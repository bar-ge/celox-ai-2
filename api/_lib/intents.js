// Intent taxonomy for the WhatsApp lead agent.
// Shared by the serverless functions and the dashboard — single source of truth.

/** @typedef {'booking_request'|'pricing_query'|'product_question'|'integration_question'|'qualification_answer'|'implementation_question'|'human_handoff'|'not_relevant'|'opt_out'|'complaint'|'general'} Intent */

export const INTENTS = {
  booking_request:        { color: '#2563EB', label: 'Booking request',        he: 'בקשת פגישה' },
  pricing_query:          { color: '#059669', label: 'Pricing',                he: 'שאלת מחיר' },
  product_question:       { color: '#7C3AED', label: 'Product question',       he: 'שאלה על המוצר' },
  integration_question:   { color: '#0D9488', label: 'Integration question',   he: 'שאלת אינטגרציה' },
  qualification_answer:   { color: '#4F46E5', label: 'Qualification answer',   he: 'תשובת אפיון' },
  implementation_question:{ color: '#D97706', label: 'Implementation',         he: 'שאלת הטמעה' },
  human_handoff:          { color: '#EA580C', label: 'Human handoff',          he: 'בקשה לנציג' },
  not_relevant:           { color: '#6B7280', label: 'Not relevant',           he: 'לא רלוונטי' },
  opt_out:                { color: '#DC2626', label: 'Opt out',                he: 'בקשת הסרה' },
  complaint:              { color: '#DC2626', label: 'Complaint',              he: 'תלונה' },
  general:                { color: '#9CA3AF', label: 'General',                he: 'כללי' },
}

export const INTENT_VALUES = /** @type {Intent[]} */ (Object.keys(INTENTS))

/** @param {unknown} v @returns {v is Intent} */
export const isIntent = (v) => typeof v === 'string' && Object.prototype.hasOwnProperty.call(INTENTS, v)

/** @param {unknown} v @returns {string} */
export const intentColor = (v) => (isIntent(v) ? INTENTS[v].color : INTENTS.general.color)

/** @param {unknown} v @returns {string} */
export const intentLabel = (v) => (isIntent(v) ? INTENTS[v].label : INTENTS.general.label)
