// POST /api/wa/nudge — dashboard "Ask for dates" button.
//
// For when the agent stalled instead of presenting real slots (script section
// 10) — usually because it wrote something like "אני בודק ואחזור אליך" instead
// of showing the calendar, a rule the system prompt explicitly forbids but the
// model can still ignore on a given turn. Rather than replaying the LLM (which
// could make the same mistake twice), this builds the section-10 message
// deterministically from the lead's own already-collected answers and the
// live calendar, so it is guaranteed to match the script.
//
// Only usable once qualification (role + fleet size + management) is done —
// before that there is nothing to summarise and no meeting to offer yet.

import { sendText } from '../_lib/whatsapp.js'
import { logMessage, getOrCreateLead } from '../_lib/crm.js'
import { availability } from '../_lib/google-calendar.js'
import { isQualified } from '../_lib/conversation-state.js'
import { CALENDAR_ERROR_MESSAGE } from '../_lib/conversation-script.js'
import { MANAGEMENT_LABEL } from '../_lib/system-prompt.js'
import { serviceClient, LEADS } from '../_lib/supabase.js'
import { requireMaster } from '../_lib/auth.js'
import { syncLead } from '../_lib/monday.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = await requireMaster(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, reason: auth.reason })

  const phone = String(req.body?.phone || '').trim()
  if (!/^\+?\d{6,20}$/.test(phone)) return res.status(400).json({ ok: false, reason: 'bad_phone' })

  try {
    const lead = await getOrCreateLead(phone)
    if (lead.opted_out) return res.status(409).json({ ok: false, reason: 'opted_out' })
    if (lead.meeting_at) return res.status(409).json({ ok: false, reason: 'already_booked' })
    if (!isQualified(lead)) return res.status(409).json({ ok: false, reason: 'not_qualified_yet' })

    const cal = await availability({ days: 14, suggest: 3 })

    const body = cal.ok
      ? summaryAndSlotsMessage(lead, cal.suggested)
      : CALENDAR_ERROR_MESSAGE

    const sent = await sendText(phone, body)
    if (!sent.ok) return res.status(502).json({ ok: false, reason: sent.error ?? 'send_failed' })

    const stage = cal.ok ? 'CALENDAR_OPTIONS' : 'HUMAN_HANDOFF'
    const status = cal.ok ? 'ממתין לבחירת מועד' : 'הועבר לנציג'

    const { data: updated, error } = await serviceClient()
      .from(LEADS)
      .update({ stage, status, bot_paused: !cal.ok })
      .eq('phone', phone)
      .select()
      .single()
    if (error) throw new Error(error.message)

    await logMessage({ phone, direction: 'outbound', body, stage, intent: null })

    const synced = await syncLead(updated)
    if (!synced.ok && synced.reason !== 'monday_not_configured') {
      console.error('monday sync skipped', synced.reason)
    }

    return res.status(200).json({ ok: true, phone, calendarOk: cal.ok })
  } catch (err) {
    console.error('POST /api/wa/nudge failed', err instanceof Error ? err.message : 'unknown')
    return res.status(500).json({ ok: false, reason: 'server_error' })
  }
}

/**
 * Spec section 10, built from data instead of the model — same wording,
 * same fold-in of the email ask from the same section.
 * @param {Record<string, unknown>} lead
 * @param {{ label: string }[]} suggested
 */
function summaryAndSlotsMessage(lead, suggested) {
  const managementLabel = lead.current_management
    ? MANAGEMENT_LABEL[lead.current_management] || lead.current_management
    : null

  const painClause = lead.main_pain ? `, והנושא המרכזי שחשוב לכם הוא ${lead.main_pain}` : ''
  const fleetClause = lead.fleet_size != null ? lead.fleet_size : (lead.fleet_size_raw || '')

  const intro = managementLabel
    ? `הבנתי. אתם מנהלים כ־${fleetClause} באמצעות ${managementLabel}${painClause}.`
    : `הבנתי. אתם מנהלים כ־${fleetClause} כלי רכב${painClause}.`

  const slotLines = suggested.map((s) => s.label).join('\n')

  return (
    `${intro}\n` +
    `בשיחה קצרה עם הצוות שלנו נראה לכם את החלקים הרלוונטיים במערכת ונבדוק אם CELOX AI מתאימה לכם. ` +
    `לא שיחת מכירה בלחץ ולא התחייבות לכלום.\n` +
    `אלה המועדים הקרובים שפנויים:\n\n${slotLines}\n\n` +
    `איזה מהם הכי נוח לך, ולאיזה כתובת מייל אשלח את ההזמנה לפגישה?`
  )
}
