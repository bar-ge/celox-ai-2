#!/usr/bin/env node
// Self-test for the WhatsApp lead agent's pure logic. No network, no API keys.
//   node scripts/wa-agent-selftest.mjs

import assert from 'node:assert/strict'

import { parseInbound, toE164 } from '../api/_lib/whatsapp.js'
import { toAgentResponse } from '../api/_lib/claude.js'
import { nextUnansweredStage, deriveStatus, isQualified, isStage, isStatus } from '../api/_lib/conversation-state.js'
import { normaliseTurns } from '../api/_lib/crm.js'
import { followupDue, followupMessage, withinBusinessHours, localParts } from '../api/_lib/followups.js'
import { buildSystemPrompt } from '../api/_lib/system-prompt.js'
import { slotKey, spreadAcrossDays } from '../api/_lib/calendly.js'
import { CONVERSATION_SCRIPT } from '../api/_lib/conversation-script.js'
import { INTENT_VALUES } from '../api/_lib/intents.js'

let passed = 0
const test = (name, fn) => {
  try { fn(); passed++; console.log(`  ok  ${name}`) }
  catch (err) { console.error(`FAIL  ${name}\n      ${err.message}`); process.exitCode = 1 }
}

console.log('\nwhatsapp payload parsing')

test('ignores status callbacks', () => {
  assert.equal(parseInbound({ entry: [{ changes: [{ value: { statuses: [{ id: 'x', status: 'delivered' }] } }] }] }), null)
})

test('extracts a text message', () => {
  const out = parseInbound({
    entry: [{ changes: [{ value: {
      contacts: [{ profile: { name: 'בר' } }],
      messages: [{ id: 'wamid.1', from: '972501234567', type: 'text', text: { body: 'שלום' }, timestamp: '1700000000' }],
    } }] }],
  })
  assert.equal(out.waMessageId, 'wamid.1')
  assert.equal(out.phone, '+972501234567')
  assert.equal(out.profileName, 'בר')
  assert.equal(out.text, 'שלום')
})

test('extracts an interactive button reply', () => {
  const out = parseInbound({
    entry: [{ changes: [{ value: { messages: [{
      id: 'wamid.2', from: '972501234567', type: 'interactive',
      interactive: { button_reply: { title: 'כן, ממש כן' } },
    }] } }] }],
  })
  assert.equal(out.text, 'כן, ממש כן')
})

test('toE164 normalises', () => {
  assert.equal(toE164('972501234567'), '+972501234567')
  assert.equal(toE164('+972-50-123-4567'), '+972501234567')
  assert.equal(toE164(''), '')
})

console.log('\nagent response contract')

test('accepts a well-formed response', () => {
  const r = toAgentResponse({
    reply: 'קיבלתי. כמה כלי רכב אתם מנהלים היום?',
    intent: 'qualification_answer',
    next_stage: 'FLEET_SIZE',
    extracted: { role: 'סמנכ״ל כספים', fleet_size: 85, current_management: 'excel' },
    open_question: null, requires_human: false, conversation_complete: false,
  })
  assert.equal(r.intent, 'qualification_answer')
  assert.equal(r.extracted.fleet_size, 85)
  assert.equal(r.extracted.current_management, 'excel')
  assert.equal(r.extracted.company, null)
})

test('rejects a response with no reply', () => {
  assert.equal(toAgentResponse({ intent: 'general', next_stage: 'ROLE' }), null)
  assert.equal(toAgentResponse(null), null)
  assert.equal(toAgentResponse('nope'), null)
})

test('falls back on an unknown intent or stage rather than storing junk', () => {
  const r = toAgentResponse({ reply: 'שלום', intent: 'make_sale', next_stage: 'CLOSING' })
  assert.equal(r.intent, 'general')
  assert.equal(r.next_stage, 'OPENING')
})

test('coerces a string fleet size and drops a bad management value', () => {
  const r = toAgentResponse({
    reply: 'x', intent: 'general', next_stage: 'ROLE',
    extracted: { fleet_size: 'בערך 70', current_management: 'carrier-pigeon' },
  })
  assert.equal(r.extracted.fleet_size, 70)
  assert.equal(r.extracted.current_management, null)
})

test('every intent in the taxonomy is accepted', () => {
  for (const intent of INTENT_VALUES) {
    assert.equal(toAgentResponse({ reply: 'x', intent, next_stage: 'ROLE' }).intent, intent)
  }
})

console.log('\nconversation state')

test('resumes at the first unanswered question', () => {
  assert.equal(nextUnansweredStage({}), 'ROLE')
  assert.equal(nextUnansweredStage({ role: 'מנהל צי' }), 'FLEET_SIZE')
  assert.equal(nextUnansweredStage({ role: 'מנהל צי', fleet_size: 85 }), 'CURRENT_MANAGEMENT')
  assert.equal(nextUnansweredStage({ role: 'x', fleet_size: 85, current_management: 'system' }), 'EXISTING_SYSTEM')
  assert.equal(nextUnansweredStage({ role: 'x', fleet_size: 85, current_management: 'excel' }), 'MAIN_PAIN')
})

test('a free-text fleet answer counts as answered', () => {
  assert.equal(nextUnansweredStage({ role: 'x', fleet_size_raw: 'אני לא יודע בדיוק' }), 'CURRENT_MANAGEMENT')
})

test('terminal states win over the ladder', () => {
  assert.equal(nextUnansweredStage({ opted_out: true }), 'OPT_OUT')
  assert.equal(nextUnansweredStage({ bot_paused: true }), 'HUMAN_HANDOFF')
  assert.equal(nextUnansweredStage({ meeting_at: '2026-08-20T10:00:00Z' }), 'MEETING_BOOKED')
})

test('qualification needs role + fleet + management', () => {
  assert.equal(isQualified({ role: 'x', fleet_size: 20 }), false)
  assert.equal(isQualified({ role: 'x', fleet_size: 20, current_management: 'excel' }), true)
})

test('status tracks the conversation and stays inside the allowed set', () => {
  const cases = [
    [{}, { stage: 'OPENING', hasInbound: false }, 'נשלחה הודעת פתיחה'],
    [{}, { stage: 'ROLE', hasInbound: true }, 'בתהליך חימום'],
    [{ role: 'x', fleet_size: 9, current_management: 'excel' }, { stage: 'MAIN_PAIN', hasInbound: true }, 'הושלם אפיון ראשוני'],
    [{}, { stage: 'CALENDAR_OPTIONS', hasInbound: true }, 'ממתין לבחירת מועד'],
    [{ meeting_at: 'x' }, { stage: 'MEETING_BOOKED', hasInbound: true }, 'נקבעה פגישה'],
    [{}, { stage: 'ROLE', hasInbound: true, requiresHuman: true }, 'הועבר לנציג'],
    [{}, { stage: 'ROLE', hasInbound: true, optedOut: true }, 'ביקש הסרה'],
    [{}, { stage: 'NOT_RELEVANT', hasInbound: true }, 'לא מתאים'],
  ]
  for (const [lead, ctx, expected] of cases) {
    const status = deriveStatus(lead, ctx)
    assert.equal(status, expected)
    assert.ok(isStatus(status), `${status} is not an allowed status`)
  }
})

test('opt-out outranks a booked meeting', () => {
  assert.equal(deriveStatus({ meeting_at: 'x', opted_out: true }, { stage: 'MEETING_BOOKED', hasInbound: true }), 'ביקש הסרה')
})

console.log('\nmessage history')

test('drops leading assistant turns and merges same-role runs', () => {
  const out = normaliseTurns([
    { role: 'assistant', content: 'פתיחה' },
    { role: 'user', content: 'כן' },
    { role: 'user', content: 'ומה זה בכלל?' },
    { role: 'assistant', content: 'תשובה' },
  ])
  assert.deepEqual(out, [
    { role: 'user', content: 'כן\nומה זה בכלל?' },
    { role: 'assistant', content: 'תשובה' },
  ])
})

test('a history with no user turn yields nothing', () => {
  assert.deepEqual(normaliseTurns([{ role: 'assistant', content: 'פתיחה' }]), [])
})

console.log('\nfollow-ups')

const jerusalem = (y, m, d, h) => new Date(Date.UTC(y, m - 1, d, h - 3)) // UTC+3 in August

test('business hours are SUN–THU 09:00–18:00 Jerusalem', () => {
  assert.equal(localParts(jerusalem(2026, 8, 16, 10)).weekday, 0) // Sunday
  assert.equal(withinBusinessHours(jerusalem(2026, 8, 16, 10)), true)  // Sun 10:00
  assert.equal(withinBusinessHours(jerusalem(2026, 8, 16, 8)), false)  // Sun 08:00
  assert.equal(withinBusinessHours(jerusalem(2026, 8, 16, 17)), true)  // Sun 17:00
  assert.equal(withinBusinessHours(jerusalem(2026, 8, 16, 18)), false) // Sun 18:00
  assert.equal(withinBusinessHours(jerusalem(2026, 8, 21, 10)), false) // Friday
  assert.equal(withinBusinessHours(jerusalem(2026, 8, 22, 10)), false) // Saturday
})

test('never chases an opted-out, paused or booked lead', () => {
  const now = jerusalem(2026, 8, 16, 10)
  const base = { last_inbound_at: jerusalem(2026, 8, 10, 10).toISOString(), followup_count: 0 }
  assert.equal(followupDue({ ...base, opted_out: true }, now).due, false)
  assert.equal(followupDue({ ...base, bot_paused: true }, now).due, false)
  assert.equal(followupDue({ ...base, meeting_at: 'x' }, now).due, false)
})

test('stops after three', () => {
  const now = jerusalem(2026, 8, 16, 12)
  const lead = { last_followup_at: jerusalem(2026, 8, 10, 10).toISOString(), followup_count: 3 }
  const check = followupDue(lead, now)
  assert.equal(check.due, false)
  assert.equal(check.reason, 'max_reached')
})

test('waits out the delay, then fires inside business hours', () => {
  const now = jerusalem(2026, 8, 16, 12)
  const tooSoon = { last_inbound_at: jerusalem(2026, 8, 16, 11).toISOString(), followup_count: 0 }
  assert.equal(followupDue(tooSoon, now).reason, 'too_soon')

  const due = { last_inbound_at: jerusalem(2026, 8, 16, 6).toISOString(), followup_count: 0 }
  assert.equal(followupDue(due, now).due, true)
  assert.equal(followupDue(due, now).number, 1)

  const night = jerusalem(2026, 8, 16, 22)
  assert.equal(followupDue(due, night).reason, 'outside_business_hours')
})

test('a follow-up resumes the unanswered question, never the opening', () => {
  const lead = { first_name: 'בר', role: 'מנהל צי', followup_count: 0 }
  const one = followupMessage(lead, 1)
  assert.ok(one.includes('כמה כלי רכב אתם מנהלים היום?'), one)
  assert.ok(!one.includes('כאן הסוכן הדיגיטלי'), 'follow-up must not restart the script')

  const two = followupMessage(lead, 2)
  assert.ok(two.includes('בר'))
  assert.ok(two.includes('כמה כלי רכב'))

  const three = followupMessage(lead, 3)
  assert.ok(three.includes('להשאיר את הפנייה פתוחה'))
})

console.log('\nsystem prompt')

test('carries the Hebrew script verbatim', () => {
  const p = buildSystemPrompt({ lead: { stage: 'OPENING' } })
  assert.ok(p.includes(CONVERSATION_SCRIPT), 'script must be embedded unmodified')
  assert.ok(p.includes('## 24. הנחיית מערכת מרכזית לסוכן'))
})

test('lists what is already known and where to resume', () => {
  const p = buildSystemPrompt({ lead: { stage: 'FLEET_SIZE', role: 'סמנכ״ל כספים', fleet_size: 85, current_management: 'excel' } })
  assert.ok(p.includes('תפקיד: סמנכ״ל כספים'))
  assert.ok(p.includes('מספר כלי רכב: 85'))
  assert.ok(p.includes('אופן ניהול כיום: אקסלים ועבודה ידנית'))
  assert.ok(p.includes('השלב הפתוח שאליו יש לחזור: MAIN_PAIN'))
})

test('forbids inventing slots when the calendar is unavailable', () => {
  const p = buildSystemPrompt({ lead: { stage: 'CALENDAR_OPTIONS' }, slots: [] })
  assert.ok(p.includes('אל תציע שעות'))
})

test('offers only the suggested slots but lists the whole calendar', () => {
  const slots = [
    { key: '2026-08-18 10:30', label: 'יום שלישי, 18 באוגוסט, 10:30' },
    { key: '2026-08-18 12:00', label: 'יום שלישי, 18 באוגוסט, 12:00' },
    { key: '2026-08-19 09:00', label: 'יום רביעי, 19 באוגוסט, 09:00' },
  ]
  const p = buildSystemPrompt({
    lead: { stage: 'CALENDAR_OPTIONS' },
    slots,
    suggested: [slots[0], slots[2]],
    meetingMinutes: 30, meetingKind: 'Zoom',
  })
  assert.ok(p.includes('המועדים שיש להציע ביוזמתך'))
  assert.ok(p.includes('מזהה: 2026-08-18 10:30'))
  // The lead-requested time must be visible even though it is not offered.
  assert.ok(p.includes('2026-08-18 (יום שלישי): 10:30, 12:00'), 'day grouping missing')
  assert.ok(p.includes('2026-08-19 (יום רביעי): 09:00'))
  assert.ok(p.includes('כ־30 דקות'))
})

test('tells the agent how to answer a lead-requested time', () => {
  const p = buildSystemPrompt({
    lead: { stage: 'CALENDAR_OPTIONS' },
    slots: [{ key: '2026-08-18 12:00', label: 'יום שלישי, 18 באוגוסט, 12:00' }],
  })
  assert.ok(p.includes('אם הליד מבקש יום ושעה מסוימים'))
  assert.ok(p.includes('אל תאשר שעה לפני שראית אותה כאן'))
})

console.log('\ncalendar helpers')

test('slotKey renders Israel local time', () => {
  // 09:00 UTC in August is 12:00 in Jerusalem (UTC+3).
  assert.equal(slotKey('2026-08-18T09:00:00.000Z'), '2026-08-18 12:00')
  // Midnight local must not render as hour 24.
  assert.equal(slotKey('2026-08-17T21:00:00.000Z'), '2026-08-18 00:00')
})

test('suggested slots spread across distinct days', () => {
  const mk = (key) => ({ key, label: key, start: key, schedulingUrl: 'x' })
  const picked = spreadAcrossDays(
    ['2026-08-18 09:00', '2026-08-18 09:30', '2026-08-18 10:00',
     '2026-08-19 09:00', '2026-08-20 11:00'].map(mk), 3)
  assert.deepEqual(picked.map((s) => s.key),
    ['2026-08-18 09:00', '2026-08-19 09:00', '2026-08-20 11:00'])
})

test('falls back to same-day slots when there are not enough days', () => {
  const mk = (key) => ({ key, label: key, start: key, schedulingUrl: 'x' })
  const picked = spreadAcrossDays(['2026-08-18 09:00', '2026-08-18 09:30'].map(mk), 3)
  assert.equal(picked.length, 2)
})

test('the contract names only valid stages and intents', () => {
  const p = buildSystemPrompt({ lead: {} })
  for (const intent of INTENT_VALUES) assert.ok(p.includes(intent))
  assert.ok(isStage('MEETING_CONFIRMATION'))
})

console.log(`\n${passed} checks passed${process.exitCode ? ' — with failures above' : ''}\n`)
