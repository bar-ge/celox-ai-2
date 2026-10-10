import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildReport, csvOf, reportToHtml, isDue, israelNow, scheduleFilters, REPORT_CATALOG, esc } from './engine.js'

// Sends scheduled reports by email (HTML body + full CSV attached).
//   cron   (x-cron-secret, no body)      every active schedule that is due today (Israel time)
//   manual (user JWT, { scheduleId })    one schedule, right now ("Send now" in the Reports tab)
// Report logic is engine.js, an exact copy of src/reports/engine.js (a self-test keeps them identical).

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const CRON_SECRET    = Deno.env.get('CRON_SECRET') ?? ''
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL     = 'Celox AI <noreply@celoxai.com>'
const MASTER_EMAIL   = 'bar.gershenzon@gmail.com'   // same rule as is_master() in the database
const ALLOWED_ORIGINS = ['https://celoxai.com', 'https://www.celoxai.com', 'http://localhost:5173', 'http://localhost:4173']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const cors = (origin: string) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-cron-secret',
})
const json = (body: unknown, h: Record<string, string>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } })

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function loadAll(table: string, companyId: string): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await supabase.from(table).select('*').eq('company_id', companyId).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

async function loadCompany(companyId: string) {
  const [cars, drivers, costs, fuel, maint, accidents, violations, leasing, insurance, branches, alerts, co] = await Promise.all([
    loadAll('cars', companyId), loadAll('drivers', companyId), loadAll('costs', companyId), loadAll('fuel_records', companyId),
    loadAll('maintenance', companyId), loadAll('accident_reports', companyId), loadAll('traffic_violations', companyId),
    loadAll('vehicle_leasing', companyId), loadAll('vehicle_insurance', companyId), loadAll('branches', companyId),
    supabase.rpc('company_expiry_alerts', { p_company: companyId }),
    supabase.from('companies').select('name').eq('id', companyId).maybeSingle(),
  ])
  if (alerts.error) throw new Error(`alerts: ${alerts.error.message}`)
  return { name: co.data?.name ?? '', D: { cars, drivers, costs, fuel, maint, accidents, violations, leasing, insurance, branches, alerts: alerts.data ?? [] } }
}

function b64(text: string) {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

async function sendOne(s: Row, cache: Map<string, Awaited<ReturnType<typeof loadCompany>>>, manual: boolean, dry = false): Promise<string> {
  if (!REPORT_CATALOG.some((r: Row) => r.id === s.report_type)) return 'error: unknown report'
  const to = (s.recipients ?? []).filter((e: string) => EMAIL_RE.test((e ?? '').trim())).slice(0, 10)
  if (!to.length) return 'error: no valid recipient'

  let c = cache.get(s.company_id)
  if (!c) { c = await loadCompany(s.company_id); cache.set(s.company_id, c) }
  const he = (s.language ?? 'he') === 'he'
  const today = israelNow().date
  const rep = buildReport(s.report_type, c.D, scheduleFilters(s, today), { he, today, currency: '₪', plate: (p: string) => p })
  if (dry) return `dry-run ok: ${rep.rows.length} rows, ${rep.kpis.length} kpis, html ${reportToHtml(rep, { company: c.name, maxRows: 300 }).length} chars, csv ${csvOf(rep).length} chars`
  if (s.skip_if_empty && rep.rows.length === 0 && !manual) return 'skipped: empty'

  const footer = he
    ? 'דוח מתוזמן מ-Celox AI. לשינוי או הפסקה היכנס ללשונית הדוחות.'
    : 'Scheduled report from Celox AI. Change or stop it from the Reports tab.'
  const html = reportToHtml(rep, { company: c.name, maxRows: 300 }) + `<div dir="${he ? 'rtl' : 'ltr'}" style="max-width:900px;margin:0 auto;padding:0 24px 24px;font-family:Arial,sans-serif;font-size:11px;color:#8a8490">${esc(footer)}</div>`
  const subject = `${s.name || rep.title} – ${rep.subtitle}`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html, attachments: [{ filename: `${s.report_type}_${today}.csv`, content: b64(csvOf(rep)) }] }),
  })
  if (!res.ok) { console.error('Resend error', s.id, (await res.text()).slice(0, 300)); return 'error: email failed' }
  return 'sent'
}

async function record(id: string, status: string) {
  const patch: Row = { last_status: status }
  if (status === 'sent') patch.last_sent_at = new Date().toISOString()
  const { error } = await supabase.from('report_schedules').update(patch).eq('id', id)
  if (error) console.error('could not record status for', id, error.message)
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get('origin') ?? '')
  if (req.method === 'OPTIONS') return new Response(null, { headers: h })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: h })
  if (!RESEND_API_KEY) return json({ ok: false, reason: 'not_configured' }, h, 500)

  let body: { scheduleId?: string; dryRun?: boolean } = {}
  try { body = await req.json() } catch { /* cron sends {} */ }

  const isCron = !!CRON_SECRET && req.headers.get('x-cron-secret') === CRON_SECRET
  const cache = new Map<string, Awaited<ReturnType<typeof loadCompany>>>()

  // ── manual: one schedule, for a signed-in member of that company ──
  if (!isCron) {
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!jwt || !body.scheduleId) return json({ ok: false, reason: 'unauthorized' }, h, 401)
    const { data: { user } } = await supabase.auth.getUser(jwt)
    if (!user) return json({ ok: false, reason: 'unauthorized' }, h, 401)
    const { data: s } = await supabase.from('report_schedules').select('*').eq('id', body.scheduleId).maybeSingle()
    if (!s) return json({ ok: false, reason: 'not_found' }, h, 404)
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle()
    if (profile?.company_id !== s.company_id && user.email !== MASTER_EMAIL) return json({ ok: false, reason: 'forbidden' }, h, 403)
    let status: string
    try { status = await sendOne(s, cache, true, !!body.dryRun) } catch (e) { console.error('manual send failed', (e as Error).message); status = 'error: ' + (e as Error).message.slice(0, 120) }
    if (body.dryRun) return json({ ok: status.startsWith('dry-run ok'), status }, h)
    await record(s.id, status)
    return json({ ok: status === 'sent', status }, h)
  }

  // ── cron: everything due today ──
  const now = israelNow()
  const { data: schedules, error } = await supabase.from('report_schedules').select('*').eq('is_active', true)
  if (error) { console.error('schedules query failed', error.message); return json({ ok: false, reason: 'query_failed' }, h, 500) }
  const due = (schedules ?? []).filter((s: Row) => isDue(s, now))
  let sent = 0, skipped = 0
  const failed: string[] = []
  for (const s of due) {
    let status: string
    try { status = await sendOne(s, cache, false) } catch (e) { console.error('send failed', s.id, (e as Error).message); status = 'error: ' + (e as Error).message.slice(0, 120) }
    if (status !== 'skipped: empty') await record(s.id, status); else await supabase.from('report_schedules').update({ last_status: status }).eq('id', s.id)
    if (status === 'sent') sent++; else if (status.startsWith('skipped')) skipped++; else failed.push(s.id)
  }
  return json({ ok: failed.length === 0, date: now.date, schedules: schedules?.length ?? 0, due: due.length, sent, skipped, ...(failed.length ? { failed } : {}) }, h)
})
