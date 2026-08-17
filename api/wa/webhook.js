// WhatsApp Cloud API webhook.
//   GET  — Meta's subscription verification handshake
//   POST — inbound messages. Responds 200 straight away and runs the agent in
//          the background so a slow model call can never time the webhook out.

import { parseInbound, sendText, markRead } from '../_lib/whatsapp.js'
import { getOrCreateLead, mergeLead, logMessage, recentTurns } from '../_lib/crm.js'
import { runAgent } from '../_lib/claude.js'
import { buildSystemPrompt } from '../_lib/system-prompt.js'
import { availability, splitSlotHe } from '../_lib/calendly.js'
import { isQualified } from '../_lib/conversation-state.js'
import { FALLBACK_MESSAGE, CALENDAR_ERROR_MESSAGE } from '../_lib/conversation-script.js'
import { serviceClient, LEADS, MESSAGES } from '../_lib/supabase.js'
import { syncLead } from '../_lib/monday.js'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Raw body is needed to verify Meta's X-Hub-Signature-256, so parse it ourselves.
export const config = { api: { bodyParser: false } }

/** Stages where real calendar availability is worth fetching. */
const CALENDAR_STAGES = ['PROCESS_EXPLANATION', 'CALENDAR_OPTIONS', 'MEETING_CONFIRMATION']

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

  try {
    const lead = await getOrCreateLead(phone, { firstName: profileName })

    // Dedupe + log in one step: the unique index on wa_message_id rejects replays.
    const isNew = await logMessage({
      phone, direction: 'inbound', body: text,
      waMessageId, stage: lead.stage, intent: null,
    })
    if (!isNew) return

    await markRead(waMessageId)

    // Spec step 5: a paused or opted-out lead is logged and left alone.
    if (lead.bot_paused || lead.opted_out) return

    const history = await recentTurns(phone, 6)

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
      return
    }

    const agent = result.data
    let reply = agent.reply
    let stage = agent.next_stage
    let meetingAt = null
    let meetingUrl = null

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

      if (chosen) {
        meetingAt = chosen.start
        meetingUrl = chosen.schedulingUrl
        const { date, time } = splitSlotHe(chosen.start)
        reply =
          `מעולה, שמרתי לך את המועד ✅\n` +
          `📅 תאריך: ${date}\n🕐 שעה: ${time}\n📞 אופן השיחה: ${calendar.kind}\n` +
          `רק נשאר לאשר בקישור הזה כדי שההזמנה תיכנס ליומן שלך: ${chosen.schedulingUrl}\n` +
          `אם משהו משתנה, אפשר לכתוב לי כאן.`
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

    const optedOut = agent.intent === 'opt_out' || stage === 'OPT_OUT'
    const requiresHuman = agent.requires_human || stage === 'HUMAN_HANDOFF'

    // Stamp the intent onto the inbound row now that we know it.
    await tagInbound(waMessageId, agent.intent, stage)

    const updated = await mergeLead(lead, agent.extracted, {
      stage,
      openQuestion: agent.open_question,
      requiresHuman,
      optedOut,
      fleetSizeRaw: agent.extracted.fleet_size != null ? text.slice(0, 300) : null,
      meetingAt,
    })

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
  } catch (err) {
    console.error('webhook processing failed', err instanceof Error ? err.message : 'unknown')
    try {
      await deliver({ phone, body: FALLBACK_MESSAGE, stage: null, intent: null })
    } catch (sendErr) {
      console.error('fallback send failed', sendErr instanceof Error ? sendErr.message : 'unknown')
    }
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
