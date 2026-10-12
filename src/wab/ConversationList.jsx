import { useMemo, useState } from 'react'
import { T, FONT_SANS, FONT_MONO, relativeShort } from './theme'
import { IntentDot } from './IntentTag'

const FILTERS = [
  { key: 'all',      label: 'הכל' },
  { key: 'active',   label: 'פעיל' },
  { key: 'booked',   label: 'נקבעה פגישה' },
  { key: 'handoff',  label: 'הועבר לנציג' },
  { key: 'notrel',   label: 'לא רלוונטי' },
  { key: 'spam',     label: 'ספאם' },
]

function matchesFilter(lead, key) {
  switch (key) {
    case 'booked':  return Boolean(lead.meeting_at) || lead.status === 'נקבעה פגישה'
    case 'handoff': return lead.status === 'הועבר לנציג' || lead.bot_paused
    case 'notrel':  return lead.status === 'לא מתאים' || lead.status === 'ביקש הסרה' || lead.opted_out
    // Bar's request (2026-10-11): any lead with a link-spam strike shows up
    // here, not just ones that hit the 3-strike auto-pause (status 'ספאם').
    case 'spam':    return (lead.spam_strikes ?? 0) > 0 || lead.status === 'ספאם'
    case 'active':  return !lead.opted_out && !lead.bot_paused && !lead.meeting_at && (lead.spam_strikes ?? 0) === 0
    default:        return true
  }
}

export default function ConversationList({ leads, selected, onSelect, onNew, loading, layout = 'wide' }) {
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
      borderInlineEnd: narrow ? 'none' : `1px solid ${T.border}`,
    }}>
      <div style={{ padding: T.pad, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: T.padTight }}>
          <span style={{ fontFamily: FONT_SANS, fontSize: T.fs16, fontWeight: 700, color: T.text }}>
            שיחות
          </span>
          <span dir="ltr" style={{
            fontFamily: FONT_MONO, fontSize: T.fs11, color: T.textMid,
            border: `1px solid ${T.border}`, borderRadius: T.radiusPill,
            padding: '1px 7px', background: T.white,
          }}>
            {leads.length}
          </span>

          {onNew && (
            <button
              onClick={onNew}
              title="שיחה חדשה"
              aria-label="שיחה חדשה"
              style={{
                marginInlineStart: 'auto',
                fontFamily: FONT_SANS, fontSize: narrow ? T.fs14 : T.fs13, fontWeight: 600, lineHeight: 1,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                padding: narrow ? '9px 12px' : '5px 10px',
                minHeight: narrow ? 40 : 0,
                borderRadius: T.radiusPill,
                border: `1px solid ${T.accent}`,
                background: T.white, color: T.accent,
                whiteSpace: 'nowrap',
                transition: 'background-color 150ms ease',
              }}
            >
              <span style={{ fontSize: narrow ? T.fs16 : T.fs14 }}>+</span>
              {!medium && <span>חדש</span>}
            </button>
          )}
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי טלפון, שם או חברה..."
          dir="auto"
          style={{
            width: '100%', boxSizing: 'border-box',
            fontFamily: FONT_SANS,
            // 16px on touch layouts stops iOS Safari zooming the page on focus.
            fontSize: narrow ? T.fs16 : T.fs13,
            color: T.text,
            padding: narrow ? '10px 12px' : '7px 10px', background: T.white,
            border: `1px solid ${T.border}`, borderRadius: T.radius, outline: 'none',
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
                  fontFamily: FONT_SANS, fontSize: narrow ? T.fs12 : T.fs11, fontWeight: 600, cursor: 'pointer',
                  padding: narrow ? '7px 13px' : '4px 10px',
                  minHeight: narrow ? 34 : 0,
                  whiteSpace: 'nowrap', flexShrink: 0,
                  borderRadius: T.radiusPill,
                  border: `1px solid ${on ? T.accent : T.border}`,
                  background: on ? T.accentSoft : T.white,
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
            {leads.length === 0 ? 'אין שיחות עדיין' : 'אין תוצאות'}
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
        borderInlineStart: `3px solid ${selected ? T.accent : 'transparent'}`,
        background: selected ? T.selected : hover ? T.white : 'transparent',
        cursor: 'pointer',
        transition: 'background-color 150ms ease',
      }}
    >
      <div style={{ paddingTop: 5 }}><IntentDot intent={lead.last_intent} /></div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: title ? FONT_SANS : FONT_MONO,
          fontSize: T.fs14, color: T.text, fontWeight: title ? 600 : 400,
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

      <div dir="ltr" style={{
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
