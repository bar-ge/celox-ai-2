import { INTENT_VALUES, isIntent } from './intents.js'
import { isStage } from './conversation-state.js'

// Vendor: NVIDIA NIM (build.nvidia.com), not Anthropic — despite the
// filename. Switched 2026-09-09 at Bar's request after the Mistral account
// turned out to have no usable throughput on either model in the fallback
// ladder — mistral-large-latest 403 tier_not_allowed, then
// mistral-small-latest 429 rate_limited on a single lone request (see
// claude/review-checker-sep-2026.md, "the ladder fix shipped, WORKS, and the
// funnel is STILL 100% DOWN"). That was the third distinct provider outage
// in three weeks (Anthropic 401 → Mistral 403/429), so this move is off
// Mistral entirely rather than another billing fix-up, onto NVIDIA's NIM
// free-credit API key.
//
// File kept as api/_lib/claude.js on purpose: every caller (webhook.js, the
// self-test suite, docs/whatsapp-agent.md) imports from this path and this
// change is additive, not a rename. `runAgent`'s signature and return shape
// are byte-for-byte the same as before, so nothing downstream needed to
// change — only what happens inside this file.
//
// NVIDIA NIM's Chat Completions API is OpenAI-shaped, same as Mistral's:
// POST /v1/chat/completions with a `messages` array (system role included
// inline). Unlike the Mistral integration this replaces, this file does NOT
// send `response_format: { type: 'json_object' }` — NIM is a catalog of many
// independently-hosted models (Llama, Nemotron, Mixtral, ...) on a vLLM
// backend, and JSON-mode support is not guaranteed uniformly across them.
// Getting a 400 for an unsupported field would retire a model for no good
// reason, which is exactly the kind of failure that took Mistral down. So
// this leans entirely on the system prompt's existing JSON-only Hebrew
// instruction (system-prompt.js:16) plus the same runtime type guard
// (toAgentResponse) that carried the whole Anthropic- and Mistral-era
// contract — nothing about validation had to change, only how the raw text
// gets fetched.

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

// Same two-tier model strategy as the rest of this codebase's non-Anthropic
// integrations (see api/avatar/chat.js): try the current model twice, then
// drop to a smaller/cheaper one rather than fail the whole turn. Both
// overridable from Vercel with no deploy. Scoped with a WA_ prefix in case
// another feature ever wants its own NVIDIA model tuned independently.
//
// meta/llama-3.1-70b-instruct as the primary: solid multilingual/Hebrew
// output and NVIDIA's free-tier API key (build.nvidia.com) covers it.
// meta/llama-3.1-8b-instruct as the fallback: a genuinely smaller/cheaper
// model, distinct from the primary, so the ladder in callNvidia below has
// somewhere real to go if the 70b model is rate-limited or unavailable —
// the exact gap that took the Mistral integration down (both of its rungs
// pointed at the same account with no throughput left).
const MODEL = process.env.WA_NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct'
const FALLBACK_MODEL = process.env.WA_NVIDIA_FALLBACK_MODEL || 'meta/llama-3.1-8b-instruct'
export { MODEL as AGENT_MODEL }

const API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const MAX_TOKENS = 700
const ATTEMPT_TIMEOUT_MS = 11000
const TOTAL_BUDGET_MS = 22000
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

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

// Preferred model twice, then the fallback. A 429/5xx from NVIDIA NIM is
// usually momentary (rate limit or demand spike), so a second attempt at the
// same model often succeeds; the third only exists for when it does not.
//
// A non-retryable status (bad request, dead key, model not deployed, unknown
// model) means THIS model will never work this call — but it says nothing
// about a *different* model. This ladder logic (deadModels) is unchanged
// from the Mistral integration it replaces: it is what let the retry loop
// walk on to a second model instead of aborting outright when the first one
// died non-retryably. Keeping it here matters even more with NVIDIA, since
// NIM is a shared catalog of independently-hosted models — one being
// unavailable or rate-limited says nothing about the other.
async function callNvidia({ apiKey, systemPrompt, messages, fetchImpl = fetch, now = Date.now, sleep }) {
  const attempts = [MODEL, MODEL, FALLBACK_MODEL]
  const wait = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)))
  const startedAt = now()
  let lastError = 'no attempt made'
  const deadModels = new Set()

  for (let i = 0; i < attempts.length; i++) {
    const model = attempts[i]
    if (deadModels.has(model)) continue // already failed non-retryably this call — don't burn another attempt on it
    if (i > 0) {
      if (now() - startedAt > TOTAL_BUDGET_MS) break
      await wait(400 * i)
    }
    try {
      const resp = await fetchImpl(API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: String(m.content ?? '') })),
          ],
        }),
      })
      if (resp.ok) {
        if (i > 0) console.warn('wa agent: recovered on attempt', i + 1, 'with', model)
        return { data: await resp.json(), lastError: null }
      }
      const errBody = await resp.text().catch(() => '')
      lastError = `${resp.status} ${errBody.slice(0, 300)}`
      if (!RETRYABLE_STATUS.has(resp.status)) deadModels.add(model)
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err) // timeout / network
    }
  }
  return { data: null, lastError }
}

/**
 * One agent turn. Calls NVIDIA NIM, retries per callNvidia's own strategy,
 * and returns either a validated AgentResponse or a typed failure the caller
 * can fall back on. Signature and return shape unchanged from the Anthropic
 * and Mistral versions — see the file-level comment.
 *
 * @param {object} args
 * @param {string} args.systemPrompt
 * @param {{ role: 'user'|'assistant', content: string }[]} args.messages  oldest first
 * @returns {Promise<{ ok: true, data: AgentResponse } | { ok: false, reason: string }>}
 */
export async function runAgent({ systemPrompt, messages }) {
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) {
    console.error('agent api call failed: NVIDIA_API_KEY is not set')
    return { ok: false, reason: 'NVIDIA_API_KEY is not set' }
  }

  const { data, lastError } = await callNvidia({ apiKey, systemPrompt, messages })

  if (!data) {
    console.error('agent api call failed', lastError)
    return { ok: false, reason: lastError ?? 'api_error' }
  }

  const text = data?.choices?.[0]?.message?.content ?? ''

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
