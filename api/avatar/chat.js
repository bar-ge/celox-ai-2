import { buildSystemPrompt } from '../_lib/avatar-knowledge.js'
import { callOpenRouterRaw, openRouterMessage, openRouterText, openRouterConfigured, DEFAULT_OPEN_ROUTER_MODEL } from '../_lib/openrouter-llm.js'
import { TOOL_DEFS, runTool } from '../_lib/avatar-tools.js'
import { requireUser } from '../_lib/auth.js'

// maxDuration left at 60 from the Gemini-era three-tier setup (on-prem → HF →
// Gemini). This route now does at most MAX_TOOL_ROUNDS+1 OpenRouter calls
// (one for each tool round trip, plus the final answer), comfortably inside
// that budget, but nobody asked to tune the ceiling down, so it's left as-is.
export const config = { maxDuration: 60 }

// TCEL-054 — LLM API connection for the in-app avatar.
//
// Vendor history: Anthropic → Gemini (2026-08-24) → OpenRouter (2026-09-28,
// Bar's request). See api/_lib/openrouter-llm.js for the shared client and
// full rationale, and api/_lib/claude.js for the WhatsApp agent's identical
// switch made the same day.
//
// 2026-09-28, same day — live fleet data. The avatar used to be pure static
// knowledge (app tabs, form templates, domain terms — see
// api/_lib/avatar-knowledge.js) with no way to answer a question like "how
// many cars do I have," so it correctly said "I don't know" rather than
// guess. Bar asked for the model to be able to look up real answers, and
// picked OpenRouter's standard tool-calling over a fixed pre-computed
// snapshot (see api/_lib/avatar-tools.js for the tool definitions and their
// rationale) so it can answer whatever shape of live-data question comes in.
//
// This means the route now needs to know WHO is asking, to scope any tool
// call to that person's own company and nobody else's — requireUser() in
// auth.js verifies the browser's Supabase session token server-side and
// resolves company_id from `profiles`, the same trust boundary every other
// dashboard API route in this app uses. If the token is missing or invalid,
// the assistant still answers from static knowledge — it just can't use the
// live-data tools for that request, rather than hard-failing the whole chat.
//
// OPEN_ROUTER_KEY must be set (Bar creates it at openrouter.ai/keys and
// pastes it into Vercel himself). If it isn't, this returns 503 rather than
// crashing — the frontend (src/avatar/llmClient.js) shows a "not configured"
// message instead of a silent failure.

const MODEL = process.env.AVATAR_OPEN_ROUTER_MODEL || DEFAULT_OPEN_ROUTER_MODEL
const FALLBACK_MODEL = process.env.AVATAR_OPEN_ROUTER_FALLBACK_MODEL || MODEL

const MAX_TOKENS = 2048
const VALID_INTENTS = ['qa', 'navigate', 'escalate', 'unclear']
const MAX_TOOL_ROUNDS = 2 // bounds latency/cost; also blocks a runaway tool-call loop

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

  // Never trust a client-supplied company/user id for tool scoping — resolve
  // it ourselves from the verified session, or fall back to no-tools mode.
  // The one exception: context.companyId (the dashboard's currently active
  // company — see AvatarWidget.jsx) is passed through as requestedCompanyId,
  // but requireUser() only honors it for a caller it independently
  // re-verifies as the master account server-side; everyone else's request
  // is silently ignored in favor of their own profiles.company_id. This
  // exists because the master "view as company" switcher is client-side
  // React state — it never changes whose company the session actually
  // belongs to — see the requestedCompanyId comment in auth.js for the bug
  // this fixed (the avatar answering from Bar's own small test company
  // while he was viewing a different one).
  const requestedCompanyId = typeof context?.companyId === 'string' ? context.companyId : null
  const auth = await requireUser(req, { requestedCompanyId })
  const companyId = auth.ok ? auth.companyId : null
  const tools = companyId ? TOOL_DEFS : undefined
  if (!auth.ok) console.warn('avatar chat: no verified session, answering without live-data tools —', auth.reason)

  const messages = [
    { role: 'system', content: systemPrompt },
    ...priorTurns.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.text || '').slice(0, 2000) })),
    { role: 'user', content: message.slice(0, 2000) },
  ]

  let lastError = null
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const isFinalRound = round === MAX_TOOL_ROUNDS
    // 🚨 2026-09-28: first shipped with jsonMode always on, on the assumption
    // response_format json_object and tools were independent — wrong, at
    // least for Groq (one of the providers OpenRouter can route this model
    // to): "Groq does not support response_format type json_object combined
    // with tool calling" (400, confirmed in production logs within minutes
    // of deploy). So: tools are only offered on a non-final round, and
    // jsonMode only forced on the final round once tools are off the table —
    // a round that offers tools leaves response_format unset and relies on
    // the system prompt's own "return valid JSON only" instruction plus
    // extractJson()'s markdown-fence/preamble stripping below for the case
    // where the model answers in plain content without calling a tool.
    const { data, lastError: err } = await callOpenRouterRaw({
      messages,
      model: MODEL,
      fallbackModel: FALLBACK_MODEL,
      maxTokens: MAX_TOKENS,
      jsonMode: isFinalRound,
      tools: !isFinalRound ? tools : undefined,
    })

    if (!data) {
      lastError = err
      break
    }

    const msg = openRouterMessage(data)
    const toolCalls = msg?.tool_calls
    if (Array.isArray(toolCalls) && toolCalls.length && !isFinalRound) {
      messages.push({ role: 'assistant', content: msg.content || '', tool_calls: toolCalls })
      // Run every requested call (models sometimes batch a couple together);
      // each is independently scoped to companyId, never to anything the
      // model passed in its arguments.
      for (const call of toolCalls) {
        let args = {}
        try { args = JSON.parse(call.function?.arguments || '{}') } catch { /* malformed args → empty */ }
        const result = await runTool(call.function?.name, args, companyId)
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.function?.name,
          content: JSON.stringify(result),
        })
      }
      continue // let the model see the tool result(s) and respond
    }

    // No tool call (or we're out of rounds) — this is the final answer.
    return respondFromText(res, openRouterText(data))
  }

  console.error('avatar chat: OpenRouter call failed —', lastError)
  return res.status(500).json({ reply: null, reason: 'api_error' })
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
