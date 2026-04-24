import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const CRON_SECRET    = Deno.env.get('CRON_SECRET') ?? ''
const FROM_EMAIL     = 'Celox AI <noreply@celoxai.com>'
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MAINT_TYPE_HE: Record<string, string> = {
  'Oil Change': 'החלפת שמן', 'Tire Rotation': 'סיבוב צמיגים',
  'Inspection': 'בדיקה תקופתית', 'Brake Service': 'שירות בלמים', 'Other': 'אחר',
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

  // ── Fetch all alert types ────────────────────────────────────────────────
  const [{ data: maintenance }, { data: documents }, { data: licenses }] = await Promise.all([
    supabase.from('maintenance')
      .select('*, cars(plate, make, model, company_id)')
      .lte('next_due', in30Str)
      .neq('status', 'done'),
    supabase.from('documents')
      .select('*, company_id')
      .lte('expires_at', in30Str),
    supabase.from('drivers')
      .select('id, name, license_expiry, company_id')
      .lte('license_expiry', in30Str)
      .not('license_expiry', 'is', null),
  ])

  // ── Group everything by company ──────────────────────────────────────────
  type AlertMap = { maintenance: typeof maintenance; documents: typeof documents; licenses: typeof licenses }
  const byCompany: Record<string, AlertMap> = {}
  const ensure = (cid: string) => {
    if (!byCompany[cid]) byCompany[cid] = { maintenance: [], documents: [], licenses: [] }
  }

  for (const r of maintenance ?? []) {
    const cid = r.cars?.company_id; if (!cid) continue
    ensure(cid); byCompany[cid].maintenance.push(r)
  }
  for (const d of documents ?? []) {
    const cid = d.company_id; if (!cid) continue
    ensure(cid); byCompany[cid].documents.push(d)
  }
  for (const drv of licenses ?? []) {
    const cid = drv.company_id; if (!cid) continue
    ensure(cid); byCompany[cid].licenses.push(drv)
  }

  let emails_sent = 0

  for (const [companyId, items] of Object.entries(byCompany)) {
    const total = (items.maintenance?.length ?? 0) + (items.documents?.length ?? 0) + (items.licenses?.length ?? 0)
    if (total === 0) continue

    const { data: admins } = await supabase.from('profiles')
      .select('email').eq('company_id', companyId).eq('role', 'admin').limit(1)
    const adminEmail = admins?.[0]?.email
    if (!adminEmail) continue

    const badge = (isOverdue: boolean) => isOverdue
      ? `<span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">באיחור</span>`
      : `<span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">בקרוב</span>`

    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('he-IL') : '—'

    // Maintenance rows
    const maintRows = (items.maintenance ?? []).map(r => {
      const overdue = r.next_due < todayStr
      return `<tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:9px 12px;font-weight:600">${r.cars?.plate ?? '—'}</td>
        <td style="padding:9px 12px">${MAINT_TYPE_HE[r.type] ?? r.type}</td>
        <td style="padding:9px 12px">${fmtDate(r.next_due)}</td>
        <td style="padding:9px 12px">${badge(overdue)}</td>
      </tr>`
    }).join('')

    // Document rows
    const docRows = (items.documents ?? []).map(d => {
      const overdue = d.expires_at < todayStr
      return `<tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:9px 12px;font-weight:600">${d.name}</td>
        <td style="padding:9px 12px">${d.entity_type === 'car' ? 'רכב' : 'נהג'}</td>
        <td style="padding:9px 12px">${fmtDate(d.expires_at)}</td>
        <td style="padding:9px 12px">${badge(overdue)}</td>
      </tr>`
    }).join('')

    // License rows
    const licRows = (items.licenses ?? []).map(drv => {
      const overdue = drv.license_expiry < todayStr
      return `<tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:9px 12px;font-weight:600">${drv.name}</td>
        <td style="padding:9px 12px">רישיון נהיגה</td>
        <td style="padding:9px 12px">${fmtDate(drv.license_expiry)}</td>
        <td style="padding:9px 12px">${badge(overdue)}</td>
      </tr>`
    }).join('')

    const thead = `<thead><tr style="background:#f8fafc">
      <th style="padding:9px 12px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase">שם / לוחית</th>
      <th style="padding:9px 12px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase">סוג</th>
      <th style="padding:9px 12px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase">תאריך</th>
      <th style="padding:9px 12px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase">סטטוס</th>
    </tr></thead>`

    const html = `<!DOCTYPE html><html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;direction:rtl">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#0f172a,#1e40af);padding:32px;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">⚠️</div>
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800">התראות יומיות — Celox AI</h1>
      <p style="color:rgba(255,255,255,0.65);margin:8px 0 0;font-size:13px">${new Date().toLocaleDateString('he-IL')}</p>
    </div>
    <div style="padding:28px 32px;font-size:14px;color:#334155">
      ${maintRows ? `<h3 style="margin:0 0 10px;font-size:14px;color:#0f172a">🔧 תחזוקה (${items.maintenance?.length})</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">${thead}<tbody>${maintRows}</tbody></table>` : ''}
      ${docRows ? `<h3 style="margin:0 0 10px;font-size:14px;color:#0f172a">📎 מסמכים (${items.documents?.length})</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">${thead}<tbody>${docRows}</tbody></table>` : ''}
      ${licRows ? `<h3 style="margin:0 0 10px;font-size:14px;color:#0f172a">🪪 רישיונות (${items.licenses?.length})</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">${thead}<tbody>${licRows}</tbody></table>` : ''}
      <div style="text-align:center;margin-top:8px">
        <a href="https://my-fleet-app.vercel.app" style="background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block">פתח את מנהל הצי</a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0">Celox AI · <a href="mailto:privacy@celoxai.com" style="color:#94a3b8">privacy@celoxai.com</a></p>
    </div>
  </div>
</body></html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL, to: adminEmail,
        subject: `⚠️ ${total} התראות — Celox AI Fleet`,
        html,
      }),
    })
    if (res.ok) emails_sent++
    else console.error('Resend error:', await res.text())
  }

  return new Response(JSON.stringify({ emails_sent, companies: Object.keys(byCompany).length }), {
    headers: { 'Content-Type': 'application/json' }, status: 200,
  })
})
