import { CELOX_INFO } from './celox-info.js'
import { FOLLOWUP_PREAMBLE } from './conversation-script.js'
import { nextUnansweredStage } from './conversation-state.js'

const TZ = CELOX_INFO.timezone

// Spec section 20: a few hours → next day → one last time. Never a fourth.
//
// Each delay is measured from the last thing we sent (or the lead's last
// message, for the first one). The 20h figures are under a day on purpose: the
// cron only fires once each business morning on Vercel's free plan, so a delay
// of 22h+ would push a follow-up to the morning *after* the one it belongs to.
export const FOLLOWUP_DELAYS_MS = {
  1: 4 * 60 * 60 * 1000,
  2: 20 * 60 * 60 * 1000,
  3: 20 * 60 * 60 * 1000,
}

export const MAX_FOLLOWUPS = 3

/**
 * The script question that belongs to a stage. Used verbatim so a follow-up
 * resumes the script rather than restarting or inventing it.
 * @type {Record<string, string>}
 */
const STAGE_QUESTION = {
  OPENING: 'רוצה לראות אם אני גם מצחיק וגם פרקטי?',
  ROLE: 'מה התפקיד שלך בחברה?',
  FLEET_SIZE: 'כמה כלי רכב אתם מנהלים היום?',
  CURRENT_MANAGEMENT: 'איך אתם מנהלים כיום את צי הרכב — מערכת קיימת, אקסל או שילוב ביניהם?',
  EXISTING_SYSTEM: 'באיזו מערכת אתם משתמשים היום?',
  MAIN_PAIN: 'מה החלק שהכי גוזל מכם זמן היום: מעקב טיפולים, מסמכים ורישיונות, עבודה מול נהגים או הפקת תמונת מצב?',
  WHY_NOW: 'מה גרם לכם לבדוק את הנושא דווקא עכשיו?',
  PROCESS_EXPLANATION: 'מתי נוח לך שנראה לך איך אפשר לנהל את כל זה עם קצת פחות ניירת וקצת יותר רגל על רגל?',
  CALENDAR_OPTIONS: 'איזה יום ושעה יהיו לך נוחים?',
  MEETING_CONFIRMATION: 'לאשר את הפגישה למועד הזה?',
}

/**
 * Local wall-clock parts for a date in Asia/Jerusalem.
 * @param {Date} date
 * @returns {{ weekday: number, hour: number }} weekday 0=Sunday
 */
export function localParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, weekday: 'short', hour: 'numeric', hour12: false,
  }).formatToParts(date)

  const weekdayName = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { weekday: map[weekdayName] ?? 0, hour: hour === 24 ? 0 : hour }
}

/**
 * SUN–THU 09:00–17:00 Asia/Jerusalem.
 * @param {Date} [now]
 */
export function withinBusinessHours(now = new Date()) {
  const { weekday, hour } = localParts(now)
  const { days, startHour, endHour } = CELOX_INFO.hours
  return days.includes(weekday) && hour >= startHour && hour < endHour
}

/**
 * Should this lead get a follow-up right now?
 * @param {Record<string, unknown>} lead
 * @param {Date} [now]
 * @returns {{ due: boolean, number: number, reason: string }}
 */
export function followupDue(lead, now = new Date()) {
  if (lead.opted_out) return { due: false, number: 0, reason: 'opted_out' }
  if (lead.bot_paused) return { due: false, number: 0, reason: 'bot_paused' }
  if (lead.meeting_at) return { due: false, number: 0, reason: 'meeting_booked' }

  const count = Number(lead.followup_count) || 0
  if (count >= MAX_FOLLOWUPS) return { due: false, number: 0, reason: 'max_reached' }

  const next = count + 1
  const anchor = lead.last_followup_at || lead.last_inbound_at || lead.updated_at || lead.created_at
  if (!anchor) return { due: false, number: 0, reason: 'no_anchor' }

  const elapsed = now.getTime() - new Date(anchor).getTime()
  if (elapsed < FOLLOWUP_DELAYS_MS[next]) return { due: false, number: next, reason: 'too_soon' }
  if (!withinBusinessHours(now)) return { due: false, number: next, reason: 'outside_business_hours' }

  return { due: true, number: next, reason: 'due' }
}

/**
 * The follow-up text: the section 20 preamble plus the question the lead never
 * answered. Never restarts the script, never invents a new question.
 *
 * @param {Record<string, unknown>} lead
 * @param {1|2|3} number
 * @returns {string}
 */
export function followupMessage(lead, number) {
  if (number === 3) return FOLLOWUP_PREAMBLE[3]

  const stage = nextUnansweredStage(lead)
  const question = STAGE_QUESTION[stage] ?? STAGE_QUESTION.FLEET_SIZE

  if (number === 1) return `${FOLLOWUP_PREAMBLE[1]}\nאז ${question}`
  return `${FOLLOWUP_PREAMBLE[2](lead.first_name)} ${question}`
}

export { STAGE_QUESTION }
