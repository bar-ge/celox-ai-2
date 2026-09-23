// Google Calendar availability + booking, replacing Calendly.
//
// Auth is a bare service-account JWT flow (no googleapis/google-auth-library
// dependency) — sign a claim set with the service account's private key,
// trade it for an OAuth access token, then call the Calendar v3 REST API
// directly. The service account only has calendar-level sharing on
// GOOGLE_CALENDAR_ID (no domain-wide delegation), so it cannot always send a
// native attendee invite — bookSlot() detects that specific failure and
// retries without attendees rather than losing the booking.
//
// Availability is computed ourselves from free/busy + CELOX_INFO.hours,
// since Google Calendar has no "list open slots" endpoint the way Calendly
// does.

import crypto from 'node:crypto'
import { CELOX_INFO } from './celox-info.js'

const TZ = 'Asia/Jerusalem'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/calendar'
const MAX_WINDOW_SLOTS = 240

const serviceAccountEmail = () => process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const serviceAccountKey = () => (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n')
const calendarId = () => process.env.GOOGLE_CALENDAR_ID || 'office@celoxai.com'
const meetingMinutes = () => Number(process.env.GOOGLE_CALENDAR_MEETING_MINUTES) || 45
const bookingUrl = () => process.env.GOOGLE_CALENDAR_BOOKING_URL || null

const isConfigured = () => Boolean(serviceAccountEmail() && serviceAccountKey() && calendarId())

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

let cachedToken = null // { accessToken, expiresAt }

/** Trade the service-account JWT for a short-lived OAuth access token, cached until near expiry. */
async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60000) return cachedToken.accessToken

  const email = serviceAccountEmail()
  const key = serviceAccountKey()
  if (!email || !key) throw new Error('google_calendar_not_configured')

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = { iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), key)
  const jwt = `${unsigned}.${b64url(signature)}`

  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
    signal: AbortSignal.timeout(10000),
  })
  const payload = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`google_token_${r.status}: ${payload?.error_description || payload?.error || ''}`)

  cachedToken = { accessToken: payload.access_token, expiresAt: Date.now() + (Number(payload.expires_in) || 3600) * 1000 }
  return cachedToken.accessToken
}

/** @param {string} timeMinIso @param {string} timeMaxIso */
async function busyIntervals(timeMinIso, timeMaxIso) {
  const token = await getAccessToken()
  const calId = calendarId()
  const r = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeMin: timeMinIso, timeMax: timeMaxIso, items: [{ id: calId }] }),
    signal: AbortSignal.timeout(12000),
  })
  const payload = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`google_freebusy_${r.status}: ${payload?.error?.message || ''}`)
  return payload?.calendars?.[calId]?.busy ?? []
}

/** @param {object} body @param {boolean} withAttendees */
async function insertEvent(body, withAttendees) {
  const token = await getAccessToken()
  const calId = calendarId()
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events` +
    `?conferenceDataVersion=1&sendUpdates=${withAttendees ? 'all' : 'none'}`

  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })
  const payload = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, payload }
}

// ---- Jerusalem-local date/time helpers -----------------------------------

const jerusalemDateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

/** @param {Date} date @returns {string} "YYYY-MM-DD" in Asia/Jerusalem */
function jerusalemDateString(date) {
  return jerusalemDateFmt.format(date)
}

/** @param {string} dateStr "YYYY-MM-DD" @returns {number} 0 (Sun) .. 6 (Sat) */
function dayOfWeekFromDateString(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** @param {string} dateStr "YYYY-MM-DD" @param {number} days */
function addDaysToDateString(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/**
 * Resolve a Jerusalem-local wall-clock time to the UTC instant it represents,
 * DST-aware. Standard trick: format the same UTC-labelled instant in both the
 * target zone and UTC, diff the two, and shift by that offset.
 * @param {string} dateStr "YYYY-MM-DD" @param {string} timeStr "HH:mm"
 */
function zonedTimeToUtc(dateStr, timeStr, tz) {
  const asUtc = new Date(`${dateStr}T${timeStr}:00Z`)
  const inTz = new Date(asUtc.toLocaleString('en-US', { timeZone: tz, hour12: false }))
  const inUtc = new Date(asUtc.toLocaleString('en-US', { timeZone: 'UTC', hour12: false }))
  const offset = inTz.getTime() - inUtc.getTime()
  return new Date(asUtc.getTime() - offset)
}

/** Every slot start, at `duration`-minute steps, within business hours on a given local date. */
function daySlots(dateStr, duration) {
  const { startHour, endHour } = CELOX_INFO.hours
  const totalMinutes = (endHour - startHour) * 60
  const slots = []
  for (let cursor = 0; cursor + duration <= totalMinutes; cursor += duration) {
    const hh = String(startHour + Math.floor(cursor / 60)).padStart(2, '0')
    const mm = String(cursor % 60).padStart(2, '0')
    slots.push(zonedTimeToUtc(dateStr, `${hh}:${mm}`, TZ))
  }
  return slots
}

function overlapsBusy(slotStart, duration, busy) {
  const slotEnd = new Date(slotStart.getTime() + duration * 60000)
  return busy.some((b) => {
    const bStart = new Date(b.start)
    const bEnd = new Date(b.end)
    return slotStart < bEnd && slotEnd > bStart
  })
}

/**
 * Genuinely free business-hours slots between `start` and `end`, sorted.
 * @param {Date} start @param {Date} end @param {number} duration
 * @returns {Promise<Date[]>}
 */
async function freeSlotsBetween(start, end, duration) {
  const busy = await busyIntervals(start.toISOString(), end.toISOString())

  const slots = []
  let dateStr = jerusalemDateString(start)
  const endDate = jerusalemDateString(end)
  let guard = 0
  while (dateStr <= endDate && guard < 400 && slots.length < MAX_WINDOW_SLOTS) {
    guard++
    if (CELOX_INFO.hours.days.includes(dayOfWeekFromDateString(dateStr))) {
      for (const slotStart of daySlots(dateStr, duration)) {
        if (slotStart >= start && slotStart < end && !overlapsBusy(slotStart, duration, busy)) {
          slots.push(slotStart)
          if (slots.length >= MAX_WINDOW_SLOTS) break
        }
      }
    }
    dateStr = addDaysToDateString(dateStr, 1)
  }
  slots.sort((a, b) => a.getTime() - b.getTime())
  return slots
}

// ---- Public interface (mirrors calendly.js) --------------------------------

const heDate = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
const heTime = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
const heShort = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })

const keyParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
})

/**
 * Stable local-time key for a slot: "2026-08-19 12:00" in Asia/Jerusalem.
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
 * Pick `n` slots on distinct days where possible.
 * @param {{start:string,key:string,label:string,schedulingUrl:string}[]} slots
 * @param {number} n
 */
export function spreadAcrossDays(slots, n) {
  const picked = []
  const daysUsed = new Set()

  for (const s of slots) {
    const day = s.key.slice(0, 10)
    if (daysUsed.has(day)) continue
    daysUsed.add(day)
    picked.push(s)
    if (picked.length >= n) return picked
  }
  for (const s of slots) {
    if (picked.includes(s)) continue
    picked.push(s)
    if (picked.length >= n) break
  }
  return picked
}

/** The public booking-page link, for the dashboard's "Send booking link" button. */
export async function schedulingLink() {
  return bookingUrl()
}

/**
 * Next N genuinely available slots.
 * @param {object} [opts]
 * @param {number} [opts.count] @param {Date} [opts.from] @param {number} [opts.days]
 */
export async function availableSlots({ count = 3, from, days = 7 } = {}) {
  if (!isConfigured()) return { ok: false, reason: 'google_calendar_not_configured' }

  try {
    const duration = meetingMinutes()
    const start = from && from.getTime() > Date.now() ? from : new Date(Date.now() + 2 * 60 * 60 * 1000)
    const end = new Date(start.getTime() + days * 86400000)
    const link = await schedulingLink()

    const raw = await freeSlotsBetween(start, end, duration)
    const slots = raw.slice(0, count).map((d) => {
      const iso = d.toISOString()
      return { start: iso, label: formatSlotHe(iso), schedulingUrl: link }
    })

    if (slots.length === 0) return { ok: false, reason: 'no_availability' }
    return { ok: true, slots, duration, kind: 'Google Meet' }
  } catch (err) {
    console.error('google calendar availability failed', err instanceof Error ? err.message : 'unknown')
    return { ok: false, reason: 'google_calendar_error' }
  }
}

/**
 * Slots on or after a specific day the lead asked for.
 * @param {Date} preferred @param {number} [count]
 */
export const slotsNear = (preferred, count = 3) => availableSlots({ count, from: preferred })

/**
 * Every open slot in the next `days`, not just the next three.
 * @param {object} [opts]
 * @param {number} [opts.days] @param {number} [opts.suggest]
 */
export async function availability({ days = 14, suggest = 3 } = {}) {
  if (!isConfigured()) return { ok: false, reason: 'google_calendar_not_configured' }

  try {
    const duration = meetingMinutes()
    const start = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const end = new Date(start.getTime() + days * 86400000)
    const link = await schedulingLink()

    const raw = await freeSlotsBetween(start, end, duration)
    const slots = raw.map((d) => {
      const iso = d.toISOString()
      return { start: iso, key: slotKey(iso), label: formatSlotHe(iso), schedulingUrl: link }
    })

    if (slots.length === 0) return { ok: false, reason: 'no_availability' }
    return { ok: true, slots, suggested: spreadAcrossDays(slots, suggest), duration, kind: 'Google Meet' }
  } catch (err) {
    console.error('google calendar availability window failed', err instanceof Error ? err.message : 'unknown')
    return { ok: false, reason: 'google_calendar_error' }
  }
}

/**
 * Book a slot outright, so the lead does not have to finish anything on a
 * separate page. The service account only has calendar-level sharing (no
 * domain-wide delegation), so a native attendee invite can be rejected by
 * Google — if that specific error comes back, the event is booked again
 * without attendees so the slot is still reserved and gets a Meet link; the
 * WhatsApp reply carries the details instead of an email invite.
 *
 * @param {object} args
 * @param {string} args.startIso @param {string} args.email @param {string} [args.name] @param {string} [args.timezone]
 * @returns {Promise<{ ok: true, eventUri: string|null, cancelUrl: string|null, rescheduleUrl: string|null, meetUrl: string|null } | { ok: false, reason: string }>}
 */
export async function bookSlot({ startIso, email, name, timezone = TZ }) {
  if (!isConfigured()) return { ok: false, reason: 'google_calendar_not_configured' }
  if (!email) return { ok: false, reason: 'email_required' }

  try {
    const duration = meetingMinutes()
    const end = new Date(new Date(startIso).getTime() + duration * 60000).toISOString()

    const body = {
      summary: `פגישת הדגמה — Celox${name ? ` עם ${name}` : ''}`,
      description: `נקבע אוטומטית דרך סוכן הוואטסאפ של Celox.\nאיש קשר: ${name || email}\nמייל: ${email}`,
      start: { dateTime: startIso, timeZone: timezone },
      end: { dateTime: end, timeZone: timezone },
      conferenceData: {
        createRequest: {
          requestId: `wa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }

    let result = await insertEvent({ ...body, attendees: [{ email, displayName: name || undefined }] }, true)

    if (!result.ok && /domain-wide delegation|cannot invite attendees/i.test(result.payload?.error?.message || '')) {
      console.error('google calendar: attendee invite blocked (no domain-wide delegation), booking without invite')
      result = await insertEvent(body, false)
    }

    if (!result.ok) {
      const message = result.payload?.error?.message || `http_${result.status}`
      console.error('google calendar booking failed', result.status, message)
      return { ok: false, reason: message }
    }

    const ev = result.payload
    const meetUrl =
      ev?.hangoutLink ?? ev?.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ?? null

    return {
      ok: true,
      eventUri: ev?.htmlLink ?? null,
      cancelUrl: ev?.htmlLink ?? null,
      rescheduleUrl: meetUrl,
      meetUrl,
    }
  } catch (err) {
    console.error('google calendar booking threw', err instanceof Error ? err.message : 'unknown')
    return { ok: false, reason: 'network' }
  }
}

/** Test seam — drops the memoised access token. */
export const _resetCache = () => { cachedToken = null }
