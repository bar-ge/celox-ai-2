// TCEL-054 — LLM API connection.
//
// Vendor: OpenRouter (api/avatar/chat.js), switched 2026-09-28 at Bar's
// request — same move made for the WhatsApp lead agent (api/_lib/claude.js)
// at the same time, both now on a single OpenRouter key/API instead of each
// surface carrying its own vendor integration. See
// api/_lib/openrouter-llm.js for the shared client and full rationale.
//
// The API key lives server-side only (OPEN_ROUTER_KEY). This client never
// talks to OpenRouter directly from the browser — it always goes through the
// app's own backend, same as every other API call in this codebase.
//
// 2026-09-28 — now also sends the caller's Supabase session token, the same
// way src/fleet-manager.jsx already does for its own API calls (see its
// supabase.auth.getSession() use). The backend verifies this itself and
// resolves which company's data to scope any live-data tool call to — it
// never trusts anything this client sends about who's asking. Without a
// session (or if getSession() fails) the request still goes through; the
// avatar just answers from static knowledge instead of live fleet data.

import { supabase } from '../supabaseClient'

/**
 * @typedef {object} AvatarReply
 * @property {string} reply
 * @property {'qa'|'navigate'|'escalate'|'unclear'} intent
 * @property {string|null} actionId
 * @property {number} confidence  0..1
 */

const CONFIDENCE_THRESHOLD = 0.55

/**
 * @param {object} args
 * @param {string} args.message
 * @param {{role: 'user'|'assistant', text: string}[]} args.history
 * @param {{route: string, lang: string, companyId?: string|null}} args.context  companyId is the dashboard's currently active company (see AvatarWidget.jsx); the backend only trusts it from a re-verified master session
 * @returns {Promise<AvatarReply>}
 */
export async function askAvatar({ message, history, context }) {
  try {
    let token = null
    try {
      const { data: { session } } = await supabase.auth.getSession()
      token = session?.access_token ?? null
    } catch {
      /* no session available — proceed without it, backend degrades gracefully */
    }

    const res = await fetch('/api/avatar/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        history: history.slice(-10), // keep the request small
        context,
      }),
    })

    if (!res.ok) {
      return fallbackReply(context.lang, res.status === 503 ? 'not_configured' : 'error')
    }

    const data = await res.json()
    if (typeof data?.reply !== 'string') return fallbackReply(context.lang, 'error')

    return {
      reply: data.reply,
      intent: ['qa', 'navigate', 'escalate', 'unclear'].includes(data.intent) ? data.intent : 'unclear',
      actionId: typeof data.actionId === 'string' ? data.actionId : null,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0,
    }
  } catch {
    return fallbackReply(context.lang, 'network')
  }
}

export function isLowConfidence(reply) {
  return reply.intent === 'unclear' || reply.confidence < CONFIDENCE_THRESHOLD
}

function fallbackReply(lang, reason) {
  const he = reason === 'not_configured'
    ? 'העוזר עדיין לא מוגדר במערכת (חסר מפתח API בצד השרת). פנו לתמיכה.'
    : 'לא הצלחתי להתחבר כרגע. נסו שוב בעוד רגע.'
  const en = reason === 'not_configured'
    ? "The assistant isn't configured yet (missing server-side API key). Contact support."
    : "I couldn't connect right now. Please try again in a moment."
  return { reply: lang === 'he' ? he : en, intent: 'unclear', actionId: null, confidence: 0 }
}
