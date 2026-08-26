import { buildSystemPrompt } from '../_lib/avatar-knowledge.js'

// TCEL-054 — LLM API connection for the in-app avatar.
//
// Vendor: Google Gemini, not Anthropic. Switched 2026-08-24 at Bar's request
// to keep this widget off Anthropic token spend — the WhatsApp lead agent
// (api/_lib/claude.js) still runs on Claude and is untouched by this change.
// Gemini's free tier (2.5 Flash: 1,500 requests/day, no card required) covers
// this widget's traffic; the work here is small structured replies, not deep
// reasoning, so the quality gap vs Claude is an acceptable tradeoff. Calls the
// REST API directly (no new npm dependency) and uses responseSchema to force
// valid JSON back — more reliable than the old extract-JSON-from-freeform-text
// approach this file used with Anthropic.
//
// GEMINI_API_KEY must be set (free key: aistudio.google.com/apikey). If it
// isn't, this returns 503 rather than crashing — the frontend
// (src/avatar/llmClient.js) shows a "not configured" message instead of a
// silent failure.
//
// Note for Bar: Google's free tier logs prompts to improve their products
// (the paid tier doesn't). Fine for fleet-ops Q&A; worth knowing before
// anything more sensitive goes through this path.

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
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

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            maxOutputTokens: MAX_TOKENS,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      }
    )

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '')
      console.error('avatar chat: Gemini call failed', resp.status, errBody.slice(0, 500))
      return res.status(500).json({ reply: null, reason: 'api_error' })
    }

    const data = await resp.json()
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
    console.error('avatar chat: Gemini call failed', err instanceof Error ? err.message : err)
    return res.status(500).json({ reply: null, reason: 'api_error' })
  }
}
