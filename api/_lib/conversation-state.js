// CURRENT_CONVERSATION_STAGE — spec section 14.
// Statuses — spec section 23.

/** @typedef {'OPENING'|'ROLE'|'FLEET_SIZE'|'CURRENT_MANAGEMENT'|'EXISTING_SYSTEM'|'MAIN_PAIN'|'WHY_NOW'|'PROCESS_EXPLANATION'|'CALENDAR_OPTIONS'|'MEETING_CONFIRMATION'|'MEETING_BOOKED'|'HUMAN_HANDOFF'|'NOT_RELEVANT'|'OPT_OUT'} Stage */

export const STAGES = /** @type {Stage[]} */ ([
  'OPENING',
  'ROLE',
  'FLEET_SIZE',
  'CURRENT_MANAGEMENT',
  'EXISTING_SYSTEM',
  'MAIN_PAIN',
  'WHY_NOW',
  'PROCESS_EXPLANATION',
  'CALENDAR_OPTIONS',
  'MEETING_CONFIRMATION',
  'MEETING_BOOKED',
  'HUMAN_HANDOFF',
  'NOT_RELEVANT',
  'OPT_OUT',
])

/** Stages at which the script is finished and no follow-up question is owed. */
export const TERMINAL_STAGES = /** @type {Stage[]} */ ([
  'MEETING_BOOKED',
  'HUMAN_HANDOFF',
  'NOT_RELEVANT',
  'OPT_OUT',
])

/** Ordered qualification stages — used to work out the next unanswered question. */
const QUALIFICATION_ORDER = /** @type {Stage[]} */ ([
  'OPENING',
  'ROLE',
  'FLEET_SIZE',
  'CURRENT_MANAGEMENT',
  'EXISTING_SYSTEM',
  'MAIN_PAIN',
  'WHY_NOW',
  'PROCESS_EXPLANATION',
  'CALENDAR_OPTIONS',
  'MEETING_CONFIRMATION',
  'MEETING_BOOKED',
])

export const STATUSES = [
  'ליד חדש',
  'נשלחה הודעת פתיחה',
  'הליד הגיב',
  'בתהליך חימום',
  'הושלם אפיון ראשוני',
  'ממתין לבחירת מועד',
  'נקבעה פגישה',
  'הועבר לנציג',
  'ביקש לחזור בהמשך',
  'לא מתאים',
  'לא הגיב',
  'ביקש הסרה',
]

/** @param {unknown} v @returns {v is Stage} */
export const isStage = (v) => typeof v === 'string' && STAGES.includes(/** @type {Stage} */ (v))

/** @param {unknown} v @returns {boolean} */
export const isStatus = (v) => typeof v === 'string' && STATUSES.includes(v)

/** @param {Stage} stage @returns {boolean} */
export const isTerminal = (stage) => TERMINAL_STAGES.includes(stage)

/**
 * The first qualification question that still has no answer on the lead row.
 * This is what a follow-up resumes from (spec section 20) and what the agent is
 * told to return to after answering a side question (spec section 14).
 *
 * @param {Record<string, unknown>} lead
 * @returns {Stage}
 */
export function nextUnansweredStage(lead) {
  if (!lead) return 'OPENING'
  if (lead.opted_out) return 'OPT_OUT'
  if (lead.meeting_at) return 'MEETING_BOOKED'
  if (lead.bot_paused) return 'HUMAN_HANDOFF'

  if (!lead.role) return 'ROLE'
  if (lead.fleet_size == null && !lead.fleet_size_raw) return 'FLEET_SIZE'
  if (!lead.current_management) return 'CURRENT_MANAGEMENT'
  // existing_system, main_pain and why_now are no longer blocking questions at all
  // (compressed script, 2026-08 — Bar asked to skip them outright, not just fold
  // them together). The agent moves straight from current_management to the
  // meeting. All three fields are still captured and shown in the CRM if the lead
  // volunteers them unprompted; nothing was removed from the data model.

  // Role, fleet size and management are all in — move straight to the meeting.
  const stage = /** @type {Stage} */ (lead.stage)
  if (isStage(stage) && QUALIFICATION_ORDER.indexOf(stage) >= QUALIFICATION_ORDER.indexOf('PROCESS_EXPLANATION')) {
    return stage
  }
  return 'PROCESS_EXPLANATION'
}

/**
 * Minimum information needed before the agent may move to booking (spec section 10):
 * role, fleet size and current management method.
 * @param {Record<string, unknown>} lead
 */
export const isQualified = (lead) =>
  Boolean(lead?.role) &&
  (lead?.fleet_size != null || Boolean(lead?.fleet_size_raw)) &&
  Boolean(lead?.current_management)

/**
 * Status derived from where the conversation actually is (spec section 23).
 * Never downgrades a status that has already moved past this point.
 *
 * @param {Record<string, unknown>} lead
 * @param {{ stage: Stage, hasInbound: boolean, requiresHuman?: boolean, optedOut?: boolean }} ctx
 * @returns {string}
 */
export function deriveStatus(lead, ctx) {
  if (ctx.optedOut || lead?.opted_out) return 'ביקש הסרה'
  if (ctx.requiresHuman || ctx.stage === 'HUMAN_HANDOFF') return 'הועבר לנציג'
  if (ctx.stage === 'NOT_RELEVANT') return 'לא מתאים'
  if (ctx.stage === 'MEETING_BOOKED' || lead?.meeting_at) return 'נקבעה פגישה'
  if (ctx.stage === 'CALENDAR_OPTIONS' || ctx.stage === 'MEETING_CONFIRMATION') return 'ממתין לבחירת מועד'
  if (isQualified({ ...lead })) return 'הושלם אפיון ראשוני'
  if (ctx.hasInbound && ctx.stage !== 'OPENING') return 'בתהליך חימום'
  if (ctx.hasInbound) return 'הליד הגיב'
  return 'נשלחה הודעת פתיחה'
}
