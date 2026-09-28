// OpenRouter: one API, one key, hundreds of models behind an OpenAI-shaped
// chat-completions endpoint — chosen 2026-09-28 at Bar's request specifically
// so a future model swap, for either the WhatsApp bot or the avatar, is an
// env var change instead of a new vendor integration (and a new outage).
// This app has already been through Anthropic → Mistral → NVIDIA → Anthropic
// for the WhatsApp bot, and Anthropic → Gemini for the avatar — see the
// changelog comments still sitting in api/_lib/claude.js and
// api/avatar/chat.js for the toll each of those took. OpenRouter is meant to
// be the last vendor integration this app ever needs to write in code.
//
// Bar's explicit call (2026-09-28): OpenRouter replaces BOTH the free-tier
// on-prem/Hugging-Face pre-tiers AND the previous cloud vendor for each
// surface — it is the only cloud vendor now, not one more tier in a ladder.
// api/_lib/onprem-llm.js and api/_lib/hf-llm.js are left in place (unused)
// rather than deleted, since deleting files needs Bar's sign-off per this
// repo's rule 1 and only the two call sites were asked about.
//
// Auth: a single OPEN_ROUTER_KEY (Bar's own naming — kept exactly as he
// asked, even though "OpenRouter" is one word everywhere else) from
// openrouter.ai/keys, Bearer-authenticated. Model ids use an
// "org/model" shape, e.g. "meta-llama/llama-3.1-8b-instruct" — the model
// Bar picked for both the WhatsApp bot and the avatar as of this writing,
// each independently overridable below with no redeploy.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

/** The model both surfaces default to unless their own env var overrides it. */
export const DEFAULT_OPEN_ROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct'

/** True once OPEN_ROUTER_KEY is set. */
export function openRouterConfigured() {
  return Boolean(process.env.OPEN_ROUTER_KEY)
}

/**
 * Call OpenRouter's OpenAI-shaped chat completions endpoint. Same
 * two-attempts-then-fallback-model shape every cloud vendor in this repo has
 * used before (see the now-retired callAnthropic in claude.js and
 * callGemini in avatar/chat.js): a non-retryable status (400/401/403/404)
 * retires only that one model for the rest of this call — it says nothing
 * about a different model — while a retryable one (429/5xx) gets a second
 * attempt with backoff, since that's usually a momentary rate limit or
 * overload rather than the model itself being unavailable.
 *
 * @param {object} args
 * @param {string} args.systemPrompt
 * @param {{role: 'user'|'assistant', content: string}[]} args.messages  oldest first
 * @param {string} args.model
 * @param {string} [args.fallbackModel]  defaults to `model` — Bar has not asked for a distinct fallback yet
 * @param {number} [args.maxTokens]
 * @param {boolean} [args.jsonMode]
 * @param {number} [args.attemptTimeoutMs]
 * @param {number} [args.totalBudgetMs]
 * @returns {Promise<{ data: any, lastError: string|null }>}
 */
export async function callOpenRouter({
  systemPrompt,
  messages,
  model,
  fallbackModel = model,
  maxTokens = 700,
  jsonMode = false,
  attemptTimeoutMs = 11000,
  totalBudgetMs = 22000,
  fetchImpl = fetch,
  now = Date.now,
  sleep,
}) {
  const apiKey = process.env.OPEN_ROUTER_KEY
  if (!apiKey) return { data: null, lastError: 'OPEN_ROUTER_KEY is not set' }

  const attempts = [model, model, fallbackModel]
  const wait = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)))
  const startedAt = now()
  let lastError = 'no attempt made'
  const deadModels = new Set()

  for (let i = 0; i < attempts.length; i++) {
    const m = attempts[i]
    if (deadModels.has(m)) continue
    if (i > 0) {
      if (now() - startedAt > totalBudgetMs) break
      await wait(400 * i)
    }
    try {
      const body = {
        model: m,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((msg) => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: String(msg.content ?? ''),
          })),
        ],
      }
      if (jsonMode) body.response_format = { type: 'json_object' }

      const resp = await fetchImpl(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          // OpenRouter's own convention for identifying the calling app —
          // harmless to omit, but plays into their abuse/rate-limit heuristics.
          'HTTP-Referer': 'https://celoxai.com',
          'X-Title': 'CELOX AI',
        },
        signal: AbortSignal.timeout(attemptTimeoutMs),
        body: JSON.stringify(body),
      })
      if (resp.ok) {
        if (i > 0) console.warn('openrouter: recovered on attempt', i + 1, 'with', m)
        return { data: await resp.json(), lastError: null }
      }
      const errBody = await resp.text().catch(() => '')
      lastError = `${resp.status} ${errBody.slice(0, 300)}`
      if (!RETRYABLE_STATUS.has(resp.status)) deadModels.add(m)
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err) // timeout / network
    }
  }
  return { data: null, lastError }
}

/** Same field shape every OpenAI-compatible response in this app uses. */
export function openRouterText(data) {
  return data?.choices?.[0]?.message?.content ?? ''
}

/**
 * Lower-level sibling of callOpenRouter() for callers that need to build
 * their own `messages` array (e.g. to append a `role: 'tool'` result after a
 * tool call) rather than the systemPrompt+messages shape callOpenRouter
 * assumes. Added 2026-09-28 for the avatar's live-data tool calling (see
 * api/_lib/avatar-tools.js) — api/_lib/claude.js is unaffected and keeps
 * using callOpenRouter above.
 *
 * Same retry/fallback-model/deadModels shape as callOpenRouter. `jsonMode`
 * and `tools` are mutually exclusive on a single call in practice: a call
 * offering tools should leave jsonMode off (a model can't both call a tool
 * and honor "reply with only a JSON object" in the same turn), then the
 * FOLLOW-UP call — after the tool result is appended to `messages` — sets
 * jsonMode true and omits tools to force the final structured reply.
 *
 * @param {object} args
 * @param {{role: string, content?: string, tool_calls?: any[], tool_call_id?: string, name?: string}[]} args.messages  raw, sent as-is
 * @param {string} args.model
 * @param {string} [args.fallbackModel]
 * @param {number} [args.maxTokens]
 * @param {boolean} [args.jsonMode]
 * @param {any[]} [args.tools]  OpenAI-shaped tool definitions
 * @param {number} [args.attemptTimeoutMs]
 * @param {number} [args.totalBudgetMs]
 * @returns {Promise<{ data: any, lastError: string|null }>}
 */
export async function callOpenRouterRaw({
  messages,
  model,
  fallbackModel = model,
  maxTokens = 700,
  jsonMode = false,
  tools,
  attemptTimeoutMs = 11000,
  totalBudgetMs = 22000,
  fetchImpl = fetch,
  now = Date.now,
  sleep,
}) {
  const apiKey = process.env.OPEN_ROUTER_KEY
  if (!apiKey) return { data: null, lastError: 'OPEN_ROUTER_KEY is not set' }

  const attempts = [model, model, fallbackModel]
  const wait = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)))
  const startedAt = now()
  let lastError = 'no attempt made'
  const deadModels = new Set()

  for (let i = 0; i < attempts.length; i++) {
    const m = attempts[i]
    if (deadModels.has(m)) continue
    if (i > 0) {
      if (now() - startedAt > totalBudgetMs) break
      await wait(400 * i)
    }
    try {
      const body = { model: m, max_tokens: maxTokens, messages }
      if (jsonMode) body.response_format = { type: 'json_object' }
      if (tools?.length) body.tools = tools

      const resp = await fetchImpl(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://celoxai.com',
          'X-Title': 'CELOX AI',
        },
        signal: AbortSignal.timeout(attemptTimeoutMs),
        body: JSON.stringify(body),
      })
      if (resp.ok) {
        if (i > 0) console.warn('openrouter: recovered on attempt', i + 1, 'with', m)
        return { data: await resp.json(), lastError: null }
      }
      const errBody = await resp.text().catch(() => '')
      lastError = `${resp.status} ${errBody.slice(0, 300)}`
      if (!RETRYABLE_STATUS.has(resp.status)) deadModels.add(m)
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
  }
  return { data: null, lastError }
}

/** The model's first-choice message, tool_calls and all. */
export function openRouterMessage(data) {
  return data?.choices?.[0]?.message ?? null
}
