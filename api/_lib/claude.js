import Anthropic from '@anthropic-ai/sdk'
import { INTENT_VALUES, isIntent } from './intents.js'
import { isStage } from './conversation-state.js'

/**
 * @typedef {object} AgentExtracted
 * @property {string|null} first_name
 * @property {string|null} company
 * @property {string|null} role
 * @property {number|null} fleet_size
 * @property {'excel'|'system'|'mixed'|'none'|null} current_management
 * @property {string|null} existing_system
 * @property {string|null} main_pain
 * @property {string|null} why_now
 * @property {string|null} email
 */

/**
 * @typedef {object} AgentResponse
 * @property {string} reply
 * @property {import('./intents.js').Intent} intent
 * @property {import('./conversation-state.js').Stage} next_stage
 * @property {AgentExtracted} extracted
 * @property {string|null} open_question
 * @property {boolean} requires_human
 * @property {boolean} conversation_complete
 * @property {string|null} selected_slot  ISO start time the lead explicitly confirmed
 */

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'
const MAX_TOKENS = 700
const TIMEOUT_MS = 25000

const EMPTY_EXTRACTED = {
  first_name: null, company: null, role: null, fleet_size: null,
  current_management: null, existing_system: null, main_pain: null,
  why_now: null, email: null,
}

const MANAGEMENT_VALUES = ['excel', 'system', 'mixed', 'none']

let sdk = null
function client() {
  if (sdk) return sdk
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  sdk = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 0 })
  return sdk
}

/** Strip markdown fences and any preamble/postamble around the JSON object. */
function extractJson(raw) {
  let s = String(raw || '').trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return s.slice(start, end + 1)
}

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** @param {unknown} raw @returns {AgentExtracted} */
function coerceExtracted(raw) {
  const e = raw && typeof raw === 'object' ? raw : {}
  let fleet = null
  if (typeof e.fleet_size === 'number' && Number.isFinite(e.fleet_size)) fleet = Math.round(e.fleet_size)
  else if (typeof e.fleet_size === 'string') {
    const n = parseInt(e.fleet_size.replace(/[^\d]/g, ''), 10)
    if (Number.isFinite(n)) fleet = n
  }
  if (fleet != null && (fleet < 0 || fleet > 1000000)) fleet = null

  const mgmt = typeof e.current_management === 'string' ? e.current_management.toLowerCase().trim() : null

  return {
    first_name: str(e.first_name),
    company: str(e.company),
    role: str(e.role),
    fleet_size: fleet,
    current_management: MANAGEMENT_VALUES.includes(mgmt) ? mgmt : null,
    existing_system: str(e.existing_system),
    main_pain: str(e.main_pain),
    why_now: str(e.why_now),
    email: str(e.email),
  }
}

/**
 * Runtime type guard + coercion. Returns null when the payload is unusable.
 * @param {unknown} parsed
 * @returns {AgentResponse|null}
 */
export function toAgentResponse(parsed) {
  if (!parsed || typeof parsed !== 'object') return null
  const reply = str(parsed.reply)
  if (!reply) return null

  return {
    reply,
    intent: isIntent(parsed.intent) ? parsed.intent : 'general',
    next_stage: isStage(parsed.next_stage) ? parsed.next_stage : 'OPENING',
    extracted: coerceExtracted(parsed.extracted),
    open_question: str(parsed.open_question),
    requires_human: parsed.requires_human === true,
    conversation_complete: parsed.conversation_complete === true,
    selected_slot: str(parsed.selected_slot),
  }
}

/**
 * One agent turn. Calls the Messages API, retries once on failure, and returns
 * either a validated AgentResponse or a typed failure the caller can fall back on.
 *
 * @param {object} args
 * @param {string} args.systemPrompt
 * @param {{ role: 'user'|'assistant', content: string }[]} args.messages  oldest first
 * @returns {Promise<{ ok: true, data: AgentResponse } | { ok: false, reason: string }>}
 */
export async function runAgent({ systemPrompt, messages }) {
  let lastReason = 'unknown'

  for (let attempt = 0; attempt < 2; attempt++) {
    let text = ''
    try {
      const res = await client().messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
      })
      text = res.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')
    } catch (err) {
      lastReason = err instanceof Error ? err.message : 'api_error'
      console.error(`agent api call failed (attempt ${attempt + 1})`, lastReason)
      continue
    }

    const json = extractJson(text)
    if (!json) {
      lastReason = 'no_json_in_response'
      console.error('agent returned no parsable JSON. raw:', text.slice(0, 800))
      continue
    }

    let parsed
    try {
      parsed = JSON.parse(json)
    } catch (err) {
      lastReason = 'json_parse_failed'
      console.error('agent JSON.parse failed:', err instanceof Error ? err.message : 'unknown', '| raw:', json.slice(0, 800))
      continue
    }

    const data = toAgentResponse(parsed)
    if (!data) {
      lastReason = 'schema_mismatch'
      console.error('agent response failed the type guard. raw:', json.slice(0, 800))
      continue
    }

    return { ok: true, data }
  }

  return { ok: false, reason: lastReason }
}

export { MODEL as AGENT_MODEL, EMPTY_EXTRACTED, INTENT_VALUES }
