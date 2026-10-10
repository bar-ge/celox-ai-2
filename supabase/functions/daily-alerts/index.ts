import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { alertKey, buildEmail, type Alert } from './email.ts'

// Sends the daily alert email. Alerts themselves come from the SQL function
// company_expiry_alerts(), the same one the Alerts tab reads, so the email and
// the tab can no longer disagree.
//
//   cron  (no body)                          every company with email alerts on
//   manual { companyId, to? }                one company, ignores the 7-day de-dup
//                                            and the on/off switch. Called by
//                                            trigger-alerts ("Send now").

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const CRON_SECRET    = Deno.env.get('CRON_SECRET') ?? ''
const FROM_EMAIL     = 'Celox AI <noreply@celoxai.com>'
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL        = 'https://celoxai.com'

// Re-send the same alert only after 7 days
const RESEND_DAYS = 7

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (CRON_SECRET && req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set')
    return new Response('RESEND_API_KEY not configured', { status: 500 })
  }

  let body: { companyId?: string; to?: string[] } = {}
  try { body = await req.json() } catch { /* cron sends {} or nothing */ }
  const manual = typeof body.companyId === 'string' && body.companyId.length > 0

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const cutoffStr = new Date(today.getTime() - RESEND_DAYS * 86400000).toISOString()
  const twoDaysAgo = new Date(today.getTime() - 2 * 86400000).toISOString()

  let q = supabase.from('companies').select('id, name, email_lang, email_alerts_enabled, alert_recipients')
  q = manual ? q.eq('id', body.companyId!) : q.eq('email_alerts_enabled', true)
  const { data: companies, error: coErr } = await q
  if (coErr) { console.error('companies query failed:', coErr.message); return json({ ok: false, reason: 'companies_failed' }, 500) }
  if (!companies?.length) return json({ ok: true, emails_sent: 0, alerts_sent: 0, reason: manual ? 'no_such_company' : 'all_disabled' })

  const alreadyAlerted = new Set<string>()
  if (!manual) {
    const { data: recent } = await supabase.from('alert_history')
      .select('company_id, entity_type, entity_id').gt('last_alerted_at', cutoffStr)
    for (const h of recent ?? []) alreadyAlerted.add(`${h.company_id}:${h.entity_type}:${h.entity_id}`)
  }

  let emails_sent = 0
  let alerts_sent = 0
  const skipped_no_recipient: string[] = []
  const failed: string[] = []

  for (const c of companies) {
    const { data: all, error: rpcErr } = await supabase.rpc('company_expiry_alerts', { p_company: c.id })
    if (rpcErr) { console.error('company_expiry_alerts failed for', c.id, rpcErr.message); failed.push(c.name); continue }

    const fresh: Alert[] = ((all as Alert[]) ?? []).filter(a => manual || !alreadyAlerted.has(alertKey(c.id, a)))

    const { data: accidents } = await supabase.from('accident_reports')
      .select('id, incident_date, created_at, other_plate, other_driver_name, description')
      .eq('company_id', c.id).eq('status', 'open').lt('created_at', twoDaysAgo)

    if (fresh.length + (accidents?.length ?? 0) === 0) continue

    let recipients: string[] = manual && body.to?.length ? body.to : (c.alert_recipients ?? []).filter(Boolean)
    if (recipients.length === 0) {
      const { data: admins } = await supabase.from('profiles')
        .select('email').eq('company_id', c.id).eq('role', 'admin').limit(1)
      if (admins?.[0]?.email) recipients = [admins[0].email]
    }
    if (recipients.length === 0) {
      console.error('alerts due but no recipient for company', c.id, c.name)
      skipped_no_recipient.push(c.name)
      continue
    }

    const { subject, html, total } = buildEmail({
      alerts: fresh, accidents: accidents ?? [], isHe: (c.email_lang ?? 'he') === 'he',
      appUrl: APP_URL, todayStr, now: today,
    })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: recipients, subject, html }),
    })
    if (!res.ok) { console.error('Resend error for company', c.id, ':', (await res.text()).slice(0, 300)); failed.push(c.name); continue }

    emails_sent++
    alerts_sent += total
    if (fresh.length > 0) {
      const stamp = new Date().toISOString()
      await supabase.from('alert_history').upsert(
        fresh.map(a => ({ company_id: c.id, entity_type: a.type, entity_id: a.source_id, last_alerted_at: stamp })),
        { onConflict: 'company_id,entity_type,entity_id' },
      )
    }
  }

  return json({
    ok: failed.length === 0,
    emails_sent, alerts_sent, companies: companies.length,
    ...(skipped_no_recipient.length ? { skipped_no_recipient } : {}),
    ...(failed.length ? { failed } : {}),
    ...(manual && alerts_sent === 0 && !skipped_no_recipient.length && !failed.length ? { reason: 'nothing_due' } : {}),
    ...(manual && skipped_no_recipient.length ? { reason: 'no_recipient' } : {}),
  })
})
