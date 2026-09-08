import { buildSystemPrompt } from '../_lib/avatar-knowledge.js'

// TCEL-054 — LLM API connection for the in-app avatar.
//
// Vendor: Google Gemini, not Anthropic. Switched 2026-08-24 at Bar's request
// to keep this widget off Anthropic token spend — the WhatsApp lead agent
// (api/_lib/claude.js) still runs on Claude and is untouched by this change.
// Gemini's free tier covers this widget's traffic; the work here is small
// structured replies, not deep reasoning, so the quality gap vs Claude is an
// acceptable tradeoff. Calls the REST API directly (no new npm dependency)
// and uses responseSchema to force valid JSON back — more reliable than the
// old extract-JSON-from-freeform-text approach this file used with Anthropic.
//
// GEMINI_API_KEY must be set (free key: aistudio.google.com/apikey). If it
// isn't, this returns 503 rather than crashing — the frontend
// (src/avatar/llmClient.js) shows a "not configured" message instead of a
// silent failure.
//
// Note for Bar: Google's free tier logs prompts to improve their products
// (the paid tier doesn't). Fine for fleet-ops Q&A; worth knowing before
// anything more sensitive goes through this path.

// 2026-08-27: gemini-2.5-flash started 404ing with "no longer available to
// new users", so the default moved to Google's current Flash model.
//
// 2026-08-28: that fixed the 404 and immediately surfaced the next problem —
// 3.7-flash is the newest model, so on the free tier it is the most contended.
// Live errors were 503 "This model is currently experiencing high demand" and
// outright request timeouts. A single attempt against a busy model is not
// good enough for a chat widget, so the call now retries and, if the preferred
// model is still refusing, drops to an older and far less contended one for
// that request. Quality dips slightly; a reply beats an error.
//
// Both are overridable from the Vercel dashboard with no deploy.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.7-flash'
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash'

// Per-attempt, not total. Three attempts at 11s each plus backoff stays inside
// the function's execution budget; TOTAL_BUDGET_MS stops the last attempt from
// starting if the earlier ones already burned the time.
const ATTEMPT_TIMEOUT_MS = 11000
const TOTAL_BUDGET_MS = 24000
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])
const MAX_TOKENS = 2048
const VALID_INTENTS = ['qa', 'navigate', 'escalate', 'unclear']

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    intent: { type: 'STRING', enum: VALID_INTENTS },
    actionId: { type: 'STRING', nullable: true },
    confidence: { type: 'NUMBER' },
  },
  required: ['reply', 'intent', 'confidence'],
}

function extractJson(raw) {
  let s = String(raw || '').trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try { return JSON.parse(s.slice(start, end + 1)) } catch { return null }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set — avatar chat unavailable')
    return res.status(503).json({ reply: null, reason: 'not_configured' })
  }

  const { message, history, context } = req.body ?? {}
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ reply: null, reason: 'missing_message' })
  }

  const lang = context?.lang === 'he' ? 'he' : 'he' // Hebrew-first app; default he regardless of context for now
  const systemPrompt = buildSystemPrompt(lang)

  const contents = [
    ...(Array.isArray(history) ? history.slice(-10) : []).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.text || '').slice(0, 2000) }],
    })),
    { role: 'user', parts: [{ text: message.slice(0, 2000) }] },
  ]

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      maxOutputTokens: MAX_TOKENS,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  })

  const { data, lastError } = await callGemini({ apiKey, body })

  if (!data) {
    console.error('avatar chat: Gemini call failed after 3 attempts —', lastError)
    return res.status(500).json({ reply: null, reason: 'api_error' })
  }

  try {
    const text = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')
    const parsed = extractJson(text)

    if (!parsed || typeof parsed.reply !== 'string') {
      console.error('avatar chat: unparsable response', text.slice(0, 500))
      return res.status(200).json({ reply: 'לא הצלחתי לנסח תשובה כרגע. נסו שוב.', intent: 'unclear', actionId: null, confidence: 0 })
    }

    return res.status(200).json({
      reply: parsed.reply,
      intent: VALID_INTENTS.includes(parsed.intent) ? parsed.intent : 'unclear',
      actionId: typeof parsed.actionId === 'string' ? parsed.actionId : null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    })
  } catch (err) {
    console.error('avatar chat: could not read Gemini response', err instanceof Error ? err.message : err)
    return res.status(500).json({ reply: null, reason: 'api_error' })
  }
}

// Preferred model twice, then the fallback. A 503 from Gemini is usually a
// momentary demand spike, so a second attempt at the same model often
// succeeds; the third only exists for when it does not.
//
// `fetchImpl` is injectable so the retry behaviour can be tested without
// hitting Google — see the note in claude/avatar-chat-gemini-model.md.
export async function callGemini({ apiKey, body, fetchImpl = fetch, now = Date.now, sleep }) {
  const attempts = [MODEL, MODEL, FALLBACK_MODEL]
  const wait = sleep || (ms => new Promise(r => setTimeout(r, ms)))
  const startedAt = now()
  let lastError = 'no attempt made'

  for (let i = 0; i < attempts.length; i++) {
    const model = attempts[i]
    if (i > 0) {
      if (now() - startedAt > TOTAL_BUDGET_MS) break
      await wait(400 * i)
    }
    try {
      const resp = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
          body,
        }
      )
      if (resp.ok) {
        if (i > 0) console.warn('avatar chat: recovered on attempt', i + 1, 'with', model)
        return { data: await resp.json(), lastError: null, model, attempt: i + 1 }
      }
      const errBody = await resp.text().catch(() => '')
      lastError = `${resp.status} ${errBody.slice(0, 300)}`
      // 400/403/404 are our bug or a dead key — retrying just wastes the budget.
      if (!RETRYABLE_STATUS.has(resp.status)) break
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)   // timeout / network
    }
  }
  return { data: null, lastError }
}
