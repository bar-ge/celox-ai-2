import { INTENT_VALUES, isIntent } from './intents.js'
import { isStage } from './conversation-state.js'

// Vendor: Mistral, not Anthropic — despite the filename. Switched
// 2026-09-07 at Bar's request after ANTHROPIC_API_KEY died in production and
// took the entire WhatsApp lead flow down with it (see
// claude/qa-agent-sep-2026.md, "the WhatsApp 401 is not intermittent"). A
// same-day Gemini version of this file was drafted and replaced before ever
// shipping — Bar's key was for Mistral, not Google — so there is no Gemini
// history to reconcile here, only this.
//
// File kept as api/_lib/claude.js on purpose: every caller (webhook.js, the
// self-test suite, docs/whatsapp-agent.md) imports from this path and this
// change is additive, not a rename. `runAgent`'s signature and return shape
// are byte-for-byte the same as before, so nothing downstream needed to
// change — only what happens inside this file.
//
// Mistral's Chat Completions API is OpenAI-shaped: POST /v1/chat/completions
// with a `messages` array (system role included inline, unlike Gemini's
// separate systemInstruction) and `response_format: { type: 'json_object' }`
// to force valid JSON back. That is a weaker guarantee than Gemini's
// responseSchema (shape, not just validity), so this file leans on the same
// runtime type guard (toAgentResponse) that carried the whole Anthropic-era
// contract — nothing about validation had to change, only how the raw text
// gets fetched. The system prompt already instructs JSON-only output in
// Hebrew (system-prompt.js:16), which is what made that safe to keep as-is.

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
// another feature ever wants its own Mistral model tuned independently.
const MODEL = process.env.WA_MISTRAL_MODEL || 'mistral-large-latest'
const FALLBACK_MODEL = process.env.WA_MISTRAL_FALLBACK_MODEL || 'mistral-small-latest'
export { MODEL as AGENT_MODEL }

const API_URL = 'https://api.mistral.ai/v1/chat/completions'
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

// Preferred model twice, then the fallback. A 429/5xx from Mistral is usually
// momentary (rate limit or demand spike), so a second attempt at the same
// model often succeeds; the third only exists for when it does not.
// Non-retryable statuses (bad request, dead key, unknown model) break
// immediately rather than burning the budget on a call that will only ever
// fail the same way.
async function callMistral({ apiKey, systemPrompt, messages, fetchImpl = fetch, now = Date.now, sleep }) {
  const attempts = [MODEL, MODEL, FALLBACK_MODEL]
  const wait = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)))
  const startedAt = now()
  let lastError = 'no attempt made'

  for (let i = 0; i < attempts.length; i++) {
    const model = attempts[i]
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
          response_format: { type: 'json_object' },
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
      if (!RETRYABLE_STATUS.has(resp.status)) break
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err) // timeout / network
    }
  }
  return { data: null, lastError }
}

/**
 * One agent turn. Calls Mistral, retries per callMistral's own strategy, and
 * returns either a validated AgentResponse or a typed failure the caller can
 * fall back on. Signature and return shape unchanged from the Anthropic
 * version — see the file-level comment.
 *
 * @param {object} args
 * @param {string} args.systemPrompt
 * @param {{ role: 'user'|'assistant', content: string }[]} args.messages  oldest first
 * @returns {Promise<{ ok: true, data: AgentResponse } | { ok: false, reason: string }>}
 */
export async function runAgent({ systemPrompt, messages }) {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) {
    console.error('agent api call failed: MISTRAL_API_KEY is not set')
    return { ok: false, reason: 'MISTRAL_API_KEY is not set' }
  }

  const { data, lastError } = await callMistral({ apiKey, systemPrompt, messages })

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
