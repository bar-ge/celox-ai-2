// Meeting reminders — 24h and 1h before a booked demo, sent over WhatsApp.
// Bar's spec (2026-09-29), wording verbatim:
//
//   מזכיר — נתראה ב-29.09.2026 בשעה 09:45 ✅
//   📞 אופן השיחה: Google Meet + <link>
//   אם משהו משתנה, פשוט תכתוב לי כאן ואשנה.
//
// Same date/time formatting as the original booking confirmation
// (splitSlotHe, google-calendar.js) so a reminder reads like a continuation
// of that message, not a different voice.

import { splitSlotHe } from './google-calendar.js'

const HOUR_MS = 60 * 60 * 1000
// Wider than the cron's 15-minute cadence so a late or skipped run still
// catches a reminder that fell inside its window — see reminderDue below.
const WINDOW_MS = 20 * 60 * 1000

/**
 * @param {Record<string, unknown>} lead
 * @returns {string}
 */
export function reminderMessage(lead) {
  const { date, time } = splitSlotHe(/** @type {string} */ (lead.meeting_at))
  const link = lead.meeting_url ? ` ${lead.meeting_url}` : ''
  return (
    `מזכיר — נתראה ב-${date} בשעה ${time} ✅\n` +
    `📞 אופן השיחה: Google Meet${link}\n` +
    `אם משהו משתנה, פשוט תכתוב לי כאן ואשנה.`
  )
}

/**
 * Should this lead get the 24h or 1h reminder right now? Same shape as
 * followupDue() in followups.js — a pure, testable check the cron handler
 * just acts on, instead of burying the window math inline in the handler.
 *
 * Each lead's meeting_at is one fixed instant, so "24 hours before" and
 * "1 hour before" are just two moments on that timeline. This asks, for
 * each one, "did we just cross this mark since the last run?" WINDOW_MS is
 * wider than the cron interval on purpose, so one delayed or skipped run
 * doesn't silently drop a reminder — the two sent_at columns make
 * re-checking a lead that already got one harmless rather than needing the
 * window to be exact.
 *
 * @param {Record<string, unknown>} lead
 * @param {Date} [now]
 * @returns {{ due: false } | { due: true, kind: '24h' | '1h' }}
 */
export function reminderDue(lead, now = new Date()) {
  if (lead.bot_paused || lead.opted_out) return { due: false }
  if (!lead.meeting_at || !lead.meeting_url) return { due: false }

  const msUntil = new Date(/** @type {string} */ (lead.meeting_at)).getTime() - now.getTime()
  if (msUntil <= 0) return { due: false }

  const due24h = !lead.reminder_24h_sent_at && msUntil <= 24 * HOUR_MS && msUntil > 24 * HOUR_MS - WINDOW_MS
  if (due24h) return { due: true, kind: '24h' }

  const due1h = !lead.reminder_1h_sent_at && msUntil <= 1 * HOUR_MS && msUntil > 1 * HOUR_MS - WINDOW_MS
  if (due1h) return { due: true, kind: '1h' }

  return { due: false }
}
