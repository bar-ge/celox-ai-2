-- Email preferences on companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS email_alerts_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_lang text DEFAULT 'he';

-- Alert history to avoid re-sending the same alert every day
CREATE TABLE IF NOT EXISTS alert_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES companies(id) ON DELETE CASCADE,
  entity_type     text NOT NULL,   -- 'maintenance' | 'document' | 'license'
  entity_id       text NOT NULL,   -- supports both integer and uuid IDs
  last_alerted_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS alert_history_uniq
  ON alert_history(company_id, entity_type, entity_id);

-- RLS: only service role touches this table
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON alert_history USING (false);
