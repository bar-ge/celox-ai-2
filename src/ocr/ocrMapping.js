// Turns what the reader found into a reviewable proposal, and a proposal into a
// database patch. Pure functions, no React, no network — so the rules that
// decide "should this box be ticked by default" can be tested directly.
//
// The stance throughout: the reader proposes, a person disposes. A wrong
// expiry date is worse than an empty field, because an empty field shows up in
// the alerts and a wrong one hides an expired license. So anything doubtful is
// shown but left UNTICKED, and nothing is saved without the Apply button.

import { isDriverLicense, isValidIsraeliId } from '../validators.js'

// Keep in sync with DEFAULT_LISTS.license_level in fleet-manager.jsx ('Other' is
// handled there as a free-text bucket and is never read from a card).
export const LICENSE_LEVELS = ['A', 'A1', 'A2', 'B', 'C', 'C1', 'D', 'D1', 'E']

// group decides the default tick:
//   compliance / registry — tick when it differs from what is stored
//   identity              — tick only when the stored value is empty, because the
//                           record usually holds the canonical spelling already
//                           (a registry-looked-up make, a Hebrew name) and a photo
//                           read should not silently replace it
export const DRIVER_ROWS = [
  { key: 'license',        group: 'compliance', type: 'text',   he: 'מספר רישיון',  en: 'License number' },
  { key: 'license_expiry', group: 'compliance', type: 'expiry', he: 'תוקף רישיון',  en: 'License expiry' },
  { key: 'license_levels', group: 'compliance', type: 'levels', he: 'דרגות רישיון', en: 'License classes' },
  { key: 'name',           group: 'identity',   type: 'text',   he: 'שם',           en: 'Name' },
  { key: 'national_id',    group: 'identity',   type: 'text',   he: 'תעודת זהות',   en: 'National ID' },
  { key: 'birth_date',     group: 'identity',   type: 'date',   he: 'תאריך לידה',   en: 'Date of birth' },
  { key: 'address',        group: 'identity',   type: 'text',   he: 'כתובת',        en: 'Address' },
  { key: 'city',           group: 'identity',   type: 'text',   he: 'עיר',          en: 'City' },
]

export const CAR_ROWS = [
  { key: 'registration_expiry', group: 'compliance', type: 'expiry', he: 'תוקף רישיון רכב', en: 'Registration expiry' },
  { key: 'make',            group: 'identity', type: 'text',   he: 'יצרן',           en: 'Make' },
  { key: 'model',           group: 'identity', type: 'text',   he: 'דגם',            en: 'Model' },
  { key: 'year',            group: 'identity', type: 'number', he: 'שנת ייצור',      en: 'Year' },
  { key: 'fuel',            group: 'identity', type: 'fuel',   he: 'סוג דלק',        en: 'Fuel' },
  { key: 'chassis_no',      group: 'registry', type: 'text',   he: 'מס׳ שילדה',      en: 'Chassis / VIN' },
  { key: 'engine_no',       group: 'registry', type: 'text',   he: 'מס׳ מנוע',       en: 'Engine number' },
  { key: 'color',           group: 'registry', type: 'text',   he: 'צבע',            en: 'Colour' },
  { key: 'engine_volume',   group: 'registry', type: 'number', he: 'נפח מנוע (סמ״ק)', en: 'Engine volume (cc)' },
  { key: 'weight_total',    group: 'registry', type: 'number', he: 'משקל כולל (ק״ג)', en: 'Total weight (kg)' },
  { key: 'vehicle_type',    group: 'registry', type: 'text',   he: 'סוג רכב',        en: 'Vehicle type' },
  { key: 'commercial_name', group: 'registry', type: 'text',   he: 'כינוי מסחרי',    en: 'Commercial name' },
  { key: 'owner_name',      group: 'registry', type: 'text',   he: 'בעלות',          en: 'Owner' },
]

export const FUEL_LABEL = {
  Petrol:   { he: 'בנזין',   en: 'Petrol' },
  Diesel:   { he: 'סולר',    en: 'Diesel' },
  Electric: { he: 'חשמלי',   en: 'Electric' },
  Hybrid:   { he: 'היברידי', en: 'Hybrid' },
}

export const KIND_FOR_ENTITY = { driver: 'driver_license', car: 'vehicle_license' }
export const ROWS_FOR = { driver_license: DRIVER_ROWS, vehicle_license: CAR_ROWS }
export const TABLE_FOR = { driver_license: 'drivers', vehicle_license: 'cars' }

const isBlank = v => v === null || v === undefined || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0)
const digitsOf = v => String(v ?? '').replace(/\D/g, '')
const sameText = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()

/** Union that never removes an existing class, ordered canonically. */
export function mergeLevels(current, read) {
  const have = Array.isArray(current) ? current : []
  const add = (read || []).filter(l => LICENSE_LEVELS.includes(l))
  const all = [...new Set([...have, ...add])]
  const rank = l => { const i = LICENSE_LEVELS.indexOf(l); return i === -1 ? 999 : i }
  return all.sort((a, b) => rank(a) - rank(b))
}

const daysUntil = (iso, today) => Math.round((new Date(iso + 'T00:00:00Z') - new Date(today + 'T00:00:00Z')) / 86400000)
export const todayISO = () => new Date().toISOString().slice(0, 10)

/**
 * A reason a proposed value should not be trusted, or null. Distinct from "the
 * reader found nothing": these are values that arrived but look wrong.
 * Codes are turned into words by the card.
 */
export function doubt(kind, key, value, today = todayISO()) {
  if (isBlank(value)) return null
  if (kind === 'driver_license') {
    if (key === 'license'     && !isDriverLicense(value)) return 'format'
    if (key === 'national_id' && !isValidIsraeliId(value)) return 'id_checksum'
    if (key === 'birth_date') {
      const age = Math.floor(daysUntil(today, value) / 365.25)
      if (age < 14 || age > 100) return 'implausible_date'
    }
  }
  if (key === 'license_expiry' || key === 'registration_expiry') {
    const d = daysUntil(value, today)
    if (d > 365 * 20 || d < -365 * 30) return 'implausible_date'   // a licence is valid for years, not decades
  }
  return null
}

/**
 * @param {'driver_license'|'vehicle_license'} kind
 * @param {object} fields   from the API
 * @param {object} entity   the driver / car row as currently stored
 * @returns {{ rows: object[], unchanged: number, banner: null | { type: 'plate_mismatch', read: string, current: string } }}
 */
export function buildProposal(kind, fields, entity, today = todayISO()) {
  const defs = ROWS_FOR[kind]
  let banner = null
  let mismatch = false

  if (kind === 'vehicle_license' && fields.plate && entity?.plate) {
    const a = digitsOf(fields.plate), b = digitsOf(entity.plate)
    if (a && b && a !== b) { banner = { type: 'plate_mismatch', read: fields.plate, current: entity.plate }; mismatch = true }
  }

  const rows = []
  let unchanged = 0

  for (const def of defs) {
    const read = fields[def.key]
    if (isBlank(read)) continue
    const current = entity?.[def.key]

    const next = def.type === 'levels' ? mergeLevels(current, read) : read
    const same = def.type === 'levels'
      ? next.length === (current || []).length
      : def.type === 'number' ? Number(current) === Number(next)
      : sameText(current, next)
    if (same) { unchanged++; continue }

    const why = doubt(kind, def.key, def.type === 'levels' ? null : read, today)
    const empty = isBlank(current) || (def.type === 'number' && !Number(current))
    let checked = def.group === 'identity' ? empty : true
    if (why || mismatch) checked = false

    rows.push({ ...def, current: empty ? null : current, next, doubt: why, checked, replaces: !empty })
  }
  return { rows, unchanged, banner }
}

/** Only the ticked rows, in the shape the update calls expect. */
export function buildPatch(rows) {
  const patch = {}
  for (const r of rows) if (r.checked) patch[r.key] = r.next
  return patch
}

/** The key whose value should also become the stored file's own expiry badge. */
export function expiryKeyFor(kind) {
  return kind === 'driver_license' ? 'license_expiry' : 'registration_expiry'
}

export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? '')
}

/** 'expired' | 'soon' | 'ok' for an expiry date, for a coloured chip. */
export function expiryState(iso, today = todayISO()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return null
  const d = daysUntil(iso, today)
  return d < 0 ? 'expired' : d <= 30 ? 'soon' : 'ok'
}
