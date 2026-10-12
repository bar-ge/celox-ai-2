import { useEffect, useRef, useState } from 'react'
import { T, FONT_SANS, FONT_MONO } from './theme'
import { startConversation } from './api'

/** Failure reasons the server can return, in words a human can act on. */
const REASONS = {
  bad_phone: 'זה לא נראה כמו מספר טלפון. נסה 054-123-4567 או +972541234567.',
  name_required: 'שם פרטי הוא שדה חובה — הודעת הפתיחה מותאמת אישית.',
  already_exists: 'למספר הזה יש כבר שיחה. פתח אותה מהרשימה במקום זאת.',
  opted_out: 'הליד הזה ביקש לא להיות בקשר בעתיד.',
  whatsapp_not_configured: 'פרטי ההתחברות לוואטסאפ חסרים בשרת.',
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
    return `וואטסאפ דחה את תבנית הפתיחה: ${reason}. היא צריכה להיות מאושרת ב-WhatsApp Manager לפני שאפשר להתחיל שיחה חדשה.`
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
    padding: narrow ? '11px 13px' : '8px 11px',
    border: `1px solid ${T.border}`, borderRadius: T.radius, outline: 'none',
  }

  return (
    <div
      dir="rtl"
      onClick={() => !busy && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 10,
        background: 'rgba(43,33,25,0.35)',
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
          borderRadius: narrow ? `${T.radius}px ${T.radius}px 0 0` : T.radius,
          boxShadow: T.shadowLg,
          padding: T.pad,
          display: 'flex', flexDirection: 'column', gap: T.padTight,
        }}
      >
        <div style={{ fontSize: T.fs16, fontWeight: 700, color: T.text }}>שיחה חדשה</div>

        <div style={{ fontSize: T.fs12, color: T.textMid, lineHeight: 1.5 }}>
          שולח את הודעת הפתיחה בעברית ומעביר את השיחה לסוכן.
        </div>

        <label style={{ fontSize: T.fs12, color: T.textMid, marginTop: 4 }}>
          טלפון
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
          שם פרטי
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
            fontSize: T.fs12, color: T.danger, lineHeight: 1.5,
            background: T.dangerSoft, border: `1px solid ${T.danger}33`,
            borderRadius: T.radius, padding: '8px 11px',
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
              fontFamily: FONT_SANS, fontSize: T.fs12, fontWeight: 600, cursor: busy ? 'default' : 'pointer',
              padding: narrow ? '11px 15px' : '7px 13px', minHeight: narrow ? 44 : 0,
              borderRadius: T.radiusPill, border: `1px solid ${T.border}`,
              background: T.white, color: T.textMid,
            }}
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={disabled}
            style={{
              fontFamily: FONT_SANS, fontSize: T.fs12, fontWeight: 600,
              cursor: disabled ? 'default' : 'pointer',
              padding: narrow ? '11px 17px' : '7px 15px', minHeight: narrow ? 44 : 0,
              borderRadius: T.radiusPill,
              // White on grey is unreadable, so the disabled state drops to the
              // muted palette rather than just dimming the background.
              border: `1px solid ${disabled ? T.border : T.accent}`,
              background: disabled ? T.subtle : T.accent,
              color: disabled ? T.textDim : T.white,
              transition: 'background-color 150ms ease',
            }}
          >
            {busy ? 'שולח…' : 'שלח הודעת פתיחה'}
          </button>
        </div>
      </form>
    </div>
  )
}
