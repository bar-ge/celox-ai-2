import { serviceClient } from '../_lib/supabase.js'

// TCEL-060 — ticket confirmation + reference number. Writes to
// `avatar_escalations` (migration in supabase/migrations/, NOT yet applied —
// see the Monday update on TCEL-057 for why). If the table doesn't exist
// yet, this returns 503 and the frontend (AvatarWidget.jsx) falls back to a
// client-generated TMP- reference so the UX doesn't break, but nothing is
// actually persisted until the migration is run.
//
// Reference number format is a placeholder (ESC-<timestamp36>) — confirm
// against the real נוהל 6 / מוקד בטיחות 365 ticket format before this ships;
// flagged, not guessed.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { type, description, urgency } = req.body ?? {}
  if (typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ ok: false, reason: 'missing_description' })
  }

  const reference = `ESC-${Date.now().toString(36).toUpperCase()}`

  try {
    const db = serviceClient()
    const { error } = await db.from('avatar_escalations').insert({
      reference,
      type: typeof type === 'string' ? type : 'other',
      description: description.trim().slice(0, 4000),
      urgency: ['low', 'medium', 'high'].includes(urgency) ? urgency : 'low',
    })
    if (error) {
      console.error('avatar escalate: insert failed (table may not exist yet)', error.message)
      return res.status(503).json({ ok: false, reason: 'not_configured' })
    }
    return res.status(200).json({ ok: true, reference })
  } catch (err) {
    console.error('avatar escalate: unexpected error', err instanceof Error ? err.message : err)
    return res.status(500).json({ ok: false, reason: 'error' })
  }
}
