// TCEL-054 — LLM API connection.
//
// Vendor decision: this project already has @anthropic-ai/sdk wired up and paid
// for (see api/_lib/claude.js, used by the WhatsApp lead agent), so the avatar
// backend (api/avatar/chat.js) reuses that same Anthropic setup rather than
// introducing a second vendor. That's a reasonable default given existing
// infra, but Bar should confirm it — it does add call volume/cost on top of
// the WA agent's usage.
//
// The API key lives server-side only (ANTHROPIC_API_KEY). This client never
// talks to Anthropic directly from the browser — it always goes through the
// app's own backend, same as every other API call in this codebase.

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
 * @param {{route: string, lang: string}} args.context
 * @returns {Promise<AvatarReply>}
 */
export async function askAvatar({ message, history, context }) {
  try {
    const res = await fetch('/api/avatar/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
