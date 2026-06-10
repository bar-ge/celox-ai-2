import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// ── Colors (matches existing app) ─────────────────────────────────────────────
const C = {
  navBg: '#0f172a', navBorder: '#1e293b',
  sidebar: '#162032', sidebarHover: 'rgba(255,255,255,0.07)',
  primary: '#2563eb', indigo: '#6366f1',
  bg: '#f1f5f9', surface: '#ffffff',
  border: '#e2e8f0',
  textPrimary: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
  success: '#10b981', warning: '#f59e0b', danger: '#ef4444', purple: '#8b5cf6',
}

const STAGE_META = {
  lead:    { label: 'ליד',    color: C.purple,  bg: '#8b5cf615' },
  trial:   { label: 'ניסיון', color: C.warning, bg: '#f59e0b15' },
  active:  { label: 'פעיל',   color: C.success, bg: '#10b98115' },
  paused:  { label: 'מושהה',  color: C.textMuted, bg: '#94a3b815' },
  churned: { label: 'עזב',    color: C.danger,  bg: '#ef444415' },
}

const LEAD_STATUS_META = {
  new:       { label: 'חדש',       color: C.primary, bg: '#2563eb15' },
  contacted: { label: 'נוצר קשר',  color: C.purple,  bg: '#8b5cf615' },
  qualified: { label: 'מוסמך',     color: C.warning, bg: '#f59e0b15' },
  proposal:  { label: 'הצעה',      color: C.indigo,  bg: '#6366f115' },
  won:       { label: '✓ נסגר',    color: C.success, bg: '#10b98115' },
  lost:      { label: 'אבוד',      color: C.danger,  bg: '#ef444415' },
}

// ── Shared style helpers ───────────────────────────────────────────────────────
const card = { background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }
const inp  = { width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: C.textPrimary, background: '#f8fafc', fontFamily: 'inherit' }
const lbl  = { fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, display: 'block' }
const btnPrimary = { background: C.primary, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnGhost   = { background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }

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
    <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 5, padding: '2px 8px', background: meta.bg, color: meta.color, whiteSpace: 'nowrap' }}>
      {meta.label}
    </span>
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
        <div style={{ fontSize: 12, color: C.textMuted }}>טוען הערות...</div>
      ) : notes.length === 0 ? (
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>אין הערות עדיין.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {notes.map(n => (
            <div key={n.id} style={{ background: C.bg, borderRadius: 7, padding: '10px 12px', fontSize: 13, color: C.textPrimary, position: 'relative' }}>
              <div style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.body}</div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{fmtDate(n.created_at)}</span>
                <button onClick={() => deleteNote(n.id)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 13, padding: 0 }}>🗑</button>
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
          style={{ ...inp, flex: 1, resize: 'none' }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote() }}
        />
        <button onClick={addNote} disabled={saving || !body.trim()} style={{ ...btnPrimary, alignSelf: 'flex-end', opacity: (!body.trim() || saving) ? 0.5 : 1 }}>
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
    { icon: '🏢', label: 'סה"כ חברות',      value: companies.length,                                    color: C.primary },
    { icon: '✅', label: 'חברות פעילות',     value: companies.filter(c => c.is_active).length,            color: C.success },
    { icon: '💬', label: 'לידים חדשים החודש', value: leads.filter(l => l.created_at >= thisMonth).length, color: C.warning },
    { icon: '📄', label: 'הסכמים חתומים',    value: agreements.length,                                   color: C.purple  },
    { icon: '🔴', label: 'לידים לטיפול',     value: leads.filter(l => l.status === 'new').length,        color: C.danger  },
    { icon: '⏰', label: 'גישה פגת תוקף',   value: companies.filter(c => c.access_until && new Date(c.access_until) < now).length, color: C.danger },
  ]

  const recentLeads = [...leads].slice(0, 5)
  const recentAgreements = [...agreements].slice(0, 5)

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, color: C.textPrimary, marginBottom: 20 }}>📊 לוח בקרה</div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent leads */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.textPrimary, marginBottom: 14 }}>💬 לידים אחרונים</div>
          {recentLeads.length === 0
            ? <div style={{ fontSize: 13, color: C.textMuted }}>אין לידים עדיין.</div>
            : recentLeads.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.textPrimary }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{l.company_name || '—'} · {fmtDate(l.created_at)}</div>
                </div>
                <Badge meta={LEAD_STATUS_META[l.status]} />
              </div>
            ))}
        </div>

        {/* Recent agreements */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.textPrimary, marginBottom: 14 }}>📄 הסכמים אחרונים</div>
          {recentAgreements.length === 0
            ? <div style={{ fontSize: 13, color: C.textMuted }}>אין הסכמים חתומים עדיין.</div>
            : recentAgreements.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.textPrimary }}>{a.data?.company_name || a.submitter_name || '—'}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{a.data?.signatory_name || '—'} · {fmtDate(a.created_at)}</div>
                </div>
                <span style={{ fontSize: 10, background: C.success + '15', color: C.success, borderRadius: 5, padding: '2px 8px', fontWeight: 700 }}>✓ חתום</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ── Clients ───────────────────────────────────────────────────────────────────
function ClientsView({ companies, agreements, session, onUpdate }) {
  const [search,   setSearch]   = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [editId,   setEditId]   = useState(null)
  const [editData, setEditData] = useState({})
  const [saving,   setSaving]   = useState(false)
  const [activeTab, setActiveTab] = useState({}) // per-company tab: info|limits|agreements|notes

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
    const updates = {
      crm_stage: editData.crm_stage,
      is_active: editData.is_active,
      max_cars:  editData.max_cars  === '' ? null : parseInt(editData.max_cars, 10),
      max_users: editData.max_users === '' ? null : parseInt(editData.max_users, 10),
      access_until: editData.access_until || null,
    }
    await supabase.from('companies').update(updates).eq('id', co.id)
    setSaving(false)
    setEditId(null)
    onUpdate()
  }

  const getTab = id => activeTab[id] || 'info'
  const setTab = (id, t) => setActiveTab(p => ({ ...p, [id]: t }))

  const coAgreements = id => agreements.filter(a => a.company_id === id)

  return (
    <div>
      {/* Header + filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.textPrimary }}>🏢 לקוחות</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש..."
            style={{ ...inp, width: 180 }}
          />
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={{ ...inp, width: 130, cursor: 'pointer' }}>
            <option value="all">כל השלבים</option>
            {Object.entries(STAGE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={{ ...card, textAlign: 'center', color: C.textMuted, padding: 40 }}>אין חברות תואמות</div>
      )}

      {filtered.map(co => {
        const isOpen = expanded === co.id
        const isEditing = editId === co.id
        const tab = getTab(co.id)
        const agrs = coAgreements(co.id)
        const daysLeft = co.access_until ? Math.ceil((new Date(co.access_until) - new Date()) / 86400000) : null
        const expired = daysLeft !== null && daysLeft < 0

        return (
          <div key={co.id} style={{ ...card, marginBottom: 10 }}>
            {/* Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : co.id)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary }}>{co.name}</span>
                  <Badge meta={STAGE_META[co.crm_stage] || STAGE_META.active} />
                  {!co.is_active && <span style={{ fontSize: 10, background: C.danger + '15', color: C.danger, borderRadius: 5, padding: '2px 8px', fontWeight: 700 }}>סגור</span>}
                  {expired && <span style={{ fontSize: 10, background: C.danger + '15', color: C.danger, borderRadius: 5, padding: '2px 8px', fontWeight: 700 }}>פג תוקף</span>}
                  {agrs.length > 0 && <span style={{ fontSize: 10, background: C.success + '15', color: C.success, borderRadius: 5, padding: '2px 8px', fontWeight: 700 }}>📄 {agrs.length} הסכמים</span>}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>{co.invite_code}</span>
                  {co.max_cars != null && <span>🚗 {co.max_cars}</span>}
                  {co.max_users != null && <span>👤 {co.max_users}</span>}
                  {co.access_until && <span>📅 {expired ? `פג ${co.access_until}` : `עד ${co.access_until}`}</span>}
                </div>
              </div>
              <span style={{ color: C.textMuted, fontSize: 18, flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
            </div>

            {/* Expanded panel */}
            {isOpen && (
              <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                  {[['info', 'פרטים'], ['limits', 'הגבלות'], ['agreements', `הסכמים (${agrs.length})`], ['notes', 'הערות']].map(([t, label]) => (
                    <button key={t} onClick={() => setTab(co.id, t)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: tab === t ? C.primary : C.bg, color: tab === t ? '#fff' : C.textSecondary }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Info tab */}
                {tab === 'info' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[['שם', co.name], ['קוד הזמנה', co.invite_code], ['נוצר', fmtDate(co.created_at)], ['סטטוס', co.is_active ? 'פעיל' : 'סגור']].map(([k, v]) => (
                      <div key={k} style={{ background: C.bg, borderRadius: 7, padding: '10px 12px' }}>
                        <div style={lbl}>{k}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Limits tab */}
                {tab === 'limits' && (
                  <div>
                    {!isEditing ? (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10, marginBottom: 12 }}>
                          {[
                            ['🚗 מקס. רכבים', co.max_cars ?? '∞'],
                            ['👤 מקס. משתמשים', co.max_users ?? '∞'],
                            ['📅 גישה עד', co.access_until || 'ללא הגבלה'],
                            ['שלב CRM', STAGE_META[co.crm_stage]?.label || co.crm_stage],
                          ].map(([k, v]) => (
                            <div key={k} style={{ background: C.bg, borderRadius: 7, padding: '10px 12px' }}>
                              <div style={lbl}>{k}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => startEdit(co)} style={btnPrimary}>✏️ עריכה</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label style={lbl}>שלב CRM</label>
                            <select value={editData.crm_stage} onChange={e => setEditData(p => ({ ...p, crm_stage: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                              {Object.entries(STAGE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={lbl}>סטטוס</label>
                            <select value={editData.is_active ? 'active' : 'inactive'} onChange={e => setEditData(p => ({ ...p, is_active: e.target.value === 'active' }))} style={{ ...inp, cursor: 'pointer' }}>
                              <option value="active">פעיל</option>
                              <option value="inactive">סגור</option>
                            </select>
                          </div>
                          <div>
                            <label style={lbl}>מקס. רכבים</label>
                            <input type="number" min="0" value={editData.max_cars} onChange={e => setEditData(p => ({ ...p, max_cars: e.target.value }))} placeholder="ללא הגבלה" style={inp} />
                          </div>
                          <div>
                            <label style={lbl}>מקס. משתמשים</label>
                            <input type="number" min="0" value={editData.max_users} onChange={e => setEditData(p => ({ ...p, max_users: e.target.value }))} placeholder="ללא הגבלה" style={inp} />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={lbl}>גישה בתוקף עד</label>
                            <input type="date" value={editData.access_until} onChange={e => setEditData(p => ({ ...p, access_until: e.target.value }))} style={inp} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => saveEdit(co)} disabled={saving} style={btnPrimary}>{saving ? '…' : 'שמור'}</button>
                          <button onClick={() => setEditId(null)} style={btnGhost}>ביטול</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Agreements tab */}
                {tab === 'agreements' && (
                  <div>
                    {agrs.length === 0 ? (
                      <div style={{ fontSize: 13, color: C.textMuted }}>אין הסכמים חתומים עדיין.</div>
                    ) : agrs.map(a => (
                      <div key={a.id} style={{ background: C.bg, borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary }}>{a.data?.company_name || '—'}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                          👤 {a.data?.signatory_name || '—'} &nbsp;·&nbsp; 📅 {a.data?.sign_date || fmtDate(a.created_at?.slice(0,10))}
                          {a.data?.id_number && ` · ח.פ/ת.ז: ${a.data.id_number}`}
                          {a.data?.email && ` · ${a.data.email}`}
                        </div>
                        {a.data?.signature && (
                          <img src={a.data.signature} alt="חתימה" style={{ marginTop: 8, maxWidth: 200, border: `1px solid ${C.border}`, borderRadius: 5, background: '#fff' }} />
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
    setSaving(null)
    onUpdate()
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
    setAdding(false)
    setShowAdd(false)
    setNewLead({ name: '', company_name: '', phone: '', email: '', fleet_size: '', message: '', status: 'new' })
    onUpdate()
  }

  const set = k => e => setNewLead(p => ({ ...p, [k]: e.target.value }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.textPrimary }}>💬 לידים</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." style={{ ...inp, width: 160 }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inp, width: 140, cursor: 'pointer' }}>
            <option value="all">כל הסטטוסים</option>
            {Object.entries(LEAD_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={() => setShowAdd(v => !v)} style={btnPrimary}>+ ליד חדש</button>
        </div>
      </div>

      {/* Add lead form */}
      {showAdd && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary, marginBottom: 14 }}>+ הוסף ליד ידנית</div>
          <form onSubmit={addManualLead} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>שם *</label><input style={inp} value={newLead.name} onChange={set('name')} required /></div>
              <div><label style={lbl}>חברה</label><input style={inp} value={newLead.company_name} onChange={set('company_name')} /></div>
              <div><label style={lbl}>טלפון</label><input style={inp} value={newLead.phone} onChange={set('phone')} /></div>
              <div><label style={lbl}>אימייל</label><input style={inp} type="email" value={newLead.email} onChange={set('email')} /></div>
              <div><label style={lbl}>גודל צי</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={newLead.fleet_size} onChange={set('fleet_size')}>
                  <option value="">בחר...</option>
                  <option value="1-10">עד 10</option><option value="10-50">10–50</option>
                  <option value="50-200">50–200</option><option value="200+">מעל 200</option>
                </select>
              </div>
              <div><label style={lbl}>סטטוס</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={newLead.status} onChange={set('status')}>
                  {Object.entries(LEAD_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div><label style={lbl}>הודעה / הערה</label><textarea style={{ ...inp, height: 70, resize: 'vertical' }} value={newLead.message} onChange={set('message')} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={adding} style={btnPrimary}>{adding ? '…' : 'הוסף'}</button>
              <button type="button" onClick={() => setShowAdd(false)} style={btnGhost}>ביטול</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 && <div style={{ ...card, textAlign: 'center', color: C.textMuted, padding: 40 }}>אין לידים תואמים</div>}

      {filtered.map(l => {
        const isOpen = expanded === l.id
        return (
          <div key={l.id} style={{ ...card, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : l.id)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary }}>{l.name}</span>
                  {l.company_name && <span style={{ fontSize: 12, color: C.textMuted }}>· {l.company_name}</span>}
                  <Badge meta={LEAD_STATUS_META[l.status]} />
                  {l.source === 'contact_form' && <span style={{ fontSize: 10, background: C.primary + '15', color: C.primary, borderRadius: 5, padding: '2px 7px', fontWeight: 700 }}>🌐 אתר</span>}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {l.phone && <span>📞 {l.phone}</span>}
                  {l.email && <span>✉ {l.email}</span>}
                  {l.fleet_size && <span>🚗 {l.fleet_size}</span>}
                  <span>📅 {fmtDate(l.created_at)}</span>
                </div>
              </div>
              <span style={{ color: C.textMuted, fontSize: 18, flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
            </div>

            {isOpen && (
              <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                {/* Change status */}
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>שנה סטטוס</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(LEAD_STATUS_META).map(([k, v]) => (
                      <button key={k} disabled={saving === l.id} onClick={() => updateStatus(l, k)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: l.status === k ? v.color : C.bg, color: l.status === k ? '#fff' : C.textSecondary }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                {l.message && (
                  <div style={{ background: C.bg, borderRadius: 7, padding: '10px 12px', fontSize: 13, color: C.textPrimary, marginBottom: 12, lineHeight: 1.6 }}>
                    📝 {l.message}
                  </div>
                )}

                {/* Notes */}
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>הערות</div>
                <NotesPanel entityType="lead" entityId={l.id} authorEmail={session.user.email} />

                {/* Contact quick actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {l.phone && <a href={`https://wa.me/972${l.phone.replace(/^0/, '').replace(/-/g, '')}`} target="_blank" rel="noreferrer" style={{ ...btnPrimary, background: '#25d366', textDecoration: 'none', fontSize: 12 }}>📲 WhatsApp</a>}
                  {l.email && <a href={`mailto:${l.email}`} style={{ ...btnPrimary, background: '#6366f1', textDecoration: 'none', fontSize: 12 }}>📧 שלח מייל</a>}
                  <button onClick={() => deleteLead(l.id)} style={{ ...btnGhost, color: C.danger, borderColor: C.danger + '40', fontSize: 12, marginInlineStart: 'auto' }}>🗑 מחק</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Agreements ────────────────────────────────────────────────────────────────
function AgreementsView({ agreements, companies, session, onUpdate }) {
  const [search,       setSearch]       = useState('')
  const [viewing,      setViewing]      = useState(null)
  const [sendCompany,        setSendCompany]        = useState('')
  const [sendNumCars,        setSendNumCars]        = useState('')
  const [sendNotes,          setSendNotes]          = useState('')
  const [sendPricePerCar,    setSendPricePerCar]    = useState('')
  const [sendFreeStorageGb,  setSendFreeStorageGb]  = useState('10')
  const [sendPriceExtraGb,   setSendPriceExtraGb]   = useState('')
  const [sendLink,           setSendLink]           = useState(null)
  const [sendBusy,           setSendBusy]           = useState(false)
  const [sendCopied,         setSendCopied]         = useState(false)
  const [sendError,          setSendError]          = useState('')

  const filtered = agreements.filter(a => {
    const q = search.toLowerCase()
    return !q || a.data?.company_name?.toLowerCase().includes(q) || a.data?.signatory_name?.toLowerCase().includes(q) || a.submitter_name?.toLowerCase().includes(q)
  })

  const getCompanyName = companyId => companies.find(c => c.id === companyId)?.name || '—'

  async function generateLink() {
    if (!sendCompany) return
    setSendBusy(true)
    setSendLink(null)
    setSendError('')
    const { data: existing, error: selErr } = await supabase.from('form_links')
      .select('*').eq('company_id', sendCompany).eq('type', 'license_agreement')
      .eq('is_active', true).is('expires_at', null).order('created_at', { ascending: false }).limit(1)
    if (selErr) { setSendError(selErr.message); setSendBusy(false); return }
    const agreementFields = {
      num_cars:         sendNumCars       ? parseInt(sendNumCars, 10)    : null,
      price_per_car:    sendPricePerCar   ? parseFloat(sendPricePerCar)  : null,
      free_storage_gb:  sendFreeStorageGb ? parseInt(sendFreeStorageGb, 10) : 10,
      price_extra_gb:   sendPriceExtraGb  ? parseFloat(sendPriceExtraGb) : null,
      notes:            sendNotes.trim() || null,
    }
    if (existing?.length) {
      const { data: updated } = await supabase.from('form_links').update({ fields: agreementFields }).eq('id', existing[0].id).select().single()
      setSendLink(updated || existing[0]); setSendBusy(false); return
    }
    const co = companies.find(c => c.id === sendCompany)
    const { data: newLink, error: insErr } = await supabase.from('form_links').insert({
      company_id: sendCompany, type: 'license_agreement',
      title: `הסכם רישיון — ${co?.name || ''}`,
      created_by: session.user.id, is_active: true, single_use: false,
      fields: agreementFields,
    }).select().single()
    if (insErr) { setSendError(insErr.message); setSendBusy(false); return }
    if (newLink) setSendLink(newLink)
    setSendBusy(false)
  }

  async function newLink() {
    if (!sendCompany) return
    setSendBusy(true)
    setSendError('')
    const co = companies.find(c => c.id === sendCompany)
    const agreementFields = {
      num_cars:         sendNumCars       ? parseInt(sendNumCars, 10)    : null,
      price_per_car:    sendPricePerCar   ? parseFloat(sendPricePerCar)  : null,
      free_storage_gb:  sendFreeStorageGb ? parseInt(sendFreeStorageGb, 10) : 10,
      price_extra_gb:   sendPriceExtraGb  ? parseFloat(sendPriceExtraGb) : null,
      notes:            sendNotes.trim() || null,
    }
    const { data: nl, error: insErr } = await supabase.from('form_links').insert({
      company_id: sendCompany, type: 'license_agreement',
      title: `הסכם רישיון — ${co?.name || ''}`,
      created_by: session.user.id, is_active: true, single_use: false,
      fields: agreementFields,
    }).select().single()
    if (insErr) { setSendError(insErr.message); setSendBusy(false); return }
    if (nl) setSendLink(nl)
    setSendBusy(false)
  }

  const linkUrl = sendLink ? `${window.location.origin}/form/${sendLink.token}` : ''

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, color: C.textPrimary, marginBottom: 16 }}>📄 הסכמים</div>

      {/* Send agreement section */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.textPrimary, marginBottom: 10 }}>📤 שלח הסכם רישיון ללקוח</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={lbl}>בחר חברה</label>
            <select value={sendCompany} onChange={e => { setSendCompany(e.target.value); setSendLink(null); setSendNumCars(''); setSendNotes(''); setSendPricePerCar(''); setSendFreeStorageGb('10'); setSendPriceExtraGb('') }} style={{ ...inp, cursor: 'pointer' }}>
              <option value="">בחר לקוח...</option>
              {companies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
            </select>
          </div>
          <div style={{ width: 110 }}>
            <label style={lbl}>מספר רכבים</label>
            <input type="number" min="0" value={sendNumCars} onChange={e => { setSendNumCars(e.target.value); setSendLink(null) }} placeholder="0" style={{ ...inp }} />
          </div>
          <div style={{ width: 120 }}>
            <label style={lbl}>מחיר לרכב (₪)</label>
            <input type="number" min="0" step="0.01" value={sendPricePerCar} onChange={e => { setSendPricePerCar(e.target.value); setSendLink(null) }} placeholder="0.00" style={{ ...inp }} />
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 12, marginBottom: 6 }}>אחסון</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ width: 140 }}>
            <label style={lbl}>אחסון חינם (GB)</label>
            <input type="number" min="0" value={sendFreeStorageGb} onChange={e => { setSendFreeStorageGb(e.target.value); setSendLink(null) }} placeholder="10" style={{ ...inp }} />
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>ברירת מחדל: 10 GB חינם</div>
          </div>
          <div style={{ width: 150 }}>
            <label style={lbl}>מחיר ל-GB נוסף (₪)</label>
            <input type="number" min="0" step="0.01" value={sendPriceExtraGb} onChange={e => { setSendPriceExtraGb(e.target.value); setSendLink(null) }} placeholder="0.00" style={{ ...inp }} />
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <label style={lbl}>הערות להסכם</label>
          <textarea value={sendNotes} onChange={e => { setSendNotes(e.target.value); setSendLink(null) }} placeholder="הערות שיופיעו בהסכם..." rows={2} style={{ ...inp, resize: 'none' }} />
        </div>
        <div style={{ marginTop: 8 }}>
          <button onClick={generateLink} disabled={!sendCompany || sendBusy} style={{ ...btnPrimary, opacity: !sendCompany || sendBusy ? 0.5 : 1, whiteSpace: 'nowrap' }}>
            {sendBusy ? '…' : '🔗 צור קישור'}
          </button>
        </div>

        {sendError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7, padding: '8px 12px', color: '#dc2626', fontSize: 12, marginTop: 8 }}>
            ⚠ {sendError}
          </div>
        )}

        {sendLink && (
          <div style={{ background: C.bg, borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <div style={{ fontSize: 12, color: C.textSecondary }}>שלח ללקוח לחתימה על הסכם הרישיון:</div>
            {(sendLink.fields?.num_cars || sendLink.fields?.price_per_car != null) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {sendLink.fields?.num_cars > 0 && (
                  <span style={{ fontSize: 11, background: C.primary + '15', color: C.primary, borderRadius: 5, padding: '2px 8px', fontWeight: 700 }}>
                    🚗 {sendLink.fields.num_cars} רכבים
                  </span>
                )}
                {sendLink.fields?.price_per_car != null && (
                  <span style={{ fontSize: 11, background: C.success + '15', color: C.success, borderRadius: 5, padding: '2px 8px', fontWeight: 700 }}>
                    ₪{sendLink.fields.price_per_car} לרכב
                  </span>
                )}
                <span style={{ fontSize: 11, background: '#f59e0b15', color: C.warning, borderRadius: 5, padding: '2px 8px', fontWeight: 700 }}>
                  💾 {sendLink.fields?.free_storage_gb ?? 10} GB חינם
                  {sendLink.fields?.price_extra_gb ? ` · ₪${sendLink.fields.price_extra_gb}/GB נוסף` : ''}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input readOnly value={linkUrl} onClick={e => e.target.select()}
                style={{ flex: 1, minWidth: 0, padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, background: C.surface, color: C.textPrimary, outline: 'none', direction: 'ltr' }} />
              <button onClick={() => { navigator.clipboard.writeText(linkUrl); setSendCopied(true); setTimeout(() => setSendCopied(false), 2000) }}
                style={{ ...btnPrimary, background: sendCopied ? C.success : C.primary, whiteSpace: 'nowrap', fontSize: 12 }}>
                {sendCopied ? '✓ הועתק' : 'העתק'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`שלום,\nמצורף קישור לחתימה על הסכם רישיון שימוש במערכת Celox AI Fleet Manager:\n${linkUrl}`)}`, '_blank')}
                style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                📲 WhatsApp
              </button>
              <button onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent('הסכם רישיון — Celox AI Fleet Manager')}&body=${encodeURIComponent(`שלום,\nקישור לחתימה:\n${linkUrl}`)}` }}
                style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                📧 אימייל
              </button>
              <button onClick={newLink} disabled={sendBusy} style={{ ...btnGhost, fontSize: 12 }}>+ קישור חדש</button>
            </div>
          </div>
        )}
      </div>

      {/* Signed agreements list */}
      <div style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        הסכמים חתומים
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." style={{ ...inp, width: 160, fontSize: 12, padding: '5px 10px', marginBottom: 0, fontWeight: 400, letterSpacing: 0, textTransform: 'none' }} />
      </div>

      {filtered.length === 0 && <div style={{ ...card, textAlign: 'center', color: C.textMuted, padding: 40 }}>אין הסכמים עדיין.</div>}

      {filtered.map(a => (
        <div key={a.id} style={{ ...card, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary }}>{a.data?.company_name || '—'}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                👤 {a.data?.signatory_name || '—'} &nbsp;·&nbsp;
                📅 {a.data?.sign_date || fmtDate(a.created_at?.slice(0, 10))} &nbsp;·&nbsp;
                🏢 {getCompanyName(a.company_id)}
                {a.data?.id_number && ` · ח.פ/ת.ז: ${a.data.id_number}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 10, background: C.success + '15', color: C.success, borderRadius: 5, padding: '2px 8px', fontWeight: 700 }}>✓ חתום</span>
              <button onClick={() => setViewing(viewing?.id === a.id ? null : a)} style={{ ...btnGhost, fontSize: 12 }}>צפה</button>
            </div>
          </div>

          {viewing?.id === a.id && (
            <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                {[
                  ['🏢 שם חברה', a.data?.company_name],
                  ['👤 חותם', a.data?.signatory_name],
                  ['💼 תפקיד', a.data?.signatory_role],
                  ['🪪 ח.פ / ת.ז.', a.data?.id_number],
                  ['📞 טלפון', a.data?.phone],
                  ['📧 אימייל', a.data?.email],
                  ['📅 תאריך', a.data?.sign_date],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ background: C.bg, borderRadius: 7, padding: '10px 12px' }}>
                    <div style={lbl}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{v}</div>
                  </div>
                ))}
              </div>
              {(a.form_links?.fields?.price_per_car != null || a.form_links?.fields?.free_storage_gb != null) && (
                <div style={{ marginBottom: 12 }}>
                  <div style={lbl}>תמחור</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {a.form_links.fields.num_cars > 0 && (
                      <span style={{ fontSize: 11, background: C.primary + '15', color: C.primary, borderRadius: 5, padding: '3px 10px', fontWeight: 700 }}>
                        🚗 {a.form_links.fields.num_cars} רכבים
                      </span>
                    )}
                    {a.form_links.fields.price_per_car != null && (
                      <span style={{ fontSize: 11, background: C.success + '15', color: C.success, borderRadius: 5, padding: '3px 10px', fontWeight: 700 }}>
                        ₪{a.form_links.fields.price_per_car} לרכב
                      </span>
                    )}
                    <span style={{ fontSize: 11, background: '#f59e0b15', color: C.warning, borderRadius: 5, padding: '3px 10px', fontWeight: 700 }}>
                      💾 {a.form_links.fields.free_storage_gb ?? 10} GB חינם
                      {a.form_links.fields.price_extra_gb ? ` · ₪${a.form_links.fields.price_extra_gb}/GB נוסף` : ''}
                    </span>
                  </div>
                </div>
              )}
              {a.data?.signature && (
                <div>
                  <div style={lbl}>חתימה דיגיטלית</div>
                  <img src={a.data.signature} alt="חתימה" style={{ maxWidth: 280, border: `1px solid ${C.border}`, borderRadius: 7, background: '#fff' }} />
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
    { id: 'dashboard',  icon: '📊', label: 'לוח בקרה' },
    { id: 'clients',    icon: '🏢', label: 'לקוחות' },
    { id: 'leads',      icon: '💬', label: 'לידים', badge: newLeadCount || null },
    { id: 'agreements', icon: '📄', label: 'הסכמים' },
  ]
  return (
    <div style={{ width: 220, background: C.sidebar, display: 'flex', flexDirection: 'column', padding: '20px 12px', gap: 3, flexShrink: 0, boxShadow: '2px 0 8px rgba(0,0,0,0.15)', direction: 'rtl' }}>
      <div style={{ padding: '4px 10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 8 }}>
        <div style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>Celox CRM</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>מערכת ניהול לקוחות</div>
      </div>
      {items.map(item => (
        <button key={item.id} onClick={() => setView(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'right', width: '100%', background: view === item.id ? C.primary + '25' : 'transparent', color: view === item.id ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: view === item.id ? 700 : 400, fontSize: 14, transition: 'background 0.15s', position: 'relative' }}>
          <span>{item.icon}</span>
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.badge && <span style={{ background: C.danger, color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.badge}</span>}
        </button>
      ))}
      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          ← חזור לאפליקציה
        </button>
      </div>
    </div>
  )
}

// ── CRM main export ───────────────────────────────────────────────────────────
export default function CRM({ session, onBack }) {
  const [view,       setView]       = useState('dashboard')
  const [companies,  setCompanies]  = useState([])
  const [leads,      setLeads]      = useState([])
  const [agreements, setAgreements] = useState([])
  const [loading,    setLoading]    = useState(true)
  const isMobile = useIsMobile()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [cosRes, ldsRes, agrsRes] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.from('crm_leads').select('*').order('created_at', { ascending: false }),
      supabase.from('form_submissions').select('*, form_links(fields)').eq('type', 'license_agreement').order('created_at', { ascending: false }),
    ])
    setCompanies(cosRes.data || [])
    setLeads(ldsRes.data || [])
    setAgreements(agrsRes.data || [])
    setLoading(false)
  }

  const NAV_ITEMS = [
    { id: 'dashboard',  icon: '📊', label: 'לוח בקרה' },
    { id: 'clients',    icon: '🏢', label: 'לקוחות' },
    { id: 'leads',      icon: '💬', label: 'לידים' },
    { id: 'agreements', icon: '📄', label: 'הסכמים' },
  ]

  if (loading) return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', alignItems: 'center', justifyContent: 'center', background: C.bg, direction: 'rtl' }}>
      <div style={{ textAlign: 'center', color: C.textMuted }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${C.primary}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        טוען נתוני CRM...
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', background: C.bg, direction: 'rtl', overflow: 'hidden' }}>
      {/* Sidebar — desktop only */}
      {!isMobile && (
        <CRMSidebar view={view} setView={setView} onBack={onBack} leads={leads} />
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar (mobile: shows title + back) */}
        {isMobile && (
          <div style={{ background: C.navBg, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer', padding: 0 }}>←</button>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>Celox CRM</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginInlineStart: 'auto' }}>
              {NAV_ITEMS.find(n => n.id === view)?.icon} {NAV_ITEMS.find(n => n.id === view)?.label}
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 12px 80px' : '24px 28px' }}>
          {view === 'dashboard'  && <DashboardView  companies={companies} leads={leads} agreements={agreements} />}
          {view === 'clients'    && <ClientsView    companies={companies} agreements={agreements} session={session} onUpdate={loadAll} />}
          {view === 'leads'      && <LeadsView      leads={leads} session={session} onUpdate={loadAll} />}
          {view === 'agreements' && <AgreementsView agreements={agreements} companies={companies} session={session} onUpdate={loadAll} />}
        </div>
      </div>

      {/* Bottom tabs — mobile only */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.navBg, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', zIndex: 100 }}>
          {NAV_ITEMS.map(item => {
            const badge = item.id === 'leads' ? leads.filter(l => l.status === 'new').length : 0
            return (
              <button key={item.id} onClick={() => setView(item.id)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative' }}>
                {badge > 0 && <span style={{ position: 'absolute', top: 6, right: '50%', marginRight: -14, background: C.danger, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>}
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontSize: 10, color: view === item.id ? C.primary : 'rgba(255,255,255,0.45)', fontWeight: view === item.id ? 700 : 400 }}>{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
