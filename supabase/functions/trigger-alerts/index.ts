import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON   = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL      = 'Celox AI <noreply@celoxai.com>'
const APP_URL         = 'https://my-fleet-app.vercel.app'

const MAINT_TYPE: Record<string, { he: string; en: string }> = {
  'Oil Change':    { he: 'החלפת שמן',     en: 'Oil Change' },
  'Tire Rotation': { he: 'סיבוב צמיגים',  en: 'Tire Rotation' },
  'Inspection':    { he: 'בדיקה תקופתית', en: 'Inspection' },
  'Brake Service': { he: 'שירות בלמים',   en: 'Brake Service' },
  'Other':         { he: 'אחר',            en: 'Other' },
}

Deno.serve(async (req) => {
  if (!RESEND_API_KEY) return new Response('RESEND_API_KEY not configured', { status: 500 })

  // ── Verify caller is an authenticated admin ──────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (!user || authErr) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: profile } = await supabase
    .from('profiles').select('role, company_id, email').eq('id', user.id).single()

  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const companyId = profile.company_id
  const adminEmail = profile.email
  if (!companyId || !adminEmail) {
    return new Response(JSON.stringify({ ok: false, reason: 'no_company' }), { status: 200 })
  }

  // ── Load company language preference ────────────────────────────────────
  const { data: company } = await supabase
    .from('companies').select('name, email_lang').eq('id', companyId).single()

  const isHe  = (company?.email_lang ?? 'he') === 'he'
  const dir   = isHe ? 'rtl' : 'ltr'
  const locale = isHe ? 'he-IL' : 'en-US'

  // ── Fetch due items for this company ────────────────────────────────────
  const today    = new Date()
  const in30Days = new Date(today); in30Days.setDate(today.getDate() + 30)
  const todayStr = today.toISOString().split('T')[0]
  const in30Str  = in30Days.toISOString().split('T')[0]

  const [{ data: maintenance }, { data: documents }, { data: licenses }] = await Promise.all([
    supabase.from('maintenance')
      .select('id, type, next_due, cars(plate, make, model, company_id)')
      .lte('next_due', in30Str).neq('status', 'done'),
    supabase.from('documents')
      .select('id, name, entity_type, expires_at')
      .eq('company_id', companyId).lte('expires_at', in30Str),
    supabase.from('drivers')
      .select('id, name, license_expiry')
      .eq('company_id', companyId).lte('license_expiry', in30Str).not('license_expiry', 'is', null),
  ])

  const maintItems = (maintenance ?? []).filter((r: any) => r.cars?.company_id === companyId)
  const docItems   = documents ?? []
  const licItems   = licenses ?? []
  const total      = maintItems.length + docItems.length + licItems.length

  if (total === 0) {
    return new Response(JSON.stringify({ ok: true, alerts_sent: 0, reason: 'nothing_due' }), {
      headers: { 'Content-Type': 'application/json' }, status: 200,
    })
  }

  // ── Build email (same template as daily-alerts) ──────────────────────────
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString(locale) : '—'
  const overdueLabel = (ov: boolean) => ov ? (isHe ? 'באיחור' : 'Overdue') : (isHe ? 'בקרוב' : 'Upcoming')
  const badge = (ov: boolean) => ov
    ? `<span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${overdueLabel(true)}</span>`
    : `<span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${overdueLabel(false)}</span>`

  const colNames = isHe ? ['שם / לוחית', 'סוג', 'תאריך', 'סטטוס'] : ['Name / Plate', 'Type', 'Date', 'Status']
  const thead = `<thead><tr style="background:#f8fafc">${colNames.map(c =>
    `<th style="padding:9px 12px;text-align:${dir === 'rtl' ? 'right' : 'left'};color:#64748b;font-size:11px;text-transform:uppercase">${c}</th>`
  ).join('')}</tr></thead>`

  const tr = (c1: string, c2: string, c3: string, c4: string) =>
    `<tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:9px 12px;font-weight:600">${c1}</td>
      <td style="padding:9px 12px">${c2}</td>
      <td style="padding:9px 12px">${c3}</td>
      <td style="padding:9px 12px">${c4}</td>
    </tr>`

  const maintRows = maintItems.map((r: any) => {
    const typeLabel = isHe ? (MAINT_TYPE[r.type]?.he ?? r.type) : (MAINT_TYPE[r.type]?.en ?? r.type)
    return tr(r.cars?.plate ?? '—', typeLabel, fmtDate(r.next_due), badge(r.next_due < todayStr))
  }).join('')

  const docRows = docItems.map((d: any) => {
    const typeLabel = d.entity_type === 'car' ? (isHe ? 'רכב' : 'Vehicle') : (isHe ? 'נהג' : 'Driver')
    return tr(d.name, typeLabel, fmtDate(d.expires_at), badge(d.expires_at < todayStr))
  }).join('')

  const licRows = licItems.map((drv: any) =>
    tr(drv.name, isHe ? 'רישיון נהיגה' : 'Driver License', fmtDate(drv.license_expiry), badge(drv.license_expiry < todayStr))
  ).join('')

  const tableBlock = (title: string, rows: string) =>
    `<h3 style="margin:0 0 10px;font-size:14px;color:#0f172a">${title}</h3>
     <table style="width:100%;border-collapse:collapse;margin-bottom:24px">${thead}<tbody>${rows}</tbody></table>`

  const settingsUrl = `${APP_URL}?tab=settings`
  const unsubText = isHe
    ? `<a href="${settingsUrl}" style="color:#94a3b8">ניהול העדפות מייל</a>`
    : `<a href="${settingsUrl}" style="color:#94a3b8">Manage email preferences</a>`

  const manualBadge = isHe
    ? `<span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">שליחה ידנית</span>`
    : `<span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">Manual send</span>`

  const subjectLine = isHe
    ? `⚠️ ${total} ${total === 1 ? 'התראה' : 'התראות'} — Celox AI Fleet`
    : `⚠️ ${total} ${total === 1 ? 'alert' : 'alerts'} — Celox AI Fleet`

  const html = `<!DOCTYPE html><html dir="${dir}" lang="${isHe ? 'he' : 'en'}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;direction:${dir}">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#0f172a,#1e40af);padding:32px;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">⚠️</div>
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800">${isHe ? 'התראות צי' : 'Fleet Alerts'} — Celox AI</h1>
      <p style="color:rgba(255,255,255,0.65);margin:8px 0 0;font-size:13px">${new Date().toLocaleDateString(locale)} · ${manualBadge}</p>
    </div>
    <div style="padding:28px 32px;font-size:14px;color:#334155">
      ${maintRows ? tableBlock(isHe ? `🔧 תחזוקה (${maintItems.length})` : `🔧 Maintenance (${maintItems.length})`, maintRows) : ''}
      ${docRows   ? tableBlock(isHe ? `📎 מסמכים (${docItems.length})`   : `📎 Documents (${docItems.length})`,    docRows)   : ''}
      ${licRows   ? tableBlock(isHe ? `🪪 רישיונות (${licItems.length})` : `🪪 Licenses (${licItems.length})`,    licRows)   : ''}
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
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: adminEmail, subject: subjectLine, html }),
  })

  if (!res.ok) {
    console.error('Resend error:', await res.text())
    return new Response(JSON.stringify({ ok: false, reason: 'send_failed' }), { status: 500 })
  }

  // Update alert_history so daily cron doesn't duplicate within 7 days
  const historyRows = [
    ...maintItems.map((r: any) => ({ company_id: companyId, entity_type: 'maintenance', entity_id: String(r.id), last_alerted_at: new Date().toISOString() })),
    ...docItems.map((d: any)   => ({ company_id: companyId, entity_type: 'document',    entity_id: String(d.id), last_alerted_at: new Date().toISOString() })),
    ...licItems.map((l: any)   => ({ company_id: companyId, entity_type: 'license',     entity_id: String(l.id), last_alerted_at: new Date().toISOString() })),
  ]
  if (historyRows.length > 0) {
    await supabase.from('alert_history').upsert(historyRows, { onConflict: 'company_id,entity_type,entity_id' })
  }

  return new Response(JSON.stringify({ ok: true, alerts_sent: total }), {
    headers: { 'Content-Type': 'application/json' }, status: 200,
  })
})
