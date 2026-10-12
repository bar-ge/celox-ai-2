// Design tokens for the WhatsApp lead dashboard (wab.celoxai.com).
//
// 2026-10-12, Bar's request: redesigned in Hebrew/RTL to match the warm
// editorial look from his "Celox AI" Claude design artifact — a cream/ink
// palette with a single terracotta accent, Heebo type, generous radii and
// soft warm-tinted shadows, instead of the old flat blue/gray screen.

export const T = {
  accent:      '#A65F2E', // terracotta
  accentHover: '#8B4D23',
  accentSoft:  '#F4E5D8', // soft tint behind accent-coloured chips/badges

  white:    '#FFFFFF',
  bg:       '#FDFBF8', // page / main content background (warm near-white)
  subtle:   '#F6F0E9', // sidebar & panel background (a shade deeper cream)
  bubbleIn: '#F1EBE3', // inbound message bubble
  selected: '#F4E5D8', // selected row background

  border:   '#E3D7C7',
  text:     '#2B2119',
  textMid:  '#7A6B5E',
  textDim:  '#B8ADA2',

  success:     '#1F7A55',
  successSoft: '#DDF1E8',
  danger:      '#B03A3A',
  dangerSoft:  '#F8DDDD',
  warn:        '#8A5A00',
  warnSoft:    '#FBEBCB',

  fs11: 11, fs12: 12, fs13: 13, fs14: 14, fs16: 16, fs20: 20,
  pad: 16, padTight: 12,
  radius: 10,
  radiusPill: 999,
  bubbleRadius: 14,
  colWidth: 320,
  shadow: '0 6px 16px rgba(166, 95, 46, 0.12)',
  shadowLg: '0 14px 34px rgba(166, 95, 46, 0.16)',
}

export const FONT_SANS = "'Heebo', 'IBM Plex Sans', system-ui, sans-serif"
export const FONT_MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

export const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2' +
  '?family=Heebo:wght@400;500;600;700;800' +
  '&family=IBM+Plex+Mono:wght@400;500;600' +
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

/** "לפני 2 דק׳" · "לפני 3 שע׳" · "אתמול" · "12 ינו׳" */
export function relativeShort(iso) {
  if (!iso) return ''
  const then = new Date(iso)
  const diff = Date.now() - then.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'עכשיו'
  if (min < 60) return `לפני ${min} דק׳`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `לפני ${hrs} שע׳`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'אתמול'
  return then.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
}

/** "לפני 2 דקות" · "לפני 3 שעות" · "לפני 4 ימים" */
export function relativeLong(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ממש עכשיו'
  if (min < 60) return `לפני ${min} דקות`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `לפני ${hrs} שעות`
  const days = Math.floor(hrs / 24)
  return `לפני ${days} ימים`
}

/** "14:32", or "12 ינו׳ 14:32" when the message is not from today. */
export function bubbleTime(iso) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false })
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay ? time : `${d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })} ${time}`
}

/** "12 בינואר 2025, 14:32" */
export function fullDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}, ` +
    d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false })
}
