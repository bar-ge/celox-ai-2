// Shared Gemini call with a retry-then-fallback ladder.
//
// Extracted from the pattern in api/avatar/chat.js (callGemini) so a second
// feature can use it without importing one route from another. That route is
// deliberately left untouched — it is live, and deduplicating it is a separate
// change worth making once this one has been proven.
//
// Why a ladder: gemini-3.7-flash is the newest model, so on the free tier it is
// also the most contended. Live errors were 503 "experiencing high demand" and
// request timeouts. One attempt is not enough; the same model twice (a demand
// spike is usually momentary) then one older, quieter model.

export const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

/**
 * @param {object} args
 * @param {string}   args.apiKey
 * @param {string}   args.body            already-serialised JSON request body
 * @param {string[]} args.models          tried in order, one attempt each
 * @param {number}  [args.attemptTimeoutMs=15000]
 * @param {number}  [args.totalBudgetMs=40000]  no NEW attempt starts past this
 * @param {typeof fetch} [args.fetchImpl]
 * @param {(ms:number)=>Promise<void>} [args.sleep]
 * @param {()=>number} [args.now]
 * @returns {Promise<{ data: any, model: string, attempt: number, lastError: null }
 *   | { data: null, lastError: string, retryable: boolean }>}
 */
export async function callGeminiLadder({
  apiKey, body, models,
  attemptTimeoutMs = 15000, totalBudgetMs = 40000,
  fetchImpl = fetch, sleep, now = Date.now,
}) {
  const wait = sleep || (ms => new Promise(r => setTimeout(r, ms)))
  const startedAt = now()
  let lastError = 'no attempt made'
  let retryable = true

  for (let i = 0; i < models.length; i++) {
    const model = models[i]
    if (i > 0) {
      if (now() - startedAt > totalBudgetMs) break
      await wait(400 * i)
    }
    try {
      const resp = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          // Key in a header, not the query string: query strings end up in
          // proxy and access logs, and this request carries an ID document.
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          signal: AbortSignal.timeout(attemptTimeoutMs),
          body,
        }
      )
      if (resp.ok) return { data: await resp.json(), model, attempt: i + 1, lastError: null }

      const errBody = await resp.text().catch(() => '')
      // Status and the vendor's short message only. The body can echo prompt
      // fragments, and this prompt is a scan of a driver's license.
      lastError = `${resp.status} ${errBody.slice(0, 160)}`
      retryable = RETRYABLE_STATUS.has(resp.status)
      // 400/403/404 mean our request or a dead key — retrying only burns budget.
      if (!retryable) break
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err) // timeout / network
      retryable = true
    }
  }
  return { data: null, lastError, retryable }
}
