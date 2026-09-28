import { buildSystemPrompt } from '../_lib/avatar-knowledge.js'
import { callOpenRouter, openRouterText, openRouterConfigured, DEFAULT_OPEN_ROUTER_MODEL } from '../_lib/openrouter-llm.js'

// maxDuration left at 60 from the Gemini-era three-tier setup (on-prem → HF →
// Gemini). This route is down to a single OpenRouter call now, so it could
// come down, but Bar didn't ask for that change and a generous ceiling is
// harmless — left as-is rather than tuning something nobody flagged.
export const config = { maxDuration: 60 }

// TCEL-054 — LLM API connection for the in-app avatar.
//
// Vendor history: Anthropic → Gemini (2026-08-24, to keep this widget off
// Anthropic token spend) → OpenRouter (2026-09-28, Bar's request). Same
// reasoning as api/_lib/claude.js's switch — see that file's comment and
// api/_lib/openrouter-llm.js for the shared client and full rationale. This
// also drops the on-prem/Hugging-Face free pre-tiers that used to sit ahead
// of the cloud vendor here: Bar's explicit call was OpenRouter as the only
// cloud vendor for this surface, not one more tier in a ladder.
// api/_lib/onprem-llm.js and api/_lib/hf-llm.js are left in place (unused)
// rather than deleted, since deleting files needs sign-off per this repo's
// rule 1 and only the call sites here were asked about.
//
// OPEN_ROUTER_KEY must be set (Bar creates it at openrouter.ai/keys and
// pastes it into Vercel himself). If it isn't, this returns 503 rather than
// crashing — the frontend (src/avatar/llmClient.js) shows a "not configured"
// message instead of a silent failure.
//
// This surface no longer depends on Gemini's proprietary responseSchema for
// structured output — OpenRouter's json_object mode plus this file's own
// extractJson()/respondFromText() validation tail (unchanged from the Gemini
// era) carries the JSON-shape guarantee instead, the same way
// api/_lib/claude.js relies on its system prompt's own JSON instructions.
// The system prompt built by buildSystemPrompt() already spells out the
// exact {reply, intent, actionId, confidence} shape (see
// api/_lib/avatar-knowledge.js), so nothing else needed to change here.

// Model id in OpenRouter's "org/model" shape. Bar picked
// meta-llama/llama-3.1-8b-instruct for this surface 2026-09-28, same as the
// WhatsApp bot; overridable from Vercel with no deploy, scoped with an
// AVATAR_ prefix in case this surface ever wants a different model tuned
// independently from api/_lib/claude.js's WA_ prefix. No separate fallback
// model was specified, so it defaults to the same model — callOpenRouter
// still retries once before giving up, per its own comment.
const MODEL = process.env.AVATAR_OPEN_ROUTER_MODEL || DEFAULT_OPEN_ROUTER_MODEL
const FALLBACK_MODEL = process.env.AVATAR_OPEN_ROUTER_FALLBACK_MODEL || MODEL

const MAX_TOKENS = 2048
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

  const { message, history, context } = req.body ?? {}
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ reply: null, reason: 'missing_message' })
  }

  const lang = context?.lang === 'he' ? 'he' : 'he' // Hebrew-first app; default he regardless of context for now
  const systemPrompt = buildSystemPrompt(lang)
  const priorTurns = Array.isArray(history) ? history.slice(-10) : []

  if (!openRouterConfigured()) {
    console.error('OPEN_ROUTER_KEY is not set — avatar chat unavailable')
    return res.status(503).json({ reply: null, reason: 'not_configured' })
  }

  const messages = [
    ...priorTurns.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.text || '').slice(0, 2000) })),
    { role: 'user', content: message.slice(0, 2000) },
  ]

  const { data, lastError } = await callOpenRouter({
    systemPrompt, messages, model: MODEL, fallbackModel: FALLBACK_MODEL, maxTokens: MAX_TOKENS, jsonMode: true,
  })

  if (!data) {
    console.error('avatar chat: OpenRouter call failed —', lastError)
    return res.status(500).json({ reply: null, reason: 'api_error' })
  }

  return respondFromText(res, openRouterText(data))
}

/** Shared JSON-extract + validate + respond tail. */
function respondFromText(res, text) {
  try {
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
    console.error('avatar chat: could not read model response', err instanceof Error ? err.message : err)
    return res.status(500).json({ reply: null, reason: 'api_error' })
  }
}
