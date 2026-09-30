import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// "Send now" button. Checks who is asking, then hands the actual work to
// daily-alerts so there is only one email template and one alert source.
//
//   allowed:   role 'admin' or 'master'
//   company:   the caller's own; a master may pass { companyId } for another
//   goes to:   the company's configured recipients, else the caller

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET   = Deno.env.get('CRON_SECRET') ?? ''

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (!user || authErr) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: profile } = await supabase.from('profiles')
    .select('role, company_id, email').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'master') return new Response('Forbidden', { status: 403 })

  let requested: string | undefined
  try { requested = (await req.json())?.companyId } catch { /* no body */ }
  const companyId = profile.role === 'master' && requested ? requested : profile.company_id
  if (!companyId) return json({ ok: false, reason: 'no_company' })

  const { data: company } = await supabase.from('companies')
    .select('alert_recipients').eq('id', companyId).single()
  const configured = (company?.alert_recipients ?? []).filter(Boolean)
  const to = configured.length ? configured : (profile.email ? [profile.email] : [])
  if (to.length === 0) return json({ ok: false, reason: 'no_recipient' })

  const res = await fetch(`${SUPABASE_URL}/functions/v1/daily-alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(CRON_SECRET ? { 'x-cron-secret': CRON_SECRET } : {}) },
    body: JSON.stringify({ companyId, to }),
  })
  if (!res.ok) { console.error('daily-alerts returned', res.status); return json({ ok: false, reason: 'send_failed' }) }

  const out = await res.json().catch(() => ({}))
  return json({ ok: out.ok !== false, alerts_sent: out.alerts_sent ?? 0, reason: out.reason })
})
