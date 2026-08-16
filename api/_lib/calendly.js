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
    schedulingUrl: match.scheduling_url || want,
  }
  return cachedEventType
}

const heDate = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
const heTime = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
const heShort = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })

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
