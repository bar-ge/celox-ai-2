import { INTENT_VALUES, isIntent } from './intents.js'
import { isStage } from './conversation-state.js'
import { callHuggingFace, hfConfigured, hfText } from './hf-llm.js'
import { callOnPrem, onPremConfigured, onPremText } from './onprem-llm.js'

// 🚨 2026-09-16: CRITICAL FIX — `wait` was undefined in callNvidia below,
// confirmed by this repo's own QA/review-checker agents (item 3216281292)
// to have caused a `ReferenceError` on the FIRST retry of every single call
// since 2026-09-09 (commit 3e286e7), silently killing the entire retry/
// fallback ladder. Net effect: the WhatsApp agent has answered zero leads
// successfully in 27 days across four vendor attempts (Anthropic, Mistral,
// NVIDIA before this fix, and now NVIDIA after it) — every inbound message
// got the generic FALLBACK_MESSAGE instead of a real reply, including at
// least one lead who explicitly asked to book a demo. See
// claude/review-checker-sep-2026.md ("0f") and claude/qa-agent-sep-10-2026.md
// in the project for the full trail. The fix is the one line restored in
// callNvidia below — this file had it correctly as recently as 2026-09-09's
// first NVIDIA commit, then lost it again when resolveAttempts() was added
// the same day and callNvidia was rewritten without carrying it over.

// Vendor: back on Anthropic (api.anthropic.com), which IS what the filename
// says, as of 2026-09-17. History: Anthropic (401, key dead) → Mistral (403
// tier_not_allowed / 429 rate_limited) → NVIDIA NIM (free-credit key, worked
// at the API-auth level but every model this account tried came back `404
// Not Found for account` — an entitlement gap on NVIDIA's side, confirmed via
// get_runtime_errors' sample error body, not fixable from Vercel env vars
// alone; see claude/qa-agent-sep-17-2026.md). Three vendor changes and 27+
// days of zero successful replies later, Bar's call: stop chasing NVIDIA
// account entitlements and switch back to Anthropic, using the
// ANTHROPIC_API_KEY already sitting in Vercel (added 2026-08-19, previously
// only wired up for the avatar chatbot before that moved to Gemini
// 2026-08-24 — unconfirmed whether this specific key is the same one that
// 401'd originally, so watch get_runtime_errors after this deploy for a 401
// here too, not just silence-means-success).
//
// File kept as api/_lib/claude.js — always was the right name again. Every
// caller (webhook.js, the self-test suite, docs/whatsapp-agent.md) imports
// from this path and this change is additive, not a rename. `runAgent`'s
// signature and return shape are byte-for-byte the same as before, so
// nothing downstream needed to change — only what happens inside this file.
//
// Anthropic's Messages API is NOT OpenAI-shaped like the NVIDIA/Mistral
// calls it replaces: POST /v1/messages, auth via `x-api-key` + an
// `anthropic-version` header (not `Authorization: Bearer`), and the system
// prompt is its own top-level `system` field rather than a `system`-role
// message in the array — the existing `messages` array here already only
// contains user/assistant turns, so it passes through unchanged, just
// re-homed. No live model-catalog discovery here (unlike NVIDIA's NIM,
// which hosts many independently-retired third-party models) — Anthropic's
// own model ids are stable and versioned, so the same runtime type guard
// (toAgentResponse) plus the system prompt's existing JSON-only Hebrew
// instruction (system-prompt.js:16) is all that's needed, same as every
// vendor before this one.

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

// Same two-tier model strategy as the rest of this codebase's cloud-vendor
// integrations (see api/avatar/chat.js): try the current model twice, then
// drop to a fallback rather than fail the whole turn. Both overridable from
// Vercel with no deploy. Scoped with a WA_ prefix in case another feature
// ever wants its own Anthropic model tuned independently.
//
// CORRECTED 2026-09-22: the pair this section originally shipped with
// (claude-3-5-haiku-20241022 / claude-3-5-sonnet-20241022) was wrong the day
// it was written — haiku-3-5-20241022 was retired by Anthropic on
// 2026-02-19, seven months earlier, and sonnet-3-5-20241022 was never on the
// active list either. A retired/unknown model id is a non-retryable status,
// so every attempt in the ladder died and runAgent fell through to
// FALLBACK_MESSAGE — outwardly identical to the NVIDIA 404 this file was
// switched off of, and to the 401 before that. Caught by the review checker
// (claude/whatsapp-anthropic-switch-sep-17-2026.md §2b) after this ran
// unmerged on `dev` for four days; see that doc for the full trail. The
// claim below that these are "long-stable" ids was false — do not repeat
// it; re-verify against platform.claude.com/docs/en/about-claude/models/overview
// before ever hardcoding a dated model id here again.
//
// Current pair: claude-haiku-4-5-20251001 as primary (fast/cheap, plenty for
// a structured-JSON lead-qualification reply), claude-sonnet-4-5-20250929 as
// fallback (higher quality, in case haiku specifically is degraded while the
// account otherwise works). Both are dated ids, not the `claude-sonnet-5` /
// `claude-opus-5` aliases, so this pair cannot silently move under the file
// the way an alias could — but a dated id CAN still be retired later, so
// there is no live-catalog discovery step the way callNvidia needed; a 404
// here means check the deprecation table first, not assume the key is bad.
const MODEL = process.env.WA_ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
const FALLBACK_MODEL = process.env.WA_ANTHROPIC_FALLBACK_MODEL || 'claude-sonnet-4-5-20250929'
export { MODEL as AGENT_MODEL }

const API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MAX_TOKENS = 700
const ATTEMPT_TIMEOUT_MS = 11000
const TOTAL_BUDGET_MS = 22000
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504, 529]) // 529 is Anthropic's "overloaded", equivalent to a 503

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

// Preferred model twice, then the fallback. A 429/5xx/529 from Anthropic is
// usually momentary (rate limit or transient overload), so a second attempt
// at the same model often succeeds; the third only exists for when it does
// not.
//
// A non-retryable status (bad request, dead key, unknown model) means THIS
// model will never work this call — but it says nothing about a *different*
// model. This ladder logic (deadModels) carries over unchanged from the
// NVIDIA/Mistral integrations this replaces.
async function callAnthropic({ apiKey, systemPrompt, messages, fetchImpl = fetch, now = Date.now, sleep }) {
  const startedAt = now()
  const attempts = [MODEL, MODEL, FALLBACK_MODEL]
  const wait = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)))
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
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: String(m.content ?? '') })),
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
 * One agent turn. Calls Anthropic's Messages API, retries per callAnthropic's
 * own strategy, and returns either a validated AgentResponse or a typed
 * failure the caller can fall back on. Signature and return shape unchanged
 * from every vendor before this one — see the file-level comment.
 *
 * @param {object} args
 * @param {string} args.systemPrompt
 * @param {{ role: 'user'|'assistant', content: string }[]} args.messages  oldest first
 * @returns {Promise<{ ok: true, data: AgentResponse } | { ok: false, reason: string }>}
 */
export async function runAgent({ systemPrompt, messages }) {
  // Three tiers, in order: self-hosted VPS (see onprem-llm.js — not yet set
  // up as of 2026-09-16), Hugging Face's free Inference Providers router
  // (see hf-llm.js — a lower-friction free option added 2026-09-16, still a
  // third-party vendor), then Anthropic below. Each tier is a silent no-op
  // when unconfigured, so today — with neither ONPREM_LLM_URL nor
  // HF_API_TOKEN/HF_MODEL set — this runs exactly the Anthropic path. This
  // webhook runs in the background (webhook.js's 200 already went out
  // before runAgent is called — config.maxDuration=60 there), so there's
  // real budget to try more than one tier before falling through here.
  let text
  const onPrem = await callOnPrem({ systemPrompt, messages, maxTokens: MAX_TOKENS })
  if (onPrem.data) {
    text = onPremText(onPrem.data)
  } else {
    if (onPremConfigured()) console.warn('wa agent: onprem LLM failed, trying Hugging Face —', onPrem.lastError)

    const hf = await callHuggingFace({ systemPrompt, messages, maxTokens: MAX_TOKENS })
    if (hf.data) {
      text = hfText(hf.data)
    } else {
      if (hfConfigured()) console.warn('wa agent: Hugging Face failed, falling back to Anthropic —', hf.lastError)

      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        console.error('agent api call failed: ANTHROPIC_API_KEY is not set')
        return { ok: false, reason: 'ANTHROPIC_API_KEY is not set' }
      }

      const { data, lastError } = await callAnthropic({ apiKey, systemPrompt, messages })

      if (!data) {
        console.error('agent api call failed', lastError)
        return { ok: false, reason: lastError ?? 'api_error' }
      }

      text = data?.content?.[0]?.text ?? ''
    }
  }

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
