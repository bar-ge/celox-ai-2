import { useState } from 'react'

// TCEL-070 / TCEL-057 — escalation flow. Issue-type list below is a
// reasonable placeholder set (matches the general נוהל 6 safety-complaint
// shape) — confirm against the real מוקד בטיחות 365 taxonomy before this
// ships; flagged in the Monday update, not guessed silently.
const ISSUE_TYPES = [
  { id: 'safety', label: 'בטיחות (נוהל 6)' },
  { id: 'maintenance', label: 'תחזוקה / תקלה' },
  { id: 'billing', label: 'חיוב / עלות' },
  { id: 'other', label: 'אחר' },
]

export default function EscalationSummaryCard({ draft, onConfirm, onCancel }) {
  const [type, setType] = useState(draft?.type || 'other')
  const [description, setDescription] = useState(draft?.description || '')
  const [urgency, setUrgency] = useState(draft?.urgency || 'low')

  return (
    <div style={{
      background: 'var(--avatar-surface)', border: '1px solid var(--avatar-border)',
      borderRadius: 'var(--avatar-radius-lg)', padding: 14, margin: '8px 0',
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--avatar-text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        סיכום הפנייה
      </div>

      <label style={labelStyle}>סוג הפנייה</label>
      <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
        {ISSUE_TYPES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>

      <label style={labelStyle}>תיאור</label>
      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />

      <label style={labelStyle}>דחיפות</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {['low', 'medium', 'high'].map(u => (
          <button key={u} onClick={() => setUrgency(u)} style={{
            ...ghostChip,
            background: urgency === u ? urgencyColor(u) + '18' : 'transparent',
            borderColor: urgency === u ? urgencyColor(u) : 'var(--avatar-border)',
            color: urgency === u ? urgencyColor(u) : 'var(--avatar-text-secondary)',
          }}>
            {u === 'low' ? 'נמוכה' : u === 'medium' ? 'בינונית' : 'גבוהה'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={ghostBtn}>עריכה</button>
        <button
          onClick={() => onConfirm({ type, description, urgency })}
          disabled={!description.trim()}
          style={{ ...primaryBtn, opacity: description.trim() ? 1 : 0.5, cursor: description.trim() ? 'pointer' : 'not-allowed' }}
        >
          אשר ושלח
        </button>
      </div>
    </div>
  )
}

function urgencyColor(u) {
  return u === 'high' ? 'var(--avatar-error)' : u === 'medium' ? 'var(--avatar-warning)' : 'var(--avatar-text-secondary)'
}

const labelStyle = { display: 'block', fontSize: 12, color: 'var(--avatar-text-muted)', marginBottom: 4, marginTop: 8 }
const inputStyle = {
  width: '100%', border: '1px solid var(--avatar-border)', borderRadius: 'var(--avatar-radius-md)',
  padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', color: 'var(--avatar-text)',
  background: 'var(--avatar-surface-alt)', boxSizing: 'border-box',
}
const ghostChip = { border: '1px solid', borderRadius: 'var(--avatar-radius-full)', padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }
const primaryBtn = { background: 'var(--avatar-primary)', color: '#fff', border: 'none', borderRadius: 'var(--avatar-radius-md)', padding: '8px 16px', fontSize: 13, fontWeight: 700 }
const ghostBtn = { background: 'transparent', color: 'var(--avatar-text-secondary)', border: '1px solid var(--avatar-border)', borderRadius: 'var(--avatar-radius-md)', padding: '8px 16px', fontSize: 13, cursor: 'pointer' }
