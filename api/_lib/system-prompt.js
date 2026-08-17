import { CELOX_INFO_PROMPT } from './celox-info.js'
import { PRODUCT_KNOWLEDGE } from './product-knowledge.js'
import { CONVERSATION_SCRIPT } from './conversation-script.js'
import { INTENT_VALUES } from './intents.js'
import { STAGES, nextUnansweredStage, isQualified } from './conversation-state.js'

const MANAGEMENT_LABEL = {
  excel: 'אקסלים ועבודה ידנית',
  system: 'מערכת ייעודית',
  mixed: 'שילוב של מערכת ועבודה ידנית',
  none: 'אין תהליך אחיד',
}

const OUTPUT_CONTRACT = `# פורמט הפלט

החזר JSON תקין בלבד. בלי טקסט לפני או אחרי, בלי גדרות markdown, בלי הסברים.

{
  "reply": "ההודעה בעברית שתישלח ללקוח ב-WhatsApp",
  "intent": "אחד מהערכים: ${INTENT_VALUES.join(' | ')}",
  "next_stage": "אחד מהערכים: ${STAGES.join(' | ')}",
  "extracted": {
    "first_name": null,
    "company": null,
    "role": null,
    "fleet_size": null,
    "current_management": null,
    "existing_system": null,
    "main_pain": null,
    "why_now": null,
    "email": null
  },
  "open_question": null,
  "requires_human": false,
  "conversation_complete": false,
  "selected_slot": null
}

כללי מילוי:
- intent מתאר את ההודעה הנכנסת של הליד, לא את התשובה שלך.
- extracted מכיל רק שדות שנלמדו מההודעה הנוכחית. כל שאר השדות null. אל תחזור על
  ערכים שכבר ידועים ואל תנחש.
- fleet_size הוא מספר שלם בלבד. אם הליד נתן טווח או הערכה, החזר את המספר הקרוב
  ביותר; אם באמת אין מספר, השאר null.
- current_management הוא אחד מ: excel, system, mixed, none.
- open_question מכיל שאלה שלא ידעת לענות עליה ושצריך להעביר לצוות, אחרת null.
- requires_human הוא true רק כשהליד ביקש אדם, כשהוא כועס, או כשאין דרך להמשיך.
- conversation_complete הוא true רק אחרי אישור פגישה, בקשת הסרה, או העברה לנציג.
- selected_slot: כשהליד אישר במפורש מועד, החזר את המזהה שלו בפורמט
  "YYYY-MM-DD HH:MM" (שעון ישראל), בדיוק כפי שהוא מופיע ברשימת היומן. בכל מצב
  אחר החזר null. אל תמציא מזהה ואל תחזיר מזהה שאינו ברשימה — המערכת מאמתת אותו
  מול היומן ותתעלם ממנו אם הוא אינו פנוי.

מגבלות על שדה reply:
- עברית, אלא אם הליד כתב בשפה אחרת.
- עד 4 משפטים. הודעה אחת בלבד, באורך שמתאים ל-WhatsApp.
- בלי בולטים, בלי רשימות ממוספרות, בלי כותרות markdown.
- למעט המקרים בסעיף 3 בתסריט — ההודעה חייבת להסתיים בשאלת ההמשך של השלב הפתוח.
- שאלה מרכזית אחת בהודעה.`

/**
 * @param {Record<string, unknown>} lead
 * @returns {string}
 */
function leadStateBlock(lead) {
  const known = []
  const push = (label, value) => { if (value !== null && value !== undefined && value !== '') known.push(`- ${label}: ${value}`) }

  push('שם פרטי', lead.first_name)
  push('שם החברה', lead.company)
  push('תפקיד', lead.role)
  push('מספר כלי רכב', lead.fleet_size != null ? lead.fleet_size : lead.fleet_size_raw)
  push('אופן ניהול כיום', lead.current_management ? MANAGEMENT_LABEL[lead.current_management] || lead.current_management : null)
  push('מערכת קיימת', lead.existing_system)
  push('כאב מרכזי', lead.main_pain)
  push('למה עכשיו', lead.why_now)
  push('דוא״ל', lead.email)
  push('מועד פגישה שנקבע', lead.meeting_at)

  const openQs = Array.isArray(lead.open_questions) ? lead.open_questions : []
  const resume = nextUnansweredStage(lead)

  return `# מצב הליד כרגע (מתוך ה-CRM)

${known.length ? known.join('\n') : '- עדיין לא נאסף מידע.'}

השלב השמור: ${lead.stage || 'OPENING'}
השלב הפתוח שאליו יש לחזור: ${resume}
אפיון בסיסי הושלם (תפקיד + גודל צי + אופן ניהול): ${isQualified(lead) ? 'כן' : 'לא'}
${openQs.length ? `שאלות פתוחות שכבר תועדו: ${openQs.join(' | ')}` : ''}

אל תשאל שוב על אף פרט שמופיע ברשימה למעלה. אם הליד מסר כמה פרטים בהודעה אחת,
חלץ את כולם ודלג ישירות לשאלה החסרה הבאה.`
}

const HE_WEEKDAY = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת']

/**
 * The calendar block: three slots to offer, plus every open slot so a
 * lead-requested time can be answered truthfully rather than deflected.
 *
 * @param {{ key: string, label: string }[]} slots      every open slot
 * @param {{ key: string, label: string }[]} suggested  the three to offer
 * @returns {string}
 */
function slotsBlock(slots, suggested) {
  if (!slots || slots.length === 0) {
    return `# מועדים ביומן

אין כרגע רשימת מועדים זמינה. אל תציע שעות ואל תאשר שעה שהליד ביקש. אם הליד רוצה
לקבוע — אמור שאתה בודק מול היומן ותחזור עם מועדים.`
  }

  // Group by local date so a fortnight of slots stays readable and cheap.
  /** @type {Map<string, string[]>} */
  const byDay = new Map()
  for (const s of slots) {
    const [date, time] = s.key.split(' ')
    if (!byDay.has(date)) byDay.set(date, [])
    byDay.get(date).push(time)
  }

  const lines = []
  for (const [date, times] of byDay) {
    const [y, m, d] = date.split('-').map(Number)
    const weekday = HE_WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
    lines.push(`${date} (${weekday}): ${times.join(', ')}`)
  }

  return `# היומן

## המועדים שיש להציע ביוזמתך
${suggested.map((s, i) => `${i + 1}. ${s.label}   — מזהה: ${s.key}`).join('\n')}

כשאתה עובר לשלב CALENDAR_OPTIONS, הצג את שלושת אלה בלבד, בטקסט שלהם (בלי המזהה).

## כל המועדים הפנויים ביומן
כל שורה היא תאריך ואחריה כל השעות הפנויות בו:

${lines.join('\n')}

איך להשתמש ברשימה הזו:
- אם הליד מבקש יום ושעה מסוימים, בדוק אותם מול הרשימה. אם השעה מופיעה — אשר
  אותה והמשך לשלב אישור הפגישה. אם היא אינה מופיעה — אמור זאת בפשטות והצע את
  השעות הקרובות ביותר באותו יום, או את היום הפנוי הקרוב.
- אם הליד מבקש יום בלי שעה, הצע שתיים-שלוש שעות מאותו יום.
- אל תמציא מועד שאינו ברשימה, ואל תאשר שעה לפני שראית אותה כאן.
- המזהה של כל מועד הוא בפורמט "YYYY-MM-DD HH:MM" — למשל "${slots[0].key}".`
}

/**
 * Build the full system prompt for one turn.
 *
 * @param {object} args
 * @param {Record<string, unknown>} args.lead        current leads row
 * @param {{ key: string, label: string }[]} [args.slots]      every open Calendly slot
 * @param {{ key: string, label: string }[]} [args.suggested]  the three to offer unprompted
 * @param {number} [args.meetingMinutes]             meeting length, if known
 * @param {string} [args.meetingKind]                'טלפון' | 'Zoom' | 'Google Meet'
 * @returns {string}
 */
export function buildSystemPrompt({ lead, slots = [], suggested, meetingMinutes, meetingKind }) {
  return [
    'אתה סוכן ה-AI של CELOX AI שמנהל שיחות WhatsApp ראשוניות עם לידים.',
    'התסריט למטה הוא ההנחיה המחייבת שלך. פעל לפיו במדויק.',
    '',
    CELOX_INFO_PROMPT,
    PRODUCT_KNOWLEDGE,
    '# תסריט השיחה',
    '',
    CONVERSATION_SCRIPT,
    '',
    leadStateBlock(lead),
    '',
    slotsBlock(slots, suggested?.length ? suggested : slots.slice(0, 3)),
    meetingMinutes || meetingKind
      ? `\nפרטי הפגישה שאפשר למסור: ${[meetingKind, meetingMinutes ? `כ־${meetingMinutes} דקות` : null].filter(Boolean).join(', ')}.`
      : '\nאל תמסור משך פגישה או אופן פגישה שלא נמסרו לך.',
    '',
    OUTPUT_CONTRACT,
  ].join('\n')
}

export { MANAGEMENT_LABEL }
