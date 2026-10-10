-- Custom alerts (user-created reminders) + a single source of truth for alerts.
--
-- Before: the Alerts tab read get_expiry_alerts() (9 kinds of expiry) while the
-- daily email re-implemented three of them in TypeScript, so the two disagreed,
-- and get_expiry_alerts() always used the caller's own company (wrong for the
-- master account when viewing another company).
--
-- After:
--   custom_alerts                  user-created reminders (title, date, optional car/driver)
--   company_expiry_alerts(uuid)    the one place alerts are computed; service_role only
--   get_expiry_alerts(uuid)        what the app calls; optional company for master
-- The daily email and "Send now" both call company_expiry_alerts().

-- ── custom_alerts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.custom_alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  note        text CHECK (note IS NULL OR char_length(note) <= 1000),
  alert_date  date NOT NULL,
  entity_type text CHECK (entity_type IS NULL OR entity_type IN ('car', 'driver')),
  entity_id   text,
  done        boolean NOT NULL DEFAULT false,
  created_by  uuid DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- a link is either both parts or neither
  CONSTRAINT custom_alerts_entity_pair CHECK ((entity_type IS NULL) = (entity_id IS NULL))
);

CREATE INDEX IF NOT EXISTS custom_alerts_company_open_idx
  ON public.custom_alerts (company_id, alert_date) WHERE NOT done;

ALTER TABLE public.custom_alerts ENABLE ROW LEVEL SECURITY;

-- Same rule as the other company tables, plus: a linked car/driver must belong
-- to the same company, so nobody can point a reminder at another tenant's row.
DROP POLICY IF EXISTS "company members manage custom_alerts" ON public.custom_alerts;
CREATE POLICY "company members manage custom_alerts" ON public.custom_alerts
  FOR ALL
  USING (
    company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
    OR public.is_master()
  )
  WITH CHECK (
    (
      company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
      OR public.is_master()
    )
    AND (
      entity_type IS NULL
      OR (entity_type = 'car' AND EXISTS (
            SELECT 1 FROM public.cars c
            WHERE c.id::text = custom_alerts.entity_id AND c.company_id = custom_alerts.company_id))
      OR (entity_type = 'driver' AND EXISTS (
            SELECT 1 FROM public.drivers d
            WHERE d.id = custom_alerts.entity_id AND d.company_id = custom_alerts.company_id))
    )
  );

-- ── one source of truth ──────────────────────────────────────────────────────
-- source_id is the id of the row the alert came from; the email uses
-- (company, type, source_id) as its de-duplication key, which is exactly what
-- alert_history already stores for maintenance/document/license.
CREATE OR REPLACE FUNCTION public.company_expiry_alerts(p_company uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := CURRENT_DATE;
  v_30    date := CURRENT_DATE + 30;
BEGIN
  IF p_company IS NULL THEN RETURN '[]'::json; END IF;
  RETURN (
    SELECT COALESCE(json_agg(a ORDER BY a.date ASC), '[]'::json)
    FROM (
      SELECT 'maintenance'::text AS type,
        CASE WHEN m.next_due < v_today THEN 'overdue' ELSE 'warning' END AS severity,
        (m.type || ' — ' || c.plate) AS label, m.next_due AS date,
        'car'::text AS entity_type, c.id::text AS entity_id, c.plate AS entity_name,
        m.type AS category, m.id::text AS source_id
      FROM maintenance m JOIN cars c ON c.id = m.car_id
      WHERE m.company_id = p_company AND m.next_due IS NOT NULL AND m.next_due <= v_30 AND m.status != 'done'
      UNION ALL
      SELECT 'document'::text,
        CASE WHEN d.expires_at < v_today THEN 'overdue' ELSE 'warning' END,
        (d.name || CASE WHEN d.entity_type = 'car' THEN ' (רכב)' ELSE ' (נהג)' END),
        d.expires_at, d.entity_type, d.entity_id,
        COALESCE(CASE WHEN d.entity_type = 'car' THEN (SELECT plate FROM cars WHERE id::text = d.entity_id)
                      ELSE (SELECT name FROM drivers WHERE id = d.entity_id) END, d.entity_id),
        COALESCE(d.doc_type, 'document'), d.id::text
      FROM documents d
      WHERE d.company_id = p_company AND d.expires_at IS NOT NULL AND d.expires_at <= v_30
        -- A licence uploaded through the auto-fill flow also stores its expiry on
        -- the driver / car record, which has its own alert below. Skip the file's
        -- copy so one expiry is not reported twice.
        AND NOT (d.doc_type = 'driver_license' AND EXISTS (
              SELECT 1 FROM drivers x WHERE x.id = d.entity_id AND x.license_expiry IS NOT NULL))
        AND NOT (d.doc_type = 'vehicle_license' AND EXISTS (
              SELECT 1 FROM cars x WHERE x.id::text = d.entity_id AND x.registration_expiry IS NOT NULL))
      UNION ALL
      SELECT 'license'::text,
        CASE WHEN drv.license_expiry < v_today THEN 'overdue' ELSE 'warning' END,
        ('רישיון נהיגה: ' || drv.name), drv.license_expiry,
        'driver'::text, drv.id, drv.name, 'license'::text, drv.id
      FROM drivers drv
      WHERE drv.company_id = p_company AND drv.license_expiry IS NOT NULL AND drv.license_expiry <= v_30
      UNION ALL
      SELECT 'certification'::text,
        CASE WHEN dc.expiry_date < v_today THEN 'overdue' ELSE 'warning' END,
        (COALESCE(dc.cert_name, dc.cert_type) || ' — ' || drv.name), dc.expiry_date,
        'driver'::text, drv.id, drv.name, COALESCE(dc.cert_type, 'certification'), dc.id::text
      FROM driver_certifications dc JOIN drivers drv ON drv.id = dc.driver_id
      WHERE dc.company_id = p_company AND dc.expiry_date IS NOT NULL AND dc.expiry_date <= v_30
      UNION ALL
      SELECT 'tachograph'::text,
        CASE WHEN c.tachograph_calibration_expiry < v_today THEN 'overdue' ELSE 'warning' END,
        ('כיול טכוגרף — ' || c.plate), c.tachograph_calibration_expiry,
        'car'::text, c.id::text, c.plate, 'tachograph'::text, c.id::text
      FROM cars c
      WHERE c.company_id = p_company AND c.tachograph_calibration_expiry IS NOT NULL
        AND c.tachograph_calibration_expiry <= v_30
      UNION ALL
      SELECT 'insurance'::text,
        CASE WHEN vi.expiry_date < v_today THEN 'overdue' ELSE 'warning' END,
        (CASE vi.policy_type WHEN 'mandatory' THEN 'ביטוח חובה'
                             WHEN 'comprehensive' THEN 'ביטוח מקיף'
                             ELSE 'ביטוח צד ג׳' END || ' — ' || c.plate),
        vi.expiry_date, 'car'::text, c.id::text, c.plate, vi.policy_type, vi.id::text
      FROM vehicle_insurance vi JOIN cars c ON c.id = vi.car_id
      WHERE vi.company_id = p_company AND vi.expiry_date IS NOT NULL AND vi.expiry_date <= v_30
      UNION ALL
      SELECT 'test'::text,
        CASE WHEN vt.next_test_date < v_today THEN 'overdue' ELSE 'warning' END,
        ('טסט שנתי — ' || c.plate), vt.next_test_date,
        'car'::text, c.id::text, c.plate, 'test'::text, vt.id::text
      FROM vehicle_tests vt JOIN cars c ON c.id = vt.car_id
      WHERE vt.company_id = p_company AND vt.next_test_date IS NOT NULL AND vt.next_test_date <= v_30
      UNION ALL
      SELECT 'leasing'::text,
        CASE WHEN vl.end_date < v_today THEN 'overdue' ELSE 'warning' END,
        ('סיום חוזה ליסינג — ' || c.plate), vl.end_date,
        'car'::text, c.id::text, c.plate, 'leasing'::text, vl.id::text
      FROM vehicle_leasing vl JOIN cars c ON c.id = vl.car_id
      WHERE vl.company_id = p_company AND vl.end_date IS NOT NULL AND vl.end_date <= v_30
        AND vl.ownership_type <> 'owned'
      UNION ALL
      -- Vehicle registration (תאריך רישוי) — driving unlicensed is an offence
      SELECT 'registration'::text,
        CASE WHEN c.registration_expiry < v_today THEN 'overdue' ELSE 'warning' END,
        ('רישיון רכב — ' || c.plate), c.registration_expiry,
        'car'::text, c.id::text, c.plate, 'registration'::text, c.id::text
      FROM cars c
      WHERE c.company_id = p_company AND c.registration_expiry IS NOT NULL
        AND c.registration_expiry <= v_30
      UNION ALL
      -- User-created reminders
      SELECT 'custom'::text,
        CASE WHEN ca.alert_date < v_today THEN 'overdue' ELSE 'warning' END,
        ca.title, ca.alert_date,
        ca.entity_type, ca.entity_id,
        CASE WHEN ca.entity_type = 'car' THEN (SELECT plate FROM cars WHERE id::text = ca.entity_id)
             WHEN ca.entity_type = 'driver' THEN (SELECT name FROM drivers WHERE id = ca.entity_id)
             ELSE NULL END,
        'custom'::text, ca.id::text
      FROM custom_alerts ca
      WHERE ca.company_id = p_company AND NOT ca.done AND ca.alert_date <= v_30
    ) a
  );
END;
$function$;

-- Server-side only: it trusts p_company, so browsers must never call it directly.
REVOKE ALL ON FUNCTION public.company_expiry_alerts(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.company_expiry_alerts(uuid) TO service_role;

-- ── what the app calls ───────────────────────────────────────────────────────
-- Replaces the zero-argument version (a default argument keeps `rpc('get_expiry_alerts')`
-- working, and two overloads would make that call ambiguous).
DROP FUNCTION IF EXISTS public.get_expiry_alerts();

CREATE OR REPLACE FUNCTION public.get_expiry_alerts(p_company uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cid uuid := public.my_company_id();
BEGIN
  -- Only the master account may look at a company other than its own.
  IF p_company IS NOT NULL AND p_company IS DISTINCT FROM v_cid AND public.is_master() THEN
    v_cid := p_company;
  END IF;
  IF v_cid IS NULL THEN RETURN '[]'::json; END IF;
  RETURN public.company_expiry_alerts(v_cid);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_expiry_alerts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_expiry_alerts(uuid) TO authenticated, service_role;
