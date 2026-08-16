// POST /api/wa/send-booking — dashboard "Send booking link".
// The link is always wrapped in a natural Hebrew sentence, never sent bare.

import { sendText } from '../_lib/whatsapp.js'
import { logMessage, getOrCreateLead } from '../_lib/crm.js'
import { schedulingLink } from '../_lib/calendly.js'
import { requireMaster } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = await requireMaster(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, reason: auth.reason })

  const phone = String(req.body?.phone || '').trim()
  if (!/^\+?\d{6,20}$/.test(phone)) return res.status(400).json({ ok: false, reason: 'bad_phone' })

  try {
    const lead = await getOrCreateLead(phone)
    if (lead.opted_out) return res.status(409).json({ ok: false, reason: 'opted_out' })

    const link = await schedulingLink()
    if (!link) return res.status(503).json({ ok: false, reason: 'calendly_not_configured' })

    const name = lead.first_name ? ` ${lead.first_name}` : ''
    const body =
      `היי${name}, כדי שנתאם את השיחה הקצרה בלי לשחק בטלפון־שבור — אפשר לבחור מועד ` +
      `שנוח לך ישירות ביומן שלנו כאן: ${link} ואם אף מועד לא מסתדר, פשוט תכתוב לי כאן ואמצא משהו אחר.`

    const sent = await sendText(phone, body)
    await logMessage({
      phone, direction: 'outbound', body,
      waMessageId: sent.id, stage: lead.stage, intent: 'booking_request',
    })

    if (!sent.ok) return res.status(502).json({ ok: false, reason: sent.error ?? 'send_failed' })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('POST /api/wa/send-booking failed', err instanceof Error ? err.message : 'unknown')
    return res.status(500).json({ ok: false, reason: 'server_error' })
  }
}
