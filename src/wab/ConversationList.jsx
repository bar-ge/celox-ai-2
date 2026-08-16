import { useMemo, useState } from 'react'
import { T, FONT_SANS, FONT_MONO, relativeShort } from './theme'
import { IntentDot } from './IntentTag'

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'active',   label: 'Active' },
  { key: 'booked',   label: 'Meeting booked' },
  { key: 'handoff',  label: 'Handed off' },
  { key: 'notrel',   label: 'Not relevant' },
]

function matchesFilter(lead, key) {
  switch (key) {
    case 'booked':  return Boolean(lead.meeting_at) || lead.status === 'נקבעה פגישה'
    case 'handoff': return lead.status === 'הועבר לנציג' || lead.bot_paused
    case 'notrel':  return lead.status === 'לא מתאים' || lead.status === 'ביקש הסרה' || lead.opted_out
    case 'active':  return !lead.opted_out && !lead.bot_paused && !lead.meeting_at
    default:        return true
  }
}

export default function ConversationList({ leads, selected, onSelect, loading, layout = 'wide' }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const narrow = layout === 'narrow'
  const medium = layout === 'medium'

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return leads
      .filter((l) => matchesFilter(l, filter))
      .filter((l) => !q || [l.phone, l.first_name, l.company].some((v) => String(v ?? '').toLowerCase().includes(q)))
  }, [leads, query, filter])

  return (
    <div style={{
      width: narrow ? '100%' : medium ? 280 : T.colWidth,
      flexShrink: 0, height: '100%',
      display: 'flex', flexDirection: 'column',
      background: T.subtle,
      borderRight: narrow ? 'none' : `1px solid ${T.border}`,
    }}>
      <div style={{ padding: T.pad, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: T.padTight }}>
          <span style={{ fontFamily: FONT_SANS, fontSize: T.fs16, fontWeight: 700, color: T.text }}>
            Conversations
          </span>
          <span style={{
            fontFamily: FONT_MONO, fontSize: T.fs11, color: T.textMid,
            border: `1px solid ${T.border}`, borderRadius: T.radius,
            padding: '1px 6px', background: T.white,
          }}>
            {leads.length}
          </span>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by phone, name or company..."
          style={{
            width: '100%', boxSizing: 'border-box',
            fontFamily: FONT_SANS,
            // 16px on touch layouts stops iOS Safari zooming the page on focus.
            fontSize: narrow ? T.fs16 : T.fs13,
            color: T.text,
            padding: narrow ? '10px 11px' : '7px 9px', background: T.white,
            border: `1px solid ${T.border}`, borderRadius: 2, outline: 'none',
          }}
        />

        <div style={{
          display: 'flex', gap: 6, marginTop: T.padTight,
          // On a phone the chips would eat a third of the screen if they wrapped.
          flexWrap: narrow ? 'nowrap' : 'wrap',
          overflowX: narrow ? 'auto' : 'visible',
          scrollbarWidth: 'none',
          paddingBottom: narrow ? 2 : 0,
        }}>
          {FILTERS.map((f) => {
            const on = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  fontFamily: FONT_SANS, fontSize: narrow ? T.fs12 : T.fs11, cursor: 'pointer',
                  padding: narrow ? '7px 12px' : '3px 8px',
                  minHeight: narrow ? 34 : 0,
                  whiteSpace: 'nowrap', flexShrink: 0,
                  borderRadius: T.radius,
                  border: `1px solid ${on ? T.accent : T.border}`,
                  background: on ? T.selected : T.white,
                  color: on ? T.accent : T.textMid,
                  transition: 'background-color 150ms ease',
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && leads.length === 0 && <ListSkeleton />}

        {!loading && rows.length === 0 && (
          <div style={{
            padding: '40px 16px', textAlign: 'center',
            fontFamily: FONT_SANS, fontSize: T.fs14, color: T.textMid,
          }}>
            {leads.length === 0 ? 'No conversations yet' : 'No matches'}
          </div>
        )}

        {rows.map((lead) => (
          <Row
            key={lead.phone}
            lead={lead}
            selected={selected === lead.phone}
            narrow={narrow}
            onSelect={() => onSelect(lead.phone)}
          />
        ))}
      </div>
    </div>
  )
}

function Row({ lead, selected, narrow, onSelect }) {
  const [hover, setHover] = useState(false)
  const title = lead.first_name || lead.company
    ? [lead.first_name, lead.company].filter(Boolean).join(' · ')
    : null

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        // 44px minimum keeps every row a comfortable touch target.
        padding: narrow ? `14px ${T.padTight}px` : `${T.padTight}px ${T.pad}px`,
        minHeight: narrow ? 44 : 0,
        borderBottom: `1px solid ${T.border}`,
        borderLeft: `3px solid ${selected ? T.accent : 'transparent'}`,
        background: selected ? T.selected : hover ? '#F3F4F6' : 'transparent',
        cursor: 'pointer',
        transition: 'background-color 150ms ease',
      }}
    >
      <div style={{ paddingTop: 5 }}><IntentDot intent={lead.last_intent} /></div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: title ? FONT_SANS : FONT_MONO,
          fontSize: T.fs14, color: T.text, fontWeight: title ? 500 : 400,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} dir={title ? 'auto' : 'ltr'}>
          {title ?? lead.phone}
        </div>
        <div dir="auto" style={{
          fontFamily: FONT_SANS, fontSize: T.fs13, color: T.textMid, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {lead.last_message_preview || '—'}
        </div>
      </div>

      <div style={{
        fontFamily: FONT_MONO, fontSize: T.fs12, color: T.textDim,
        whiteSpace: 'nowrap', paddingTop: 2,
      }}>
        {relativeShort(lead.last_message_at)}
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{
          padding: `${T.padTight}px ${T.pad}px`,
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div className="wab-skeleton" style={{ height: 12, width: '60%', borderRadius: 2 }} />
          <div className="wab-skeleton" style={{ height: 10, width: '85%', borderRadius: 2, marginTop: 8 }} />
        </div>
      ))}
    </div>
  )
}
