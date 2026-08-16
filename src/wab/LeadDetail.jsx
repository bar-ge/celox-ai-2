import { useEffect, useMemo, useState } from 'react'
import { STATUSES } from '../../api/_lib/conversation-state.js'
import { T, FONT_SANS, FONT_MONO, fullDateTime, relativeLong } from './theme'
import IntentTag from './IntentTag'
import StageBadge from './StageBadge'

const MANAGEMENT_LABEL = { excel: 'Excel', system: 'System', mixed: 'Mixed', none: 'None' }
const DASH = '—'

export default function LeadDetail({ lead, messages, layout = 'wide', onPatch, onSendBooking, onClose, showClose }) {
  const narrow = layout === 'narrow'
  const [copied, setCopied] = useState(false)
  // Keyed by phone so switching leads resets the button without an effect.
  const [booking, setBooking] = useState({ phone: null, state: 'idle' })
  const [, tick] = useState(0)

  // "Last active" is a relative string — refresh it without refetching.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const bookingState = booking.phone === lead?.phone ? booking.state : 'idle'

  const intentsSeen = useMemo(() => {
    const seen = []
    for (const m of messages) if (m.intent && !seen.includes(m.intent)) seen.push(m.intent)
    return seen
  }, [messages])

  if (!lead) {
    return (
      <aside style={panelStyle(narrow)}>
        <div style={{
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: T.pad,
          fontFamily: FONT_SANS, fontSize: T.fs13, color: T.textMid,
        }}>
          Select a lead to view details
        </div>
      </aside>
    )
  }

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(lead.phone)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  async function handleBooking() {
    const phone = lead.phone
    setBooking({ phone, state: 'sending' })
    try {
      await onSendBooking(phone)
      setBooking({ phone, state: 'sent' })
    } catch {
      setBooking({ phone, state: 'failed' })
    }
  }

  const openQuestions = Array.isArray(lead.open_questions) ? lead.open_questions : []
  const rawDiffers = lead.fleet_size_raw && String(lead.fleet_size ?? '') !== String(lead.fleet_size_raw)

  return (
    <aside style={panelStyle(narrow)}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: T.padTight,
        padding: narrow ? T.padTight : T.pad, borderBottom: `1px solid ${T.border}`, flexShrink: 0,
      }}>
        <span style={{
          fontFamily: FONT_SANS, fontSize: T.fs14, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', color: T.text,
        }}>
          Lead Details
        </span>
        {showClose && onClose && (
          <button onClick={onClose} aria-label="Close lead details" style={closeButtonStyle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        padding: narrow ? T.padTight : T.pad,
        display: 'flex', flexDirection: 'column', gap: T.pad,
      }}>
        <Field label="Phone">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: T.fs16, color: T.text }}>{lead.phone}</span>
            <button
              onClick={copyPhone}
              title="Copy"
              aria-label="Copy phone number"
              style={{ ...iconButtonStyle, width: narrow ? 34 : 22, height: narrow ? 34 : 22 }}
            >
              {copied ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textMid} strokeWidth="1.6">
                  <rect x="9" y="9" width="11" height="11" rx="1.5" /><path d="M5 15V5a1 1 0 0 1 1-1h9" />
                </svg>
              )}
            </button>
          </div>
        </Field>

        <Field label="Name / Company">
          <Value size={T.fs14}>{[lead.first_name, lead.company].filter(Boolean).join(' · ') || DASH}</Value>
        </Field>

        <Field label="Role"><Value size={T.fs14}>{lead.role || DASH}</Value></Field>

        <Field label="Fleet size">
          <div style={{ fontFamily: FONT_MONO, fontSize: T.fs20, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
            {lead.fleet_size ?? DASH}
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: T.fs12, color: T.textMid }}>vehicles</div>
          {rawDiffers && (
            <div dir="auto" style={{ fontFamily: FONT_SANS, fontSize: T.fs12, color: T.textMid, marginTop: 4 }}>
              “{lead.fleet_size_raw}”
            </div>
          )}
        </Field>

        <Field label="Current management">
          <Value size={T.fs14}>{MANAGEMENT_LABEL[lead.current_management] || DASH}</Value>
          {lead.existing_system && (
            <div dir="auto" style={{ fontFamily: FONT_SANS, fontSize: T.fs12, color: T.textMid, marginTop: 2 }}>
              {lead.existing_system}
            </div>
          )}
        </Field>

        <Field label="Main pain"><Value size={T.fs13}>{lead.main_pain || DASH}</Value></Field>
        <Field label="Why now"><Value size={T.fs13}>{lead.why_now || DASH}</Value></Field>

        <Field label="Stage"><StageBadge stage={lead.stage} /></Field>

        <Field label="Status">
          <select
            value={lead.status}
            onChange={(e) => onPatch(lead.phone, { status: e.target.value })}
            dir="auto"
            style={{
              width: '100%', boxSizing: 'border-box',
              fontFamily: FONT_SANS,
              fontSize: narrow ? T.fs16 : T.fs13,
              color: T.text,
              padding: narrow ? '10px 8px' : '6px 8px',
              minHeight: narrow ? 44 : 0,
              background: T.white,
              border: `1px solid ${T.border}`, borderRadius: T.radius, outline: 'none',
            }}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Meeting">
          <span style={{ fontFamily: lead.meeting_at ? FONT_MONO : FONT_SANS, fontSize: T.fs13, color: lead.meeting_at ? T.text : T.textMid }}>
            {lead.meeting_at ? fullDateTime(lead.meeting_at) : 'Not booked'}
          </span>
        </Field>

        <Field label="Total messages">
          <div style={{ fontFamily: FONT_MONO, fontSize: T.fs20, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
            {messages.length}
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: T.fs12, color: T.textMid }}>messages</div>
        </Field>

        <Field label="First contact">
          <span style={{ fontFamily: FONT_MONO, fontSize: T.fs13, color: T.text }}>
            {fullDateTime(messages[0]?.created_at ?? lead.first_contact_at ?? lead.created_at)}
          </span>
        </Field>

        <Field label="Last active">
          <span style={{ fontFamily: FONT_SANS, fontSize: T.fs13, color: T.text }}>
            {relativeLong(messages[messages.length - 1]?.created_at ?? lead.last_message_at)}
          </span>
        </Field>

        <Field label="Intents seen">
          {intentsSeen.length === 0
            ? <Value size={T.fs13}>{DASH}</Value>
            : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {intentsSeen.map((i) => <IntentTag key={i} intent={i} />)}
              </div>}
        </Field>

        <Field label="Open questions">
          {openQuestions.length === 0
            ? <Value size={T.fs13}>{DASH}</Value>
            : <ul style={{ margin: 0, paddingInlineStart: 16 }}>
                {openQuestions.map((q, i) => (
                  <li key={i} dir="auto" style={{ fontFamily: FONT_SANS, fontSize: T.fs13, color: T.text, lineHeight: 1.5 }}>{q}</li>
                ))}
              </ul>}
        </Field>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
          <button
            onClick={handleBooking}
            disabled={bookingState === 'sending' || lead.opted_out}
            style={{
              fontFamily: FONT_SANS, fontSize: T.fs13, fontWeight: 600,
              padding: narrow ? '12px' : '8px 12px', minHeight: narrow ? 44 : 0,
              borderRadius: T.radius, border: 'none',
              background: T.accent, color: T.white,
              cursor: bookingState === 'sending' || lead.opted_out ? 'not-allowed' : 'pointer',
              opacity: lead.opted_out ? 0.5 : 1,
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => { if (!lead.opted_out) e.currentTarget.style.background = T.accentHover }}
            onMouseLeave={(e) => { e.currentTarget.style.background = T.accent }}
          >
            {bookingState === 'sending' ? 'Sending...'
              : bookingState === 'sent' ? 'Booking link sent'
              : bookingState === 'failed' ? 'Failed — retry'
              : 'Send booking link'}
          </button>

          <button
            onClick={() => onPatch(lead.phone, { bot_paused: !lead.bot_paused })}
            style={{
              fontFamily: FONT_SANS, fontSize: T.fs13,
              padding: narrow ? '12px' : '8px 12px', minHeight: narrow ? 44 : 0,
              borderRadius: T.radius,
              border: `1px solid ${T.border}`, background: 'transparent', color: T.text,
              cursor: 'pointer', transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.subtle }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            {lead.bot_paused ? 'Resume bot' : 'Pause bot'}
          </button>
        </div>
      </div>
    </aside>
  )
}

const panelStyle = (narrow) => ({
  width: narrow ? '100%' : T.colWidth,
  maxWidth: '100vw', flexShrink: 0, height: '100%',
  display: 'flex', flexDirection: 'column',
  background: T.white, borderLeft: narrow ? 'none' : `1px solid ${T.border}`,
})

const closeButtonStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 36, height: 36, flexShrink: 0, padding: 0, cursor: 'pointer',
  border: `1px solid ${T.border}`, borderRadius: T.radius, background: T.white,
  transition: 'background-color 150ms ease',
}

const iconButtonStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 22, height: 22, padding: 0, cursor: 'pointer',
  border: `1px solid ${T.border}`, borderRadius: T.radius, background: T.white,
  transition: 'background-color 150ms ease',
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{
        fontFamily: FONT_SANS, fontSize: T.fs12, color: T.textMid,
        marginBottom: 4, letterSpacing: '0.01em',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Value({ children, size }) {
  return (
    <div dir="auto" style={{
      fontFamily: FONT_SANS, fontSize: size, color: T.text,
      lineHeight: 1.5, wordBreak: 'break-word',
    }}>
      {children}
    </div>
  )
}
