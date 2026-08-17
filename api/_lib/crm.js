import { serviceClient, LEADS, MESSAGES } from './supabase.js'
import { deriveStatus, isStage, isStatus } from './conversation-state.js'

/** Fields the agent may fill in on a lead. Never overwritten with null. */
const MERGEABLE = [
  'first_name', 'company', 'role', 'fleet_size', 'fleet_size_raw',
  'current_management', 'existing_system', 'main_pain', 'why_now', 'email',
]

/**
 * Load a lead, creating it if this is the first time we've seen the number.
 * @param {string} phone E.164
 * @param {{ firstName?: string|null }} [seed]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getOrCreateLead(phone, seed = {}) {
  const db = serviceClient()

  const { data: existing, error } = await db.from(LEADS).select('*').eq('phone', phone).maybeSingle()
  if (error) throw new Error(`lead lookup failed: ${error.message}`)
  if (existing) {
    // Backfill a name we didn't have before, without touching anything else.
    if (!existing.first_name && seed.firstName) {
      const { data } = await db.from(LEADS).update({ first_name: seed.firstName }).eq('phone', phone).select().single()
      return data ?? existing
    }
    return existing
  }

  const { data, error: insertErr } = await db
    .from(LEADS)
    .insert({ phone, first_name: seed.firstName ?? null, stage: 'OPENING', status: 'ליד חדש' })
    .select()
    .single()

  if (insertErr) {
    // Racing webhooks can both miss the select; re-read rather than fail the turn.
    const { data: raced } = await db.from(LEADS).select('*').eq('phone', phone).maybeSingle()
    if (raced) return raced
    throw new Error(`lead insert failed: ${insertErr.message}`)
  }
  return data
}

/**
 * Merge extracted fields into a lead. A null from the agent means "learned
 * nothing this turn" and never clears an existing value (spec: AI CALL CONTRACT).
 *
 * @param {Record<string, unknown>} lead        current row
 * @param {Partial<Record<string, unknown>>} extracted
 * @param {object} opts
 * @param {string} opts.stage
 * @param {string|null} [opts.openQuestion]
 * @param {boolean} [opts.requiresHuman]
 * @param {boolean} [opts.optedOut]
 * @param {string|null} [opts.fleetSizeRaw]     the lead's own wording, when they answered fleet size
 * @param {string|null} [opts.meetingAt]        ISO timestamp, only once confirmed
 * @param {string|null} [opts.aiSummary]
 * @returns {Promise<Record<string, unknown>>}  the updated row
 */
export async function mergeLead(lead, extracted, opts) {
  const db = serviceClient()
  /** @type {Record<string, unknown>} */
  const patch = {}

  for (const field of MERGEABLE) {
    const incoming = extracted?.[field]
    if (incoming === null || incoming === undefined || incoming === '') continue
    if (lead[field] !== null && lead[field] !== undefined && lead[field] !== '') continue
    patch[field] = incoming
  }

  // fleet_size_raw records how the lead actually phrased it, even when we also
  // parsed a number, and even if a number was already stored.
  if (opts.fleetSizeRaw && !lead.fleet_size_raw) patch.fleet_size_raw = opts.fleetSizeRaw

  if (isStage(opts.stage)) patch.stage = opts.stage
  patch.last_inbound_at = new Date().toISOString()
  patch.followup_count = 0        // any inbound message resets the follow-up ladder
  patch.last_followup_at = null

  if (opts.openQuestion) {
    const current = Array.isArray(lead.open_questions) ? lead.open_questions : []
    if (!current.includes(opts.openQuestion)) patch.open_questions = [...current, opts.openQuestion]
  }

  if (opts.requiresHuman) patch.bot_paused = true
  if (opts.optedOut) { patch.opted_out = true; patch.bot_paused = true }
  if (opts.meetingAt) patch.meeting_at = opts.meetingAt
  if (opts.aiSummary) patch.ai_summary = opts.aiSummary

  const merged = { ...lead, ...patch }
  const status = deriveStatus(merged, {
    stage: patch.stage ?? lead.stage,
    hasInbound: true,
    requiresHuman: Boolean(opts.requiresHuman),
    optedOut: Boolean(opts.optedOut),
  })
  if (isStatus(status)) patch.status = status

  const { data, error } = await db.from(LEADS).update(patch).eq('phone', lead.phone).select().single()
  if (error) throw new Error(`lead update failed: ${error.message}`)
  return data
}

/**
 * Log a message. Returns false when the wa_message_id was already stored,
 * which is how inbound duplicates are dropped.
 *
 * @param {object} m
 * @param {string} m.phone
 * @param {'inbound'|'outbound'} m.direction
 * @param {string} m.body
 * @param {string|null} [m.waMessageId]
 * @param {string|null} [m.intent]
 * @param {string|null} [m.stage]
 * @returns {Promise<boolean>} true when a new row was written
 */
export async function logMessage(m) {
  const db = serviceClient()
  const { error } = await db.from(MESSAGES).insert({
    wa_message_id: m.waMessageId ?? null,
    phone: m.phone,
    direction: m.direction,
    body: m.body ?? '',
    intent: m.intent ?? null,
    stage: m.stage ?? null,
  })

  if (!error) return true
  if (error.code === '23505') return false // unique violation on wa_message_id — duplicate delivery
  throw new Error(`message insert failed: ${error.message}`)
}

/**
 * Recent conversation context for the model, oldest first.
 * @param {string} phone
 * @param {number} [limit]
 * @returns {Promise<{ role: 'user'|'assistant', content: string }[]>}
 */
export async function recentTurns(phone, limit = 6) {
  const db = serviceClient()
  const { data, error } = await db
    .from(MESSAGES)
    .select('direction, body, created_at')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`message history failed: ${error.message}`)

  const turns = (data ?? [])
    .reverse()
    .filter((r) => r.body)
    .map((r) => ({ role: r.direction === 'inbound' ? 'user' : 'assistant', content: r.body }))

  return normaliseTurns(turns)
}

/**
 * The Messages API needs the first turn to be `user` and roles to alternate.
 * A window of the last N rows can start mid-exchange or contain two messages
 * from the same side in a row, so trim and collapse before sending.
 *
 * @param {{ role: 'user'|'assistant', content: string }[]} turns
 * @returns {{ role: 'user'|'assistant', content: string }[]}
 */
export function normaliseTurns(turns) {
  const start = turns.findIndex((t) => t.role === 'user')
  if (start === -1) return []

  /** @type {{ role: 'user'|'assistant', content: string }[]} */
  const out = []
  for (const turn of turns.slice(start)) {
    const prev = out[out.length - 1]
    if (prev && prev.role === turn.role) prev.content += `\n${turn.content}`
    else out.push({ ...turn })
  }
  return out
}

/** How long a single webhook run may hold a lead before the claim goes stale. */
const CLAIM_TTL_MS = 45000

/**
 * Take exclusive ownership of a lead for the length of one turn.
 *
 * Two messages arriving a second apart produce two concurrent invocations for
 * the same phone. Without this they race: both read the same lead, both call the
 * model, both reply, and the later write silently overwrites the earlier one —
 * which is how a confirmed meeting can turn into a different meeting.
 *
 * The claim is a conditional update, so the database decides the winner. It
 * expires on its own, so a crashed run cannot wedge a lead permanently.
 *
 * @param {string} phone
 * @returns {Promise<boolean>} true if this run owns the lead
 */
export async function claimLead(phone) {
  const db = serviceClient()
  const now = new Date()
  const until = new Date(now.getTime() + CLAIM_TTL_MS).toISOString()

  const { data, error } = await db
    .from(LEADS)
    .update({ processing_until: until })
    .eq('phone', phone)
    .or(`processing_until.is.null,processing_until.lt.${now.toISOString()}`)
    .select('phone')

  if (error) {
    // Never block a conversation because the lock itself failed.
    console.error('claim failed, proceeding unserialised', error.message)
    return true
  }
  return (data?.length ?? 0) > 0
}

/** @param {string} phone */
export async function releaseLead(phone) {
  const { error } = await serviceClient()
    .from(LEADS).update({ processing_until: null }).eq('phone', phone)
  if (error) console.error('claim release failed', error.message)
}

/**
 * The most recent inbound message for a lead, used to spot messages that
 * arrived while this run was busy.
 * @param {string} phone
 * @returns {Promise<{ wa_message_id: string|null, created_at: string, body: string }|null>}
 */
export async function latestInbound(phone) {
  const { data, error } = await serviceClient()
    .from(MESSAGES)
    .select('wa_message_id, created_at, body')
    .eq('phone', phone)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) { console.error('latestInbound failed', error.message); return null }
  return data?.[0] ?? null
}

/**
 * Pause or resume the bot for a lead, and keep status in step.
 * @param {string} phone
 * @param {boolean} paused
 */
export async function setBotPaused(phone, paused) {
  const db = serviceClient()
  const patch = { bot_paused: paused }
  if (paused) patch.status = 'הועבר לנציג'
  const { data, error } = await db.from(LEADS).update(patch).eq('phone', phone).select().single()
  if (error) throw new Error(`pause toggle failed: ${error.message}`)
  return data
}

export { MERGEABLE }
