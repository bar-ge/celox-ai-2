import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL     = 'Celox AI <noreply@celoxai.com>'
const APP_URL        = 'https://celoxai.com'
const MASTER_EMAIL   = 'bar.gershenzon@gmail.com'

// HTML-escape any value interpolated into an email body (prevents markup/link injection)
const ESC_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
function esc(v: unknown): string { return String(v ?? '').replace(/[&<>"']/g, (c) => ESC_MAP[c]) }

// ── Shared layout wrapper ─────────────────────────────────────────────────────
function layout(body: string, dir: string) {
  return `<!DOCTYPE html><html dir="${dir}" lang="${dir === 'rtl' ? 'he' : 'en'}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;direction:${dir}">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#0f172a,#0891b2);padding:28px 32px;text-align:center">
      <div style="font-size:26px;margin-bottom:6px">🚗</div>
      <h1 style="color:#fff;margin:0;font-size:18px;font-weight:800;letter-spacing:-0.3px">Celox AI Fleet Manager</h1>
    </div>
    <div style="padding:28px 32px;font-size:14px;color:#334155;line-height:1.6">${body}</div>
    <div style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0">
        Celox AI · <a href="${APP_URL}/settings" style="color:#94a3b8">כניסה להגדרות</a>
      </p>
    </div>
  </div>
</body></html>`
}

function btn(label: string, url: string) {
  return `<div style="text-align:center;margin:20px 0">
    <a href="${url}" style="background:linear-gradient(135deg,#0891b2,#6366f1);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block">${label}</a>
  </div>`
}

function section(title: string, content: string) {
  return `<div style="background:#f8fafc;border-radius:10px;padding:16px 20px;margin:16px 0">
    <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">${title}</div>
    ${content}
  </div>`
}

// ── Email builders ────────────────────────────────────────────────────────────
function buildInvite(p: any, isHe: boolean, dir: string) {
  const body = isHe
    ? `<h2 style="margin:0 0 8px;font-size:18px;color:#0f172a">הוזמנת להצטרף 🎉</h2>
       <p style="margin:0 0 16px"><strong>${esc(p.inviterEmail)}</strong> הזמין אותך להצטרף לחברה <strong>${esc(p.companyName)}</strong> ב-Celox AI Fleet Manager.</p>
       ${section('מה הלאה?', `<ol style="margin:0;padding-inline-start:20px;color:#475569">
         <li style="margin-bottom:6px">לחץ על הכפתור למטה כדי ליצור חשבון</li>
         <li style="margin-bottom:6px">הכנס את כתובת האימייל הזו</li>
         <li>אחרי ההרשמה, בחר "הצטרף עם קוד" ובקש את קוד ההזמנה מהמנהל שלך</li>
       </ol>`)}
       ${btn('הצטרף עכשיו', APP_URL)}`
    : `<h2 style="margin:0 0 8px;font-size:18px;color:#0f172a">You've been invited 🎉</h2>
       <p style="margin:0 0 16px"><strong>${esc(p.inviterEmail)}</strong> invited you to join <strong>${esc(p.companyName)}</strong> on Celox AI Fleet Manager.</p>
       ${section('Next steps', `<ol style="margin:0;padding-inline-start:20px;color:#475569">
         <li style="margin-bottom:6px">Click the button below to create an account</li>
         <li style="margin-bottom:6px">Use this email address to sign up</li>
         <li>After signing up, choose "Join with Code" and ask your admin for the invite code</li>
       </ol>`)}
       ${btn('Join now', APP_URL)}`
  return layout(body, dir)
}

function buildMemberJoined(p: any, isHe: boolean, dir: string) {
  const body = isHe
    ? `<h2 style="margin:0 0 8px;font-size:18px;color:#0f172a">חבר חדש הצטרף 👋</h2>
       <p>${section('', `<span style="font-weight:700">${esc(p.newMemberEmail)}</span> הצטרף לחברה <span style="font-weight:700">${esc(p.companyName)}</span>`)}</p>
       <p style="color:#64748b;font-size:13px">תוכל לנהל הרשאות בהגדרות.</p>
       ${btn('פתח הגדרות', `${APP_URL}?tab=settings`)}`
    : `<h2 style="margin:0 0 8px;font-size:18px;color:#0f172a">New member joined 👋</h2>
       <p>${section('', `<span style="font-weight:700">${esc(p.newMemberEmail)}</span> joined <span style="font-weight:700">${esc(p.companyName)}</span>`)}</p>
       <p style="color:#64748b;font-size:13px">You can manage permissions in Settings.</p>
       ${btn('Open settings', `${APP_URL}?tab=settings`)}`
  return layout(body, dir)
}

function buildStatusChanged(p: any, isHe: boolean, dir: string) {
  const statusHe: Record<string, string> = { Available: 'פנוי', 'In Use': 'בשימוש', Maintenance: 'תחזוקה' }
  const fmt = (s: string) => esc(isHe ? (statusHe[s] ?? s) : s)
  const body = isHe
    ? `<h2 style="margin:0 0 8px;font-size:18px;color:#0f172a">שינוי סטטוס רכב 🔄</h2>
       ${section('פרטי הרכב', `
         <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
           <span style="font-size:20px;font-weight:900;letter-spacing:2px">${esc(p.plate)}</span>
           <span style="color:#64748b">${esc(p.make)} ${esc(p.model)}</span>
         </div>
         <div style="margin-top:12px;display:flex;align-items:center;gap:12px">
           <span style="background:#fef2f2;color:#dc2626;padding:4px 10px;border-radius:6px;font-weight:700;font-size:13px">${fmt(p.oldStatus)}</span>
           <span style="color:#94a3b8">→</span>
           <span style="background:#f0fdf4;color:#16a34a;padding:4px 10px;border-radius:6px;font-weight:700;font-size:13px">${fmt(p.newStatus)}</span>
         </div>
         <div style="margin-top:8px;font-size:12px;color:#94a3b8">שונה על ידי ${esc(p.changedByEmail)}</div>
       `)}
       ${btn('פתח את הצי', APP_URL)}`
    : `<h2 style="margin:0 0 8px;font-size:18px;color:#0f172a">Vehicle status changed 🔄</h2>
       ${section('Vehicle details', `
         <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
           <span style="font-size:20px;font-weight:900;letter-spacing:2px">${esc(p.plate)}</span>
           <span style="color:#64748b">${esc(p.make)} ${esc(p.model)}</span>
         </div>
         <div style="margin-top:12px;display:flex;align-items:center;gap:12px">
           <span style="background:#fef2f2;color:#dc2626;padding:4px 10px;border-radius:6px;font-weight:700;font-size:13px">${fmt(p.oldStatus)}</span>
           <span style="color:#94a3b8">→</span>
           <span style="background:#f0fdf4;color:#16a34a;padding:4px 10px;border-radius:6px;font-weight:700;font-size:13px">${fmt(p.newStatus)}</span>
         </div>
         <div style="margin-top:8px;font-size:12px;color:#94a3b8">Changed by ${esc(p.changedByEmail)}</div>
       `)}
       ${btn('Open fleet', APP_URL)}`
  return layout(body, dir)
}

function buildFormSubmitted(p: any, isHe: boolean, dir: string) {
  const formData = p.formData ?? {}
  const rows = Object.entries(formData)
    .filter(([k]) => k !== 'attachments' && k !== 'submitter_name')
    .map(([k, v]) => {
      const val = Array.isArray(v) ? (v as string[]).join(', ') : String(v ?? '')
      if (!val) return ''
      return `<tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:7px 10px;color:#64748b;font-weight:600;white-space:nowrap">${esc(k)}</td>
        <td style="padding:7px 10px;color:#0f172a">${esc(val)}</td>
      </tr>`
    }).filter(Boolean).join('')

  const attachments = Array.isArray(formData.attachments) && formData.attachments.length > 0
    ? `<div style="margin-top:12px;font-size:12px;color:#64748b">${isHe ? 'קבצים מצורפים' : 'Attachments'}: ${formData.attachments.length}</div>`
    : ''

  const body = isHe
    ? `<h2 style="margin:0 0 8px;font-size:18px;color:#0f172a">טופס חדש נשלח 📋</h2>
       ${section('פרטי הגשה', `
         <div><span style="color:#64748b">טופס:</span> <strong>${esc(p.formTitle)}</strong></div>
         <div style="margin-top:4px"><span style="color:#64748b">ממלא:</span> <strong>${esc(p.submitterName)}</strong></div>
       `)}
       ${rows ? section('תוכן הטופס', `<table style="width:100%;border-collapse:collapse">${rows}</table>${attachments}`) : ''}
       ${btn('צפה בהגשות', `${APP_URL}?tab=forms`)}`
    : `<h2 style="margin:0 0 8px;font-size:18px;color:#0f172a">New form submission 📋</h2>
       ${section('Submission details', `
         <div><span style="color:#64748b">Form:</span> <strong>${esc(p.formTitle)}</strong></div>
         <div style="margin-top:4px"><span style="color:#64748b">Submitted by:</span> <strong>${esc(p.submitterName)}</strong></div>
       `)}
       ${rows ? section('Form contents', `<table style="width:100%;border-collapse:collapse">${rows}</table>${attachments}`) : ''}
       ${btn('View submissions', `${APP_URL}?tab=forms`)}`
  return layout(body, dir)
}

function row(label: string, value: string | number | null | undefined) {
  if (value == null || value === '') return ''
  return `<tr style="border-bottom:1px solid #f1f5f9">
    <td style="padding:7px 12px;color:#64748b;font-weight:600;white-space:nowrap">${esc(label)}</td>
    <td style="padding:7px 12px;color:#0f172a">${esc(value)}</td>
  </tr>`
}

function buildLicenseSigned(p: any) {
  const monthly = p.price_per_car && p.num_cars
    ? (100 + p.price_per_car * p.num_cars).toLocaleString('he-IL')
    : null
  const pricingRows = [
    row('מספר רכבים', p.num_cars),
    row('מחיר לרכב', p.price_per_car ? `₪${p.price_per_car}` : null),
    row('אחסון חינם', p.free_storage_gb ? `${p.free_storage_gb} GB` : '10 GB'),
    row('מחיר GB נוסף', p.price_extra_gb ? `₪${p.price_extra_gb}` : null),
    row('סה"כ חודשי', monthly ? `₪${monthly}` : null),
  ].filter(Boolean).join('')

  const body = `
    <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a">📄 הסכם רישיון נחתם</h2>
    <p style="margin:0 0 16px;color:#475569">לקוח חדש חתם על הסכם הרישיון.</p>
    ${section('פרטי החותם', `<table style="width:100%;border-collapse:collapse">
      ${row('חברה', p.company_name)}
      ${row('שם מלא', p.signatory_name)}
      ${row('תפקיד', p.signatory_role)}
      ${row('ת.ז.', p.id_number)}
      ${row('טלפון', p.phone)}
      ${row('אימייל', p.email)}
      ${row('תאריך', p.sign_date)}
    </table>`)}
    ${pricingRows ? section('תמחור', `<table style="width:100%;border-collapse:collapse">${pricingRows}</table>`) : ''}
    ${p.notes ? section('הערות', `<p style="margin:0;color:#475569">${esc(p.notes)}</p>`) : ''}
    ${btn('פתח CRM', `${APP_URL}?tab=crm`)}
  `
  return layout(body, 'rtl')
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) console.error('Resend error:', await res.text())
  return res.ok
}

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (!RESEND_API_KEY) return new Response('RESEND_API_KEY not configured', { status: 500, headers: CORS })

  const { type, payload } = await req.json()

  // License signed: send directly to master, no company lookup needed
  if (type === 'license_signed') {
    const subject = `📄 הסכם נחתם — ${payload.company_name || payload.signatory_name || 'לקוח חדש'}`
    const ok = await sendEmail(MASTER_EMAIL, subject, buildLicenseSigned(payload))
    return json({ ok })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // Load company for name + language preference
  const { data: company } = await supabase
    .from('companies').select('id, name, email_lang')
    .eq('id', payload.company_id).maybeSingle()

  const isHe = (company?.email_lang ?? 'he') === 'he'
  const dir  = isHe ? 'rtl' : 'ltr'

  // Resolve recipient
  let to: string | null = null
  let subject = ''
  let html = ''

  if (type === 'invite_sent') {
    // Arbitrary-recipient send from our verified domain → require the caller to be an
    // authenticated admin of the target company, and trust the JWT for the inviter identity.
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: { user } } = jwt ? await supabase.auth.getUser(jwt) : { data: { user: null } }
    if (!user) return json({ ok: false, reason: 'unauthorized' }, 401)
    const { data: caller } = await supabase
      .from('profiles').select('role, company_id').eq('id', user.id).maybeSingle()
    const isMaster = user.email === MASTER_EMAIL
    if (!isMaster && !(caller?.role === 'admin' && caller?.company_id === payload.company_id)) {
      return json({ ok: false, reason: 'forbidden' }, 403)
    }
    to = payload.email
    subject = isHe
      ? `הוזמנת להצטרף ל-${company?.name ?? 'Celox AI'}`
      : `You've been invited to join ${company?.name ?? 'Celox AI'}`
    html = buildInvite({ inviterEmail: user.email, companyName: company?.name ?? '' }, isHe, dir)

  } else {
    // All other types → company admin
    const { data: admins } = await supabase
      .from('profiles').select('email').eq('company_id', payload.company_id).eq('role', 'admin').limit(1)
    to = admins?.[0]?.email ?? null

    if (type === 'member_joined') {
      subject = isHe ? `חבר חדש הצטרף — ${payload.new_member_email}` : `New member joined — ${payload.new_member_email}`
      html = buildMemberJoined({ newMemberEmail: payload.new_member_email, companyName: company?.name ?? '' }, isHe, dir)

    } else if (type === 'status_changed') {
      subject = isHe ? `שינוי סטטוס — ${payload.plate}` : `Status change — ${payload.plate}`
      html = buildStatusChanged({
        plate: payload.plate, make: payload.make, model: payload.model,
        oldStatus: payload.old_status, newStatus: payload.new_status,
        changedByEmail: payload.changed_by_email,
      }, isHe, dir)

    } else if (type === 'form_submitted') {
      subject = isHe ? `טופס נשלח — ${payload.form_title}` : `Form submitted — ${payload.form_title}`
      html = buildFormSubmitted({
        formTitle: payload.form_title,
        submitterName: payload.submitter_name ?? '—',
        formData: payload.form_data ?? {},
      }, isHe, dir)
    }
  }

  if (!to) return json({ ok: false, reason: 'no_recipient' })

  const ok = await sendEmail(to, subject, html)
  return json({ ok }, ok ? 200 : 500)
})
