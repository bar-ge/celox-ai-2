// Calendly availability + booking links.
//
// Calendly's public API has no "create invitee" endpoint, so a confirmed slot is
// booked by handing the lead the single-use scheduling URL that Calendly returns
// alongside that slot. Nothing here ever invents a time.

const API = 'https://api.calendly.com'
const TZ = 'Asia/Jerusalem'

const token = () => process.env.CALENDLY_API_KEY
const eventUrl = () => process.env.CALENDLY_EVENT_URL

/** @param {string} path @param {AbortSignal} [signal] */
async function get(path, signal) {
  const r = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    signal: signal ?? AbortSignal.timeout(12000),
  })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`calendly ${r.status}: ${body.slice(0, 200)}`)
  }
  return r.json()
}

let cachedEventType = null

/**
 * Resolve CALENDLY_EVENT_URL to its event type resource (uri + duration + kind).
 * @returns {Promise<{ uri: string, duration: number, kind: string, schedulingUrl: string }>}
 */
async function resolveEventType() {
  if (cachedEventType) return cachedEventType

  const me = await get('/users/me')
  const userUri = me?.resource?.uri
  if (!userUri) throw new Error('calendly: could not resolve current user')

  const list = await get(`/event_types?user=${encodeURIComponent(userUri)}&active=true&count=100`)
  const want = String(eventUrl() || '').replace(/\/+$/, '')
  const items = Array.isArray(list?.collection) ? list.collection : []
  const match =
    items.find((e) => String(e.scheduling_url || '').replace(/\/+$/, '') === want) ||
    items[0]

  if (!match?.uri) throw new Error('calendly: no active event type found')

  const kindMap = { physical: 'פגישה פרונטלית', outbound_call: 'טלפון', inbound_call: 'טלפון', google_conference: 'Google Meet', zoom_conference: 'Zoom', gotomeeting: 'GoToMeeting', microsoft_teams_conference: 'Microsoft Teams' }
  const locKind = match?.location?.kind || match?.locations?.[0]?.kind

  cachedEventType = {
    uri: match.uri,
    duration: Number(match.duration) || 30,
    kind: kindMap[locKind] || 'שיחה',
    // The raw kind is what the booking API wants; the Hebrew one is for humans.
    locationKind: locKind || null,
    location: match?.location?.location || match?.locations?.[0]?.location || null,
    schedulingUrl: match.scheduling_url || want,
  }
  return cachedEventType
}

/**
 * Book a slot outright, so the lead does not have to finish anything on a
 * Calendly page. Needs their email — Calendly has nowhere to send the invite
 * otherwise, and rejects the request without it.
 *
 * Failure is never fatal: the caller falls back to sending the scheduling link,
 * which is what happened before this existed.
 *
 * @param {object} args
 * @param {string} args.startIso   slot start, as returned by availability()
 * @param {string} args.email
 * @param {string} [args.name]
 * @param {string} [args.timezone]
 * @returns {Promise<{ ok: true, eventUri: string|null, cancelUrl: string|null, rescheduleUrl: string|null } | { ok: false, reason: string }>}
 */
export async function bookSlot({ startIso, email, name, timezone = TZ }) {
  if (!token() || !eventUrl()) return { ok: false, reason: 'calendly_not_configured' }
  if (!email) return { ok: false, reason: 'email_required' }

  try {
    const et = await resolveEventType()

    /** @type {Record<string, unknown>} */
    const body = {
      event_type: et.uri,
      start_time: new Date(startIso).toISOString(),
      invitee: { name: name || email, email, timezone },
    }
    // Conference locations need only the kind; physical and custom ones also
    // carry the place itself.
    if (et.locationKind) {
      body.location = et.location
        ? { kind: et.locationKind, location: et.location }
        : { kind: et.locationKind }
    }

    const r = await fetch(`${API}/invitees`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    const payload = await r.json().catch(() => ({}))
    if (!r.ok) {
      const message = payload?.message || payload?.title || `http_${r.status}`
      console.error('calendly booking failed', r.status, message)
      return { ok: false, reason: message }
    }

    const res = payload?.resource ?? payload
    return {
      ok: true,
      eventUri: res?.event ?? res?.uri ?? null,
      cancelUrl: res?.cancel_url ?? null,
      rescheduleUrl: res?.reschedule_url ?? null,
    }
  } catch (err) {
    console.error('calendly booking threw', err instanceof Error ? err.message : 'unknown')
    return { ok: false, reason: 'network' }
  }
}

const heDate = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
const heTime = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
const heShort = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })

const keyParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
})

/**
 * Stable local-time key for a slot: "2026-08-19 12:00" in Asia/Jerusalem.
 *
 * The agent picks slots by this key rather than by ISO timestamp — it is what a
 * lead actually says ("יום שלישי ב-12:00"), it is short enough to list every
 * open slot in the prompt, and it round-trips through a lookup table so a
 * confirmed time is always matched against real availability.
 *
 * @param {string} iso
 * @returns {string}
 */
export function slotKey(iso) {
  const p = Object.fromEntries(keyParts.formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day} ${p.hour === '24' ? '00' : p.hour}:${p.minute}`
}

/** @param {string} iso @returns {string} e.g. "יום שלישי, 19 באוגוסט, 10:30" */
export function formatSlotHe(iso) {
  const d = new Date(iso)
  return `${heDate.format(d)}, ${heTime.format(d)}`
}

/** @param {string} iso @returns {{ date: string, time: string }} */
export function splitSlotHe(iso) {
  const d = new Date(iso)
  return { date: heShort.format(d), time: heTime.format(d) }
}

/**
 * Next N genuinely available slots.
 *
 * @param {object} [opts]
 * @param {number} [opts.count]      how many slots to return (default 3)
 * @param {Date}   [opts.from]       earliest start (default: now + 2h)
 * @param {number} [opts.days]       search window in days (default 7, Calendly's max per call)
 * @returns {Promise<{ ok: true, slots: { start: string, label: string, schedulingUrl: string }[], duration: number, kind: string } | { ok: false, reason: string }>}
 */
export async function availableSlots({ count = 3, from, days = 7 } = {}) {
  if (!token() || !eventUrl()) return { ok: false, reason: 'calendly_not_configured' }

  try {
    const et = await resolveEventType()

    // Calendly requires start_time in the future and a window of at most 7 days.
    const start = from && from.getTime() > Date.now() ? from : new Date(Date.now() + 2 * 60 * 60 * 1000)
    const collected = []

    for (let chunk = 0; chunk < 3 && collected.length < count; chunk++) {
      const windowStart = new Date(start.getTime() + chunk * days * 86400000)
      const windowEnd = new Date(windowStart.getTime() + days * 86400000 - 60000)

      const res = await get(
        `/event_type_available_times?event_type=${encodeURIComponent(et.uri)}` +
        `&start_time=${encodeURIComponent(windowStart.toISOString())}` +
        `&end_time=${encodeURIComponent(windowEnd.toISOString())}`,
      )

      for (const s of res?.collection ?? []) {
        if (s.status !== 'available') continue
        collected.push({
          start: s.start_time,
          label: formatSlotHe(s.start_time),
          schedulingUrl: s.scheduling_url || et.schedulingUrl,
        })
        if (collected.length >= count) break
      }
    }

    if (collected.length === 0) return { ok: false, reason: 'no_availability' }
    return { ok: true, slots: collected, duration: et.duration, kind: et.kind }
  } catch (err) {
    console.error('calendly availability failed', err instanceof Error ? err.message : 'unknown')
    return { ok: false, reason: 'calendly_error' }
  }
}

/**
 * Slots on or after a specific day the lead asked for (spec section 11 — never
 * promise the requested time before checking).
 * @param {Date} preferred
 * @param {number} [count]
 */
export const slotsNear = (preferred, count = 3) => availableSlots({ count, from: preferred })

/** Hard cap on how many open slots we will list in a prompt. */
const MAX_WINDOW_SLOTS = 240

/**
 * Every open slot in the next `days`, not just the next three.
 *
 * The agent still *offers* three (spec section 10), but it needs the full set
 * in front of it so that when a lead names a time — "יום שלישי ב-12:00" — it can
 * answer truthfully instead of re-offering its three. `suggested` is what to
 * show by default; `slots` is what may be confirmed.
 *
 * @param {object} [opts]
 * @param {number} [opts.days]      how far ahead to look (default 14)
 * @param {number} [opts.suggest]   how many to put forward unprompted (default 3)
 * @returns {Promise<{ ok: true, slots: {start:string,key:string,label:string,schedulingUrl:string}[], suggested: {start:string,key:string,label:string,schedulingUrl:string}[], duration: number, kind: string } | { ok: false, reason: string }>}
 */
export async function availability({ days = 14, suggest = 3 } = {}) {
  if (!token() || !eventUrl()) return { ok: false, reason: 'calendly_not_configured' }

  try {
    const et = await resolveEventType()
    const start = new Date(Date.now() + 2 * 60 * 60 * 1000)
    /** @type {{start:string,key:string,label:string,schedulingUrl:string}[]} */
    const slots = []

    // Calendly caps each query at a 7-day window, so walk it in chunks.
    for (let chunk = 0; chunk * 7 < days && slots.length < MAX_WINDOW_SLOTS; chunk++) {
      const windowStart = new Date(start.getTime() + chunk * 7 * 86400000)
      const windowEnd = new Date(Math.min(
        windowStart.getTime() + 7 * 86400000 - 60000,
        start.getTime() + days * 86400000,
      ))
      if (windowEnd <= windowStart) break

      const res = await get(
        `/event_type_available_times?event_type=${encodeURIComponent(et.uri)}` +
        `&start_time=${encodeURIComponent(windowStart.toISOString())}` +
        `&end_time=${encodeURIComponent(windowEnd.toISOString())}`,
      )

      for (const s of res?.collection ?? []) {
        if (s.status !== 'available') continue
        slots.push({
          start: s.start_time,
          key: slotKey(s.start_time),
          label: formatSlotHe(s.start_time),
          schedulingUrl: s.scheduling_url || et.schedulingUrl,
        })
        if (slots.length >= MAX_WINDOW_SLOTS) break
      }
    }

    if (slots.length === 0) return { ok: false, reason: 'no_availability' }
    return {
      ok: true,
      slots,
      suggested: spreadAcrossDays(slots, suggest),
      duration: et.duration,
      kind: et.kind,
    }
  } catch (err) {
    console.error('calendly availability window failed', err instanceof Error ? err.message : 'unknown')
    return { ok: false, reason: 'calendly_error' }
  }
}

/**
 * Pick `n` slots on distinct days where possible.
 *
 * Taking the literal next three on a quiet calendar gives 10:00, 10:30 and
 * 11:00 on one morning, which reads to a lead as "only one day is open".
 * One per day is the same three options carrying far more information.
 *
 * @param {{start:string,key:string,label:string,schedulingUrl:string}[]} slots
 * @param {number} n
 */
export function spreadAcrossDays(slots, n) {
  /** @type {typeof slots} */
  const picked = []
  const daysUsed = new Set()

  for (const s of slots) {
    const day = s.key.slice(0, 10)
    if (daysUsed.has(day)) continue
    daysUsed.add(day)
    picked.push(s)
    if (picked.length >= n) return picked
  }
  // Fewer distinct days than requested — top up with whatever is left.
  for (const s of slots) {
    if (picked.includes(s)) continue
    picked.push(s)
    if (picked.length >= n) break
  }
  return picked
}

/** The plain scheduling link, for the dashboard's "Send booking link" button. */
export async function schedulingLink() {
  if (!token() || !eventUrl()) return eventUrl() || null
  try {
    const et = await resolveEventType()
    return et.schedulingUrl
  } catch {
    return eventUrl() || null
  }
}

/** Test seam — drops the memoised event type. */
export const _resetCache = () => { cachedEventType = null }
