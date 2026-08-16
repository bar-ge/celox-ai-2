// GET /api/wa/messages/:phone — the full thread for one lead, oldest first.

import { serviceClient, MESSAGES } from '../../_lib/supabase.js'
import { requireMaster } from '../../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const auth = await requireMaster(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, reason: auth.reason })

  const phone = decodeURIComponent(String(req.query.phone || ''))
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
    console.error('GET /api/wa/messages/[phone] failed', err instanceof Error ? err.message : 'unknown')
    return res.status(500).json({ ok: false, reason: 'server_error' })
  }
}
