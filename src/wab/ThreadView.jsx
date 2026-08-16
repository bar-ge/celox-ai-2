import { useEffect, useRef } from 'react'
import { T, FONT_SANS, FONT_MONO, fullDateTime } from './theme'
import MessageBubble from './MessageBubble'
import StageBadge from './StageBadge'

export default function ThreadView({ lead, messages, loading, onResumeBot }) {
  const endRef = useRef(null)
  const count = messages.length

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [count, lead?.phone])

  if (!lead) return <EmptyState />

  return (
    <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', background: T.white }}>
      <div style={{ padding: T.pad, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          {(lead.first_name || lead.company) && (
            <span dir="auto" style={{ fontFamily: FONT_SANS, fontSize: T.fs16, fontWeight: 700, color: T.text }}>
              {[lead.first_name, lead.company].filter(Boolean).join(' · ')}
            </span>
          )}
          <span style={{ fontFamily: FONT_MONO, fontSize: T.fs16, fontWeight: 700, color: T.text }}>
            {lead.phone}
          </span>
          <StageBadge stage={lead.stage} />
        </div>
        <div style={{ fontFamily: FONT_SANS, fontSize: T.fs12, color: T.textMid, marginTop: 4 }}>
          First contact: <span style={{ fontFamily: FONT_MONO }}>{fullDateTime(lead.first_contact_at ?? lead.created_at)}</span>
        </div>
      </div>

      {lead.bot_paused && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: T.padTight,
          padding: `8px ${T.pad}px`, borderBottom: `1px solid ${T.border}`,
          background: T.subtle, flexShrink: 0,
        }}>
          <span style={{ fontFamily: FONT_SANS, fontSize: T.fs12, color: T.textMid }}>
            Bot paused — handed off to a human
          </span>
          <button
            onClick={onResumeBot}
            style={{
              fontFamily: FONT_SANS, fontSize: T.fs12, cursor: 'pointer',
              padding: '3px 10px', borderRadius: T.radius,
              border: `1px solid ${T.border}`, background: T.white, color: T.text,
              transition: 'background-color 150ms ease',
            }}
          >
            Resume bot
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: T.pad }}>
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
            gapTop={i === 0 ? 0 : messages[i - 1].direction === m.direction ? 4 : 16}
          />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      flex: 1, height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: T.padTight, background: T.white,
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
