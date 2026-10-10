// GET /api/cron/wa-meeting-reminders — every 15 minutes (Vercel Pro; the
// once-a-day cron on the free plan, api/cron/wa-followups.js, can't hit a
// 1-hour-precision window). Bar's spec (2026-09-29): two WhatsApp reminders
// per booked meeting, 24 hours before and 1 hour before.
//
// Each lead's meeting_at is a single fixed instant, so "24 hours before" and
// "1 hour before" are just two moments on that same timeline — this scans
// every lead with an upcoming meeting once per run and asks, for each one,
// "did we just cross either mark since the last run?" WINDOW_MS is wider
// than the cron interval on purpose, so one delayed or skipped run doesn't
// silently drop a reminder — reminder_24h_sent_at / reminder_1h_sent_at make
// re-checking a lead that already got one harmless rather than needing the
// window to be exact.
//
// Both flags are cleared by webhook.js the moment a lead's meeting_at
// changes (rebooked or newly booked) — see the comment there — so a
// reschedule always gets its own fresh pair of reminders instead of
// inheriting whichever flags happened to already be set.

import { serviceClient, LEADS } from '../_lib/supabase.js'
import { sendText } from '../_lib/whatsapp.js'
import { logMessage } from '../_lib/crm.js'
import { reminderMessage, reminderDue } from '../_lib/reminders.js'
import { isCronRequest, requireMaster } from '../_lib/auth.js'

const HOUR_MS = 60 * 60 * 1000
const BATCH = 100

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()

  // Vercel Cron authenticates with CRON_SECRET; a human can trigger it as master.
  if (!isCronRequest(req)) {
    const auth = await requireMaster(req)
    if (!auth.ok) return res.status(auth.status).json({ ok: false, reason: auth.reason })
  }

  const now = Date.now()

  try {
    const db = serviceClient()

    const { data: leads, error } = await db
      .from(LEADS)
      .select('phone, meeting_at, meeting_url, reminder_24h_sent_at, reminder_1h_sent_at, bot_paused, opted_out')
      .not('meeting_at', 'is', null)
      .eq('opted_out', false)
      .gt('meeting_at', new Date(now).toISOString())
      .lt('meeting_at', new Date(now + 25 * HOUR_MS).toISOString())
      .limit(BATCH)

    if (error) throw new Error(error.message)

    const results = []
    for (const lead of leads ?? []) {
      const check = reminderDue(lead, new Date(now))
      if (!check.due) continue

      const body = reminderMessage(lead)
      const sent = await sendText(lead.phone, body)

      await logMessage({
        phone: lead.phone, direction: 'outbound', body,
        waMessageId: sent.id, stage: 'MEETING_BOOKED', intent: null,
      })

      const patch = check.kind === '24h'
        ? { reminder_24h_sent_at: new Date(now).toISOString() }
        : { reminder_1h_sent_at: new Date(now).toISOString() }
      await db.from(LEADS).update(patch).eq('phone', lead.phone)

      results.push({ phone: lead.phone, kind: check.kind, delivered: sent.ok })
    }

    return res.status(200).json({ ok: true, sent: results.length, results })
  } catch (err) {
    console.error('cron wa-meeting-reminders failed', err instanceof Error ? err.message : 'unknown')
    return res.status(500).json({ ok: false, reason: 'server_error' })
  }
}
