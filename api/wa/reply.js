// POST /api/wa/reply — dashboard "take control" reply box.
//
// The WhatsApp number is a Cloud API sender (WHATSAPP_PHONE_NUMBER_ID), not a
// number with a companion consumer WhatsApp app — so "Pause bot" alone never
// let a human actually type back to a lead. This is the other half: it sends
// whatever text a team member types, through the exact same Cloud API call
// the bot itself uses, so it comes from the same number and the same thread.
//
// Sending a manual reply always pauses the bot too. Otherwise the bot could
// reply on top of a human message on the very next inbound turn, which would
// be confusing at best and contradictory at worst.

import { sendText } from '../_lib/whatsapp.js'
import { logMessage, getOrCreateLead } from '../_lib/crm.js'
import { serviceClient, LEADS } from '../_lib/supabase.js'
import { requireMaster } from '../_lib/auth.js'
import { syncLead } from '../_lib/monday.js'

const MAX_LENGTH = 4096 // WhatsApp's own text message limit

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = await requireMaster(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, reason: auth.reason })

  const phone = String(req.body?.phone || '').trim()
  if (!/^\+?\d{6,20}$/.test(phone)) return res.status(400).json({ ok: false, reason: 'bad_phone' })

  const body = String(req.body?.text || '').trim()
  if (!body) return res.status(400).json({ ok: false, reason: 'empty_text' })
  if (body.length > MAX_LENGTH) return res.status(400).json({ ok: false, reason: 'text_too_long' })

  try {
    const lead = await getOrCreateLead(phone)
    if (lead.opted_out) return res.status(409).json({ ok: false, reason: 'opted_out' })

    const sent = await sendText(phone, body)
    if (!sent.ok) return res.status(502).json({ ok: false, reason: sent.error ?? 'send_failed' })

    await logMessage({
      phone, direction: 'outbound', body,
      waMessageId: sent.id, stage: lead.stage, intent: null,
    })

    // A human is now in this conversation — pause the bot and reflect that on
    // the board, same status the bot itself uses for a handoff.
    const { data: updated, error } = await serviceClient()
      .from(LEADS)
      .update({ bot_paused: true, status: 'הועבר לנציג' })
      .eq('phone', phone)
      .select()
      .single()
    if (error) throw new Error(error.message)

    const synced = await syncLead(updated)
    if (!synced.ok && synced.reason !== 'monday_not_configured') {
      console.error('monday sync skipped', synced.reason)
    }

    return res.status(200).json({ ok: true, phone })
  } catch (err) {
    console.error('POST /api/wa/reply failed', err instanceof Error ? err.message : 'unknown')
    return res.status(500).json({ ok: false, reason: 'server_error' })
  }
}
