// WhatsApp lead-agent spam guard (Bar's request, 2026-10-11).
//
// Bar's three decisions, verbatim:
//   1. block links
//   2. 2-3 spam bot should stop responding
//   3. is show on wab filter
//
// "block links" is read literally and generically: ANY message containing a
// link is spam, whatever the domain. Deliberately NOT a tiktok.com/aliexpress.com
// blocklist — a domain list needs constant upkeep and misses the next site a
// spammer tries; detecting "this looks like a URL" catches all of them at once,
// including ones nobody has seen yet.
//
// "2-3 ... should stop responding" is read as: every link-containing message
// is still a strike (never gets an LLM reply, ever — no "first one's free"),
// and once a lead has sent SPAM_STRIKE_LIMIT of them, the whole conversation is
// paused the same way a human handoff pauses it — the bot goes fully silent
// for that lead, not just for link messages.

import { serviceClient, LEADS } from './supabase.js'

/** Strikes before the lead is auto-paused (bot_paused: true) entirely. */
export const SPAM_STRIKE_LIMIT = 3

// Generic URL/domain detector — not tied to any specific site.
//   - scheme-prefixed: http://..., https://...
//   - www.-prefixed bare domains: www.example.com
//   - bare "word.tld" shapes for the common TLDs spam links actually use,
//     optionally followed by a path (example.com/x, aliexpress.com, t.co/x)
// False positives are possible (e.g. a lead typing "menora.co.il" as their own
// insurer) but Bar's instruction was literal ("block links"), and a link is
// exactly the kind of thing a qualified fleet-manager lead has no reason to
// send the bot.
const SCHEME_RE = /https?:\/\/\S+/i
const WWW_RE = /\bwww\.[a-z0-9-]+\.[a-z]{2,}\b/i
const BARE_DOMAIN_RE = /\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|net|org|co|io|il|me|shop|store|link|ly|gl|xyz|info|biz|app|vip|top|club|site|co\.il|net\.il|org\.il)\b(?:\/\S*)?/i

/**
 * @param {string|null|undefined} text
 * @returns {boolean}
 */
export function containsLink(text) {
  if (!text || typeof text !== 'string') return false
  return SCHEME_RE.test(text) || WWW_RE.test(text) || BARE_DOMAIN_RE.test(text)
}

/**
 * Increments the lead's spam strike counter and auto-pauses the bot once the
 * limit is reached. Never throws — a failure here must not break the message
 * pipeline, it just means this one strike wasn't counted.
 *
 * @param {string} phone
 * @returns {Promise<number>} the strike count after this message (0 on failure)
 */
export async function recordSpamStrike(phone) {
  const db = serviceClient()
  const { data: lead, error: readErr } = await db
    .from(LEADS).select('spam_strikes').eq('phone', phone).maybeSingle()
  if (readErr) {
    console.error('spam strike read failed', readErr.message)
    return 0
  }

  const next = (lead?.spam_strikes ?? 0) + 1
  /** @type {Record<string, unknown>} */
  const patch = { spam_strikes: next }
  if (next >= SPAM_STRIKE_LIMIT) {
    // Same gate respond() already checks for a human handoff — reusing it
    // means a spammer goes fully silent with zero extra code in the turn loop.
    patch.bot_paused = true
    patch.status = 'ספאם'
  }

  const { error } = await db.from(LEADS).update(patch).eq('phone', phone)
  if (error) console.error('spam strike write failed', error.message)
  return next
}
