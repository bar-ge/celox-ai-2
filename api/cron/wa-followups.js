// GET /api/cron/wa-followups — hourly. Spec section 20.
// Sends at most three follow-ups per lead, only inside SUN–THU 09:00–17:00
// Asia/Jerusalem, each resuming the question the lead never answered.

import { serviceClient, LEADS, MESSAGES } from '../_lib/supabase.js'
import { sendText } from '../_lib/whatsapp.js'
import { logMessage } from '../_lib/crm.js'
import { followupDue, followupMessage, withinBusinessHours, MAX_FOLLOWUPS } from '../_lib/followups.js'
import { isCronRequest, requireMaster } from '../_lib/auth.js'

const BATCH = 40

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()

  // Vercel Cron authenticates with CRON_SECRET; a human can trigger it as master.
  if (!isCronRequest(req)) {
    const auth = await requireMaster(req)
    if (!auth.ok) return res.status(auth.status).json({ ok: false, reason: auth.reason })
  }

  const now = new Date()
  if (!withinBusinessHours(now)) {
    return res.status(200).json({ ok: true, skipped: 'outside_business_hours', sent: 0 })
  }

  try {
    const db = serviceClient()

    const { data: leads, error } = await db
      .from(LEADS)
      .select('*')
      .eq('bot_paused', false)
      .eq('opted_out', false)
      .is('meeting_at', null)
      .lt('followup_count', MAX_FOLLOWUPS)
      .order('last_inbound_at', { ascending: true, nullsFirst: true })
      .limit(200)

    if (error) throw new Error(error.message)

    const results = []
    for (const lead of leads ?? []) {
      if (results.length >= BATCH) break

      const check = followupDue(lead, now)
      if (!check.due) continue

      // Only chase a lead whose last message was ours — never talk over an
      // inbound message the webhook is still processing.
      const { data: last } = await db
        .from(MESSAGES)
        .select('direction')
        .eq('phone', lead.phone)
        .order('created_at', { ascending: false })
        .limit(1)
      if (last?.[0]?.direction !== 'outbound') continue

      const body = followupMessage(lead, /** @type {1|2|3} */ (check.number))
      const sent = await sendText(lead.phone, body)

      await logMessage({
        phone: lead.phone, direction: 'outbound', body,
        waMessageId: sent.id, stage: lead.stage, intent: null,
      })

      /** @type {Record<string, unknown>} */
      const patch = { followup_count: check.number, last_followup_at: now.toISOString() }
      if (check.number === MAX_FOLLOWUPS) patch.status = 'לא הגיב'

      await db.from(LEADS).update(patch).eq('phone', lead.phone)
      results.push({ phone: lead.phone, followup: check.number, delivered: sent.ok })
    }

    return res.status(200).json({ ok: true, sent: results.length, results })
  } catch (err) {
    console.error('cron wa-followups failed', err instanceof Error ? err.message : 'unknown')
    return res.status(500).json({ ok: false, reason: 'server_error' })
  }
}
