import { useEffect, useRef, useState } from 'react'
import { T, FONT_SANS, FONT_MONO } from './theme'
import { startConversation } from './api'

/** Failure reasons the server can return, in words a human can act on. */
const REASONS = {
  bad_phone: 'That does not look like a phone number. Try 054-123-4567 or +972541234567.',
  name_required: 'A first name is required — the opening message is personalised.',
  already_exists: 'This number already has a conversation. Open it from the list instead.',
  opted_out: 'This lead asked not to be contacted again.',
  whatsapp_not_configured: 'WhatsApp credentials are missing on the server.',
}

/**
 * Meta rejects a free-text message to a number that has never written to us, so
 * the opening goes out as an approved template. When the template is missing or
 * still pending review the API says so, and that error is worth showing in full
 * rather than flattening to "failed".
 */
function explain(reason) {
  if (REASONS[reason]) return REASONS[reason]
  if (/template/i.test(reason)) {
    return `WhatsApp rejected the opening template: ${reason}. It has to be approved in WhatsApp Manager before a new conversation can be started.`
  }
  return reason
}

export default function NewConversation({ onClose, onStarted, narrow }) {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const phoneRef = useRef(null)

  useEffect(() => { phoneRef.current?.focus() }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await startConversation({ phone, firstName: name })
      onStarted(res.phone)
    } catch (err) {
      setError(explain(err instanceof Error ? err.message : 'send_failed'))
      setBusy(false)
    }
  }

  const disabled = busy || !phone.trim() || !name.trim()

  const field = {
    width: '100%', boxSizing: 'border-box',
    fontFamily: FONT_SANS,
    // 16px on touch keeps iOS Safari from zooming the page on focus.
    fontSize: narrow ? T.fs16 : T.fs14,
    color: T.text, background: T.white,
    padding: narrow ? '11px 12px' : '8px 10px',
    border: `1px solid ${T.border}`, borderRadius: 2, outline: 'none',
  }

  return (
    <div
      onClick={() => !busy && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 10,
        background: 'rgba(17,24,39,0.35)',
        display: 'flex', alignItems: narrow ? 'flex-end' : 'center', justifyContent: 'center',
        padding: narrow ? 0 : T.pad,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{
          width: narrow ? '100%' : 380, maxWidth: '100%',
          background: T.white,
          border: `1px solid ${T.border}`,
          borderRadius: narrow ? '8px 8px 0 0' : T.radius,
          padding: T.pad,
          display: 'flex', flexDirection: 'column', gap: T.padTight,
        }}
      >
        <div style={{ fontSize: T.fs16, fontWeight: 700, color: T.text }}>New conversation</div>

        <div style={{ fontSize: T.fs12, color: T.textMid, lineHeight: 1.5 }}>
          Sends the Hebrew opening message and hands the thread to the agent.
        </div>

        <label style={{ fontSize: T.fs12, color: T.textMid, marginTop: 4 }}>
          Phone
          <input
            ref={phoneRef}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="054-123-4567"
            inputMode="tel"
            dir="ltr"
            style={{ ...field, fontFamily: FONT_MONO, marginTop: 4 }}
          />
        </label>

        <label style={{ fontSize: T.fs12, color: T.textMid }}>
          First name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ישראל"
            dir="auto"
            style={{ ...field, marginTop: 4 }}
          />
        </label>

        {error && (
          <div dir="auto" style={{
            fontSize: T.fs12, color: '#B91C1C', lineHeight: 1.5,
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 2, padding: '8px 10px',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              fontFamily: FONT_SANS, fontSize: T.fs12, cursor: busy ? 'default' : 'pointer',
              padding: narrow ? '11px 14px' : '7px 12px', minHeight: narrow ? 44 : 0,
              borderRadius: T.radius, border: `1px solid ${T.border}`,
              background: T.white, color: T.textMid,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={disabled}
            style={{
              fontFamily: FONT_SANS, fontSize: T.fs12,
              cursor: disabled ? 'default' : 'pointer',
              padding: narrow ? '11px 16px' : '7px 14px', minHeight: narrow ? 44 : 0,
              borderRadius: T.radius,
              // White on grey is unreadable, so the disabled state drops to the
              // muted palette rather than just dimming the background.
              border: `1px solid ${disabled ? T.border : T.accent}`,
              background: disabled ? T.subtle : T.accent,
              color: disabled ? T.textDim : T.white,
              transition: 'background-color 150ms ease',
            }}
          >
            {busy ? 'Sending…' : 'Send opening'}
          </button>
        </div>
      </form>
    </div>
  )
}
