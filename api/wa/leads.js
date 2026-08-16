// GET   /api/wa/leads              — every lead plus a preview of its most recent message
// PATCH /api/wa/leads?phone=+9725… — manual controls: bot_paused, status, assigned_rep
//
// The PATCH lives here rather than in a `leads/[phone].js` file because Vercel's
// bare `api/` directory convention on a Vite project does not deploy `[param]`
// files as functions — those requests fell through to the SPA rewrite instead.

import { serviceClient, LEADS, MESSAGES } from '../_lib/supabase.js'
import { requireMaster } from '../_lib/auth.js'
import { isStatus } from '../_lib/conversation-state.js'

export default async function handler(req, res) {
  if (req.method === 'PATCH') return patchLead(req, res)
  if (req.method !== 'GET') return res.status(405).json({ ok: false, reason: 'method_not_allowed' })

  const auth = await requireMaster(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, reason: auth.reason })

  try {
    const db = serviceClient()

    const { data: leads, error: leadsErr } = await db
      .from(LEADS)
      .select('*')
      .order('updated_at', { ascending: false })
    if (leadsErr) throw new Error(leadsErr.message)

    const phones = (leads ?? []).map((l) => l.phone)
    if (phones.length === 0) return res.status(200).json({ ok: true, leads: [] })

    // One pass over the messages for these leads, folded down per phone.
    const { data: messages, error: msgErr } = await db
      .from(MESSAGES)
      .select('phone, body, direction, intent, created_at')
      .in('phone', phones)
      .order('created_at', { ascending: true })
    if (msgErr) throw new Error(msgErr.message)

    /** @type {Record<string, { count: number, first: string|null, last: string|null, preview: string, lastIntent: string|null }>} */
    const roll = {}
    for (const m of messages ?? []) {
      const r = roll[m.phone] ?? (roll[m.phone] = { count: 0, first: null, last: null, preview: '', lastIntent: null })
      r.count += 1
      if (!r.first) r.first = m.created_at
      r.last = m.created_at
      r.preview = m.body ?? ''
      if (m.direction === 'inbound' && m.intent) r.lastIntent = m.intent
    }

    const rows = (leads ?? [])
      .map((lead) => {
        const r = roll[lead.phone] ?? { count: 0, first: null, last: null, preview: '', lastIntent: null }
        return {
          ...lead,
          message_count: r.count,
          first_contact_at: r.first ?? lead.created_at,
          last_message_at: r.last ?? lead.created_at,
          last_message_preview: r.preview,
          last_intent: r.lastIntent,
        }
      })
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())

    return res.status(200).json({ ok: true, leads: rows })
  } catch (err) {
    console.error('GET /api/wa/leads failed', err instanceof Error ? err.message : 'unknown')
    return res.status(500).json({ ok: false, reason: 'server_error' })
  }
}

/** Only three fields are writable by hand. */
async function patchLead(req, res) {
  const auth = await requireMaster(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, reason: auth.reason })

  const phone = String(req.query?.phone || '').trim()
  if (!/^\+?\d{6,20}$/.test(phone)) return res.status(400).json({ ok: false, reason: 'bad_phone' })

  const body = req.body ?? {}
  /** @type {Record<string, unknown>} */
  const patch = {}

  if (typeof body.bot_paused === 'boolean') patch.bot_paused = body.bot_paused
  if (body.status !== undefined) {
    if (!isStatus(body.status)) return res.status(400).json({ ok: false, reason: 'bad_status' })
    patch.status = body.status
  }
  if (body.assigned_rep !== undefined) {
    if (body.assigned_rep !== null && typeof body.assigned_rep !== 'string') {
      return res.status(400).json({ ok: false, reason: 'bad_rep' })
    }
    patch.assigned_rep = body.assigned_rep || null
  }

  if (Object.keys(patch).length === 0) return res.status(400).json({ ok: false, reason: 'nothing_to_update' })

  try {
    const { data, error } = await serviceClient()
      .from(LEADS).update(patch).eq('phone', phone).select().single()

    if (error) throw new Error(error.message)
    return res.status(200).json({ ok: true, lead: data })
  } catch (err) {
    console.error('PATCH /api/wa/leads failed', err instanceof Error ? err.message : 'unknown')
    return res.status(500).json({ ok: false, reason: 'server_error' })
  }
}
