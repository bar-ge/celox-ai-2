// ── Region configuration — one entry per country market ──────────────────────
// Drives the localized marketing site (celoxai.com/il and /us) and the in-app
// defaults once a company is tagged with its country. "ca" is kept ONLY as an
// in-app market (CAD / km) so companies already tagged Canada keep their
// currency — it has no marketing page and is not in MARKETING_REGION_CODES.
export const REGIONS = {
  il: { code: 'il', name: 'Israel',        nameHe: 'ישראל',      flag: '🇮🇱', lang: 'he', dir: 'rtl', currency: '₪',  currencyCode: 'ILS', units: 'km',    phoneCc: '+972' },
  us: { code: 'us', name: 'United States', nameHe: 'ארצות הברית', flag: '🇺🇸', lang: 'en', dir: 'ltr', currency: '$',  currencyCode: 'USD', units: 'miles', phoneCc: '+1' },
  ca: { code: 'ca', name: 'Canada',        nameHe: 'קנדה',       flag: '🇨🇦', lang: 'en', dir: 'ltr', currency: 'C$', currencyCode: 'CAD', units: 'km',    phoneCc: '+1' },
}
export const REGION_CODES = Object.keys(REGIONS)
export const DEFAULT_REGION = 'il'
// Regions that have a public marketing page (and a switcher button).
export const MARKETING_REGION_CODES = ['il', 'us']

// Extract a marketing region code from the URL path, e.g. "/us" or "/us/pricing" -> "us"
export function regionFromPath(pathname = '') {
  const m = pathname.match(/^\/(il|us)(?=\/|$)/i)
  return m ? m[1].toLowerCase() : null
}

// Language default. Hebrew is the product's primary language: a bare "/" always
// opens the Hebrew site (/il), whatever the visitor's browser locale or country.
// Only an explicit "/us" URL (the switcher, or a shared link) opts into English.
// An in-app language pick still wins over this (see fleet_lang_manual).
export function defaultLang(pathname = '') {
  return regionFromPath(pathname) === 'us' ? REGIONS.us.lang : REGIONS.il.lang
}

export function getRegion(code) {
  return REGIONS[(code || '').toLowerCase()] || REGIONS[DEFAULT_REGION]
}
