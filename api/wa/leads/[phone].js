// PATCH /api/wa/leads/:phone — manual controls from the dashboard.
// Only three fields are writable by hand: bot_paused, status, assigned_rep.

import { serviceClient, LEADS } from '../../_lib/supabase.js'
import { requireMaster } from '../../_lib/auth.js'
import { isStatus } from '../../_lib/conversation-state.js'

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).end()

  const auth = await requireMaster(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, reason: auth.reason })

  const phone = decodeURIComponent(String(req.query.phone || ''))
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
    console.error('PATCH /api/wa/leads/[phone] failed', err instanceof Error ? err.message : 'unknown')
    return res.status(500).json({ ok: false, reason: 'server_error' })
  }
}
