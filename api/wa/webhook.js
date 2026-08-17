// WhatsApp Cloud API webhook.
//   GET  — Meta's subscription verification handshake
//   POST — inbound messages. Responds 200 straight away and runs the agent in
//          the background so a slow model call can never time the webhook out.

import { parseInbound, sendText, markRead } from '../_lib/whatsapp.js'
import {
  getOrCreateLead, mergeLead, logMessage, recentTurns,
  claimLead, releaseLead, latestInbound,
} from '../_lib/crm.js'
import { runAgent } from '../_lib/claude.js'
import { buildSystemPrompt } from '../_lib/system-prompt.js'
import { availability, splitSlotHe, bookSlot } from '../_lib/calendly.js'
import { isQualified, nextUnansweredStage } from '../_lib/conversation-state.js'
import { FALLBACK_MESSAGE, CALENDAR_ERROR_MESSAGE } from '../_lib/conversation-script.js'
import { serviceClient, LEADS, MESSAGES } from '../_lib/supabase.js'
import { syncLead } from '../_lib/monday.js'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Raw body is needed to verify Meta's X-Hub-Signature-256, so parse it ourselves.
//
// maxDuration is explicit because the reply is produced *after* the 200 goes
// back to Meta. That background work is still charged to this invocation, and
// on the default budget a slow turn is killed mid-flight — which loses the
// reply and leaves the lead's claim held until it expires.
export const config = { api: { bodyParser: false }, maxDuration: 60 }

// Stop draining before the runtime kills us, so the claim is always released
// and a half-finished turn never strands a conversation.
const TURN_BUDGET_MS = 40000

/** Stages where real calendar availability is worth fetching. */
const CALENDAR_STAGES = ['PROCESS_EXPLANATION', 'CALENDAR_OPTIONS', 'MEETING_CONFIRMATION']

/** Stages that mean the lead has actually been shown times to choose from. */
const BOOKING_STAGES = ['CALENDAR_OPTIONS', 'MEETING_CONFIRMATION', 'MEETING_BOOKED']

/** Run work after the response, without the runtime freezing the function. */
async function background(promise) {
  try {
    const { waitUntil } = await import('@vercel/functions')
    waitUntil(promise)
  } catch {
    await promise // local dev / non-Vercel runtime
  }
}

/** @param {import('http').IncomingMessage} req */
async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

/**
 * Meta signs every webhook delivery with the app secret. Verified when
 * WHATSAPP_APP_SECRET is set; skipped (with a warning) when it is not.
 * @param {Buffer} raw
 * @param {string|undefined} header
 */
function signatureValid(raw, header) {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) return true
  if (typeof header !== 'string' || !header.startsWith('sha256=')) return false

  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`)
  const received = Buffer.from(header)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export default async function handler(req, res) {
  if (req.method === 'GET') return verify(req, res)
  if (req.method !== 'POST') return res.status(405).end()

  let inbound = null
  try {
    const raw = await readRawBody(req)
    if (!signatureValid(raw, req.headers['x-hub-signature-256'])) {
      console.error('webhook signature rejected')
      return res.status(401).end()
    }
    inbound = parseInbound(JSON.parse(raw.toString('utf8') || '{}'))
  } catch (err) {
    console.error('webhook parse failed', err instanceof Error ? err.message : 'unknown')
  }

  // Status callbacks, reactions, media — acknowledge and drop.
  if (!inbound) return res.status(200).json({ ok: true, skipped: true })

  res.status(200).json({ ok: true })
  await background(handleInbound(inbound))
}

function verify(req, res) {
  // Read from the URL directly so this works whether or not the runtime
  // populated req.query (body parsing is disabled on this route).
  const url = new URL(req.url ?? '', 'http://localhost')
  const q = (k) => req.query?.[k] ?? url.searchParams.get(k)

  const mode = q('hub.mode')
  const token = q('hub.verify_token')
  const challenge = q('hub.challenge')

  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  if (!expected) {
    console.error('WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set')
    return res.status(500).end()
  }
  if (mode === 'subscribe' && token === expected) {
    res.setHeader('Content-Type', 'text/plain')
    return res.status(200).send(String(challenge ?? ''))
  }
  return res.status(403).end()
}

/**
 * @param {{ waMessageId: string, phone: string, profileName: string|null, text: string }} inbound
 */
async function handleInbound(inbound) {
  const { waMessageId, phone, profileName, text } = inbound

  const seed = await getOrCreateLead(phone, { firstName: profileName })

  // Dedupe + log in one step: the unique index on wa_message_id rejects replays.
  const isNew = await logMessage({
    phone, direction: 'inbound', body: text,
    waMessageId, stage: seed.stage, intent: null,
  })
  if (!isNew) return

  await markRead(waMessageId)

  // Only one run may hold a lead at a time. A loser exits here: its message is
  // already logged, and the holder re-checks for new messages before finishing,
  // so nothing is dropped — it is answered by whichever run is still awake.
  //
  // Logged rather than silent: if the holder ever dies mid-turn this is the
  // only trace that a message went unanswered.
  if (!(await claimLead(phone))) {
    console.error('lead busy, leaving this message to the run that holds it', phone, waMessageId)
    return
  }

  const deadline = Date.now() + TURN_BUDGET_MS

  try {
    // Answer everything that has arrived, including messages that land while
    // the model is thinking. Bounded twice over: by turns, so a fast typist
    // cannot spin this forever, and by wall clock, so we stop while there is
    // still time to release the claim.
    let pending = text
    for (let turn = 0; turn < 3; turn++) {
      const handled = await respond(phone, pending)
      if (!handled.continue) break
      if (Date.now() > deadline) {
        // Whatever arrived late is answered by the next inbound message, which
        // sees it in the history — better than being killed holding the claim.
        console.error('drain budget spent, leaving the rest to the next message', phone)
        break
      }
      pending = handled.next ?? pending
    }
  } catch (err) {
    console.error('webhook processing failed', err instanceof Error ? err.message : 'unknown')
    try {
      await deliver({ phone, body: FALLBACK_MESSAGE, stage: null, intent: null })
    } catch (sendErr) {
      console.error('fallback send failed', sendErr instanceof Error ? sendErr.message : 'unknown')
    }
  } finally {
    await releaseLead(phone)
  }
}

/**
 * One agent turn against the lead's current state.
 * @param {string} phone
 * @param {string} text  the message that triggered this run, for context only
 * @returns {Promise<{ continue: boolean, next?: string }>} whether newer input
 *   arrived meanwhile, and what it said
 */
async function respond(phone, text) {
  const startedAt = new Date().toISOString()

  const lead = await getOrCreateLead(phone)

  // Spec step 5: a paused or opted-out lead is logged and left alone.
  if (lead.bot_paused || lead.opted_out) return { continue: false }

  const history = await recentTurns(phone, 6, lead.conversation_started_at)

  // The current message is already logged, so it is the last history entry.
  const messages = history.length ? history : [{ role: 'user', content: text }]

  const wantsCalendar = CALENDAR_STAGES.includes(lead.stage) || isQualified(lead)
  let calendar = { ok: false, reason: 'not_requested', slots: [], suggested: [] }
  if (wantsCalendar) calendar = await availability({ days: 14, suggest: 3 })

  const systemPrompt = buildSystemPrompt({
    lead,
    slots: calendar.ok ? calendar.slots : [],
    suggested: calendar.ok ? calendar.suggested : [],
    meetingMinutes: calendar.ok ? calendar.duration : undefined,
    meetingKind: calendar.ok ? calendar.kind : undefined,
  })

  const result = await runAgent({ systemPrompt, messages })

  if (!result.ok) {
    await deliver({ phone, body: FALLBACK_MESSAGE, stage: lead.stage, intent: null })
    return { continue: false }
  }

  const agent = result.data
  let reply = agent.reply
  let stage = agent.next_stage
  let meetingAt = null
  let meetingUrl = null
  let pendingMeetingAt = null

  // Calendly was needed but unreachable — say so honestly, hand to a human.
  if (wantsCalendar && !calendar.ok && calendar.reason !== 'not_requested' &&
      ['CALENDAR_OPTIONS', 'MEETING_CONFIRMATION', 'MEETING_BOOKED'].includes(stage)) {
    reply = CALENDAR_ERROR_MESSAGE
    stage = 'HUMAN_HANDOFF'
    agent.requires_human = true
  }

  // A meeting is only ever written after the lead confirmed a slot that is
  // still genuinely available.
  if (stage === 'MEETING_BOOKED') {
    // Match on the local-time key the agent was given. Accept a raw ISO too,
    // in case the model echoes the underlying timestamp instead.
    const wanted = agent.selected_slot?.trim()
    const chosen = calendar.ok && wanted
      ? calendar.slots.find((s) => s.key === wanted || s.start === wanted)
      : null

    const rebooking = lead.meeting_at && chosen && chosen.start !== lead.meeting_at
    const confirmedThisTurn = lead.stage === 'MEETING_CONFIRMATION'

    // Did this lead ever actually get as far as picking a time? A lead who
    // merely *mentions* a meeting ("I can't find our meeting") is not booking
    // one, and the model sometimes reads that as MEETING_BOOKED on the very
    // first message.
    const wasOfferedSlots = BOOKING_STAGES.includes(lead.stage) || Boolean(lead.meeting_at)

    if (!wanted && !wasOfferedSlots) {
      // Nothing was ever offered and nothing was chosen, so there is no booking
      // to verify and — crucially — no slot to tell them they have lost. Keep
      // the model's own reply and put the stage back where the script is.
      console.error('ignored an unbacked MEETING_BOOKED', phone, 'stage was', lead.stage)
      stage = nextUnansweredStage(lead)
    } else if (rebooking && !confirmedThisTurn) {
      // A booked meeting only moves through an explicit confirmation step.
      // Anything else is a stray message or a stale run, and must not silently
      // overwrite a time the lead already agreed to.
      console.error('refused to rebook without confirmation', phone)
      const { date, time } = splitSlotHe(lead.meeting_at)
      stage = 'MEETING_BOOKED'
      reply =
        `הפגישה שלנו כבר קבועה ל-${date} בשעה ${time} ✅\n` +
        `אם בא לך לשנות אותה, תגיד לי איזה יום ושעה מתאימים ואבדוק ביומן.`
    } else if (chosen) {
      const email = agent.extracted?.email || lead.email
      const { date, time } = splitSlotHe(chosen.start)

      if (!email) {
        // Calendly has nowhere to send the invite without an address, and
        // rejects the booking outright. Hold the agreed time so the next turn
        // can finish the job the moment they answer.
        pendingMeetingAt = chosen.start
        stage = 'MEETING_CONFIRMATION'
        reply =
          `מעולה, ${date} בשעה ${time} שמור לך 👍\n` +
          `רק צריך כתובת מייל כדי שאשלח לך את ההזמנה ליומן עם הקישור לשיחה. מה המייל שלך?`
      } else {
        const booked = await book({ startIso: chosen.start, email, lead, calendar, phone })
        reply = booked.reply
        meetingAt = booked.meetingAt
        meetingUrl = booked.meetingUrl
        stage = booked.stage
        pendingMeetingAt = booked.pendingMeetingAt
      }
    } else {
      // The model claimed a booking we cannot verify — do not fake it.
      const fresh = calendar.ok ? calendar : await availability({ days: 14, suggest: 3 })
      if (fresh.ok) {
        stage = 'CALENDAR_OPTIONS'
        reply =
          `רגע לפני שאני סוגר — המועד שבחרת כבר לא מופיע כפנוי אצלי ביומן, ואני לא רוצה לשמור לך שעה שלא באמת קיימת.\n` +
          `אלה המועדים הקרובים שפנויים:\n${fresh.suggested.map((s) => s.label).join('\n')}\n` +
          `איזה מהם מתאים לך?`
      } else {
        stage = 'HUMAN_HANDOFF'
        reply = CALENDAR_ERROR_MESSAGE
        agent.requires_human = true
      }
    }
  }

  // The lead agreed a time last turn and we were only waiting on their email.
  // Finish it here rather than making them confirm the same slot twice.
  if (lead.pending_meeting_at && !meetingAt && stage !== 'OPT_OUT' && stage !== 'HUMAN_HANDOFF') {
    const email = agent.extracted?.email || lead.email
    if (email) {
      const fresh = calendar.ok ? calendar : await availability({ days: 14, suggest: 3 })
      const still = fresh.ok
        ? fresh.slots.find((s) => s.start === lead.pending_meeting_at)
        : null

      if (still) {
        const booked = await book({ startIso: still.start, email, lead, calendar: fresh, phone })
        reply = booked.reply
        meetingAt = booked.meetingAt
        meetingUrl = booked.meetingUrl
        stage = booked.stage
        pendingMeetingAt = booked.pendingMeetingAt
      } else if (fresh.ok) {
        // Someone else took it while we were waiting for the address.
        pendingMeetingAt = null
        stage = 'CALENDAR_OPTIONS'
        reply =
          `תודה! רק שנייה לפני שאני סוגר — המועד ששמרנו כבר נתפס בינתיים.\n` +
          `אלה המועדים הקרובים שפנויים:\n${fresh.suggested.map((s) => s.label).join('\n')}\n` +
          `איזה מהם מתאים לך?`
      }
    }
  }

  const optedOut = agent.intent === 'opt_out' || stage === 'OPT_OUT'
  const requiresHuman = agent.requires_human || stage === 'HUMAN_HANDOFF'

  // Stamp the intent onto the newest inbound row now that we know it.
  const tagged = await latestInbound(phone)
  if (tagged?.wa_message_id) await tagInbound(tagged.wa_message_id, agent.intent, stage)

  const updated = await mergeLead(lead, agent.extracted, {
    stage,
    openQuestion: agent.open_question,
    requiresHuman,
    optedOut,
    fleetSizeRaw: agent.extracted.fleet_size != null ? text.slice(0, 300) : null,
    meetingAt,
  })

  // Written outside mergeLead because it must also be *cleared* — mergeLead
  // deliberately never overwrites a value with null.
  if (pendingMeetingAt !== lead.pending_meeting_at) {
    const { error } = await serviceClient()
      .from(LEADS).update({ pending_meeting_at: pendingMeetingAt }).eq('phone', phone)
    if (error) console.error('pending slot write failed', error.message)
  }

  if (meetingUrl) {
    await serviceClient().from(LEADS).update({ meeting_url: meetingUrl }).eq('phone', phone)
  }

  // Intent belongs to the inbound message (data model); outbound rows leave it null.
  await deliver({ phone, body: reply, stage: updated.stage, intent: null })

  // Mirror onto the Monday CRM board. Deliberately last and deliberately
  // swallowed — the lead already has their reply, and no CRM problem is worth
  // failing a conversation over.
  const synced = await syncLead(meetingUrl ? { ...updated, meeting_url: meetingUrl } : updated)
  if (!synced.ok && synced.reason !== 'monday_not_configured') {
    console.error('monday sync skipped', synced.reason)
  }

  // Did anything land while we were thinking? If so, answer that too rather
  // than leaving the lead waiting for a reply that will never come.
  const newest = await latestInbound(phone)
  if (newest && newest.created_at > startedAt) {
    return { continue: true, next: newest.body || text }
  }
  return { continue: false }
}

/**
 * Put the meeting in the calendar for real.
 *
 * Calendly's booking API does the whole thing server-side, so the lead gets a
 * calendar invite instead of homework. If it refuses — plan restrictions, the
 * slot going in the last few seconds, anything — we fall back to the single-use
 * scheduling link, which is how this worked before and still gets them booked.
 *
 * @param {{ startIso: string, email: string, lead: Record<string, unknown>, calendar: any, phone: string }} args
 */
async function book({ startIso, email, lead, calendar, phone }) {
  const { date, time } = splitSlotHe(startIso)
  const kind = calendar?.kind || 'שיחה'
  const name = [lead.first_name, lead.company].filter(Boolean).join(' ') || String(lead.phone)

  const res = await bookSlot({ startIso, email, name })

  if (res.ok) {
    return {
      stage: 'MEETING_BOOKED',
      meetingAt: startIso,
      meetingUrl: res.rescheduleUrl || res.cancelUrl,
      pendingMeetingAt: null,
      reply:
        `קבעתי — נתראה ב-${date} בשעה ${time} ✅\n` +
        `📞 אופן השיחה: ${kind}\n` +
        `שלחתי הזמנה ל-${email} עם הקישור לשיחה, והיא כבר ביומן שלנו.\n` +
        `אם משהו משתנה, פשוט תכתוב לי כאן ואשנה.`,
    }
  }

  console.error('booking fell back to a scheduling link', phone, res.reason)

  const slot = calendar?.ok ? calendar.slots.find((s) => s.start === startIso) : null
  const link = slot?.schedulingUrl
  if (!link) {
    return {
      stage: 'HUMAN_HANDOFF',
      meetingAt: null, meetingUrl: null, pendingMeetingAt: null,
      reply: CALENDAR_ERROR_MESSAGE,
    }
  }

  return {
    stage: 'MEETING_BOOKED',
    meetingAt: startIso,
    meetingUrl: link,
    pendingMeetingAt: null,
    reply:
      `מעולה, שמרתי לך את המועד ✅\n` +
      `📅 תאריך: ${date}\n🕐 שעה: ${time}\n📞 אופן השיחה: ${kind}\n` +
      `רק נשאר לאשר בקישור הזה כדי שההזמנה תיכנס ליומן שלך: ${link}\n` +
      `אם משהו משתנה, אפשר לכתוב לי כאן.`,
  }
}

/** Log then send, so an outbound message is recorded even if WhatsApp rejects it. */
async function deliver({ phone, body, stage, intent }) {
  const sent = await sendText(phone, body)
  await logMessage({
    phone, direction: 'outbound', body,
    waMessageId: sent.id, stage, intent,
  })
  if (!sent.ok) console.error('outbound not delivered', sent.error)
}

async function tagInbound(waMessageId, intent, stage) {
  const { error } = await serviceClient()
    .from(MESSAGES)
    .update({ intent, stage })
    .eq('wa_message_id', waMessageId)
  if (error) console.error('intent tag failed', error.message)
}
