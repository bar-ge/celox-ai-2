// ── Ready-made inspection form templates ─────────────────────────────────────
// Transcribed from the customer's existing paper forms (Spuntech / N.R.Spuntech
// Industries Ltd.) so a fleet moving off paper finds the same checklist, in the
// same order, with the same wording.
//
// A template is just a factory that returns rows in the shape the custom-form
// builder already stores in form_links.fields, so nothing downstream changes:
// the public form, submissions and exports all keep working as they are.
//
// Every item is a `select` of תקין / לא תקין / לא רלוונטי rather than a yes/no,
// because an inspector needs to record "this assembly is not fitted on this
// vehicle" — with only two options that would be indistinguishable from a fault.

const uid = () => (crypto?.randomUUID?.() ?? `f_${Math.random().toString(36).slice(2)}`)

const STATUS_OPTIONS = ['תקין', 'לא תקין', 'לא רלוונטי']

const preset = (p, label, labelEn, required = false) =>
  ({ id: uid(), type: 'preset', preset: p, label, labelEn, required, options: [] })

const field = (type, label, labelEn, required = false) =>
  ({ id: uid(), type, label, labelEn, required, options: [] })

// One checklist row. `section` is folded into the label so the grouping from the
// paper form survives without needing a new field type in the builder.
const check = (section, label, labelEn) => ({
  id: uid(), type: 'select',
  label: section ? `${section} — ${label}` : label,
  labelEn: section ? `${section} — ${labelEn}` : labelEn,
  required: false, options: [...STATUS_OPTIONS],
})

// Free-text fault note that follows a group of checks.
const note = (label, labelEn) => field('textarea', label, labelEn)

// ── WI.PU.10.01 · טופס ביקורת תקופתית ────────────────────────────────────────
const PERIODIC_ITEMS = [
  ['מערכת פליטה', 'Exhaust system'],
  ['צירים-מיסבים', 'Hinges & bearings'],
  ['בולמי זעזועים קדמיים', 'Front shock absorbers'],
  ['דוושת בלם – גובה', 'Brake pedal – height'],
  ['בלם יד', 'Handbrake'],
  ['מצמד-דוושה', 'Clutch pedal'],
  ['תיבת הילוכים', 'Gearbox'],
  ['רדיאטור', 'Radiator'],
  ['מערכת קירור – משאבה', 'Cooling system – pump'],
  ['נזילת שמן', 'Oil leak'],
  ['צמיגים', 'Tyres'],
  ['בדיקות בנסיעה', 'Road-test checks'],
  ['מגבה', 'Jack'],
  ['גלגל נוסף', 'Spare wheel'],
  ['חגורות בטיחות', 'Seat belts'],
  ['מצבר', 'Battery'],
  ['אורות איתות', 'Indicator lights'],
  ['צופר', 'Horn'],
  ['מגבי שמשות', 'Windscreen wipers'],
  ['שעונים', 'Instrument gauges'],
  ['ניקיון כללי', 'General cleanliness'],
  ['צבע פח', 'Bodywork paint'],
  ['מראות', 'Mirrors'],
  ['משולש', 'Warning triangle'],
  ['רישיונות', 'Licences'],
  ['נסיעת מבחן', 'Test drive'],
  ['אפוד זוהר', 'Hi-vis vest'],
]

// ── P.PU.20.3 · ביקורת בטיחותית למלגזה דיזל/חשמלית ───────────────────────────
const FORKLIFT_GROUPS = [
  ['מנוע', 'Engine', [
    ['מערכת דלק דיזל', 'Diesel fuel system'],
    ['מערכת הזרקה', 'Injection system'],
    ['מערכת פליטה', 'Exhaust system'],
    ['נזילות שמן', 'Oil leaks'],
  ]],
  ['מערכת קירור', 'Cooling system', [
    ['משאבות מים + מאוורר', 'Water pumps + fan'],
    ['מצנן + רצועות', 'Radiator + belts'],
    ['צינורות + חיבורים', 'Hoses + connections'],
  ]],
  ['מערכת העברת כוח', 'Transmission', [
    ['תיבת הילוכים', 'Gearbox'],
    ['דיפרנציאל', 'Differential'],
    ['צירים + צלבים', 'Axles + universal joints'],
    ['נזילות שמן', 'Oil leaks'],
  ]],
  ['מערכת בלימה', 'Braking system', [
    ['יעילות בלימה', 'Braking efficiency'],
    ['בלם יד', 'Handbrake'],
    ['צינורות + חיבורים', 'Lines + connections'],
  ]],
  ['מערכת היגוי', 'Steering system', [
    ['בית ההגה', 'Steering box'],
    ['מוטות וחיבורים', 'Rods and joints'],
    ['יציבות היגוי', 'Steering stability'],
  ]],
  ['מתלה קדמי', 'Front suspension', [
    ['תפוחים + זרועות', 'Ball joints + arms'],
    ['מיסבי גלילים', 'Roller bearings'],
  ]],
  ['מערכת חשמל', 'Electrical system', [
    ['מצבר', 'Battery'],
    ['מתנע', 'Starter'],
    ['אלטרנטור', 'Alternator'],
    ['אורות, צופר', 'Lights, horn'],
  ]],
  ['לוח שעונים', 'Instrument panel', [
    ['מד – חום מנוע', 'Gauge – engine temperature'],
    ['מד – לחץ שמן', 'Gauge – oil pressure'],
    ['מד – טעינה', 'Gauge – charging'],
    ['מד – דלק', 'Gauge – fuel'],
  ]],
  ['מרכב', 'Body', [
    ['משקולת נגדית', 'Counterweight'],
    ['גגון בטיחות', 'Overhead guard'],
    ['מושבים + ריפודים', 'Seats + upholstery'],
    ['מראות, חגורות', 'Mirrors, belts'],
  ]],
  ['צמיגים', 'Tyres', [
    ['קדמיים + ברגים', 'Front + bolts'],
    ['אחוריים + ברגים', 'Rear + bolts'],
  ]],
  ['שונות', 'Other', [
    ['שילוט הכלי', 'Equipment signage'],
    ['מטף כיבוי', 'Fire extinguisher'],
    ['מדבקות ע"ב', 'Safety stickers'],
  ]],
]

// ── P.PU.20.2 · ביקורת קצין בטיחות לגרורים ───────────────────────────────────
const TRAILER_GROUPS = [
  ['סרן קדמי', 'Front axle', [
    ['צמיגים', 'Tyres'],
    ['בולמי זעזועים', 'Shock absorbers'],
    ['תותבים בקפיצים', 'Spring bushings'],
    ['מוט רדיוס', 'Radius rod'],
    ['מוט מייצב + גומיות', 'Stabiliser bar + bushes'],
    ['ברגים משוחררים', 'Loose bolts'],
    ['חופשים בצלחת', 'Turntable play'],
    ['עין גרירה / פין גרירה', 'Towing eye / pin'],
    ['שרשרות בטיחות', 'Safety chains'],
  ]],
  ['סרנים אחוריים', 'Rear axles', [
    ['צמיגים', 'Tyres'],
    ['בולמי זעזועים', 'Shock absorbers'],
    ['קפיצים', 'Springs'],
    ['כריות אוויר', 'Air bags'],
    ['מוט רדיוס', 'Radius rod'],
    ['הגה אחורי', 'Rear steering'],
  ]],
  ['משטח העמסה', 'Load platform', [
    ['סדקים', 'Cracks'],
    ['מנעולי הצמדה מכולות', 'Container twist locks'],
  ]],
  ['שלדה', 'Chassis', [
    ['רגלי חנייה', 'Landing legs'],
    ['וו קשירה', 'Lashing hook'],
    ['טבעות עגינה', 'Anchor rings'],
  ]],
  ['כללי', 'General', [
    ['נזילות אוויר', 'Air leaks'],
    ['פגוש אחורי', 'Rear bumper'],
    ['כנפיים', 'Mudguards'],
    ['מגני בוץ', 'Mud flaps'],
    ['מחזירי אור', 'Reflectors'],
    ['מדבקה נוהל 6', 'Procedure-6 sticker'],
  ]],
  ['חשמל', 'Electrical', [
    ['תאורה הקפית', 'Perimeter lighting'],
    ['פנסים אחוריים', 'Rear lamps'],
    ['צופר רוורס', 'Reverse buzzer'],
    ['שקע ABS', 'ABS socket'],
    ['שקע חשמל', 'Electrical socket'],
  ]],
]

// ── P.PU.20.1 · ביקורת קצין בטיחות למשאיות ───────────────────────────────────
const TRUCK_GROUPS = [
  ['הגה', 'Steering', [
    ['צמיגים', 'Tyres'],
    ['בולמי זעזועים', 'Shock absorbers'],
    ['תותבים בקפיצים', 'Spring bushings'],
    ['נזילות שמן', 'Oil leaks'],
    ['מוט מייצב + גומיות', 'Stabiliser bar + bushes'],
    ['חופש בתפוחים', 'Ball joint play'],
  ]],
  ['סרן אחורי', 'Rear axle', [
    ['צמיגים', 'Tyres'],
    ['בולמי זעזועים', 'Shock absorbers'],
    ['קפיצים', 'Springs'],
    ['כריות אוויר', 'Air bags'],
    ['רדיוס', 'Radius rod'],
    ['גל הנע חופשיים', 'Prop-shaft play'],
    ['גל הנע נזילות', 'Prop-shaft leaks'],
  ]],
  ['תא נהג', 'Cab', [
    ['מראות', 'Mirrors'],
    ['שמשות', 'Windows'],
    ['דלתות', 'Doors'],
    ['מגבים + מתזים', 'Wipers + washers'],
    ['מושבים', 'Seats'],
    ['חגורות בטיחות', 'Seat belts'],
    ['מדרגות עלייה', 'Access steps'],
    ['נורות ביקורת', 'Warning lights'],
    ['לוח מכוונים', 'Instrument panel'],
  ]],
  ['שלדה', 'Chassis', [
    ['ברגים משוחררים', 'Loose bolts'],
    ['חופשיים בצלחת', 'Turntable play'],
    ['טרוורסה אחורית', 'Rear cross-member'],
    ['חופש בוו גרירה', 'Tow hook play'],
  ]],
  ['כללי', 'General', [
    ['נזילות אוויר', 'Air leaks'],
    ['נזילות דלק', 'Fuel leaks'],
    ['נזילות שמן', 'Oil leaks'],
    ['נזילות מים', 'Water leaks'],
    ['עשן מוגבר', 'Excessive smoke'],
    ['כלי נהג', 'Driver tools'],
    ['משולש', 'Warning triangle'],
    ['סדי עצירה', 'Wheel chocks'],
    ['מטף כיבוי', 'Fire extinguisher'],
    ['פגוש אחורי', 'Rear bumper'],
    ['מגני בוץ', 'Mud flaps'],
    ['אפודה זוהרת', 'Hi-vis vest'],
    ['עזרה ראשונה', 'First-aid kit'],
  ]],
  ['חשמל', 'Electrical', [
    ['מצברים', 'Batteries'],
    ['תאורה עקפית', 'Perimeter lighting'],
    ['פנסים קדמיים', 'Head lamps'],
    ['פנסים אחוריים', 'Rear lamps'],
    ['צופר רוורס', 'Reverse buzzer'],
    ['שקע ABS', 'ABS socket'],
    ['שקע חשמל', 'Electrical socket'],
  ]],
]

// The English group name rides along in the tuple for readability of the data
// above; the row label is built from the Hebrew section plus both item names.
const groupsToFields = groups =>
  groups.flatMap(([he, , items]) => items.map(([l, le]) => check(he, l, le)))

// Closing block every one of these forms shares on paper.
const signOff = (roleHe = 'שם הבודק', roleEn = 'Inspector name') => [
  note('הערות', 'Remarks'),
  preset('submitter_name', roleHe, roleEn, true),
  field('text', 'תפקיד', 'Role'),
  preset('signature', 'חתימה', 'Signature', true),
]

export const FORM_TEMPLATES = [
  {
    id: 'periodic_inspection_wi1001',
    icon: '🔍',
    label: 'ביקורת תקופתית',
    labelEn: 'Periodic inspection',
    ref: 'WI.PU.10.01',
    build: () => [
      preset('plate', 'מס׳ רישוי', 'License plate', true),
      field('text', 'תוצרת', 'Make'),
      field('number', 'ק״מ', 'Odometer (km)'),
      field('date', 'תאריך ביקורת', 'Inspection date', true),
      ...PERIODIC_ITEMS.map(([l, le]) => check('', l, le)),
      ...signOff(),
      note('החלטת קצין הבטיחות', 'Safety officer decision'),
    ],
  },
  {
    id: 'forklift_safety_ppu203',
    icon: '🏗️',
    label: 'ביקורת בטיחותית למלגזה',
    labelEn: 'Forklift safety inspection',
    ref: 'P.PU.20.3',
    build: () => [
      preset('plate', 'מס׳ רכב', 'Vehicle number', true),
      field('text', 'סוג ותוצרת', 'Type & make'),
      field('date', 'תאריך', 'Date', true),
      // Forklifts are metered by engine hours, not distance — this is the
      // reading the whole service plan hangs off.
      field('number', 'שעות מנוע', 'Engine hours'),
      ...groupsToFields(FORKLIFT_GROUPS),
      note('מהות התקלה', 'Fault description'),
      field('text', 'מס׳ כרטיס תיקון / ח״ן', 'Repair card / work order no.'),
      field('date', 'תאריך תיקון', 'Repair date'),
      ...signOff(),
    ],
  },
  {
    id: 'trailer_safety_ppu202',
    icon: '🚛',
    label: 'ביקורת קצין בטיחות לגרורים',
    labelEn: 'Trailer safety-officer inspection',
    ref: 'P.PU.20.2',
    build: () => [
      preset('plate', 'מס׳ רכב', 'Vehicle number', true),
      field('text', 'מס׳ פנימי', 'Internal number'),
      field('text', 'סוג רכב', 'Vehicle type'),
      field('date', 'תאריך ביקורת', 'Inspection date', true),
      field('date', 'בתוקף עד', 'Valid until'),
      ...groupsToFields(TRAILER_GROUPS),
      note('הערות', 'Remarks'),
      preset('submitter_name', 'קצין בטיחות', 'Safety officer', true),
      preset('signature', 'חתימת קצין בטיחות', 'Safety officer signature', true),
    ],
  },
  {
    id: 'truck_safety_ppu201',
    icon: '🚚',
    label: 'ביקורת קצין בטיחות למשאיות',
    labelEn: 'Truck safety-officer inspection',
    ref: 'P.PU.20.1',
    build: () => [
      preset('plate', 'מס׳ רכב', 'Vehicle number', true),
      field('text', 'סוג רכב', 'Vehicle type'),
      field('text', 'מס׳ פנימי', 'Internal number'),
      field('number', 'מד אוץ', 'Odometer'),
      field('date', 'תאריך ביקורת', 'Inspection date', true),
      field('text', 'שם הנהג', 'Driver name'),
      ...groupsToFields(TRUCK_GROUPS),
      note('הערות', 'Remarks'),
      preset('submitter_name', 'קצין בטיחות', 'Safety officer', true),
      preset('signature', 'חתימת קצין בטיחות', 'Safety officer signature', true),
    ],
  },
]
