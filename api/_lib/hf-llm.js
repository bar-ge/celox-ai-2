// Free-tier client for Hugging Face's Inference Providers router — an
// OpenAI-compatible endpoint (https://router.huggingface.co/v1/chat/completions)
// that serves open models (Llama, Qwen, Gemma, ...) through several backend
// providers, authenticated with a free HF access token. No payment method
// required to sign up or to use it up to the free monthly credit.
//
// Where this sits: added 2026-09-16 as a lower-friction middle ground while
// the fully self-hosted VPS plan (see docs/onprem-llm-setup.md,
// api/_lib/onprem-llm.js) is still undecided. It is NOT the same kind of fix
// as a real on-prem box — it's still a third-party vendor sitting behind a
// router, so it carries the same class of risk that has hit this app three
// times already (Anthropic, Mistral, NVIDIA, Gemini): a backend provider can
// deprecate or stop serving a model with little notice. The upside is signup
// is free-with-just-an-email (no VPS to provision or pay for) and it's a
// drop-in OpenAI shape, so it slots into the exact same retry pattern as
// onprem-llm.js.
//
// Deliberately has NO hardcoded default model. Every hardcoded model-id
// guess this app has made (NVIDIA twice, in the original Gemini pick) has
// eventually gone stale and 404'd/410'd in production — see claude.js's own
// changelog comments. HF's router additionally encodes the backend provider
// INTO the model string (e.g. "meta-llama/Llama-3.1-8B-Instruct:novita"),
// so a wrong guess here is even more likely to be wrong than a plain model
// name. Rather than repeat that mistake, HF_MODEL must be set explicitly —
// pick it from https://huggingface.co/docs/inference-providers after
// checking which providers currently serve which models. Unset HF_MODEL (or
// unset HF_API_TOKEN) makes this tier a no-op, same as onprem-llm.js when
// ONPREM_LLM_URL is unset.

const ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions'
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

/** True once both HF_API_TOKEN and HF_MODEL are set. */
export function hfConfigured() {
  return Boolean(process.env.HF_API_TOKEN && process.env.HF_MODEL)
}

/**
 * Call Hugging Face's free router. Returns `{ data: null, lastError }` on
 * any failure, including "not configured" — callers fall through to their
 * next tier without a separate not-configured branch, same contract as
 * callOnPrem in onprem-llm.js.
 *
 * @param {object} args
 * @param {string} args.systemPrompt
 * @param {{role: 'user'|'assistant', content: string}[]} args.messages  oldest first
 * @param {number} [args.maxTokens]
 * @param {boolean} [args.jsonMode]
 * @param {number} [args.attempts]
 * @param {number} [args.attemptTimeoutMs]
 * @param {number} [args.totalBudgetMs]
 */
export async function callHuggingFace({
  systemPrompt,
  messages,
  maxTokens = 700,
  jsonMode = false,
  attempts = 2,
  attemptTimeoutMs = 11000,
  totalBudgetMs = 18000,
  fetchImpl = fetch,
  now = Date.now,
  sleep,
}) {
  const apiToken = process.env.HF_API_TOKEN
  const model = process.env.HF_MODEL
  if (!apiToken || !model) return { data: null, lastError: 'HF_API_TOKEN or HF_MODEL is not set' }

  const wait = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)))
  const startedAt = now()
  let lastError = 'no attempt made'

  for (let i = 0; i < attempts; i++) {
    if (i > 0) {
      if (now() - startedAt > totalBudgetMs) break
      await wait(400 * i)
    }
    try {
      const body = {
        model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content ?? '') })),
        ],
      }
      if (jsonMode) body.response_format = { type: 'json_object' }

      const resp = await fetchImpl(ROUTER_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(attemptTimeoutMs),
        body: JSON.stringify(body),
      })
      if (resp.ok) {
        if (i > 0) console.warn('hf llm: recovered on attempt', i + 1)
        return { data: await resp.json(), lastError: null }
      }
      const errBody = await resp.text().catch(() => '')
      lastError = `${resp.status} ${errBody.slice(0, 300)}`
      // 402 = out of free credit for the month — no point retrying this call.
      if (!RETRYABLE_STATUS.has(resp.status)) break
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
  }
  return { data: null, lastError }
}

/** Same field OpenAI-compatible responses (NVIDIA, HF router, on-prem) all use. */
export function hfText(data) {
  return data?.choices?.[0]?.message?.content ?? ''
}
