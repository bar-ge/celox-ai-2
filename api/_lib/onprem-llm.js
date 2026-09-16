// Shared OpenAI-compatible chat client for a self-hosted LLM.
//
// Context: every outage this app's LLM-backed features have had traced back
// to a third-party vendor changing something out from under us — Anthropic
// key/billing issues, Mistral 403 tier_not_allowed then 429 rate_limited,
// NVIDIA NIM retiring a whole model family plus two wrong model-id guesses,
// Gemini's free tier retiring a model and then throttling the replacement
// under demand. A model running on a box we control removes that entire
// failure class: no catalog churn, no shared rate limit, no vendor billing
// tier. The tradeoff is this app now owns that box's uptime, which is why
// every caller of this module treats it as an optional FIRST attempt and
// keeps its existing cloud vendor call as the fallback — never a bare
// replacement. See docs/onprem-llm-setup.md for how the box itself is set
// up (Ollama + Caddy on a small VPS), and CLAUDE.md's deploy rule: this
// lands on `dev` first regardless of how good local testing looks.
//
// Any self-hosted server that speaks the OpenAI Chat Completions shape works
// here unchanged — Ollama (`ollama serve`, OpenAI-compatible at /v1/...),
// vLLM, llama.cpp's server, TGI. Point ONPREM_LLM_URL at whichever one is
// actually running.
//
// Fully inert until configured: every function below is a no-op / instant
// "not configured" failure when ONPREM_LLM_URL is unset, so merging this
// file changes nothing in production by itself. Nothing calls it with real
// effect until the env vars are set in Vercel.

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

/** True once ONPREM_LLM_URL is set — callers use this to decide whether to
 * log a "falling back to cloud" warning or stay silent (expected until the
 * VPS exists). */
export function onPremConfigured() {
  return Boolean(process.env.ONPREM_LLM_URL)
}

/**
 * Call the self-hosted model. Returns `{ data: null, lastError }` on any
 * failure, including "not configured" — callers fall through to their
 * existing cloud path without needing a separate not-configured branch.
 *
 * There is only one model to try here (whatever the box is actually
 * running), so unlike the multi-model cloud ladders in claude.js / chat.js,
 * this only retries the same model on a retryable status — it does not have
 * a second model to drop to locally.
 *
 * @param {object} args
 * @param {string} args.systemPrompt
 * @param {{role: 'user'|'assistant', content: string}[]} args.messages  oldest first
 * @param {number} [args.maxTokens]
 * @param {boolean} [args.jsonMode]  send response_format: json_object (Ollama/vLLM honor this; harmless no-op on servers that ignore unknown fields)
 * @param {number} [args.attempts]  how many tries total (default 2)
 * @param {number} [args.attemptTimeoutMs]
 * @param {number} [args.totalBudgetMs]  caller's own time budget for this whole call
 */
export async function callOnPrem({
  systemPrompt,
  messages,
  maxTokens = 700,
  jsonMode = false,
  attempts = 2,
  attemptTimeoutMs = 9000,
  totalBudgetMs = 16000,
  fetchImpl = fetch,
  now = Date.now,
  sleep,
}) {
  const apiUrl = process.env.ONPREM_LLM_URL
  if (!apiUrl) return { data: null, lastError: 'ONPREM_LLM_URL is not set' }

  const apiKey = process.env.ONPREM_LLM_API_KEY || ''
  const model = process.env.ONPREM_LLM_MODEL || 'default'
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

      const resp = await fetchImpl(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        signal: AbortSignal.timeout(attemptTimeoutMs),
        body: JSON.stringify(body),
      })
      if (resp.ok) {
        if (i > 0) console.warn('onprem llm: recovered on attempt', i + 1)
        return { data: await resp.json(), lastError: null }
      }
      const errBody = await resp.text().catch(() => '')
      lastError = `${resp.status} ${errBody.slice(0, 300)}`
      if (!RETRYABLE_STATUS.has(resp.status)) break // our bug, a dead key, or an unloaded model — retrying the same box won't fix it this call
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err) // timeout / box unreachable
    }
  }
  return { data: null, lastError }
}

/** Pull the reply text out of an OpenAI-shaped chat completion, same field
 * NVIDIA/Mistral/OpenAI-compatible responses all use. */
export function onPremText(data) {
  return data?.choices?.[0]?.message?.content ?? ''
}
