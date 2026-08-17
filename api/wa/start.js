// POST /api/wa/start — dashboard "New conversation" and "Restart conversation".
//
// Opens a thread from our side. Meta only allows free-form text inside the
// 24-hour customer service window, and that window opens when the *lead* writes
// to us. So:
//   - a number that has never written  → approved template
//   - a restart inside the window      → plain text, no template needed
//   - a restart outside the window     → approved template again
// Everything after the opening is ordinary text handled by the webhook.

import { sendTemplate, sendText, normalisePhone, isE164 } from '../_lib/whatsapp.js'
import { logMessage } from '../_lib/crm.js'
import { OPENING_MESSAGE } from '../_lib/conversation-script.js'
import { serviceClient, LEADS, MESSAGES } from '../_lib/supabase.js'
import { syncLead } from '../_lib/monday.js'
import { requireMaster } from '../_lib/auth.js'

const WINDOW_MS = 24 * 60 * 60 * 1000

/** Is Meta's customer service window still open for this lead? */
export function windowOpen(lastInboundAt, now = Date.now()) {
  if (!lastInboundAt) return false
  const t = new Date(lastInboundAt).getTime()
  return Number.isFinite(t) && now - t < WINDOW_MS
}

/**
 * Fields a restart clears. Qualification answers belong to the conversation
 * that collected them; keeping them would make the agent skip questions it has
 * not actually asked this time round.
 */
const RESET_FIELDS = {
  role: null, fleet_size: null, fleet_size_raw: null,
  current_management: null, existing_system: null,
  main_pain: null, why_now: null,
  meeting_at: null, meeting_url: null,
  open_questions: [], ai_summary: null,
  bot_paused: false, followup_count: 0, last_followup_at: null,
  processing_until: null,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = await requireMaster(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, reason: auth.reason })

  const phone = normalisePhone(req.body?.phone)
  const restart = req.body?.restart === true

  if (!isE164(phone)) return res.status(400).json({ ok: false, reason: 'bad_phone' })

  try {
    const db = serviceClient()

    const { data: existing, error: lookupErr } = await db
      .from(LEADS).select('*').eq('phone', phone).maybeSingle()
    if (lookupErr) throw new Error(lookupErr.message)

    // A restart keeps the name already on file; a new conversation needs one.
    const firstName = String(req.body?.firstName || existing?.first_name || '').trim()

    if (existing) {
      // A lead who asked to be left alone is never messaged again, restart or not.
      if (existing.opted_out) return res.status(409).json({ ok: false, reason: 'opted_out' })

      if (!restart) {
        const { count } = await db
          .from(MESSAGES).select('id', { count: 'exact', head: true }).eq('phone', phone)
        if ((count ?? 0) > 0) {
          return res.status(409).json({ ok: false, reason: 'already_exists', phone })
        }
      }
    } else if (restart) {
      return res.status(404).json({ ok: false, reason: 'no_such_lead' })
    }

    // Inside the window a plain message is allowed, which means a restart works
    // even before the opening template has been approved.
    const canSendText = restart && windowOpen(existing?.last_inbound_at)
    const body = OPENING_MESSAGE(firstName)

    if (!canSendText && !firstName) {
      // The template personalises by name and Meta rejects an empty parameter.
      return res.status(400).json({ ok: false, reason: 'name_required' })
    }

    const sent = canSendText
      ? await sendText(phone, body)
      : await sendTemplate(phone, { params: [firstName] })

    if (!sent.ok) return res.status(502).json({ ok: false, reason: sent.error ?? 'send_failed' })

    // Written only after Meta accepted the message, so a failed send never
    // leaves a phantom conversation — or wipes a real one.
    const startedAt = new Date().toISOString()
    const { data: lead, error: upsertErr } = await db
      .from(LEADS)
      .upsert({
        ...(restart ? RESET_FIELDS : {}),
        phone,
        first_name: firstName || null,
        stage: 'OPENING',
        status: 'נשלחה הודעת פתיחה',
        followup_count: 0,
        // Older messages stay in wab_messages for the audit trail; the agent
        // simply cannot see past this line.
        conversation_started_at: startedAt,
        // Anchors the follow-up ladder to the opening we just sent.
        last_followup_at: startedAt,
      }, { onConflict: 'phone' })
      .select()
      .single()
    if (upsertErr) throw new Error(upsertErr.message)

    // Log the rendered text, not the template name: the dashboard thread should
    // read as the lead sees it.
    await logMessage({
      phone, direction: 'outbound', body,
      waMessageId: sent.id, stage: 'OPENING', intent: null,
    })

    const synced = await syncLead(lead)
    if (!synced.ok && synced.reason !== 'monday_not_configured') {
      console.error('monday sync skipped', synced.reason)
    }

    return res.status(200).json({ ok: true, phone, restarted: restart })
  } catch (err) {
    console.error('POST /api/wa/start failed', err instanceof Error ? err.message : 'unknown')
    return res.status(500).json({ ok: false, reason: 'server_error' })
  }
}
