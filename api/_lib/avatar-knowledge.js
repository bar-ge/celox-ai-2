// TCEL-056 — system knowledge base for the in-app avatar assistant.
//
// This is real content, built from what's actually in src/fleet-manager.jsx
// (tab list, terminology, form templates) rather than a placeholder — but it
// is necessarily incomplete: it doesn't cover every screen, connector, or
// edge case in the app. Extend it as the assistant's Q&A misses land.

export const APP_TABS = [
  { id: 'dashboard', he: 'לוח בקרה', en: 'Dashboard', desc: 'תמונת מצב כללית של הצי — רכבים, נהגים, סטטוסים והתראות.' },
  { id: 'cars', he: 'רכבים', en: 'Fleet', desc: 'רשימת הרכבים: מסמכים, ביטוחים, טסטים, תחזוקה וקבצים לכל רכב.' },
  { id: 'drivers', he: 'נהגים', en: 'Drivers', desc: 'ניהול נהגים, רישיונות, שיוך לרכבים והיסטוריית נהיגה.' },
  { id: 'branches', he: 'סניפים', en: 'Branches', desc: 'ניהול סניפי החברה וההיררכיה הארגונית.' },
  { id: 'costs', he: 'עלויות', en: 'Costs', desc: 'מעקב הוצאות — דלק, אגרות, תיקונים ועלויות נוספות, לפי רכב או סניף.' },
  { id: 'violations', he: 'קנסות', en: 'Violations', desc: 'ניהול דוחות תנועה, כולל הסבת דוח לנהג הרלוונטי.' },
  { id: 'integrations', he: 'אינטגרציות', en: 'Integrations', desc: 'חיבורים לספקים חיצוניים (דלקן, GPS, חשבשבת וכו׳).' },
  { id: 'reports', he: 'דוחות', en: 'Reports', desc: 'הפקת דוחות מרוכזים על הצי.' },
  { id: 'settings', he: 'הגדרות', en: 'Settings', desc: 'הגדרות חברה, משתמשים והרשאות.' },
]

// Inspection form templates that actually exist (src/formTemplates.js).
export const FORM_TEMPLATES = [
  'בדיקה תקופתית (WI-1001)',
  'בטיחות מלגזה (PPU-203)',
  'בטיחות נגרר (PPU-202)',
  'בטיחות משאית (PPU-201)',
]

export const DOMAIN_TERMS = [
  'שווי שימוש — the taxable value of a company car used privately by an employee (income tax term).',
  'נוהל 6 — Israeli workplace safety-complaint procedure; מוקד בטיחות 365 is a related safety hotline/ingestion channel.',
  'דלקן — an Israeli fuel-card provider (also פז, דור אלון, טן).',
  'כביש 6 / דרך ארץ — Israeli toll roads; toll charges are tracked as a cost line under "עלויות".',
  'חשבשבת — a common Israeli accounting software; a planned connector target.',
  'הסבת דוח — transferring a traffic fine from the company to the driver who was actually driving.',
]

export function buildSystemPrompt(lang) {
  const tabList = APP_TABS.map(t => `- ${t.id}: "${lang === 'he' ? t.he : t.en}" — ${t.desc}`).join('\n')
  const terms = DOMAIN_TERMS.join('\n- ')

  return `אתה עוזר בתוך אפליקציית CELOX לניהול צי רכב ישראלי. ענה בקצרה, ישירות, וללא נימוס מוגזם — פונה למנהל צי, לא ללקוח קצה.

מסכי האפליקציה הזמינים לניווט (id לשימוש בשדה actionId, בפורמט go_<id>):
${tabList}

מונחים בתחום:
- ${terms}

תפקידך:
1. לענות על שאלות לגבי האפליקציה (intent: "qa").
2. אם המשתמש מבקש לעבור למסך מסוים — להחזיר intent "navigate" עם actionId מתאים (go_dashboard, go_cars, go_drivers, go_branches, go_costs, go_violations, go_integrations, go_reports, go_settings).
3. אם המשתמש מדווח על תקלה, בעיית בטיחות, או רוצה לפתוח פנייה — להחזיר intent "escalate".
4. אם אינך בטוח בכוונת המשתמש — להחזיר intent "unclear" ו-confidence נמוך, ולבקש הבהרה. אל תנחש.

החזר תמיד JSON תקין בלבד, בפורמט:
{"reply": string, "intent": "qa"|"navigate"|"escalate"|"unclear", "actionId": string|null, "confidence": number 0-1}`
}
