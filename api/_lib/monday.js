// Mirror qualified WhatsApp leads onto the Monday CRM board.
//
// This is a side effect of a conversation, never a precondition for one. Every
// failure here is logged and swallowed: a Monday outage, a revoked token or a
// renamed column must never stop the agent replying to a lead.

import { serviceClient, LEADS } from './supabase.js'

const API = 'https://api.monday.com/v2'
const API_VERSION = '2024-10'

/** Board: "CRM ללידים שלי" */
export const BOARD_ID = process.env.MONDAY_BOARD_ID || '5101979328'

/** Column ids on that board. Change here if the board is restructured. */
export const COLUMNS = {
  phone:      'text_mm64ds17',   // טלפון
  contactedAt:'date_mm64dckk',   // תאריך יצירת קשר
  fleetSize:  'numeric_mm645dbq',// מספר רכבים
  email:      'text_mm64rhr9',   // E-MAIL
  source:     'dropdown_mm64fsda',// מקור הליד
  role:       'text_mm6atrs0',   // תפקיד
  management: 'color_mm6a4sq6',  // אופן ניהול הצי
}

/** wab_leads.current_management → the board's status labels. */
const MANAGEMENT_LABEL = {
  excel: 'אקסל',
  system: 'מערכת ייעודית',
  mixed: 'משולב',
  none: 'אין תהליך אחיד',
}

/**
 * Agent status → board group. The board's groups are a sales pipeline, so this
 * is a judgement call rather than a one-to-one mapping; it is kept in one place
 * so it is easy to retune.
 */
const GROUP_BY_STATUS = {
  'ליד חדש':             'topics',            // ליד חם
  'נשלחה הודעת פתיחה':   'topics',
  'הליד הגיב':           'topics',
  'בתהליך חימום':        'topics',
  'הושלם אפיון ראשוני':  'group_mm64n512',    // נוצר קשר
  'ממתין לבחירת מועד':   'group_mm64n512',
  'נקבעה פגישה':         'group_mm648mhn',    // נוצר דמו
  'הועבר לנציג':         'group_mm64n512',
  'ביקש לחזור בהמשך':    'group_mm64qgdy',    // ליד קר
  'לא מתאים':            'group_mm64sy8k',    // לא רלוונטי - לא עומד בתנאים
  'ביקש הסרה':           'group_mm648307',    // לא רלוונטי - מכחיש פנייה
}

/** "לא הגיב" depends on how many follow-ups went unanswered. */
const NO_REPLY_GROUPS = ['group_mm648acn', 'group_mm64bj5n', 'group_mm64habb']

/** @param {Record<string, unknown>} lead @returns {string} */
export function groupForLead(lead) {
  if (lead.status === 'לא הגיב') {
    const n = Math.min(Math.max(Number(lead.followup_count) || 1, 1), 3)
    return NO_REPLY_GROUPS[n - 1]
  }
  return GROUP_BY_STATUS[lead.status] || 'topics'
}

/**
 * The column payload for a lead. Only fields we actually know are sent, so a
 * later message can fill a blank without an earlier one wiping it.
 *
 * @param {Record<string, unknown>} lead
 * @returns {Record<string, unknown>}
 */
export function columnValues(lead) {
  /** @type {Record<string, unknown>} */
  const v = {
    [COLUMNS.phone]: lead.phone,
    [COLUMNS.source]: { labels: ['WhatsApp'] },
  }

  if (lead.created_at) v[COLUMNS.contactedAt] = { date: String(lead.created_at).slice(0, 10) }
  if (lead.fleet_size != null) v[COLUMNS.fleetSize] = String(lead.fleet_size)
  if (lead.email) v[COLUMNS.email] = lead.email
  if (lead.role) v[COLUMNS.role] = lead.role
  if (lead.current_management && MANAGEMENT_LABEL[lead.current_management]) {
    v[COLUMNS.management] = { label: MANAGEMENT_LABEL[lead.current_management] }
  }
  return v
}

/** @param {string} query @param {Record<string, unknown>} variables */
async function gql(query, variables) {
  const key = process.env.MONDAY_API_KEY
  if (!key) return { ok: false, reason: 'monday_not_configured' }

  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: {
        Authorization: key,
        'Content-Type': 'application/json',
        'API-Version': API_VERSION,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(10000),
    })

    const body = await r.json().catch(() => ({}))
    if (!r.ok || body.errors) {
      const message = body.errors?.[0]?.message || `http_${r.status}`
      console.error('monday api error', message)
      return { ok: false, reason: message }
    }
    return { ok: true, data: body.data }
  } catch (err) {
    console.error('monday api threw', err instanceof Error ? err.message : 'unknown')
    return { ok: false, reason: 'network' }
  }
}

const CREATE = `
  mutation ($board: ID!, $group: String!, $name: String!, $values: JSON!) {
    create_item(board_id: $board, group_id: $group, item_name: $name,
                column_values: $values, create_labels_if_missing: true) { id }
  }`

const UPDATE = `
  mutation ($board: ID!, $item: ID!, $values: JSON!) {
    change_multiple_column_values(board_id: $board, item_id: $item,
                                  column_values: $values, create_labels_if_missing: true) { id }
  }`

const MOVE = `
  mutation ($item: ID!, $group: String!) {
    move_item_to_group(item_id: $item, group_id: $group) { id }
  }`

/**
 * Create the lead's board item, or bring the existing one up to date.
 *
 * Never throws. Returns a result the caller may log but does not need to act on.
 *
 * @param {Record<string, unknown>} lead  a wab_leads row
 * @returns {Promise<{ ok: boolean, itemId?: string, action?: 'created'|'updated'|'skipped', reason?: string }>}
 */
export async function syncLead(lead) {
  if (!process.env.MONDAY_API_KEY) return { ok: false, reason: 'monday_not_configured' }
  if (!lead?.phone) return { ok: false, reason: 'no_phone' }

  const group = groupForLead(lead)
  const values = JSON.stringify(columnValues(lead))
  const name = lead.first_name || lead.company || lead.phone

  try {
    if (lead.monday_item_id) {
      const res = await gql(UPDATE, { board: BOARD_ID, item: lead.monday_item_id, values })
      if (!res.ok) return { ok: false, reason: res.reason }
      await gql(MOVE, { item: lead.monday_item_id, group })
      await stamp(lead.phone, lead.monday_item_id)
      return { ok: true, itemId: lead.monday_item_id, action: 'updated' }
    }

    const res = await gql(CREATE, { board: BOARD_ID, group, name, values })
    if (!res.ok) return { ok: false, reason: res.reason }

    const itemId = res.data?.create_item?.id
    if (!itemId) return { ok: false, reason: 'no_item_id' }

    await stamp(lead.phone, itemId)
    return { ok: true, itemId, action: 'created' }
  } catch (err) {
    console.error('monday sync failed', err instanceof Error ? err.message : 'unknown')
    return { ok: false, reason: 'sync_failed' }
  }
}

/** Remember the item id so the next turn updates rather than duplicates. */
async function stamp(phone, itemId) {
  const { error } = await serviceClient()
    .from(LEADS)
    .update({ monday_item_id: String(itemId), monday_synced_at: new Date().toISOString() })
    .eq('phone', phone)
  if (error) console.error('monday id stamp failed', error.message)
}

export { MANAGEMENT_LABEL as MONDAY_MANAGEMENT_LABEL, GROUP_BY_STATUS }
