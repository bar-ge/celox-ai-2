import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Config ────────────────────────────────────────────────────────────────────
// SECURITY FIX: API key now loaded from Supabase Secret, not hardcoded
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const CRON_SECRET    = Deno.env.get('CRON_SECRET') ?? ''
const FROM_EMAIL     = 'Celox AI <noreply@celoxai.com>'
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TYPE_HE: Record<string, string> = {
  'Oil Change':     'החלפת שמן',
  'Tire Rotation':  'סיבוב צמיגים',
  'Inspection':     'בדיקה תקופתית',
  'Brake Service':  'שירות בלמים',
  'Other':          'אחר',
}

Deno.serve(async (req) => {
  // Allow calls with CRON_SECRET header (from pg_cron) or valid Supabase JWT
  const cronHeader = req.headers.get('x-cron-secret')
  if (CRON_SECRET && cronHeader !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY secret is not set')
    return new Response('RESEND_API_KEY not configured', { status: 500 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const today   = new Date()
  const in30Days = new Date(today)
  in30Days.setDate(today.getDate() + 30)

  const todayStr    = today.toISOString().split('T')[0]
  const in30DaysStr = in30Days.toISOString().split('T')[0]

  // Fetch upcoming + overdue maintenance records
  const { data: records, error: recErr } = await supabase
    .from('maintenance')
    .select('*, cars(plate, make, model, company_id)')
    .lte('next_due', in30DaysStr)
    .neq('status', 'done')

  if (recErr) {
    console.error('Fetch error:', recErr)
    return new Response('DB error', { status: 500 })
  }

  if (!records || records.length === 0) {
    return new Response(JSON.stringify({ message: 'No upcoming maintenance', emails_sent: 0 }), { status: 200 })
  }

  // Group by company
  const byCompany: Record<string, typeof records> = {}
  for (const r of records) {
    const cid = r.cars?.company_id
    if (!cid) continue
    if (!byCompany[cid]) byCompany[cid] = []
    byCompany[cid].push(r)
  }

  let companies_alerted = 0
  let emails_sent = 0

  for (const [companyId, items] of Object.entries(byCompany)) {
    // Get admin email for this company
    const { data: admins } = await supabase
      .from('profiles')
      .select('email')
      .eq('company_id', companyId)
      .eq('role', 'admin')
      .limit(1)

    const adminEmail = admins?.[0]?.email
    if (!adminEmail) continue

    companies_alerted++

    const overdueItems  = items.filter(r => r.next_due < todayStr)
    const upcomingItems = items.filter(r => r.next_due >= todayStr)

    const formatRow = (r: typeof records[0]) => {
      const plate    = r.cars?.plate ?? '—'
      const typeHe   = TYPE_HE[r.type] ?? r.type
      const nextDue  = r.next_due ? new Date(r.next_due).toLocaleDateString('he-IL') : '—'
      const isOverdue = r.next_due < todayStr
      const badge    = isOverdue
        ? `<span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-size:12px;">באיחור</span>`
        : `<span style="background:#eff6ff;color:#2563eb;padding:2px 8px;border-radius:4px;font-size:12px;">קרוב</span>`
      return `<tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:10px 12px;font-weight:600">${plate}</td>
        <td style="padding:10px 12px">${typeHe}</td>
        <td style="padding:10px 12px">${nextDue}</td>
        <td style="padding:10px 12px">${badge}</td>
      </tr>`
    }

    const allRows = [...overdueItems, ...upcomingItems].map(formatRow).join('')

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;direction:rtl">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#0f172a,#1e40af);padding:32px;text-align:center">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;background:rgba(255,255,255,0.15);border-radius:14px;font-size:24px;margin-bottom:12px">🔧</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">תזכורת תחזוקה יומית</h1>
      <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:14px">Celox AI Fleet Manager</p>
    </div>
    <div style="padding:28px 32px">
      ${overdueItems.length > 0 ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:14px;color:#dc2626;font-weight:600">⚠️ יש ${overdueItems.length} רכב/ים עם תחזוקה באיחור!</div>` : ''}
      <p style="color:#475569;font-size:14px;margin:0 0 20px">שלום, להלן סיכום תחזוקת הרכבים הדורשת טיפול ב-30 הימים הקרובים:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:10px 12px;text-align:right;color:#64748b;font-weight:700;font-size:12px;text-transform:uppercase">לוחית</th>
            <th style="padding:10px 12px;text-align:right;color:#64748b;font-weight:700;font-size:12px;text-transform:uppercase">סוג שירות</th>
            <th style="padding:10px 12px;text-align:right;color:#64748b;font-weight:700;font-size:12px;text-transform:uppercase">תאריך הבא</th>
            <th style="padding:10px 12px;text-align:right;color:#64748b;font-weight:700;font-size:12px;text-transform:uppercase">סטטוס</th>
          </tr>
        </thead>
        <tbody>${allRows}</tbody>
      </table>
      <div style="margin-top:28px;text-align:center">
        <a href="https://my-fleet-app.vercel.app" style="background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block">פתח את מנהל הצי</a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:12px;margin:0">Celox AI | <a href="mailto:privacy@celoxai.com" style="color:#94a3b8">privacy@celoxai.com</a></p>
    </div>
  </div>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: adminEmail, subject: `🔧 תזכורת תחזוקה — ${items.length} רכב/ים דורשים טיפול`, html }),
    })

    if (res.ok) emails_sent++
    else console.error('Resend error:', await res.text())
  }

  return new Response(JSON.stringify({ companies_alerted, emails_sent, records_found: records.length }), {
    headers: { 'Content-Type': 'application/json' }, status: 200,
  })
})
