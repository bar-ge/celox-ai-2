// Protected test-chat endpoint — TCEL, added 2026-09-28.
//
// Bar's ask: before reporting a WhatsApp-bot fix as verified, actually run a
// scripted conversation through the bot like a real customer would, instead
// of relying on Bar to test manually every time. The obstacle: there is no
// way to send a real WhatsApp message from here (no WhatsApp client, no
// phone), and the real webhook (api/wa/webhook.js) requires Meta's
// X-Hub-Signature-256, which only Meta (or someone holding
// WHATSAPP_APP_SECRET) can produce.
//
// This route sidesteps both by calling handleInbound() directly — the exact
// same function the real webhook calls after verifying Meta's signature, so
// every downstream step (claim/release, the agent, calendar availability,
// real booking, CRM writes, Monday sync, alerts) runs for real. It just
// swaps "a signed Meta payload" for "a shared secret" as the door in, and
// synchronously hands back the bot's reply instead of making the caller poll
// Supabase for it.
//
// Locked down two ways, since a route that can push messages into the real
// conversation pipeline is worth protecting even though it doesn't touch
// WhatsApp itself:
//   1. WA_TEST_SIMULATE_SECRET (Bar sets it in Vercel, same pattern as every
//      other secret in this app) — fails closed if unset, same as the real
//      webhook's signature check.
//   2. The phone number is never taken from the caller — it's always the
//      fixed WA_TEST_PHONE — so a leaked secret can, at worst, mess with a
//      lead that was never real to begin with, never an actual lead's
//      conversation.
//
// action: "check_reminders" (added 2026-09-29) runs the wa-meeting-reminders
// cron's own per-lead check against just the test lead — see
// checkTestReminder() below.

import { handleInbound } from './webhook.js'
import { serviceClient, LEADS, MESSAGES } from '../_lib/supabase.js'
import { sendText } from '../_lib/whatsapp.js'
import { logMessage } from '../_lib/crm.js'
import { reminderMessage, reminderDue } from '../_lib/reminders.js'

export const config = { maxDuration: 60 }

const TEST_PHONE = process.env.WA_TEST_PHONE || '+972500000001'

function authorized(req) {
  const secret = process.env.WA_TEST_SIMULATE_SECRET
  if (!secret) return false
  const header = req.headers?.authorization
  return typeof header === 'string' && header === `Bearer ${secret}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!authorized(req)) {
    console.error('wa simulate: rejected — missing/wrong secret, or WA_TEST_SIMULATE_SECRET unset')
    return res.status(401).json({ ok: false, reason: 'unauthorized' })
  }

  const { action, text } = req.body ?? {}

  if (action === 'reset') {
    const cleared = await resetTestLead()
    return res.status(200).json({ ok: true, cleared })
  }

  if (action === 'check_reminders') {
    const result = await checkTestReminder()
    return res.status(200).json({ ok: true, result })
  }

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ ok: false, reason: 'missing_text' })
  }

  const waMessageId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  try {
    await handleInbound({ waMessageId, phone: TEST_PHONE, profileName: 'בדיקה אוטומטית', text })
  } catch (err) {
    console.error('wa simulate: handleInbound threw', err instanceof Error ? err.message : 'unknown')
    return res.status(500).json({ ok: false, reason: 'agent_error' })
  }

  const db = serviceClient()

  const { data: lastOutbound } = await db
    .from(MESSAGES)
    .select('body, stage, intent, created_at')
    .eq('phone', TEST_PHONE)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: lead } = await db
    .from(LEADS)
    .select('stage, role, fleet_size, fleet_size_raw, current_management, email, meeting_at, meeting_url')
    .eq('phone', TEST_PHONE)
    .maybeSingle()

  return res.status(200).json({
    ok: true,
    reply: lastOutbound?.body ?? null,
    stage: lastOutbound?.stage ?? null,
    intent: lastOutbound?.intent ?? null,
    lead,
  })
}

/**
 * Clears the test lead and its message history so a fresh simulated
 * conversation starts with no leftover state (exactly the class of staleness
 * bug fixed elsewhere today — a test harness inheriting a stale MEETING_BOOKED
 * from its own previous run would be testing nothing).
 *
 * Does not touch Google Calendar: a completed test run that books a real
 * slot leaves a real event behind. That's a deliberate trade-off, not an
 * oversight — see the docstring at the top of this file. Running a full
 * booking test repeatedly will eat into the real 3-per-day cap, so use it
 * deliberately, not on every check.
 */
async function resetTestLead() {
  const db = serviceClient()
  const { data: existed } = await db.from(LEADS).select('phone').eq('phone', TEST_PHONE).maybeSingle()
  await db.from(MESSAGES).delete().eq('phone', TEST_PHONE)
  await db.from(LEADS).delete().eq('phone', TEST_PHONE)
  return Boolean(existed)
}

/**
 * Runs the exact same per-lead check the wa-meeting-reminders cron does
 * (reminderDue → reminderMessage → sendText → logMessage → stamp the flag),
 * scoped to the fixed test lead only, on demand.
 *
 * Added 2026-09-29 so "did the reminder actually go out" doesn't have to
 * wait for a real meeting to drift into the 24h/1h window and the cron to
 * happen to run — bump the test lead's meeting_at into that window with a
 * direct DB edit, then call this. Same secret gate and same fixed-phone
 * guarantee as the rest of this file, so it carries no more risk than the
 * booking flow above already does.
 */
async function checkTestReminder() {
  const db = serviceClient()
  const { data: lead } = await db
    .from(LEADS)
    .select('phone, meeting_at, meeting_url, reminder_24h_sent_at, reminder_1h_sent_at, bot_paused, opted_out')
    .eq('phone', TEST_PHONE)
    .maybeSingle()

  if (!lead) return { checked: false, reason: 'no_test_lead' }

  const check = reminderDue(lead, new Date())
  if (!check.due) return { checked: true, due: false, lead }

  const body = reminderMessage(lead)
  const sent = await sendText(lead.phone, body)

  await logMessage({
    phone: lead.phone, direction: 'outbound', body,
    waMessageId: sent.id, stage: 'MEETING_BOOKED', intent: null,
  })

  const patch = check.kind === '24h'
    ? { reminder_24h_sent_at: new Date().toISOString() }
    : { reminder_1h_sent_at: new Date().toISOString() }
  await db.from(LEADS).update(patch).eq('phone', TEST_PHONE)

  return { checked: true, due: true, kind: check.kind, delivered: sent.ok, body }
}
