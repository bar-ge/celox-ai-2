// Company facts the agent is allowed to state. Nothing outside this file and
// product-knowledge.js may be presented to a lead as fact.

export const CELOX_INFO = {
  name: 'CELOX AI',
  product: 'מערכת לניהול צי רכב',
  email: 'office@celoxai.com',
  site: 'https://celoxai.com',
  timezone: 'Asia/Jerusalem',
  language: 'he',
  hours: {
    days: [0, 1, 2, 3, 4], // Sunday–Thursday (JS getDay)
    startHour: 9,
    endHour: 17,
    label: 'ראשון–חמישי, 09:00–17:00',
  },
}

export const CELOX_INFO_PROMPT = `# פרטי החברה

- שם: ${CELOX_INFO.name}
- מוצר: ${CELOX_INFO.product}
- דוא״ל: ${CELOX_INFO.email}
- שעות פעילות: ${CELOX_INFO.hours.label} (שעון ישראל)
- שפת השיחה: עברית. אם הליד כותב בשפה אחרת — ענה באותה שפה.
`
