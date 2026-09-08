// ── Region configuration — one entry per country market ──────────────────────
// Drives the localized marketing site (celoxai.com/il, /us, /ca) and, later,
// the in-app defaults once a company is tagged with its country.
export const REGIONS = {
  il: { code: 'il', name: 'Israel',        nameHe: 'ישראל',      flag: '🇮🇱', lang: 'he', dir: 'rtl', currency: '₪',  currencyCode: 'ILS', units: 'km',    phoneCc: '+972' },
  us: { code: 'us', name: 'United States', nameHe: 'ארצות הברית', flag: '🇺🇸', lang: 'en', dir: 'ltr', currency: '$',  currencyCode: 'USD', units: 'miles', phoneCc: '+1' },
  ca: { code: 'ca', name: 'Canada',        nameHe: 'קנדה',       flag: '🇨🇦', lang: 'en', dir: 'ltr', currency: 'C$', currencyCode: 'CAD', units: 'km',    phoneCc: '+1' },
}
export const REGION_CODES = Object.keys(REGIONS)
export const DEFAULT_REGION = 'il'

// Extract a region code from the URL path, e.g. "/us" or "/us/pricing" -> "us"
export function regionFromPath(pathname = '') {
  const m = pathname.match(/^\/(il|us|ca)(?=\/|$)/i)
  return m ? m[1].toLowerCase() : null
}

// Auto-detect the visitor's market so they never have to pick one.
// Strongest signal first: the browser locale's region subtag (en-CA vs en-US),
// then timezone, then default. (For IP-accurate geo, add a Vercel edge redirect.)
export function detectRegion() {
  try {
    for (const raw of (navigator.languages || [navigator.language || ''])) {
      const l = raw.toLowerCase()
      if (l.startsWith('he') || l.startsWith('iw')) return 'il'
      const sub = l.split('-')[1]                    // "en-ca" -> "ca"
      if (sub === 'ca') return 'ca'
      if (sub === 'us') return 'us'
      if (sub === 'il') return 'il'
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz === 'Asia/Jerusalem') return 'il'
    const CA_TZ = ['Toronto', 'Vancouver', 'Edmonton', 'Winnipeg', 'Halifax', 'Regina', 'St_Johns', 'Moncton', 'Montreal']
    if (CA_TZ.some(c => tz.includes(c))) return 'ca'
    if (tz.startsWith('America/')) return 'us'
  } catch { /* navigator/Intl unavailable */ }
  return DEFAULT_REGION
}

// Language default. Hebrew is the product's primary language, so it is what a
// visitor gets unless the URL explicitly asks for a North American market:
// only "/us" and "/ca" opt into English. Region detection still drives
// currency, units, phone codes and marketing copy — it no longer decides
// language, which is why celoxai.com opens in Hebrew for an American visitor.
// An in-app language pick still wins over this (see fleet_lang_manual).
export function defaultLang(pathname = '') {
  const r = regionFromPath(pathname)
  return (r === 'us' || r === 'ca') ? REGIONS[r].lang : REGIONS.il.lang
}

export function getRegion(code) {
  return REGIONS[(code || '').toLowerCase()] || REGIONS[DEFAULT_REGION]
}
