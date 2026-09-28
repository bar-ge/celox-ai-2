import { useEffect, useRef, useState } from 'react'
import { T, FONT_SANS, FONT_MONO, fullDateTime } from './theme'
import MessageBubble from './MessageBubble'
import StageBadge from './StageBadge'

export default function ThreadView({
  lead, messages, loading, layout = 'wide', onResumeBot, onSendReply, onBack, onOpenDetail,
}) {
  const endRef = useRef(null)
  const count = messages.length
  const narrow = layout === 'narrow'

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [count, lead?.phone])

  if (!lead) return <EmptyState narrow={narrow} />

  const pad = narrow ? T.padTight : T.pad

  return (
    <div style={{
      flex: 1, minWidth: 0, height: '100%',
      display: 'flex', flexDirection: 'column', background: T.white,
    }}>
      <div style={{ padding: pad, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {onBack && (
            <button onClick={onBack} aria-label="Back to conversations" style={backButtonStyle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              {(lead.first_name || lead.company) && (
                <span dir="auto" style={{ fontFamily: FONT_SANS, fontSize: T.fs16, fontWeight: 700, color: T.text }}>
                  {[lead.first_name, lead.company].filter(Boolean).join(' · ')}
                </span>
              )}
              <span style={{ fontFamily: FONT_MONO, fontSize: narrow ? T.fs14 : T.fs16, fontWeight: 700, color: T.text }}>
                {lead.phone}
              </span>
              <StageBadge stage={lead.stage} />
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: T.fs12, color: T.textMid, marginTop: 4 }}>
              First contact: <span style={{ fontFamily: FONT_MONO }}>{fullDateTime(lead.first_contact_at ?? lead.created_at)}</span>
            </div>
          </div>

          {onOpenDetail && (
            <button onClick={onOpenDetail} style={detailButtonStyle(narrow)}>Details</button>
          )}
        </div>
      </div>

      {lead.bot_paused && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: T.padTight, flexWrap: 'wrap',
          padding: `8px ${pad}px`, borderBottom: `1px solid ${T.border}`,
          background: T.subtle, flexShrink: 0,
        }}>
          <span style={{ fontFamily: FONT_SANS, fontSize: T.fs12, color: T.textMid }}>
            Bot paused — handed off to a human
          </span>
          <button
            onClick={onResumeBot}
            style={{
              fontFamily: FONT_SANS, fontSize: T.fs12, cursor: 'pointer',
              padding: narrow ? '8px 12px' : '3px 10px', minHeight: narrow ? 36 : 0,
              borderRadius: T.radius,
              border: `1px solid ${T.border}`, background: T.white, color: T.text,
              transition: 'background-color 150ms ease',
            }}
          >
            Resume bot
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: pad, WebkitOverflowScrolling: 'touch' }}>
        {loading && count === 0 && <ThreadSkeleton />}
        {!loading && count === 0 && (
          <div style={{ fontFamily: FONT_SANS, fontSize: T.fs13, color: T.textMid, textAlign: 'center', paddingTop: 40 }}>
            No messages yet
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble
            key={m.id}
            message={m}
            narrow={narrow}
            gapTop={i === 0 ? 0 : messages[i - 1].direction === m.direction ? 4 : 16}
          />
        ))}
        <div ref={endRef} />
      </div>

      {onSendReply && <ReplyBox lead={lead} narrow={narrow} pad={pad} onSendReply={onSendReply} />}
    </div>
  )
}

// "Take control" — a real WhatsApp message sent through the same Cloud API
// number the bot uses, from a human. Sending always pauses the bot too (see
// api/wa/reply.js), so it never lands on top of a bot reply.
function ReplyBox({ lead, narrow, pad, onSendReply }) {
  const [text, setText] = useState('')
  const [state, setState] = useState(null) // null | 'sending' | 'failed'

  const disabled = lead.opted_out || state === 'sending'

  const send = async () => {
    const body = text.trim()
    if (!body || disabled) return
    setState('sending')
    try {
      await onSendReply(lead.phone, body)
      setText('')
      setState(null)
    } catch {
      setState('failed')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 8, flexShrink: 0,
      padding: pad, borderTop: `1px solid ${T.border}`, background: T.white,
    }}>
      <textarea
        dir="auto"
        rows={narrow ? 2 : 1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={lead.opted_out ? 'This lead opted out' : 'Reply as a human — this pauses the bot and sends now'}
        style={{
          flex: 1, minWidth: 0, resize: 'none',
          fontFamily: FONT_SANS, fontSize: T.fs13, lineHeight: 1.4,
          padding: '10px 12px', borderRadius: T.radius, border: `1px solid ${T.border}`,
          background: disabled ? T.subtle : T.white, color: T.text,
          outline: 'none',
        }}
      />
      <button
        onClick={send}
        disabled={disabled || !text.trim()}
        style={{
          fontFamily: FONT_SANS, fontSize: T.fs13, fontWeight: 600, flexShrink: 0,
          padding: narrow ? '12px 14px' : '10px 14px', minHeight: narrow ? 44 : 0,
          borderRadius: T.radius, border: 'none',
          background: T.accent, color: T.white,
          cursor: disabled || !text.trim() ? 'not-allowed' : 'pointer',
          opacity: disabled || !text.trim() ? 0.5 : 1,
          transition: 'background-color 150ms ease',
        }}
      >
        {state === 'sending' ? 'Sending...' : state === 'failed' ? 'Failed — retry' : 'Send'}
      </button>
    </div>
  )
}

const backButtonStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 36, height: 36, flexShrink: 0, padding: 0, marginTop: -2, cursor: 'pointer',
  border: `1px solid ${T.border}`, borderRadius: T.radius, background: T.white,
  transition: 'background-color 150ms ease',
}

const detailButtonStyle = (narrow) => ({
  fontFamily: FONT_SANS, fontSize: T.fs12, cursor: 'pointer', flexShrink: 0,
  padding: narrow ? '9px 12px' : '6px 12px', minHeight: narrow ? 36 : 0,
  borderRadius: T.radius, border: `1px solid ${T.border}`,
  background: T.white, color: T.text, whiteSpace: 'nowrap',
  transition: 'background-color 150ms ease',
})

function EmptyState({ narrow }) {
  return (
    <div style={{
      flex: 1, height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: T.padTight,
      background: T.white, padding: narrow ? T.padTight : T.pad, textAlign: 'center',
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.border} strokeWidth="1.5" aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
      <span style={{ fontFamily: FONT_SANS, fontSize: T.fs14, color: T.textMid }}>Select a conversation</span>
    </div>
  )
}

function ThreadSkeleton() {
  return (
    <div>
      {[['left', '55%'], ['right', '40%'], ['left', '65%'], ['right', '48%']].map(([side, w], i) => (
        <div key={i} style={{ display: 'flex', justifyContent: side === 'right' ? 'flex-end' : 'flex-start', marginTop: i ? 16 : 0 }}>
          <div className="wab-skeleton" style={{ height: 34, width: w, borderRadius: T.radius }} />
        </div>
      ))}
    </div>
  )
}
