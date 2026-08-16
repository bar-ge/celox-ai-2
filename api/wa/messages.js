// GET /api/wa/messages?phone=+9725... — the full thread for one lead, oldest first.
//
// Deliberately a query parameter rather than a path segment: Vercel's bare `api/`
// directory convention on a Vite project does not deploy `[param]` files as
// functions, so /api/wa/messages/<phone> fell through to the SPA rewrite and
// returned index.html.

import { serviceClient, MESSAGES } from '../_lib/supabase.js'
import { requireMaster } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, reason: 'method_not_allowed' })

  const auth = await requireMaster(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, reason: auth.reason })

  const phone = String(req.query?.phone || '').trim()
  if (!/^\+?\d{6,20}$/.test(phone)) return res.status(400).json({ ok: false, reason: 'bad_phone' })

  try {
    const { data, error } = await serviceClient()
      .from(MESSAGES)
      .select('id, wa_message_id, phone, direction, body, intent, stage, created_at')
      .eq('phone', phone)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return res.status(200).json({ ok: true, messages: data ?? [] })
  } catch (err) {
    console.error('GET /api/wa/messages failed', err instanceof Error ? err.message : 'unknown')
    return res.status(500).json({ ok: false, reason: 'server_error' })
  }
}
