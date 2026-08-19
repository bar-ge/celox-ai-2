import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt } from '../_lib/avatar-knowledge.js'

// TCEL-054 — LLM API connection for the in-app avatar.
//
// Reuses the same Anthropic setup as the WhatsApp lead agent (api/_lib/claude.js)
// rather than a separate wrapper, since the pattern (call Messages API, parse
// JSON out of the reply, validate/coerce) is identical. Kept as its own file
// instead of importing claude.js directly because the schema (reply/intent/
// actionId/confidence) is different from the WA agent's AgentResponse shape.
//
// ANTHROPIC_API_KEY must be set. If it isn't, this returns 503 rather than
// crashing — the frontend (src/avatar/llmClient.js) shows a "not configured"
// message instead of a silent failure.

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'
const MAX_TOKENS = 400
const VALID_INTENTS = ['qa', 'navigate', 'escalate', 'unclear']

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

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set — avatar chat unavailable')
    return res.status(503).json({ reply: null, reason: 'not_configured' })
  }

  const { message, history, context } = req.body ?? {}
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ reply: null, reason: 'missing_message' })
  }

  const lang = context?.lang === 'he' ? 'he' : 'he' // Hebrew-first app; default he regardless of context for now
  const systemPrompt = buildSystemPrompt(lang)

  const messages = [
    ...(Array.isArray(history) ? history.slice(-10) : []).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.text || '').slice(0, 2000),
    })),
    { role: 'user', content: message.slice(0, 2000) },
  ]

  try {
    const client = new Anthropic({ apiKey, timeout: 20000, maxRetries: 0 })
    const resp = await client.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system: systemPrompt, messages })
    const text = resp.content.filter(b => b.type === 'text').map(b => b.text).join('')
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
    console.error('avatar chat: Anthropic call failed', err instanceof Error ? err.message : err)
    return res.status(500).json({ reply: null, reason: 'api_error' })
  }
}
