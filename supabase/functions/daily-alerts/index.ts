import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const CRON_SECRET    = Deno.env.get('CRON_SECRET') ?? ''
const FROM_EMAIL     = 'Celox AI <noreply@celoxai.com>'
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL        = 'https://celoxai.com'

// Re-send same alert only after 7 days
const RESEND_DAYS = 7

const MAINT_TYPE: Record<string, { he: string; en: string }> = {
  'Oil Change':    { he: 'החלפת שמן',       en: 'Oil Change' },
  'Tire Rotation': { he: 'סיבוב צמיגים',    en: 'Tire Rotation' },
  'Inspection':    { he: 'בדיקה תקופתית',   en: 'Inspection' },
  'Brake Service': { he: 'שירות בלמים',     en: 'Brake Service' },
  'Other':         { he: 'אחר',              en: 'Other' },
}

Deno.serve(async (req) => {
  const cronHeader = req.headers.get('x-cron-secret')
  if (CRON_SECRET && cronHeader !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set')
    return new Response('RESEND_API_KEY not configured', { status: 500 })
  }

  const supabase  = createClient(SUPABASE_URL, SERVICE_KEY)
  const today     = new Date()
  const in30Days  = new Date(today); in30Days.setDate(today.getDate() + 30)
  const todayStr  = today.toISOString().split('T')[0]
  const in30Str   = in30Days.toISOString().split('T')[0]
  const cutoffStr = new Date(today.getTime() - RESEND_DAYS * 86400000).toISOString()

  // ── Fetch all companies with email_alerts_enabled = true ─────────────────
  const { data: enabledCompanies } = await supabase
    .from('companies')
    .select('id, name, email_lang, email_alerts_enabled, alert_recipients')
    .eq('email_alerts_enabled', true)

  const enabledIds = new Set((enabledCompanies ?? []).map((c: any) => c.id))
  const companyMeta: Record<string, { lang: string; name: string; recipients: string[] }> = {}
  for (const c of enabledCompanies ?? []) {
    companyMeta[c.id] = { lang: c.email_lang ?? 'he', name: c.name, recipients: c.alert_recipients ?? [] }
  }

  if (enabledIds.size === 0) {
    return new Response(JSON.stringify({ emails_sent: 0, reason: 'all_disabled' }), { status: 200 })
  }

  // ── Fetch alert history (items alerted within last RESEND_DAYS days) ──────
  const { data: recentHistory } = await supabase
    .from('alert_history')
    .select('company_id, entity_type, entity_id')
    .gt('last_alerted_at', cutoffStr)

  const alreadyAlerted = new Set(
    (recentHistory ?? []).map((h: any) => `${h.company_id}:${h.entity_type}:${h.entity_id}`)
  )
  const isAlerted = (cid: string, type: string, id: string) =>
    alreadyAlerted.has(`${cid}:${type}:${id}`)

  // ── Fetch all alert types ────────────────────────────────────────────────
  const twoDaysAgo = new Date(today.getTime() - 2 * 86400000).toISOString()
  const [{ data: maintenance }, { data: documents }, { data: licenses }, { data: openAccidents }] = await Promise.all([
    supabase.from('maintenance')
      .select('id, type, next_due, cars(plate, make, model, company_id)')
      .lte('next_due', in30Str)
      .neq('status', 'done'),
    supabase.from('documents')
      .select('id, name, entity_type, expires_at, company_id')
      .lte('expires_at', in30Str),
    supabase.from('drivers')
      .select('id, name, license_expiry, company_id')
      .lte('license_expiry', in30Str)
      .not('license_expiry', 'is', null),
    supabase.from('accident_reports')
      .select('id, company_id, incident_date, created_at, other_plate, other_driver_name, description, status')
      .eq('status', 'open')
      .lt('created_at', twoDaysAgo),
  ])

  // ── Group by company — filter disabled companies and already-alerted items ─
  type AlertMap = {
    maintenance: any[]; documents: any[]; licenses: any[]; accidents: any[]
    newMaintIds: string[]; newDocIds: string[]; newLicIds: string[]
  }
  const byCompany: Record<string, AlertMap> = {}
  const ensure = (cid: string) => {
    if (!byCompany[cid]) byCompany[cid] = {
      maintenance: [], documents: [], licenses: [], accidents: [],
      newMaintIds: [], newDocIds: [], newLicIds: [],
    }
  }

  for (const r of maintenance ?? []) {
    const cid = r.cars?.company_id; if (!cid || !enabledIds.has(cid)) continue
    if (isAlerted(cid, 'maintenance', String(r.id))) continue
    ensure(cid); byCompany[cid].maintenance.push(r); byCompany[cid].newMaintIds.push(String(r.id))
  }
  for (const d of documents ?? []) {
    const cid = d.company_id; if (!cid || !enabledIds.has(cid)) continue
    if (isAlerted(cid, 'document', String(d.id))) continue
    ensure(cid); byCompany[cid].documents.push(d); byCompany[cid].newDocIds.push(String(d.id))
  }
  for (const drv of licenses ?? []) {
    const cid = drv.company_id; if (!cid || !enabledIds.has(cid)) continue
    if (isAlerted(cid, 'license', String(drv.id))) continue
    ensure(cid); byCompany[cid].licenses.push(drv); byCompany[cid].newLicIds.push(String(drv.id))
  }
  for (const acc of openAccidents ?? []) {
    const cid = acc.company_id; if (!cid || !enabledIds.has(cid)) continue
    ensure(cid); byCompany[cid].accidents.push(acc)
  }

  let emails_sent = 0

  for (const [companyId, items] of Object.entries(byCompany)) {
    const total = items.maintenance.length + items.documents.length + items.licenses.length + items.accidents.length
    if (total === 0) continue

    // Configured recipient list wins; empty list falls back to the first admin
    // (the original behaviour), so companies that never set it are unaffected.
    let recipients: string[] = (companyMeta[companyId]?.recipients ?? []).filter(Boolean)
    if (recipients.length === 0) {
      const { data: admins } = await supabase.from('profiles')
        .select('email').eq('company_id', companyId).eq('role', 'admin').limit(1)
      if (admins?.[0]?.email) recipients = [admins[0].email]
    }
    if (recipients.length === 0) continue

    const isHe  = (companyMeta[companyId]?.lang ?? 'he') === 'he'
    const dir    = isHe ? 'rtl' : 'ltr'
    const locale = isHe ? 'he-IL' : 'en-US'

    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString(locale) : '—'
    const overdueLabel = (overdue: boolean) => overdue
      ? (isHe ? 'באיחור' : 'Overdue')
      : (isHe ? 'בקרוב' : 'Upcoming')
    const badge = (overdue: boolean) => overdue
      ? `<span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${overdueLabel(true)}</span>`
      : `<span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${overdueLabel(false)}</span>`

    const thead = (cols: string[]) => `<thead><tr style="background:#f8fafc">${cols.map(c =>
      `<th style="padding:9px 12px;text-align:${dir === 'rtl' ? 'right' : 'left'};color:#64748b;font-size:11px;text-transform:uppercase">${c}</th>`
    ).join('')}</tr></thead>`

    const colNames = isHe
      ? ['שם / לוחית', 'סוג', 'תאריך', 'סטטוס']
      : ['Name / Plate', 'Type', 'Date', 'Status']

    // Maintenance rows
    const maintRows = items.maintenance.map(r => {
      const overdue = r.next_due < todayStr
      const typeLabel = isHe ? (MAINT_TYPE[r.type]?.he ?? r.type) : (MAINT_TYPE[r.type]?.en ?? r.type)
      return `<tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:9px 12px;font-weight:600">${r.cars?.plate ?? '—'}</td>
        <td style="padding:9px 12px">${typeLabel}</td>
        <td style="padding:9px 12px">${fmtDate(r.next_due)}</td>
        <td style="padding:9px 12px">${badge(overdue)}</td>
      </tr>`
    }).join('')

    // Document rows
    const docRows = items.documents.map(d => {
      const overdue = d.expires_at < todayStr
      const typeLabel = d.entity_type === 'car' ? (isHe ? 'רכב' : 'Vehicle') : (isHe ? 'נהג' : 'Driver')
      return `<tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:9px 12px;font-weight:600">${d.name}</td>
        <td style="padding:9px 12px">${typeLabel}</td>
        <td style="padding:9px 12px">${fmtDate(d.expires_at)}</td>
        <td style="padding:9px 12px">${badge(overdue)}</td>
      </tr>`
    }).join('')

    // License rows
    const licRows = items.licenses.map(drv => {
      const overdue = drv.license_expiry < todayStr
      return `<tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:9px 12px;font-weight:600">${drv.name}</td>
        <td style="padding:9px 12px">${isHe ? 'רישיון נהיגה' : 'Driver License'}</td>
        <td style="padding:9px 12px">${fmtDate(drv.license_expiry)}</td>
        <td style="padding:9px 12px">${badge(overdue)}</td>
      </tr>`
    }).join('')

    // Accident rows
    const accidentColNames = isHe
      ? ['תאריך', 'לוחית צד שני', 'נהג צד שני', 'תיאור']
      : ['Date', 'Other Plate', 'Other Driver', 'Description']
    const accidentThead = `<thead><tr style="background:#fef2f2">${accidentColNames.map(c =>
      `<th style="padding:9px 12px;text-align:${dir === 'rtl' ? 'right' : 'left'};color:#dc2626;font-size:11px;text-transform:uppercase">${c}</th>`
    ).join('')}</tr></thead>`
    const accRows = items.accidents.map(acc => {
      const dateStr = fmtDate(acc.incident_date || acc.created_at?.slice(0, 10))
      const desc = (acc.description || '').slice(0, 60) + ((acc.description || '').length > 60 ? '…' : '')
      return `<tr style="border-bottom:1px solid #fee2e2">
        <td style="padding:9px 12px;font-weight:600">${dateStr}</td>
        <td style="padding:9px 12px">${acc.other_plate || '—'}</td>
        <td style="padding:9px 12px">${acc.other_driver_name || '—'}</td>
        <td style="padding:9px 12px;color:#475569;font-size:12px">${desc || '—'}</td>
      </tr>`
    }).join('')

    const tableBlock = (title: string, rows: string, customThead?: string) =>
      `<h3 style="margin:0 0 10px;font-size:14px;color:#0f172a">${title}</h3>
       <table style="width:100%;border-collapse:collapse;margin-bottom:24px">${customThead ?? thead(colNames)}<tbody>${rows}</tbody></table>`

    const settingsUrl = `${APP_URL}?tab=settings`
    const unsubText = isHe
      ? `<a href="${settingsUrl}" style="color:#94a3b8">ניהול העדפות מייל</a>`
      : `<a href="${settingsUrl}" style="color:#94a3b8">Manage email preferences</a>`

    const subjectLine = isHe
      ? `⚠️ ${total} ${total === 1 ? 'התראה' : 'התראות'} — Celox AI Fleet`
      : `⚠️ ${total} ${total === 1 ? 'alert' : 'alerts'} — Celox AI Fleet`

    const html = `<!DOCTYPE html><html dir="${dir}" lang="${isHe ? 'he' : 'en'}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;direction:${dir}">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#0f172a,#1e40af);padding:32px;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">⚠️</div>
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800">${isHe ? 'התראות יומיות' : 'Daily Alerts'} — Celox AI</h1>
      <p style="color:rgba(255,255,255,0.65);margin:8px 0 0;font-size:13px">${new Date().toLocaleDateString(locale)}</p>
    </div>
    <div style="padding:28px 32px;font-size:14px;color:#334155">
      ${accRows   ? tableBlock(isHe ? `🚨 תאונות פתוחות (${items.accidents.length})` : `🚨 Open Accidents (${items.accidents.length})`, accRows, accidentThead) : ''}
      ${maintRows ? tableBlock(isHe ? `🔧 תחזוקה (${items.maintenance.length})` : `🔧 Maintenance (${items.maintenance.length})`, maintRows) : ''}
      ${docRows   ? tableBlock(isHe ? `📎 מסמכים (${items.documents.length})` : `📎 Documents (${items.documents.length})`, docRows) : ''}
      ${licRows   ? tableBlock(isHe ? `🪪 רישיונות (${items.licenses.length})` : `🪪 Licenses (${items.licenses.length})`, licRows) : ''}
      <div style="text-align:center;margin-top:8px">
        <a href="${APP_URL}" style="background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block">
          ${isHe ? 'פתח את מנהל הצי' : 'Open fleet manager'}
        </a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0">Celox AI · ${unsubText}</p>
    </div>
  </div>
</body></html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: recipients, subject: subjectLine, html }),
    })

    if (res.ok) {
      emails_sent++
      // Record alert history to avoid re-sending for RESEND_DAYS days
      const historyRows = [
        ...items.newMaintIds.map(id => ({ company_id: companyId, entity_type: 'maintenance', entity_id: id, last_alerted_at: new Date().toISOString() })),
        ...items.newDocIds.map(id   => ({ company_id: companyId, entity_type: 'document',    entity_id: id, last_alerted_at: new Date().toISOString() })),
        ...items.newLicIds.map(id   => ({ company_id: companyId, entity_type: 'license',     entity_id: id, last_alerted_at: new Date().toISOString() })),
      ]
      if (historyRows.length > 0) {
        await supabase.from('alert_history').upsert(historyRows, { onConflict: 'company_id,entity_type,entity_id' })
      }
    } else {
      console.error('Resend error for company', companyId, ':', await res.text())
    }
  }

  return new Response(JSON.stringify({ emails_sent, companies: Object.keys(byCompany).length }), {
    headers: { 'Content-Type': 'application/json' }, status: 200,
  })
})
