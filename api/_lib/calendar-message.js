// Deterministic builder for spec section 10's "summary + real slots" message
// (fold-in of the email ask included, per the later fix to that section).
//
// Used in two places that both need to be immune to the model inventing or
// misformatting dates instead of using the real calendar: api/wa/webhook.js,
// the moment a lead first reaches CALENDAR_OPTIONS (observed once fabricating
// slots in January when the real calendar had next-week openings — a lead
// caught it and asked for something sooner before any real slot was ever
// offered), and api/wa/nudge.js, the dashboard's manual "Ask for real dates"
// recovery action for a conversation the agent otherwise stalled on.

import { MANAGEMENT_LABEL } from './system-prompt.js'

/**
 * @param {Record<string, unknown>} lead
 * @param {{ label: string }[]} suggested
 * @returns {string}
 */
export function summaryAndSlotsMessage(lead, suggested) {
  const managementLabel = lead.current_management
    ? MANAGEMENT_LABEL[lead.current_management] || lead.current_management
    : null

  const painClause = lead.main_pain ? `, והנושא המרכזי שחשוב לכם הוא ${lead.main_pain}` : ''
  const fleetClause = lead.fleet_size != null ? lead.fleet_size : (lead.fleet_size_raw || '')

  const intro = managementLabel
    ? `הבנתי. אתם מנהלים כ־${fleetClause} באמצעות ${managementLabel}${painClause}.`
    : `הבנתי. אתם מנהלים כ־${fleetClause} כלי רכב${painClause}.`

  const slotLines = suggested.map((s) => s.label).join('\n')

  return (
    `${intro}\n` +
    `בשיחה קצרה עם הצוות שלנו נראה לכם את החלקים הרלוונטיים במערכת ונבדוק אם CELOX AI מתאימה לכם. ` +
    `לא שיחת מכירה בלחץ ולא התחייבות לכלום.\n` +
    `אלה המועדים הקרובים שפנויים:\n\n${slotLines}\n\n` +
    `איזה מהם הכי נוח לך, ולאיזה כתובת מייל אשלח את ההזמנה לפגישה?`
  )
}
