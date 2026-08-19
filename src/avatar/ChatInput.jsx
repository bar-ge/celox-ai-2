import { useState, useRef } from 'react'

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('')
  const taRef = useRef(null)

  const send = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
    taRef.current?.focus()
  }

  const onKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div style={{
      borderTop: '1px solid var(--avatar-border)', padding: 10,
      display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--avatar-surface)',
    }}>
      <textarea
        ref={taRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        rows={1}
        placeholder="הקלידו הודעה…"
        aria-label="הודעה לעוזר CELOX"
        style={{
          flex: 1, resize: 'none', border: '1px solid var(--avatar-border)',
          borderRadius: 'var(--avatar-radius-md)', padding: '8px 10px', fontSize: 13.5,
          fontFamily: 'inherit', maxHeight: 100, background: disabled ? 'var(--avatar-surface-alt)' : 'var(--avatar-surface)',
          color: 'var(--avatar-text)',
        }}
      />
      <button
        onClick={send}
        disabled={disabled || !value.trim()}
        aria-label="שלח הודעה"
        style={{
          width: 36, height: 36, borderRadius: 'var(--avatar-radius-md)', border: 'none',
          background: 'var(--avatar-primary)', color: '#fff', flexShrink: 0,
          cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
          opacity: disabled || !value.trim() ? 0.5 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  )
}
