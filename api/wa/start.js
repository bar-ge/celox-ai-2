// POST /api/wa/start — dashboard "New conversation".
//
// Opens a thread with a number that has never written to us. Meta's 24-hour
// customer service window has not started for such a number, so the first
// message must be an approved template; everything after it is ordinary text
// handled by the webhook, exactly as if the lead had written first.

import { sendTemplate, normalisePhone, isE164 } from '../_lib/whatsapp.js'
import { logMessage } from '../_lib/crm.js'
import { OPENING_MESSAGE } from '../_lib/conversation-script.js'
import { serviceClient, LEADS, MESSAGES } from '../_lib/supabase.js'
import { syncLead } from '../_lib/monday.js'
import { requireMaster } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = await requireMaster(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, reason: auth.reason })

  const phone = normalisePhone(req.body?.phone)
  const firstName = String(req.body?.firstName || '').trim()

  if (!isE164(phone)) return res.status(400).json({ ok: false, reason: 'bad_phone' })
  // The opening template personalises by name, and Meta rejects an empty
  // parameter — so a name is required rather than optional here.
  if (!firstName) return res.status(400).json({ ok: false, reason: 'name_required' })

  try {
    const db = serviceClient()

    const { data: existing, error: lookupErr } = await db
      .from(LEADS).select('*').eq('phone', phone).maybeSingle()
    if (lookupErr) throw new Error(lookupErr.message)

    if (existing) {
      // Never re-open a lead who asked to be left alone, and never restart a
      // live conversation from the top — say which it is so the UI can explain.
      if (existing.opted_out) return res.status(409).json({ ok: false, reason: 'opted_out' })

      const { count } = await db
        .from(MESSAGES).select('id', { count: 'exact', head: true }).eq('phone', phone)
      if ((count ?? 0) > 0) {
        return res.status(409).json({ ok: false, reason: 'already_exists', phone })
      }
    }

    const sent = await sendTemplate(phone, { params: [firstName] })
    if (!sent.ok) {
      return res.status(502).json({ ok: false, reason: sent.error ?? 'send_failed' })
    }

    // The lead row is written only after Meta accepted the message, so a failed
    // send never leaves a phantom conversation in the dashboard.
    const { data: lead, error: upsertErr } = await db
      .from(LEADS)
      .upsert({
        phone,
        first_name: firstName,
        stage: 'OPENING',
        status: 'נשלחה הודעת פתיחה',
        last_followup_at: new Date().toISOString(),
        followup_count: 0,
      }, { onConflict: 'phone' })
      .select()
      .single()
    if (upsertErr) throw new Error(upsertErr.message)

    // Log the rendered text, not the template name: the dashboard thread should
    // read as the lead sees it.
    await logMessage({
      phone, direction: 'outbound', body: OPENING_MESSAGE(firstName),
      waMessageId: sent.id, stage: 'OPENING', intent: null,
    })

    const synced = await syncLead(lead)
    if (!synced.ok && synced.reason !== 'monday_not_configured') {
      console.error('monday sync skipped', synced.reason)
    }

    return res.status(200).json({ ok: true, phone })
  } catch (err) {
    console.error('POST /api/wa/start failed', err instanceof Error ? err.message : 'unknown')
    return res.status(500).json({ ok: false, reason: 'server_error' })
  }
}
