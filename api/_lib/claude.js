import { INTENT_VALUES, isIntent } from './intents.js'
import { isStage } from './conversation-state.js'
import { callOpenRouter, openRouterText, openRouterConfigured, DEFAULT_OPEN_ROUTER_MODEL } from './openrouter-llm.js'

// File kept as api/_lib/claude.js — every caller (webhook.js, the self-test
// suite, docs/whatsapp-agent.md) imports from this path, and this rename-in-
// spirit-only change is additive: `runAgent`'s signature and return shape
// are byte-for-byte the same as every vendor before this one, so nothing
// downstream needed to change.
//
// Vendor history, in order: Anthropic (401, key dead) → Mistral (403
// tier_not_allowed / 429 rate_limited) → NVIDIA NIM (404, account not
// entitled) → Anthropic again (worked, but two model-id retirements caused
// two more outages along the way — see git history on this file for the
// full trail if it's ever needed). Bar's call 2026-09-28: stop absorbing a
// new vendor integration every time one of these breaks or a model gets
// retired, and move to OpenRouter — one API, one key, hundreds of models
// behind an OpenAI-shaped endpoint, so a future model swap is an env var
// change in Vercel, not new code and a new outage. See
// api/_lib/openrouter-llm.js for the shared client (also now used by
// api/avatar/chat.js) and its own history/rationale comment.
//
// This also replaces the on-prem/Hugging-Face free pre-tiers that used to
// sit ahead of the cloud vendor here — Bar's explicit call was OpenRouter as
// the only cloud vendor for this surface, not one more tier in a ladder.
// api/_lib/onprem-llm.js and api/_lib/hf-llm.js are left in place (unused)
// rather than deleted, since deleting files needs sign-off per this repo's
// rule 1 and only the call sites here were asked about.

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

// Model id in OpenRouter's "org/model" shape. Bar picked
// meta-llama/llama-3.1-8b-instruct for this surface 2026-09-28; overridable
// from Vercel with no deploy, scoped with a WA_ prefix in case the avatar
// (api/avatar/chat.js) ever wants a different model tuned independently. No
// separate fallback model was specified, so it defaults to the same model —
// callOpenRouter still retries once before giving up, per its own comment.
const MODEL = process.env.WA_OPEN_ROUTER_MODEL || DEFAULT_OPEN_ROUTER_MODEL
const FALLBACK_MODEL = process.env.WA_OPEN_ROUTER_FALLBACK_MODEL || MODEL
export { MODEL as AGENT_MODEL }

const MAX_TOKENS = 700

const EMPTY_EXTRACTED = {
  first_name: null, company: null, role: null, fleet_size: null,
  current_management: null, existing_system: null, main_pain: null,
  why_now: null, email: null,
}

const MANAGEMENT_VALUES = ['excel', 'system', 'mixed', 'none']

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
 * One agent turn. Calls OpenRouter's chat completions endpoint (see
 * openrouter-llm.js for the retry/fallback-model shape), and returns either
 * a validated AgentResponse or a typed failure the caller can fall back on.
 * Signature and return shape unchanged from every vendor before this one —
 * see the file-level comment.
 *
 * @param {object} args
 * @param {string} args.systemPrompt
 * @param {{ role: 'user'|'assistant', content: string }[]} args.messages  oldest first
 * @returns {Promise<{ ok: true, data: AgentResponse } | { ok: false, reason: string }>}
 */
export async function runAgent({ systemPrompt, messages }) {
  if (!openRouterConfigured()) {
    console.error('agent api call failed: OPEN_ROUTER_KEY is not set')
    return { ok: false, reason: 'OPEN_ROUTER_KEY is not set' }
  }

  const { data, lastError } = await callOpenRouter({
    systemPrompt, messages, model: MODEL, fallbackModel: FALLBACK_MODEL, maxTokens: MAX_TOKENS, jsonMode: true,
  })

  if (!data) {
    console.error('agent api call failed', lastError)
    return { ok: false, reason: lastError ?? 'api_error' }
  }

  const text = openRouterText(data)

  const json = extractJson(text)
  if (!json) {
    console.error('agent returned no parsable JSON. raw:', String(text).slice(0, 800))
    return { ok: false, reason: 'no_json_in_response' }
  }

  let parsed
  try {
    parsed = JSON.parse(json)
  } catch (err) {
    console.error('agent JSON.parse failed:', err instanceof Error ? err.message : 'unknown', '| raw:', json.slice(0, 800))
    return { ok: false, reason: 'json_parse_failed' }
  }

  const result = toAgentResponse(parsed)
  if (!result) {
    console.error('agent response failed the type guard. raw:', json.slice(0, 800))
    return { ok: false, reason: 'schema_mismatch' }
  }

  return { ok: true, data: result }
}

export { EMPTY_EXTRACTED, INTENT_VALUES }
