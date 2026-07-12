import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// ── Premium styles injection ──────────────────────────────────────────────────
const INJECTED_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700;800&display=swap');

  @keyframes crmFadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes crmSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes crmPulse {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.5; }
  }

  .crm-root * { box-sizing: border-box; }
  .crm-root { font-family: 'Figtree', 'Segoe UI', system-ui, sans-serif; }
  .crm-display { font-family: 'Bricolage Grotesque', 'Figtree', system-ui, sans-serif !important; }

  .crm-card {
    transition: background 0.22s cubic-bezier(0.32,0.72,0,1),
                border-color 0.22s cubic-bezier(0.32,0.72,0,1),
                box-shadow 0.22s cubic-bezier(0.32,0.72,0,1) !important;
  }
  .crm-card:hover {
    background: #f8fafc !important;
    border-color: #cbd5e1 !important;
    box-shadow: 0 4px 16px rgba(15,23,42,0.08) !important;
  }

  .crm-stat-card {
    transition: transform 0.26s cubic-bezier(0.32,0.72,0,1),
                box-shadow 0.26s cubic-bezier(0.32,0.72,0,1) !important;
    cursor: default;
  }
  .crm-stat-card:hover {
    transform: translateY(-3px) !important;
    box-shadow: 0 16px 40px rgba(15,23,42,0.12) !important;
  }

  .crm-btn-primary {
    transition: transform 0.2s cubic-bezier(0.32,0.72,0,1),
                box-shadow 0.2s cubic-bezier(0.32,0.72,0,1),
                background 0.2s !important;
  }
  .crm-btn-primary:hover  { transform: translateY(-1px) !important; box-shadow: 0 8px 24px rgba(59,130,246,0.42) !important; }
  .crm-btn-primary:active { transform: scale(0.97) translateY(0) !important; }

  .crm-btn-ghost {
    transition: background 0.2s, border-color 0.2s, color 0.2s !important;
  }
  .crm-btn-ghost:hover {
    background: #f1f5f9 !important;
    border-color: #cbd5e1 !important;
    color: #0f172a !important;
  }

  .crm-btn-danger {
    transition: background 0.2s, border-color 0.2s, color 0.2s !important;
  }
  .crm-btn-danger:hover {
    background: #fef2f2 !important;
    border-color: #fca5a5 !important;
    color: #dc2626 !important;
  }

  .crm-nav-item {
    transition: background 0.18s cubic-bezier(0.32,0.72,0,1), color 0.18s !important;
  }
  .crm-nav-item:not(.crm-nav-active):hover {
    background: rgba(255,255,255,0.07) !important;
    color: rgba(241,245,249,0.88) !important;
  }

  .crm-input {
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s !important;
  }
  .crm-input:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.12) !important;
    background: #ffffff !important;
    outline: none !important;
  }

  .crm-animate    { animation: crmFadeUp 0.52s cubic-bezier(0.22,1,0.36,1) both; }
  .crm-animate-d1 { animation-delay: 0.04s; }
  .crm-animate-d2 { animation-delay: 0.08s; }
  .crm-animate-d3 { animation-delay: 0.12s; }
  .crm-animate-d4 { animation-delay: 0.16s; }
  .crm-animate-d5 { animation-delay: 0.20s; }
  .crm-animate-d6 { animation-delay: 0.24s; }

  .crm-tab-btn { transition: background 0.18s, color 0.18s, border-color 0.18s !important; }
  .crm-tab-btn:not(.crm-tab-active):hover {
    background: rgba(255,255,255,0.07) !important;
    color: rgba(241,245,249,0.82) !important;
  }

  .crm-chevron {
    transition: transform 0.3s cubic-bezier(0.32,0.72,0,1) !important;
  }

  .crm-note-card { transition: background 0.18s !important; }
  .crm-note-card:hover { background: #f8fafc !important; }

  .crm-status-pill {
    transition: transform 0.18s, box-shadow 0.18s !important;
  }
  .crm-status-pill:hover {
    transform: translateY(-1px) !important;
  }
`

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  bg:            '#f1f5f9',
  surface:       '#ffffff',
  surfaceHover:  '#f8fafc',
  surfaceStrong: '#f1f5f9',
  border:        '#e2e8f0',
  borderStrong:  '#cbd5e1',
  primary:       '#2563eb',
  primaryDim:    'rgba(37,99,235,0.1)',
  indigo:        '#6366f1',
  textPrimary:   '#0f172a',
  textSecondary: '#475569',
  textMuted:     '#94a3b8',
  success:       '#059669',
  successText:   '#059669',
  warning:       '#d97706',
  danger:        '#dc2626',
  purple:        '#7c3aed',
  navBg:         '#0f172a',
  sidebar:       '#0f172a',
}

const STAGE_META = {
  lead:    { label: 'ליד',    color: '#7c3aed', bg: '#ede9fe' },
  trial:   { label: 'ניסיון', color: '#b45309', bg: '#fef3c7' },
  active:  { label: 'פעיל',   color: '#065f46', bg: '#d1fae5' },
  paused:  { label: 'מושהה',  color: '#64748b', bg: '#f1f5f9' },
  churned: { label: 'עזב',    color: '#991b1b', bg: '#fee2e2' },
}

const LEAD_STATUS_META = {
  new:       { label: 'חדש',      color: '#1d4ed8', bg: '#dbeafe' },
  contacted: { label: 'נוצר קשר', color: '#7c3aed', bg: '#ede9fe' },
  qualified: { label: 'מוסמך',    color: '#b45309', bg: '#fef3c7' },
  proposal:  { label: 'הצעה',     color: '#4338ca', bg: '#e0e7ff' },
  won:       { label: '✓ נסגר',   color: '#065f46', bg: '#d1fae5' },
  lost:      { label: 'אבוד',     color: '#991b1b', bg: '#fee2e2' },
}

// ── Style constants ───────────────────────────────────────────────────────────
const FONT = "'Figtree','Segoe UI',system-ui,sans-serif"

const card = {
  background: '#ffffff',
  borderRadius: 14,
  border: '1px solid #e2e8f0',
  padding: '18px 22px',
  fontFamily: FONT,
  boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
}

const inp = {
  width: '100%',
  padding: '9px 13px',
  border: '1px solid #e2e8f0',
  borderRadius: 9,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  color: '#0f172a',
  background: '#ffffff',
  fontFamily: FONT,
}

const lbl = {
  fontSize: 10,
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: 5,
  display: 'block',
  fontFamily: FONT,
}

const btnPrimary = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 9,
  padding: '8px 18px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: FONT,
}

const btnGhost = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  color: '#475569',
  borderRadius: 9,
  padding: '7px 14px',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: FONT,
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('he-IL')
}

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 768)
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return m
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ meta }) {
  if (!meta) return null
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      borderRadius: 20, padding: '3px 10px',
      background: meta.bg, color: meta.color,
      whiteSpace: 'nowrap', letterSpacing: '0.02em',
      fontFamily: FONT,
    }}>
      {meta.label}
    </span>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 800, color: C.textMuted,
      textTransform: 'uppercase', letterSpacing: '0.12em',
      marginBottom: 12, fontFamily: FONT,
    }}>
      {children}
    </div>
  )
}

// ── Notes panel ───────────────────────────────────────────────────────────────
function NotesPanel({ entityType, entityId, authorEmail }) {
  const [notes,   setNotes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [body,    setBody]    = useState('')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    supabase.from('crm_notes').select('*')
      .eq('entity_type', entityType).eq('entity_id', entityId)
      .order('created_at')
      .then(({ data }) => { setNotes(data || []); setLoading(false) })
  }, [entityId])

  async function addNote() {
    if (!body.trim()) return
    setSaving(true)
    const { data } = await supabase.from('crm_notes').insert({
      entity_type: entityType, entity_id: entityId,
      body: body.trim(), author_email: authorEmail,
    }).select().single()
    if (data) setNotes(p => [...p, data])
    setBody(''); setSaving(false)
  }

  async function deleteNote(id) {
    await supabase.from('crm_notes').delete().eq('id', id)
    setNotes(p => p.filter(n => n.id !== id))
  }

  return (
    <div style={{ marginTop: 12 }}>
      {loading ? (
        <div style={{ fontSize: 12, color: C.textMuted, fontFamily: FONT }}>טוען הערות...</div>
      ) : notes.length === 0 ? (
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10, fontFamily: FONT }}>אין הערות עדיין.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {notes.map(n => (
            <div key={n.id} className="crm-note-card" style={{
              background: '#f8fafc',
              borderRadius: 9, padding: '10px 13px',
              fontSize: 13, color: C.textPrimary,
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ lineHeight: 1.65, whiteSpace: 'pre-wrap', fontFamily: FONT }}>{n.body}</div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: FONT }}>{fmtDate(n.created_at)}</span>
                <button onClick={() => deleteNote(n.id)} className="crm-btn-danger" style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 13, padding: '2px 6px', borderRadius: 5 }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="הוסף הערה..."
          rows={2}
          className="crm-input"
          style={{ ...inp, flex: 1, resize: 'none' }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote() }}
        />
        <button
          onClick={addNote}
          disabled={saving || !body.trim()}
          className="crm-btn-primary"
          style={{ ...btnPrimary, alignSelf: 'flex-end', opacity: (!body.trim() || saving) ? 0.45 : 1 }}
        >
          {saving ? '…' : '➕'}
        </button>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardView({ companies, leads, agreements }) {
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const stats = [
    { label: 'סה"כ חברות',      value: companies.length,                                    color: C.primary,  icon: '🏢', delay: 'd1' },
    { label: 'חברות פעילות',     value: companies.filter(c => c.is_active).length,            color: C.success,  icon: '✅', delay: 'd2' },
    { label: 'לידים חדשים החודש', value: leads.filter(l => l.created_at >= thisMonth).length, color: C.warning,  icon: '💬', delay: 'd3' },
    { label: 'הסכמים חתומים',    value: agreements.length,                                   color: C.purple,   icon: '📄', delay: 'd4' },
    { label: 'לידים לטיפול',     value: leads.filter(l => l.status === 'new').length,        color: C.danger,   icon: '🔴', delay: 'd5' },
    { label: 'גישה פגת תוקף',   value: companies.filter(c => c.access_until && new Date(c.access_until) < now).length, color: C.danger, icon: '⏰', delay: 'd6' },
  ]

  const recentLeads = [...leads].slice(0, 5)
  const recentAgreements = [...agreements].slice(0, 5)

  return (
    <div>
      {/* Page title */}
      <div className="crm-animate" style={{ marginBottom: 28 }}>
        <div className="crm-display" style={{ fontSize: 26, fontWeight: 800, color: C.textPrimary, letterSpacing: '-0.02em' }}>
          לוח בקרה
        </div>
        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4, fontFamily: FONT }}>סקירה כללית של מצב המערכת</div>
      </div>

      {/* Stat bento grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`crm-stat-card crm-animate crm-animate-${s.delay}`}
            style={{
              background: '#ffffff',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              padding: '20px 20px 18px',
              boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Accent glow blob */}
            <div style={{
              position: 'absolute', top: -20, right: -20,
              width: 80, height: 80, borderRadius: '50%',
              background: s.color,
              opacity: 0.08,
              filter: 'blur(20px)',
              pointerEvents: 'none',
            }} />
            <div style={{ fontSize: 22, marginBottom: 12, lineHeight: 1 }}>{s.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1, fontFamily: FONT, letterSpacing: '-0.02em' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 5, fontFamily: FONT }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Recent leads */}
        <div className="crm-animate crm-animate-d3" style={{ ...card }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.textPrimary, marginBottom: 16, fontFamily: FONT }}>
            💬 לידים אחרונים
          </div>
          {recentLeads.length === 0
            ? <div style={{ fontSize: 13, color: C.textMuted, fontFamily: FONT }}>אין לידים עדיין.</div>
            : recentLeads.map((l, i) => (
              <div key={l.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 0',
                borderBottom: i < recentLeads.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.textPrimary, fontFamily: FONT }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1, fontFamily: FONT }}>
                    {l.company_name || '—'} · {fmtDate(l.created_at)}
                  </div>
                </div>
                <Badge meta={LEAD_STATUS_META[l.status]} />
              </div>
            ))
          }
        </div>

        {/* Recent agreements */}
        <div className="crm-animate crm-animate-d4" style={{ ...card }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.textPrimary, marginBottom: 16, fontFamily: FONT }}>
            📄 הסכמים אחרונים
          </div>
          {recentAgreements.length === 0
            ? <div style={{ fontSize: 13, color: C.textMuted, fontFamily: FONT }}>אין הסכמים חתומים עדיין.</div>
            : recentAgreements.map((a, i) => (
              <div key={a.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 0',
                borderBottom: i < recentAgreements.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.textPrimary, fontFamily: FONT }}>
                    {a.data?.company_name || a.submitter_name || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1, fontFamily: FONT }}>
                    {a.data?.signatory_name || '—'} · {fmtDate(a.submitted_at)}
                  </div>
                </div>
                <span style={{ fontSize: 10, background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontFamily: FONT }}>
                  ✓ חתום
                </span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

// ── Clients ───────────────────────────────────────────────────────────────────
function ClientsView({ companies, agreements, session, onUpdate }) {
  const [search,      setSearch]      = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [expanded,    setExpanded]    = useState(null)
  const [editId,      setEditId]      = useState(null)
  const [editData,    setEditData]    = useState({})
  const [saving,      setSaving]      = useState(false)
  const [activeTab,   setActiveTab]   = useState({})

  const filtered = companies.filter(c => {
    const q = search.toLowerCase()
    if (q && !c.name.toLowerCase().includes(q) && !c.invite_code?.toLowerCase().includes(q)) return false
    if (stageFilter !== 'all' && c.crm_stage !== stageFilter) return false
    return true
  })

  function startEdit(co) {
    setEditId(co.id)
    setEditData({ crm_stage: co.crm_stage || 'active', max_cars: co.max_cars ?? '', max_users: co.max_users ?? '', access_until: co.access_until ?? '', is_active: co.is_active })
  }

  async function saveEdit(co) {
    setSaving(true)
    await supabase.from('companies').update({
      crm_stage:    editData.crm_stage,
      is_active:    editData.is_active,
      max_cars:     editData.max_cars  === '' ? null : parseInt(editData.max_cars, 10),
      max_users:    editData.max_users === '' ? null : parseInt(editData.max_users, 10),
      access_until: editData.access_until || null,
    }).eq('id', co.id)
    setSaving(false); setEditId(null); onUpdate()
  }

  const getTab = id => activeTab[id] || 'info'
  const setTab = (id, t) => setActiveTab(p => ({ ...p, [id]: t }))
  const coAgreements = id => agreements.filter(a => a.company_id === id)

  return (
    <div>
      {/* Header */}
      <div className="crm-animate" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="crm-display" style={{ fontSize: 26, fontWeight: 800, color: C.textPrimary, letterSpacing: '-0.02em' }}>לקוחות</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4, fontFamily: FONT }}>{companies.length} חברות רשומות</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש חברה..."
            className="crm-input"
            style={{ ...inp, width: 180 }}
          />
          <select
            value={stageFilter} onChange={e => setStageFilter(e.target.value)}
            className="crm-input"
            style={{ ...inp, width: 138, cursor: 'pointer' }}
          >
            <option value="all">כל השלבים</option>
            {Object.entries(STAGE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={{ ...card, textAlign: 'center', color: C.textMuted, padding: '48px 20px', fontFamily: FONT }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🏢</div>
          אין חברות תואמות
        </div>
      )}

      {filtered.map((co, idx) => {
        const isOpen    = expanded === co.id
        const isEditing = editId   === co.id
        const tab       = getTab(co.id)
        const agrs      = coAgreements(co.id)
        const daysLeft  = co.access_until ? Math.ceil((new Date(co.access_until) - new Date()) / 86400000) : null
        const expired   = daysLeft !== null && daysLeft < 0

        return (
          <div
            key={co.id}
            className="crm-card crm-animate"
            style={{
              ...card,
              marginBottom: 8,
              animationDelay: `${idx * 0.04}s`,
            }}
          >
            {/* Row header */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              onClick={() => setExpanded(isOpen ? null : co.id)}
            >
              {/* Company avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)',
                border: '1px solid #c7d2fe',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
              }}>
                🏢
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary, fontFamily: FONT }}>{co.name}</span>
                  <Badge meta={STAGE_META[co.crm_stage] || STAGE_META.active} />
                  {!co.is_active && <span style={{ fontSize: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 20, padding: '2px 9px', fontWeight: 700, fontFamily: FONT }}>סגור</span>}
                  {expired && <span style={{ fontSize: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 20, padding: '2px 9px', fontWeight: 700, fontFamily: FONT }}>פג תוקף</span>}
                  {agrs.length > 0 && <span style={{ fontSize: 10, background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '2px 9px', fontWeight: 700, fontFamily: FONT }}>📄 {agrs.length} הסכמים</span>}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap', fontFamily: FONT }}>
                  <span style={{ fontFamily: 'monospace', letterSpacing: '0.1em', color: C.textSecondary }}>{co.invite_code}</span>
                  {co.max_cars  != null && <span>🚗 {co.max_cars}</span>}
                  {co.max_users != null && <span>👤 {co.max_users}</span>}
                  {co.access_until && <span style={{ color: expired ? C.danger : C.textMuted }}>📅 {expired ? `פג ${co.access_until}` : `עד ${co.access_until}`}</span>}
                </div>
              </div>

              <span className="crm-chevron" style={{
                color: C.textMuted, fontSize: 14, flexShrink: 0,
                transform: isOpen ? 'rotate(180deg)' : 'none',
              }}>▾</span>
            </div>

            {/* Expanded panel */}
            {isOpen && (
              <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                  {[['info', 'פרטים'], ['limits', 'הגבלות'], ['agreements', `הסכמים (${agrs.length})`], ['notes', 'הערות']].map(([t, label]) => (
                    <button
                      key={t}
                      onClick={() => setTab(co.id, t)}
                      className={`crm-tab-btn${tab === t ? ' crm-tab-active' : ''}`}
                      style={{
                        padding: '5px 13px', borderRadius: 20, border: 'none',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
                        background: tab === t ? C.primary : '#f1f5f9',
                        color: tab === t ? '#fff' : C.textSecondary,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Info tab */}
                {tab === 'info' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[['שם', co.name], ['קוד הזמנה', co.invite_code], ['נוצר', fmtDate(co.created_at)], ['סטטוס', co.is_active ? 'פעיל' : 'סגור']].map(([k, v]) => (
                      <div key={k} style={{ background: '#f8fafc', borderRadius: 9, padding: '10px 13px', border: '1px solid #e2e8f0' }}>
                        <div style={lbl}>{k}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: FONT }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Limits tab */}
                {tab === 'limits' && (
                  <div>
                    {!isEditing ? (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10, marginBottom: 14 }}>
                          {[
                            ['🚗 מקס. רכבים',   co.max_cars  ?? '∞'],
                            ['👤 מקס. משתמשים', co.max_users ?? '∞'],
                            ['📅 גישה עד',       co.access_until || 'ללא הגבלה'],
                            ['שלב CRM',          STAGE_META[co.crm_stage]?.label || co.crm_stage],
                          ].map(([k, v]) => (
                            <div key={k} style={{ background: '#f8fafc', borderRadius: 9, padding: '10px 13px', border: '1px solid #e2e8f0' }}>
                              <div style={lbl}>{k}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, fontFamily: FONT }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => startEdit(co)} className="crm-btn-primary" style={btnPrimary}>✏️ עריכה</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label style={lbl}>שלב CRM</label>
                            <select value={editData.crm_stage} onChange={e => setEditData(p => ({ ...p, crm_stage: e.target.value }))} className="crm-input" style={{ ...inp, cursor: 'pointer' }}>
                              {Object.entries(STAGE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={lbl}>סטטוס</label>
                            <select value={editData.is_active ? 'active' : 'inactive'} onChange={e => setEditData(p => ({ ...p, is_active: e.target.value === 'active' }))} className="crm-input" style={{ ...inp, cursor: 'pointer' }}>
                              <option value="active">פעיל</option>
                              <option value="inactive">סגור</option>
                            </select>
                          </div>
                          <div>
                            <label style={lbl}>מקס. רכבים</label>
                            <input type="number" min="0" value={editData.max_cars} onChange={e => setEditData(p => ({ ...p, max_cars: e.target.value }))} placeholder="ללא הגבלה" className="crm-input" style={inp} />
                          </div>
                          <div>
                            <label style={lbl}>מקס. משתמשים</label>
                            <input type="number" min="0" value={editData.max_users} onChange={e => setEditData(p => ({ ...p, max_users: e.target.value }))} placeholder="ללא הגבלה" className="crm-input" style={inp} />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={lbl}>גישה בתוקף עד</label>
                            <input type="date" value={editData.access_until} onChange={e => setEditData(p => ({ ...p, access_until: e.target.value }))} className="crm-input" style={inp} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => saveEdit(co)} disabled={saving} className="crm-btn-primary" style={btnPrimary}>{saving ? '…' : 'שמור'}</button>
                          <button onClick={() => setEditId(null)} className="crm-btn-ghost" style={btnGhost}>ביטול</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Agreements tab */}
                {tab === 'agreements' && (
                  <div>
                    {agrs.length === 0 ? (
                      <div style={{ fontSize: 13, color: C.textMuted, fontFamily: FONT }}>אין הסכמים חתומים עדיין.</div>
                    ) : agrs.map(a => (
                      <div key={a.id} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary, fontFamily: FONT }}>{a.data?.company_name || '—'}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, fontFamily: FONT }}>
                          👤 {a.data?.signatory_name || '—'} &nbsp;·&nbsp; 📅 {a.data?.sign_date || fmtDate(a.submitted_at?.slice(0, 10))}
                          {a.data?.id_number && ` · ח.פ/ת.ז: ${a.data.id_number}`}
                          {a.data?.email && ` · ${a.data.email}`}
                        </div>
                        {a.data?.signature && (
                          <img src={a.data.signature} alt="חתימה" style={{ marginTop: 10, maxWidth: 200, border: `1px solid ${C.border}`, borderRadius: 7, background: '#fff' }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes tab */}
                {tab === 'notes' && (
                  <NotesPanel entityType="company" entityId={co.id} authorEmail={session.user.email} />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Leads ─────────────────────────────────────────────────────────────────────
function LeadsView({ leads, session, onUpdate }) {
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expanded,     setExpanded]     = useState(null)
  const [saving,       setSaving]       = useState(null)
  const [showAdd,      setShowAdd]      = useState(false)
  const [newLead,      setNewLead]      = useState({ name: '', company_name: '', phone: '', email: '', fleet_size: '', message: '', status: 'new' })
  const [adding,       setAdding]       = useState(false)

  const filtered = leads.filter(l => {
    const q = search.toLowerCase()
    if (q && !l.name?.toLowerCase().includes(q) && !l.company_name?.toLowerCase().includes(q) && !l.email?.toLowerCase().includes(q)) return false
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    return true
  })

  async function updateStatus(lead, status) {
    setSaving(lead.id)
    await supabase.from('crm_leads').update({ status, updated_at: new Date().toISOString() }).eq('id', lead.id)
    setSaving(null); onUpdate()
  }

  async function deleteLead(id) {
    if (!window.confirm('למחוק ליד זה?')) return
    await supabase.from('crm_leads').delete().eq('id', id)
    onUpdate()
  }

  async function addManualLead(e) {
    e.preventDefault()
    if (!newLead.name.trim()) return
    setAdding(true)
    await supabase.from('crm_leads').insert({ ...newLead, source: 'manual' })
    setAdding(false); setShowAdd(false)
    setNewLead({ name: '', company_name: '', phone: '', email: '', fleet_size: '', message: '', status: 'new' })
    onUpdate()
  }

  const set = k => e => setNewLead(p => ({ ...p, [k]: e.target.value }))

  return (
    <div>
      {/* Header */}
      <div className="crm-animate" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="crm-display" style={{ fontSize: 26, fontWeight: 800, color: C.textPrimary, letterSpacing: '-0.02em' }}>לידים</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4, fontFamily: FONT }}>{leads.length} לידים במערכת</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." className="crm-input" style={{ ...inp, width: 160 }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="crm-input" style={{ ...inp, width: 140, cursor: 'pointer' }}>
            <option value="all">כל הסטטוסים</option>
            {Object.entries(LEAD_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="crm-btn-primary"
            style={btnPrimary}
          >
            + ליד חדש
          </button>
        </div>
      </div>

      {/* Add lead form */}
      {showAdd && (
        <div className="crm-animate" style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary, marginBottom: 14, fontFamily: FONT }}>+ הוסף ליד ידנית</div>
          <form onSubmit={addManualLead} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>שם *</label><input style={inp} className="crm-input" value={newLead.name} onChange={set('name')} required /></div>
              <div><label style={lbl}>חברה</label><input style={inp} className="crm-input" value={newLead.company_name} onChange={set('company_name')} /></div>
              <div><label style={lbl}>טלפון</label><input style={inp} className="crm-input" value={newLead.phone} onChange={set('phone')} /></div>
              <div><label style={lbl}>אימייל</label><input style={inp} className="crm-input" type="email" value={newLead.email} onChange={set('email')} /></div>
              <div>
                <label style={lbl}>גודל צי</label>
                <select style={{ ...inp, cursor: 'pointer' }} className="crm-input" value={newLead.fleet_size} onChange={set('fleet_size')}>
                  <option value="">בחר...</option>
                  <option value="1-10">עד 10</option><option value="10-50">10–50</option>
                  <option value="50-200">50–200</option><option value="200+">מעל 200</option>
                </select>
              </div>
              <div>
                <label style={lbl}>סטטוס</label>
                <select style={{ ...inp, cursor: 'pointer' }} className="crm-input" value={newLead.status} onChange={set('status')}>
                  {Object.entries(LEAD_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div><label style={lbl}>הודעה / הערה</label><textarea style={{ ...inp, height: 70, resize: 'vertical' }} className="crm-input" value={newLead.message} onChange={set('message')} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={adding} className="crm-btn-primary" style={btnPrimary}>{adding ? '…' : 'הוסף'}</button>
              <button type="button" onClick={() => setShowAdd(false)} className="crm-btn-ghost" style={btnGhost}>ביטול</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ ...card, textAlign: 'center', color: C.textMuted, padding: '48px 20px', fontFamily: FONT }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
          אין לידים תואמים
        </div>
      )}

      {filtered.map((l, idx) => {
        const isOpen = expanded === l.id
        return (
          <div key={l.id} className="crm-card crm-animate" style={{ ...card, marginBottom: 8, animationDelay: `${idx * 0.04}s` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : l.id)}>
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: LEAD_STATUS_META[l.status]?.bg || '#dbeafe',
                border: `1px solid ${LEAD_STATUS_META[l.status]?.color || '#2563eb'}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
              }}>
                💬
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary, fontFamily: FONT }}>{l.name}</span>
                  {l.company_name && <span style={{ fontSize: 12, color: C.textMuted, fontFamily: FONT }}>· {l.company_name}</span>}
                  <Badge meta={LEAD_STATUS_META[l.status]} />
                  {l.source === 'contact_form' && (
                    <span style={{ fontSize: 10, background: C.primaryDim, color: C.primary, borderRadius: 20, padding: '2px 9px', fontWeight: 700, fontFamily: FONT }}>🌐 אתר</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap', fontFamily: FONT }}>
                  {l.phone && <span>📞 {l.phone}</span>}
                  {l.email && <span>✉ {l.email}</span>}
                  {l.fleet_size && <span>🚗 {l.fleet_size}</span>}
                  <span>📅 {fmtDate(l.created_at)}</span>
                </div>
              </div>
              <span className="crm-chevron" style={{ color: C.textMuted, fontSize: 14, flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
            </div>

            {isOpen && (
              <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                {/* Status pills */}
                <div style={{ marginBottom: 14 }}>
                  <div style={lbl}>שנה סטטוס</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(LEAD_STATUS_META).map(([k, v]) => (
                      <button
                        key={k}
                        disabled={saving === l.id}
                        onClick={() => updateStatus(l, k)}
                        className="crm-status-pill"
                        style={{
                          padding: '5px 13px', borderRadius: 20, border: 'none',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
                          background: l.status === k ? v.color : '#f1f5f9',
                          color: l.status === k ? '#fff' : C.textSecondary,
                          boxShadow: l.status === k ? `0 4px 16px ${v.color}40` : 'none',
                        }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {l.message && (
                  <div style={{ background: '#f8fafc', borderRadius: 9, padding: '10px 13px', fontSize: 13, color: C.textPrimary, marginBottom: 14, lineHeight: 1.65, border: '1px solid #e2e8f0', fontFamily: FONT }}>
                    📝 {l.message}
                  </div>
                )}

                <div style={{ ...lbl, marginBottom: 8 }}>הערות</div>
                <NotesPanel entityType="lead" entityId={l.id} authorEmail={session.user.email} />

                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  {l.phone && (
                    <a href={`https://wa.me/972${l.phone.replace(/^0/, '').replace(/-/g, '')}`} target="_blank" rel="noreferrer"
                      style={{ ...btnPrimary, background: '#25d366', textDecoration: 'none', fontSize: 12, display: 'inline-block' }}>
                      📲 WhatsApp
                    </a>
                  )}
                  {l.email && (
                    <a href={`mailto:${l.email}`}
                      style={{ ...btnPrimary, background: C.indigo, textDecoration: 'none', fontSize: 12, display: 'inline-block' }}>
                      📧 שלח מייל
                    </a>
                  )}
                  <button
                    onClick={() => deleteLead(l.id)}
                    className="crm-btn-danger crm-btn-ghost"
                    style={{ ...btnGhost, color: C.textMuted, marginInlineStart: 'auto' }}
                  >
                    🗑 מחק
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── WhatsApp license message (edit-before-send) ───────────────────────────────
const CRM_LICENSE_WA_DEFAULT = 'שלום,\nמצורף קישור לחתימה על הסכם רישיון שימוש במערכת Celox AI Fleet Manager:\n{link}'
function renderCrmTpl(tpl, vars) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : '')).replace(/\n{3,}/g, '\n\n').trim()
}
function WaEditModal({ initialText, onClose }) {
  const [text, setText] = useState(initialText || '')
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, direction: 'rtl', fontFamily: FONT }}>
      <div style={{ background: C.surface, borderRadius: 14, width: '100%', maxWidth: 440, padding: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: C.textPrimary }}>💬 עריכת הודעת וואטסאפ</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: C.textMuted }}>ערוך את הטקסט לפי הצורך ולחץ לפתיחת וואטסאפ.</p>
        <textarea value={text} onChange={e => setText(e.target.value)}
          style={{ width: '100%', minHeight: 150, resize: 'vertical', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: FONT, color: C.textPrimary, background: C.bg, boxSizing: 'border-box', lineHeight: 1.6 }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer'); onClose() }} disabled={!text.trim()}
            style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'not-allowed', opacity: text.trim() ? 1 : 0.6 }}>פתח בוואטסאפ</button>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>ביטול</button>
        </div>
      </div>
    </div>
  )
}

// ── Agreements ────────────────────────────────────────────────────────────────
function AgreementsView({ agreements, pendingLinks = [], companies, session, onUpdate }) {
  const [search,            setSearch]            = useState('')
  const [waModal,           setWaModal]           = useState(null)
  const [licenseTpl,        setLicenseTpl]        = useState(null)
  const [viewing,           setViewing]           = useState(null)
  const [sendCompany,       setSendCompany]       = useState('')
  const [sendNumCars,       setSendNumCars]       = useState('')
  const [sendNotes,         setSendNotes]         = useState('')
  const [sendPricePerCar,   setSendPricePerCar]   = useState('')
  const [sendFreeStorageGb, setSendFreeStorageGb] = useState('10')
  const [sendPriceExtraGb,  setSendPriceExtraGb]  = useState('')
  const [sendLink,          setSendLink]          = useState(null)
  const [sendBusy,          setSendBusy]          = useState(false)
  const [sendCopied,        setSendCopied]        = useState(false)
  const [sendError,         setSendError]         = useState('')

  useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('profiles').select('companies(whatsapp_templates)').eq('id', session.user.id).single()
      .then(({ data }) => setLicenseTpl(data?.companies?.whatsapp_templates?.license || null))
  }, [session])

  const filtered = agreements.filter(a => {
    const q = search.toLowerCase()
    return !q || a.data?.company_name?.toLowerCase().includes(q) || a.data?.signatory_name?.toLowerCase().includes(q) || a.submitter_name?.toLowerCase().includes(q)
  })

  const getCompanyName = companyId => companies.find(c => c.id === companyId)?.name || '—'

  function sevenDaysFromNow() {
    const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString()
  }

  async function createAgreementLink(agreementFields) {
    const co = companies.find(c => c.id === sendCompany)
    await supabase.from('form_links').update({ expires_at: sevenDaysFromNow() })
      .eq('company_id', sendCompany).eq('type', 'license_agreement').eq('is_active', true).is('expires_at', null)
    const { data: nl, error: insErr } = await supabase.from('form_links').insert({
      company_id: sendCompany, type: 'license_agreement',
      title: `הסכם רישיון — ${co?.name || ''}`,
      created_by: session.user.id, is_active: true, single_use: false,
      fields: agreementFields,
    }).select().single()
    return { data: nl, error: insErr }
  }

  async function generateLink() {
    if (!sendCompany) return
    setSendBusy(true); setSendLink(null); setSendError('')
    const fields = {
      num_cars:        sendNumCars       ? parseInt(sendNumCars, 10)        : null,
      price_per_car:   sendPricePerCar   ? parseFloat(sendPricePerCar)      : null,
      free_storage_gb: sendFreeStorageGb ? parseInt(sendFreeStorageGb, 10)  : 10,
      price_extra_gb:  sendPriceExtraGb  ? parseFloat(sendPriceExtraGb)     : null,
      notes:           sendNotes.trim() || null,
    }
    const { data: nl, error: insErr } = await createAgreementLink(fields)
    if (insErr) { setSendError(insErr.message); setSendBusy(false); return }
    if (nl) setSendLink(nl)
    setSendBusy(false)
  }

  async function newLink() {
    if (!sendCompany) return
    setSendBusy(true); setSendError('')
    const fields = {
      num_cars:        sendNumCars       ? parseInt(sendNumCars, 10)        : null,
      price_per_car:   sendPricePerCar   ? parseFloat(sendPricePerCar)      : null,
      free_storage_gb: sendFreeStorageGb ? parseInt(sendFreeStorageGb, 10)  : 10,
      price_extra_gb:  sendPriceExtraGb  ? parseFloat(sendPriceExtraGb)     : null,
      notes:           sendNotes.trim() || null,
    }
    const { data: nl, error: insErr } = await createAgreementLink(fields)
    if (insErr) { setSendError(insErr.message); setSendBusy(false); return }
    if (nl) setSendLink(nl)
    setSendBusy(false)
  }

  const linkUrl = sendLink ? `${window.location.origin}/form/${sendLink.token}` : ''

  return (
    <div>
      {/* Header */}
      <div className="crm-animate" style={{ marginBottom: 22 }}>
        <div className="crm-display" style={{ fontSize: 26, fontWeight: 800, color: C.textPrimary, letterSpacing: '-0.02em' }}>הסכמים</div>
        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4, fontFamily: FONT }}>{agreements.length} הסכמים חתומים</div>
      </div>

      {/* Send agreement card */}
      <div className="crm-animate crm-animate-d1" style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.textPrimary, marginBottom: 14, fontFamily: FONT }}>📤 שלח הסכם רישיון ללקוח</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={lbl}>בחר חברה</label>
            <select
              value={sendCompany}
              onChange={e => { setSendCompany(e.target.value); setSendLink(null); setSendNumCars(''); setSendNotes(''); setSendPricePerCar(''); setSendFreeStorageGb('10'); setSendPriceExtraGb('') }}
              className="crm-input"
              style={{ ...inp, cursor: 'pointer' }}
            >
              <option value="">בחר לקוח...</option>
              {companies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
            </select>
          </div>
          <div style={{ width: 110 }}>
            <label style={lbl}>מספר רכבים</label>
            <input type="number" min="0" value={sendNumCars} onChange={e => { setSendNumCars(e.target.value); setSendLink(null) }} placeholder="0" className="crm-input" style={inp} />
          </div>
          <div style={{ width: 124 }}>
            <label style={lbl}>מחיר לרכב (₪)</label>
            <input type="number" min="0" step="0.01" value={sendPricePerCar} onChange={e => { setSendPricePerCar(e.target.value); setSendLink(null) }} placeholder="0.00" className="crm-input" style={inp} />
          </div>
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 14, marginBottom: 8, fontFamily: FONT }}>אחסון</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ width: 140 }}>
            <label style={lbl}>אחסון חינם (GB)</label>
            <input type="number" min="0" value={sendFreeStorageGb} onChange={e => { setSendFreeStorageGb(e.target.value); setSendLink(null) }} placeholder="10" className="crm-input" style={inp} />
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4, fontFamily: FONT }}>ברירת מחדל: 10 GB חינם</div>
          </div>
          <div style={{ width: 152 }}>
            <label style={lbl}>מחיר ל-GB נוסף (₪)</label>
            <input type="number" min="0" step="0.01" value={sendPriceExtraGb} onChange={e => { setSendPriceExtraGb(e.target.value); setSendLink(null) }} placeholder="0.00" className="crm-input" style={inp} />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <label style={lbl}>הערות להסכם</label>
          <textarea value={sendNotes} onChange={e => { setSendNotes(e.target.value); setSendLink(null) }} placeholder="הערות שיופיעו בהסכם..." rows={2} className="crm-input" style={{ ...inp, resize: 'none' }} />
        </div>
        <div style={{ marginTop: 10 }}>
          <button onClick={generateLink} disabled={!sendCompany || sendBusy} className="crm-btn-primary" style={{ ...btnPrimary, opacity: !sendCompany || sendBusy ? 0.45 : 1, whiteSpace: 'nowrap' }}>
            {sendBusy ? '…' : '🔗 צור קישור'}
          </button>
        </div>

        {sendError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 9, padding: '9px 13px', color: '#dc2626', fontSize: 12, marginTop: 10, fontFamily: FONT }}>
            ⚠ {sendError}
          </div>
        )}

        {sendLink && (
          <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12, border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: FONT }}>שלח ללקוח לחתימה על הסכם הרישיון:</div>
            {(sendLink.fields?.num_cars || sendLink.fields?.price_per_car != null) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {sendLink.fields?.num_cars > 0 && (
                  <span style={{ fontSize: 11, background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontFamily: FONT }}>
                    🚗 {sendLink.fields.num_cars} רכבים
                  </span>
                )}
                {sendLink.fields?.price_per_car != null && (
                  <span style={{ fontSize: 11, background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontFamily: FONT }}>
                    ₪{sendLink.fields.price_per_car} לרכב
                  </span>
                )}
                <span style={{ fontSize: 11, background: '#fef3c7', color: '#b45309', borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontFamily: FONT }}>
                  💾 {sendLink.fields?.free_storage_gb ?? 10} GB חינם
                  {sendLink.fields?.price_extra_gb ? ` · ₪${sendLink.fields.price_extra_gb}/GB נוסף` : ''}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input readOnly value={linkUrl} onClick={e => e.target.select()}
                className="crm-input"
                style={{ flex: 1, minWidth: 0, ...inp, fontSize: 12, direction: 'ltr' }} />
              <button
                onClick={() => { navigator.clipboard.writeText(linkUrl); setSendCopied(true); setTimeout(() => setSendCopied(false), 2000) }}
                className="crm-btn-primary"
                style={{ ...btnPrimary, background: sendCopied ? C.success : C.primary, whiteSpace: 'nowrap', fontSize: 12 }}
              >
                {sendCopied ? '✓ הועתק' : 'העתק'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setWaModal({ text: renderCrmTpl(licenseTpl && licenseTpl.trim() ? licenseTpl : CRM_LICENSE_WA_DEFAULT, { link: linkUrl }) })}
                style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
              >
                📲 WhatsApp
              </button>
              <button
                onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent('הסכם רישיון — Celox AI Fleet Manager')}&body=${encodeURIComponent(`שלום,\nקישור לחתימה:\n${linkUrl}`)}` }}
                style={{ background: C.indigo, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
              >
                📧 אימייל
              </button>
              <button onClick={newLink} disabled={sendBusy} className="crm-btn-ghost" style={{ ...btnGhost, fontSize: 12 }}>+ קישור חדש</button>
            </div>
          </div>
        )}
      </div>

      {waModal && <WaEditModal initialText={waModal.text} onClose={() => setWaModal(null)} />}

      {/* Pending links */}
      {pendingLinks.length > 0 && (
        <>
          <SectionLabel>ממתינים לחתימה ({pendingLinks.length})</SectionLabel>
          {pendingLinks.map(l => {
            const co = companies.find(c => c.id === l.company_id)
            const lu = `${window.location.origin}/form/${l.token}`
            return (
              <div key={l.id} className="crm-card" style={{ ...card, marginBottom: 8, opacity: 0.82 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary, fontFamily: FONT }}>{co?.name || '—'}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, fontFamily: FONT }}>
                      📅 נשלח {fmtDate(l.created_at?.slice(0, 10))}
                      {l.fields?.num_cars ? ` · 🚗 ${l.fields.num_cars} רכבים` : ''}
                      {l.fields?.price_per_car != null ? ` · ₪${l.fields.price_per_car}/רכב` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, background: '#fef3c7', color: '#b45309', borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontFamily: FONT }}>⏳ ממתין</span>
                    <button onClick={() => { navigator.clipboard.writeText(lu) }} className="crm-btn-ghost" style={{ ...btnGhost, fontSize: 12 }}>העתק קישור</button>
                  </div>
                </div>
              </div>
            )
          })}
          <div style={{ marginBottom: 22 }} />
        </>
      )}

      {/* Signed agreements */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <SectionLabel>הסכמים חתומים</SectionLabel>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש..."
          className="crm-input"
          style={{ ...inp, width: 160, fontSize: 12, padding: '6px 11px' }}
        />
      </div>

      {filtered.length === 0 && (
        <div style={{ ...card, textAlign: 'center', color: C.textMuted, padding: '48px 20px', fontFamily: FONT }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
          אין הסכמים חתומים עדיין.
        </div>
      )}

      {filtered.map((a, idx) => (
        <div key={a.id} className="crm-card crm-animate" style={{ ...card, marginBottom: 8, animationDelay: `${idx * 0.04}s` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary, fontFamily: FONT }}>{a.data?.company_name || '—'}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, fontFamily: FONT }}>
                👤 {a.data?.signatory_name || '—'} &nbsp;·&nbsp;
                📅 {a.data?.sign_date || fmtDate(a.created_at?.slice(0, 10))} &nbsp;·&nbsp;
                🏢 {getCompanyName(a.company_id)}
                {a.data?.id_number && ` · ח.פ/ת.ז: ${a.data.id_number}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 10, background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontFamily: FONT }}>✓ חתום</span>
              <button onClick={() => setViewing(viewing?.id === a.id ? null : a)} className="crm-btn-ghost" style={{ ...btnGhost, fontSize: 12 }}>צפה</button>
            </div>
          </div>

          {viewing?.id === a.id && (
            <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                {[
                  ['🏢 שם חברה',   a.data?.company_name],
                  ['👤 חותם',      a.data?.signatory_name],
                  ['💼 תפקיד',     a.data?.signatory_role],
                  ['🪪 ח.פ / ת.ז.', a.data?.id_number],
                  ['📞 טלפון',     a.data?.phone],
                  ['📧 אימייל',    a.data?.email],
                  ['📅 תאריך',     a.data?.sign_date],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ background: '#f8fafc', borderRadius: 9, padding: '10px 13px', border: '1px solid #e2e8f0' }}>
                    <div style={lbl}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: FONT }}>{v}</div>
                  </div>
                ))}
              </div>
              {(a.form_links?.fields?.price_per_car != null || a.form_links?.fields?.free_storage_gb != null) && (
                <div style={{ marginBottom: 14 }}>
                  <div style={lbl}>תמחור</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {a.form_links.fields.num_cars > 0 && (
                      <span style={{ fontSize: 11, background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontFamily: FONT }}>
                        🚗 {a.form_links.fields.num_cars} רכבים
                      </span>
                    )}
                    {a.form_links.fields.price_per_car != null && (
                      <span style={{ fontSize: 11, background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontFamily: FONT }}>
                        ₪{a.form_links.fields.price_per_car} לרכב
                      </span>
                    )}
                    <span style={{ fontSize: 11, background: '#fef3c7', color: '#b45309', borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontFamily: FONT }}>
                      💾 {a.form_links.fields.free_storage_gb ?? 10} GB חינם
                      {a.form_links.fields.price_extra_gb ? ` · ₪${a.form_links.fields.price_extra_gb}/GB נוסף` : ''}
                    </span>
                  </div>
                </div>
              )}
              {a.data?.signature && (
                <div>
                  <div style={lbl}>חתימה דיגיטלית</div>
                  <div style={{ display: 'inline-block', background: '#fff', borderRadius: 10, padding: 6, border: `1px solid ${C.border}` }}>
                    <img src={a.data.signature} alt="חתימה" style={{ maxWidth: 280, display: 'block', borderRadius: 6 }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function CRMSidebar({ view, setView, onBack, leads }) {
  const newLeadCount = leads.filter(l => l.status === 'new').length
  const items = [
    { id: 'dashboard',  icon: '◈',  label: 'לוח בקרה' },
    { id: 'clients',    icon: '⬡',  label: 'לקוחות' },
    { id: 'leads',      icon: '◎',  label: 'לידים', badge: newLeadCount || null },
    { id: 'agreements', icon: '◻',  label: 'הסכמים' },
  ]

  return (
    <div style={{
      width: 230,
      background: C.navBg,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      direction: 'rtl',
      borderLeft: `1px solid ${C.border}`,
    }}>
      {/* Brand header */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: `1px solid ${C.border}`,
      }}>
        {/* Eyebrow tag */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(59,130,246,0.14)',
          borderRadius: 20, padding: '3px 10px',
          marginBottom: 10,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.primary }} />
          <span style={{ fontSize: 9, fontWeight: 800, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: FONT }}>LIVE</span>
        </div>
        <div className="crm-display" style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>
          Celox CRM
        </div>
        <div style={{ color: C.textMuted, fontSize: 11, marginTop: 3, fontFamily: FONT }}>מערכת ניהול לקוחות</div>
      </div>

      {/* Nav items */}
      <div style={{ padding: '12px 10px', flex: 1 }}>
        {items.map(item => {
          const isActive = view === item.id
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`crm-nav-item${isActive ? ' crm-nav-active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, border: 'none',
                cursor: 'pointer', textAlign: 'right', width: '100%',
                background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: isActive ? '#f1f5f9' : C.textMuted,
                fontWeight: isActive ? 700 : 500,
                fontSize: 14, fontFamily: FONT,
                marginBottom: 2, position: 'relative',
              }}
            >
              {/* Active indicator line */}
              {isActive && (
                <div style={{
                  position: 'absolute', right: 0, top: '25%', bottom: '25%',
                  width: 3, borderRadius: '2px 0 0 2px',
                  background: C.primary,
                  boxShadow: `0 0 8px ${C.primary}`,
                }} />
              )}
              <span style={{ fontSize: 16, lineHeight: 1, opacity: isActive ? 1 : 0.55, color: isActive ? C.primary : 'inherit' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge ? (
                <span style={{
                  background: C.danger, color: '#fff',
                  borderRadius: '50%', width: 18, height: 18,
                  fontSize: 10, fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Back button */}
      <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}` }}>
        <button
          onClick={onBack}
          className="crm-nav-item"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 10,
            border: 'none', cursor: 'pointer', width: '100%',
            background: 'transparent', color: C.textMuted,
            fontSize: 13, fontFamily: FONT,
          }}
        >
          <span style={{ fontSize: 14 }}>←</span>
          חזור לאפליקציה
        </button>
      </div>
    </div>
  )
}

// ── CRM main export ───────────────────────────────────────────────────────────
export default function CRM({ session, onBack }) {
  const [view,         setView]         = useState('dashboard')
  const [companies,    setCompanies]    = useState([])
  const [leads,        setLeads]        = useState([])
  const [agreements,   setAgreements]   = useState([])
  const [pendingLinks, setPendingLinks] = useState([])
  const [loading,      setLoading]      = useState(true)
  const isMobile = useIsMobile()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [cosRes, ldsRes, agrsRes, linksRes] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.from('crm_leads').select('*').order('created_at', { ascending: false }),
      supabase.from('form_submissions').select('*, form_links(fields)').eq('type', 'license_agreement').order('submitted_at', { ascending: false }),
      supabase.from('form_links').select('*, form_submissions(id)').eq('type', 'license_agreement').eq('is_active', true).order('created_at', { ascending: false }),
    ])
    setCompanies(cosRes.data || [])
    setLeads(ldsRes.data || [])
    setAgreements(agrsRes.data || [])
    const signed = new Set((agrsRes.data || []).map(a => a.form_link_id))
    setPendingLinks((linksRes.data || []).filter(l => !signed.has(l.id)))
    setLoading(false)
  }

  const NAV_ITEMS = [
    { id: 'dashboard',  icon: '◈',  label: 'לוח בקרה' },
    { id: 'clients',    icon: '⬡',  label: 'לקוחות' },
    { id: 'leads',      icon: '◎',  label: 'לידים' },
    { id: 'agreements', icon: '◻',  label: 'הסכמים' },
  ]

  if (loading) return (
    <div className="crm-root" style={{ display: 'flex', width: '100%', height: '100vh', alignItems: 'center', justifyContent: 'center', background: C.bg, direction: 'rtl' }}>
      <style>{INJECTED_STYLES}</style>
      <div style={{ textAlign: 'center', color: C.textMuted, fontFamily: FONT }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid rgba(59,130,246,0.3)`, borderTopColor: C.primary, animation: 'crmSpin 0.75s linear infinite', margin: '0 auto 14px' }} />
        <div style={{ fontSize: 14, fontWeight: 500 }}>טוען נתוני CRM...</div>
      </div>
    </div>
  )

  return (
    <div className="crm-root" style={{ display: 'flex', width: '100%', height: '100vh', background: C.bg, direction: 'rtl', overflow: 'hidden' }}>
      <style>{INJECTED_STYLES}</style>

      {/* Sidebar — desktop only */}
      {!isMobile && (
        <CRMSidebar view={view} setView={setView} onBack={onBack} leads={leads} />
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div style={{ background: C.navBg, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 18, cursor: 'pointer', padding: 0 }}>←</button>
            <div className="crm-display" style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>Celox CRM</div>
            <div style={{ color: C.textMuted, fontSize: 12, marginInlineStart: 'auto', fontFamily: FONT }}>
              {NAV_ITEMS.find(n => n.id === view)?.icon} {NAV_ITEMS.find(n => n.id === view)?.label}
            </div>
          </div>
        )}

        {/* Content scroll area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px 90px' : '28px 32px' }}>
          {view === 'dashboard'  && <DashboardView  companies={companies} leads={leads} agreements={agreements} />}
          {view === 'clients'    && <ClientsView    companies={companies} agreements={agreements} session={session} onUpdate={loadAll} />}
          {view === 'leads'      && <LeadsView      leads={leads} session={session} onUpdate={loadAll} />}
          {view === 'agreements' && <AgreementsView agreements={agreements} pendingLinks={pendingLinks} companies={companies} session={session} onUpdate={loadAll} />}
        </div>
      </div>

      {/* Mobile bottom tabs */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.navBg, borderTop: `1px solid ${C.border}`, display: 'flex', zIndex: 100 }}>
          {NAV_ITEMS.map(item => {
            const badge = item.id === 'leads' ? leads.filter(l => l.status === 'new').length : 0
            const isActive = view === item.id
            return (
              <button key={item.id} onClick={() => setView(item.id)} style={{
                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 4px 10px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4, position: 'relative', fontFamily: FONT,
              }}>
                {badge > 0 && (
                  <span style={{ position: 'absolute', top: 6, right: '50%', marginRight: -14, background: C.danger, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {badge}
                  </span>
                )}
                <span style={{ fontSize: 18, color: isActive ? C.primary : C.textMuted }}>{item.icon}</span>
                <span style={{ fontSize: 10, color: isActive ? C.primary : C.textMuted, fontWeight: isActive ? 700 : 400 }}>{item.label}</span>
                {isActive && <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, borderRadius: 2, background: C.primary }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
