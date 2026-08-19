import { useEffect, useRef } from 'react'
import AvatarBadge from './AvatarBadge'
import EscalationSummaryCard from './EscalationSummaryCard'

// TCEL-046 — chat UI. Auto-scrolls on new message, shows the typing badge
// while a request is in flight. Message persistence is session-only (React
// state, cleared on refresh) — whether it should persist server-side is an
// open product question, not assumed here (see TCEL-046 Monday update).
export default function ChatThread({ messages, thinking, state, onConfirmEscalation, onCancelEscalation }) {
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {messages.length === 0 && !thinking && (
        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--avatar-text-muted)', fontSize: 13, padding: 24 }}>
          שאלו אותי כל דבר על CELOX, או בקשו ממני לנווט אתכם למסך מסוים.
        </div>
      )}

      {messages.map((m, i) => (
        <Bubble key={i} role={m.role}>
          {m.text}
          {m.escalationDraft && (
            <EscalationSummaryCard
              draft={m.escalationDraft}
              onConfirm={onConfirmEscalation}
              onCancel={onCancelEscalation}
            />
          )}
        </Bubble>
      ))}

      {thinking && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AvatarBadge state={state} typing size={24} />
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}

function Bubble({ role, children }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-start' : 'flex-end', width: '100%' }}>
      {/* justify flipped: in a dir=rtl container "flex-start" is visually right — assistant on the
          visually-right/reading-start side, user on reading-end, matching normal chat conventions */}
      <div style={{
        maxWidth: '82%',
        background: isUser ? 'var(--avatar-primary)' : 'var(--avatar-surface-alt)',
        color: isUser ? '#fff' : 'var(--avatar-text)',
        borderRadius: 'var(--avatar-radius-lg)',
        padding: '8px 12px',
        fontSize: 13.5,
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {children}
      </div>
    </div>
  )
}
