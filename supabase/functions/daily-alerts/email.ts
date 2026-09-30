// Pure email-building helpers for daily-alerts. No network, no Deno APIs, so
// scripts/alerts-email-selftest.mjs can run them under Node.

export type Alert = {
  type: string
  severity: string
  label: string
  date: string
  entity_name: string | null
  category: string | null
  source_id: string
}

export type Accident = {
  id: string; incident_date?: string | null; created_at?: string | null
  other_plate?: string | null; other_driver_name?: string | null; description?: string | null
}

// Order the sections appear in the email (most actionable first).
export const TYPE_ORDER = [
  'registration', 'test', 'insurance', 'license', 'certification',
  'maintenance', 'tachograph', 'leasing', 'document', 'custom',
]

export const TYPE_LABEL: Record<string, { he: string; en: string; icon: string }> = {
  registration:  { he: 'רישיון רכב',     en: 'Vehicle registration', icon: '🚗' },
  test:          { he: 'טסט שנתי',       en: 'Annual test',          icon: '🔍' },
  insurance:     { he: 'ביטוח',          en: 'Insurance',            icon: '🛡️' },
  license:       { he: 'רישיון נהיגה',   en: 'Driver license',       icon: '🪪' },
  certification: { he: 'הכשרות',         en: 'Certifications',       icon: '🎓' },
  maintenance:   { he: 'תחזוקה',         en: 'Maintenance',          icon: '🔧' },
  tachograph:    { he: 'כיול טכוגרף',    en: 'Tachograph',           icon: '⏱️' },
  leasing:       { he: 'סיום ליסינג',    en: 'Leasing end',          icon: '📄' },
  document:      { he: 'מסמכים',         en: 'Documents',            icon: '📎' },
  custom:        { he: 'תזכורות',        en: 'Reminders',            icon: '⏰' },
}

const MAINT_TYPE: Record<string, { he: string; en: string }> = {
  'Oil Change':    { he: 'החלפת שמן',     en: 'Oil Change' },
  'Tire Rotation': { he: 'סיבוב צמיגים',  en: 'Tire Rotation' },
  'Inspection':    { he: 'בדיקה תקופתית', en: 'Inspection' },
  'Brake Service': { he: 'שירות בלמים',   en: 'Brake Service' },
  'Other':         { he: 'אחר',            en: 'Other' },
}

const POLICY: Record<string, { he: string; en: string }> = {
  mandatory:     { he: 'ביטוח חובה', en: 'Mandatory insurance' },
  comprehensive: { he: 'ביטוח מקיף', en: 'Comprehensive insurance' },
}

/** HTML-escape anything that came from a user (titles, names, file names). */
export function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c])
}

/** The de-duplication key shared with the alert_history table. */
export const alertKey = (companyId: string, a: Pick<Alert, 'type' | 'source_id'>) =>
  `${companyId}:${a.type}:${a.source_id}`

/** One line of text describing an alert, in the email's language. */
export function describe(a: Alert, isHe: boolean): string {
  const plate = a.entity_name ?? ''
  const lang = isHe ? 'he' : 'en'
  switch (a.type) {
    case 'maintenance': {
      const t = MAINT_TYPE[a.category ?? '']?.[lang] ?? a.category ?? ''
      return plate ? `${t} — ${plate}` : t
    }
    case 'insurance': {
      const t = POLICY[a.category ?? '']?.[lang] ?? (isHe ? 'ביטוח צד ג׳' : 'Third-party insurance')
      return plate ? `${t} — ${plate}` : t
    }
    case 'license':
      return `${TYPE_LABEL.license[lang]}: ${plate}`
    case 'registration': case 'test': case 'tachograph': case 'leasing':
      return plate ? `${TYPE_LABEL[a.type][lang]} — ${plate}` : TYPE_LABEL[a.type][lang]
    case 'document': {
      // The SQL label ends with a Hebrew (רכב)/(נהג) suffix.
      const base = a.label.replace(/ \((רכב|נהג)\)$/, '')
      const kind = /\(רכב\)$/.test(a.label) ? (isHe ? 'רכב' : 'Vehicle') : (isHe ? 'נהג' : 'Driver')
      return `${base} (${kind})`
    }
    case 'custom':
      return a.entity_name ? `${a.label} — ${a.entity_name}` : a.label
    default:
      return a.label   // certification: "<cert> — <driver>", already user data
  }
}

const th = (dir: string, color: string) =>
  `padding:9px 12px;text-align:${dir === 'rtl' ? 'right' : 'left'};color:${color};font-size:11px;text-transform:uppercase`

export function buildEmail(opts: {
  alerts: Alert[]
  accidents: Accident[]
  isHe: boolean
  appUrl: string
  todayStr: string        // YYYY-MM-DD, decides overdue vs upcoming
  now?: Date
}): { subject: string; html: string; total: number } {
  const { alerts, accidents, isHe, appUrl, todayStr } = opts
  const dir = isHe ? 'rtl' : 'ltr'
  const locale = isHe ? 'he-IL' : 'en-US'
  const total = alerts.length + accidents.length
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString(locale) : '—'

  const badge = (overdue: boolean) => overdue
    ? `<span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${isHe ? 'באיחור' : 'Overdue'}</span>`
    : `<span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${isHe ? 'בקרוב' : 'Upcoming'}</span>`

  const cols = isHe ? ['תיאור', 'תאריך', 'סטטוס'] : ['Description', 'Date', 'Status']
  const thead = `<thead><tr style="background:#f8fafc">${cols.map(c => `<th style="${th(dir, '#64748b')}">${c}</th>`).join('')}</tr></thead>`

  const byType = new Map<string, Alert[]>()
  for (const a of alerts) byType.set(a.type, [...(byType.get(a.type) ?? []), a])
  const types = [...TYPE_ORDER.filter(t => byType.has(t)), ...[...byType.keys()].filter(t => !TYPE_ORDER.includes(t))]

  const section = (title: string, rows: string, head = thead) =>
    `<h3 style="margin:0 0 10px;font-size:14px;color:#0f172a">${title}</h3>
     <table style="width:100%;border-collapse:collapse;margin-bottom:24px">${head}<tbody>${rows}</tbody></table>`

  const alertSections = types.map(t => {
    const list = (byType.get(t) ?? []).slice().sort((a, b) => a.date < b.date ? -1 : 1)
    const meta = TYPE_LABEL[t]
    const title = `${meta?.icon ?? '⚠️'} ${esc(meta ? meta[isHe ? 'he' : 'en'] : t)} (${list.length})`
    const rows = list.map(a => `<tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:9px 12px;font-weight:600">${esc(describe(a, isHe))}</td>
        <td style="padding:9px 12px">${fmtDate(a.date)}</td>
        <td style="padding:9px 12px">${badge(a.date < todayStr)}</td>
      </tr>`).join('')
    return section(title, rows)
  }).join('')

  const accCols = isHe ? ['תאריך', 'לוחית צד שני', 'נהג צד שני', 'תיאור'] : ['Date', 'Other Plate', 'Other Driver', 'Description']
  const accHead = `<thead><tr style="background:#fef2f2">${accCols.map(c => `<th style="${th(dir, '#dc2626')}">${c}</th>`).join('')}</tr></thead>`
  const accRows = accidents.map(acc => {
    const desc = (acc.description || '').slice(0, 60) + ((acc.description || '').length > 60 ? '…' : '')
    return `<tr style="border-bottom:1px solid #fee2e2">
        <td style="padding:9px 12px;font-weight:600">${fmtDate(acc.incident_date || acc.created_at?.slice(0, 10))}</td>
        <td style="padding:9px 12px">${esc(acc.other_plate || '—')}</td>
        <td style="padding:9px 12px">${esc(acc.other_driver_name || '—')}</td>
        <td style="padding:9px 12px;color:#475569;font-size:12px">${esc(desc || '—')}</td>
      </tr>`
  }).join('')
  const accSection = accidents.length
    ? section(isHe ? `🚨 תאונות פתוחות (${accidents.length})` : `🚨 Open Accidents (${accidents.length})`, accRows, accHead)
    : ''

  const settingsUrl = `${appUrl}?tab=settings`
  const unsub = isHe
    ? `<a href="${settingsUrl}" style="color:#94a3b8">ניהול העדפות מייל</a>`
    : `<a href="${settingsUrl}" style="color:#94a3b8">Manage email preferences</a>`

  const subject = isHe
    ? `⚠️ ${total} ${total === 1 ? 'התראה' : 'התראות'} — Celox AI Fleet`
    : `⚠️ ${total} ${total === 1 ? 'alert' : 'alerts'} — Celox AI Fleet`

  const html = `<!DOCTYPE html><html dir="${dir}" lang="${isHe ? 'he' : 'en'}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;direction:${dir}">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#0f172a,#1e40af);padding:32px;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">⚠️</div>
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800">${isHe ? 'התראות יומיות' : 'Daily Alerts'} — Celox AI</h1>
      <p style="color:rgba(255,255,255,0.65);margin:8px 0 0;font-size:13px">${(opts.now ?? new Date()).toLocaleDateString(locale)}</p>
    </div>
    <div style="padding:28px 32px;font-size:14px;color:#334155">
      ${accSection}${alertSections}
      <div style="text-align:center;margin-top:8px">
        <a href="${appUrl}" style="background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block">
          ${isHe ? 'פתח את מנהל הצי' : 'Open fleet manager'}
        </a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0">Celox AI · ${unsub}</p>
    </div>
  </div>
</body></html>`

  return { subject, html, total }
}
