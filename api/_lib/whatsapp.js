// WhatsApp Cloud API (Meta) helpers.

const GRAPH = 'https://graph.facebook.com/v21.0'

const phoneNumberId = () => process.env.WHATSAPP_PHONE_NUMBER_ID
const accessToken = () => process.env.WHATSAPP_ACCESS_TOKEN

/**
 * Normalise a WhatsApp `wa_id` to E.164 with a leading '+'.
 * Cloud API hands over digits only (e.g. "972501234567").
 * @param {string} waId
 * @returns {string}
 */
export function toE164(waId) {
  const digits = String(waId || '').replace(/\D/g, '')
  return digits ? `+${digits}` : ''
}

/** Cloud API wants digits without '+'. @param {string} phone @returns {string} */
export const toWaId = (phone) => String(phone || '').replace(/\D/g, '')

/** Default country for numbers typed without one. */
const DEFAULT_CC = '972'

/**
 * Normalise a number a human typed into E.164.
 *
 * Someone adding a lead by hand writes `054-631-6133`, not `+972546316133`.
 * Israeli local form (leading 0) is the common case, so it is assumed when no
 * country code is present; anything already international is left alone.
 *
 * @param {string} input
 * @returns {string} E.164, or '' when the input cannot be a phone number
 */
export function normalisePhone(input) {
  const raw = String(input || '').trim()
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''

  // Already international, in one form or another.
  if (raw.startsWith('+')) return `+${digits}`
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  if (digits.startsWith(DEFAULT_CC)) return `+${digits}`

  // Local form: 0XXXXXXXX → +972XXXXXXXX.
  if (digits.startsWith('0')) return `+${DEFAULT_CC}${digits.slice(1)}`

  // A bare subscriber number with no trunk prefix.
  if (digits.length <= 9) return `+${DEFAULT_CC}${digits}`

  return `+${digits}`
}

/** E.164 sanity check — permissive on length, strict on shape. */
export const isE164 = (phone) => /^\+\d{8,15}$/.test(String(phone || ''))

const openingTemplate = () => process.env.WHATSAPP_OPENING_TEMPLATE || 'celox_opening_he'
const openingTemplateLang = () => process.env.WHATSAPP_OPENING_TEMPLATE_LANG || 'he'

/**
 * The Cloud API body for a template message.
 *
 * Split out from the send so the shape can be asserted in tests without a
 * network call — a malformed `components` array fails at Meta, not locally.
 *
 * @param {string} phone
 * @param {{ name?: string, language?: string, params?: string[] }} [opts]
 */
export function templatePayload(phone, { name, language, params = [] } = {}) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toWaId(phone),
    type: 'template',
    template: {
      name: name || openingTemplate(),
      language: { code: language || openingTemplateLang() },
      ...(params.length
        ? { components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }] }
        : {}),
    },
  }
}

/**
 * Send an approved template message.
 *
 * Outside the 24-hour customer service window — which is every first contact —
 * Meta only accepts templates. A plain text send to a new number is rejected,
 * so starting a conversation always goes through here.
 *
 * @param {string} phone
 * @param {{ name?: string, language?: string, params?: string[] }} [opts]
 * @returns {Promise<{ ok: boolean, id: string|null, error: string|null }>}
 */
export async function sendTemplate(phone, opts = {}) {
  const id = phoneNumberId()
  const token = accessToken()
  if (!id || !token) return { ok: false, id: null, error: 'whatsapp_not_configured' }

  try {
    const r = await fetch(`${GRAPH}/${id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(templatePayload(phone, opts)),
      signal: AbortSignal.timeout(15000),
    })

    const payload = await r.json().catch(() => ({}))
    if (!r.ok) {
      console.error('whatsapp template send failed', r.status, payload?.error?.message || 'unknown')
      return { ok: false, id: null, error: payload?.error?.message || `http_${r.status}` }
    }
    return { ok: true, id: payload?.messages?.[0]?.id ?? null, error: null }
  } catch (err) {
    console.error('whatsapp template send threw', err instanceof Error ? err.message : 'unknown')
    return { ok: false, id: null, error: 'network' }
  }
}

/**
 * Send a plain text WhatsApp message.
 * @param {string} phone E.164 or raw digits
 * @param {string} body
 * @returns {Promise<{ ok: boolean, id: string|null, error: string|null }>}
 */
export async function sendText(phone, body) {
  const id = phoneNumberId()
  const token = accessToken()
  if (!id || !token) return { ok: false, id: null, error: 'whatsapp_not_configured' }

  const text = String(body || '').trim()
  if (!text) return { ok: false, id: null, error: 'empty_body' }

  try {
    const r = await fetch(`${GRAPH}/${id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toWaId(phone),
        type: 'text',
        text: { preview_url: true, body: text },
      }),
      signal: AbortSignal.timeout(15000),
    })

    const payload = await r.json().catch(() => ({}))
    if (!r.ok) {
      // Never log the token; the payload may echo request context, so log only the message.
      console.error('whatsapp send failed', r.status, payload?.error?.message || 'unknown')
      return { ok: false, id: null, error: payload?.error?.message || `http_${r.status}` }
    }
    return { ok: true, id: payload?.messages?.[0]?.id ?? null, error: null }
  } catch (err) {
    console.error('whatsapp send threw', err instanceof Error ? err.message : 'unknown')
    return { ok: false, id: null, error: 'network' }
  }
}

/**
 * Send a read receipt for an inbound message.
 * @param {string} waMessageId
 */
export async function markRead(waMessageId) {
  const id = phoneNumberId()
  const token = accessToken()
  if (!id || !token || !waMessageId) return

  try {
    await fetch(`${GRAPH}/${id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: waMessageId }),
      signal: AbortSignal.timeout(10000),
    })
  } catch (err) {
    console.error('whatsapp markRead failed', err instanceof Error ? err.message : 'unknown')
  }
}

/**
 * Pull the first user-sent text message out of a Cloud API webhook body.
 * Returns null for status callbacks, reactions, and anything without text.
 *
 * @param {unknown} payload
 * @returns {{ waMessageId: string, phone: string, profileName: string|null, text: string, timestamp: string|null }|null}
 */
export function parseInbound(payload) {
  const value = payload?.entry?.[0]?.changes?.[0]?.value
  if (!value) return null
  if (!Array.isArray(value.messages) || value.messages.length === 0) return null // status update

  const msg = value.messages[0]
  const text =
    msg.type === 'text' ? msg.text?.body
    : msg.type === 'button' ? msg.button?.text
    : msg.type === 'interactive'
      ? (msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title)
      : null

  if (!text || !msg.from || !msg.id) return null

  return {
    waMessageId: msg.id,
    phone: toE164(msg.from),
    profileName: value.contacts?.[0]?.profile?.name ?? null,
    text: String(text),
    timestamp: msg.timestamp ?? null,
  }
}
