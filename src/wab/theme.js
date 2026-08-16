// Design tokens for the WhatsApp lead dashboard (wab.celoxai.com).
// This screen has its own visual language, deliberately flatter and denser than
// the fleet app: single blue accent, 4px radius ceiling, no shadows.

export const T = {
  accent:      '#2563EB',
  accentHover: '#1D4ED8',

  white:    '#FFFFFF',
  subtle:   '#F9FAFB',
  bubbleIn: '#F3F4F6',
  selected: '#EFF6FF',

  border:   '#E5E7EB',
  text:     '#111827',
  textMid:  '#6B7280',
  textDim:  '#9CA3AF',

  fs11: 11, fs12: 12, fs13: 13, fs14: 14, fs16: 16, fs20: 20,
  pad: 16, padTight: 12,
  radius: 4,
  colWidth: 320,
  minWidth: 1024,
}

export const FONT_SANS = "'IBM Plex Sans', 'Assistant', system-ui, sans-serif"
export const FONT_MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

export const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2' +
  '?family=IBM+Plex+Sans:wght@400;500;600;700' +
  '&family=IBM+Plex+Mono:wght@400;500;600' +
  '&family=Assistant:wght@400;500;600;700' +
  '&display=swap'

/** Load the dashboard's webfonts once, only on this screen. */
export function useDashboardFonts() {
  if (typeof document === 'undefined') return
  if (document.getElementById('wab-fonts')) return
  const link = document.createElement('link')
  link.id = 'wab-fonts'
  link.rel = 'stylesheet'
  link.href = GOOGLE_FONTS_HREF
  document.head.appendChild(link)
}

/** "2m ago" · "3h ago" · "Yesterday" · "12 Jan" */
export function relativeShort(iso) {
  if (!iso) return ''
  const then = new Date(iso)
  const diff = Date.now() - then.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** "2 minutes ago" · "3 hours ago" · "4 days ago" */
export function relativeLong(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/** "14:32", or "12 Jan 14:32" when the message is not from today. */
export function bubbleTime(iso) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay ? time : `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${time}`
}

/** "12 January 2025, 14:32" */
export function fullDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}, ` +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}
