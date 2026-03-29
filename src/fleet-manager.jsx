import { supabase } from './supabaseClient'
import { useState, useEffect } from 'react'

// ── Design tokens ───────────────────────────────────────────────────────────
const C = {
  sidebarBg:         '#1f3a5f',
  sidebarActive:     '#2d5086',
  sidebarText:       '#c3d4e8',
  sidebarActiveText: '#ffffff',
  primary:           '#0073ea',
  primaryHover:      '#0060c0',
  bg:                '#f6f7fb',
  surface:           '#ffffff',
  border:            '#e6e9ef',
  textPrimary:       '#323338',
  textSecondary:     '#676879',
  textMuted:         '#9699a6',
  success:           '#00c875',
  danger:            '#e2445c',
  warning:           '#fdab3d',
}

const BRANCH_COLORS = ['#0073ea','#00c875','#fdab3d','#a25ddc','#e2445c','#579bfc','#ff7575','#03c4a1']
const branchColor = idx => BRANCH_COLORS[Math.max(idx, 0) % BRANCH_COLORS.length]

// ── Translations ────────────────────────────────────────────────────────────
const T = {
  en: {
    appName:        'Fleet Manager',
    workspace:      'WORKSPACE',
    boards:         'BOARDS',
    fleet:          'Fleet',
    drivers:        'Drivers',
    branches:       'Branches',
    overview:       'OVERVIEW',
    cars:           'Cars',
    search:         'Search…',
    newItem:        '+ New Item',
    allVehicles:    'All Vehicles',
    allDrivers:     'All Drivers',
    allBranches:    'All Branches',
    plate:          'Plate Number',
    model:          'Model',
    branch:         'Branch',
    actions:        'Actions',
    name:           'Name',
    license:        'License',
    branchName:     'Branch Name',
    location:       'Location',
    edit:           'Edit',
    delete:         'Delete',
    save:           'Save',
    cancel:         'Cancel',
    add:            'Add',
    addItem:        'Add item',
    noBranch:       'No branch',
    noCars:         'No vehicles found. Click + New Item to add one.',
    noDrivers:      'No drivers found. Click + New Item to add one.',
    noBranches:     'No branches found. Click + New Item to add one.',
    loading:        'Loading your workspace…',
    platePlaceholder:   'Plate number',
    modelPlaceholder:   'Model',
    driverPlaceholder:  'Driver name',
    licensePlaceholder: 'License number',
    branchPlaceholder:  'Branch name',
    locationPlaceholder:'Location',
  },
  he: {
    appName:        'מנהל הצי',
    workspace:      'סביבת עבודה',
    boards:         'לוחות',
    fleet:          'צי רכבים',
    drivers:        'נהגים',
    branches:       'סניפים',
    overview:       'סקירה',
    cars:           'רכבים',
    search:         '…חיפוש',
    newItem:        '+ פריט חדש',
    allVehicles:    'כל הרכבים',
    allDrivers:     'כל הנהגים',
    allBranches:    'כל הסניפים',
    plate:          'מספר לוחית',
    model:          'דגם',
    branch:         'סניף',
    actions:        'פעולות',
    name:           'שם',
    license:        'רישיון',
    branchName:     'שם סניף',
    location:       'מיקום',
    edit:           'עריכה',
    delete:         'מחיקה',
    save:           'שמור',
    cancel:         'ביטול',
    add:            'הוסף',
    addItem:        'הוסף פריט',
    noBranch:       'ללא סניף',
    noCars:         '.לא נמצאו רכבים. לחץ על + פריט חדש להוספה',
    noDrivers:      '.לא נמצאו נהגים. לחץ על + פריט חדש להוספה',
    noBranches:     '.לא נמצאו סניפים. לחץ על + פריט חדש להוספה',
    loading:        '…טוען את סביבת העבודה',
    platePlaceholder:   'מספר לוחית',
    modelPlaceholder:   'דגם',
    driverPlaceholder:  'שם נהג',
    licensePlaceholder: 'מספר רישיון',
    branchPlaceholder:  'שם סניף',
    locationPlaceholder:'מיקום',
  },
}

// ── Shared style atoms ──────────────────────────────────────────────────────
const thStyle = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: 12,
  fontWeight: 600,
  color: C.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: `1px solid ${C.border}`,
  background: '#f8f9fb',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '10px 16px',
  fontSize: 14,
  color: C.textPrimary,
  borderBottom: `1px solid ${C.border}`,
  verticalAlign: 'middle',
}

const inlineInput = {
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 14,
  color: C.textPrimary,
  background: C.surface,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

// ── Sub-components ──────────────────────────────────────────────────────────
function Badge({ label, color }) {
  return (
    <span style={{
      display: 'inline-block',
      background: color + '22', color,
      border: `1px solid ${color}44`,
      borderRadius: 20, padding: '2px 10px',
      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function ActionBtn({ onClick, variant, children }) {
  const variants = {
    edit:   { background: C.primary + '18', color: C.primary },
    save:   { background: C.success + '22', color: '#007a45' },
    cancel: { background: C.bg, color: C.textSecondary },
    delete: { background: C.danger + '18', color: C.danger },
  }
  return (
    <button onClick={onClick} style={{
      border: 'none', borderRadius: 6, padding: '5px 10px',
      fontSize: 12, fontWeight: 600, cursor: 'pointer',
      ...variants[variant],
    }}>{children}</button>
  )
}

// ── Row components ──────────────────────────────────────────────────────────
function CarRow({ car, branches, getBranchName, getBranchIdx, onEdit, onDelete, t }) {
  const [hover, setHover] = useState(false)
  const bIdx = getBranchIdx(car.branch_id)
  const bName = getBranchName(car.branch_id)
  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? '#f0f6ff' : C.surface, transition: 'background 0.1s' }}>
      <td style={{ ...tdStyle, fontWeight: 600 }}>{car.plate}</td>
      <td style={tdStyle}>{car.model}</td>
      <td style={tdStyle}>
        {bName !== '—' ? <Badge label={bName} color={branchColor(bIdx)} /> : <span style={{ color: C.textMuted }}>—</span>}
      </td>
      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6 }}>
          <ActionBtn variant="edit" onClick={onEdit}>{t.edit}</ActionBtn>
          <ActionBtn variant="delete" onClick={onDelete}>{t.delete}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

function EditableCarRow({ car, branches, onSave, onCancel, t }) {
  const [form, setForm] = useState({ ...car })
  return (
    <tr style={{ background: '#f0f6ff' }}>
      <td style={tdStyle}><input value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} style={inlineInput} /></td>
      <td style={tdStyle}><input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} style={inlineInput} /></td>
      <td style={tdStyle}>
        <select value={form.branch_id || ''} onChange={e => setForm({ ...form, branch_id: e.target.value })} style={inlineInput}>
          <option value="">{t.noBranch}</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </td>
      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6 }}>
          <ActionBtn variant="save" onClick={() => onSave(form)}>{t.save}</ActionBtn>
          <ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

function DriverRow({ driver, branches, getBranchName, getBranchIdx, onEdit, onDelete, t }) {
  const [hover, setHover] = useState(false)
  const bIdx = getBranchIdx(driver.branch_id)
  const bName = getBranchName(driver.branch_id)
  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? '#f0f6ff' : C.surface, transition: 'background 0.1s' }}>
      <td style={{ ...tdStyle, fontWeight: 600 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 28, height: 28, borderRadius: '50%',
            background: C.primary, color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>{driver.name?.charAt(0)?.toUpperCase() || '?'}</span>
          {driver.name}
        </span>
      </td>
      <td style={tdStyle}><Badge label={driver.license} color={C.warning} /></td>
      <td style={tdStyle}>
        {bName !== '—' ? <Badge label={bName} color={branchColor(bIdx)} /> : <span style={{ color: C.textMuted }}>—</span>}
      </td>
      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6 }}>
          <ActionBtn variant="edit" onClick={onEdit}>{t.edit}</ActionBtn>
          <ActionBtn variant="delete" onClick={onDelete}>{t.delete}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

function EditableDriverRow({ driver, branches, onSave, onCancel, t }) {
  const [form, setForm] = useState({ ...driver })
  return (
    <tr style={{ background: '#f0f6ff' }}>
      <td style={tdStyle}><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inlineInput} /></td>
      <td style={tdStyle}><input value={form.license} onChange={e => setForm({ ...form, license: e.target.value })} style={inlineInput} /></td>
      <td style={tdStyle}>
        <select value={form.branch_id || ''} onChange={e => setForm({ ...form, branch_id: e.target.value })} style={inlineInput}>
          <option value="">{t.noBranch}</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </td>
      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6 }}>
          <ActionBtn variant="save" onClick={() => onSave(form)}>{t.save}</ActionBtn>
          <ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

function BranchRow({ branch, index, onEdit, onDelete, t }) {
  const [hover, setHover] = useState(false)
  const color = branchColor(index)
  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? '#f0f6ff' : C.surface, transition: 'background 0.1s' }}>
      <td style={{ ...tdStyle, fontWeight: 600 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
          {branch.name}
        </span>
      </td>
      <td style={tdStyle}>{branch.location}</td>
      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6 }}>
          <ActionBtn variant="edit" onClick={onEdit}>{t.edit}</ActionBtn>
          <ActionBtn variant="delete" onClick={onDelete}>{t.delete}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

function EditableBranchRow({ branch, onSave, onCancel, t }) {
  const [form, setForm] = useState({ ...branch })
  return (
    <tr style={{ background: '#f0f6ff' }}>
      <td style={tdStyle}><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inlineInput} /></td>
      <td style={tdStyle}><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={inlineInput} /></td>
      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6 }}>
          <ActionBtn variant="save" onClick={() => onSave(form)}>{t.save}</ActionBtn>
          <ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

// ── Add-item inline rows ────────────────────────────────────────────────────
function AddCarRow({ branches, onAdd, onCancel, t }) {
  const [form, setForm] = useState({ plate: '', model: '', branch_id: '' })
  function submit() {
    if (!form.plate.trim() || !form.model.trim()) return
    onAdd(form)
  }
  return (
    <tr style={{ background: '#eef4ff' }}>
      <td style={tdStyle}><input autoFocus placeholder={t.platePlaceholder} value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} style={inlineInput} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={tdStyle}><input placeholder={t.modelPlaceholder} value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} style={inlineInput} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={tdStyle}>
        <select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })} style={inlineInput}>
          <option value="">{t.noBranch}</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </td>
      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6 }}>
          <ActionBtn variant="save" onClick={submit}>{t.add}</ActionBtn>
          <ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

function AddDriverRow({ branches, onAdd, onCancel, t }) {
  const [form, setForm] = useState({ name: '', license: '', branch_id: '' })
  function submit() {
    if (!form.name.trim() || !form.license.trim()) return
    onAdd(form)
  }
  return (
    <tr style={{ background: '#eef4ff' }}>
      <td style={tdStyle}><input autoFocus placeholder={t.driverPlaceholder} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inlineInput} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={tdStyle}><input placeholder={t.licensePlaceholder} value={form.license} onChange={e => setForm({ ...form, license: e.target.value })} style={inlineInput} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={tdStyle}>
        <select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })} style={inlineInput}>
          <option value="">{t.noBranch}</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </td>
      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6 }}>
          <ActionBtn variant="save" onClick={submit}>{t.add}</ActionBtn>
          <ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

function AddBranchRow({ onAdd, onCancel, t }) {
  const [form, setForm] = useState({ name: '', location: '' })
  function submit() {
    if (!form.name.trim() || !form.location.trim()) return
    onAdd(form)
  }
  return (
    <tr style={{ background: '#eef4ff' }}>
      <td style={tdStyle}><input autoFocus placeholder={t.branchPlaceholder} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inlineInput} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={tdStyle}><input placeholder={t.locationPlaceholder} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={inlineInput} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6 }}>
          <ActionBtn variant="save" onClick={submit}>{t.add}</ActionBtn>
          <ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

// ── Language toggle button ──────────────────────────────────────────────────
function LangToggle({ lang, setLang }) {
  return (
    <div style={{
      display: 'flex', borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.2)',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {['en', 'he'].map(l => (
        <button key={l} onClick={() => setLang(l)} style={{
          padding: '5px 12px', border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
          background: lang === l ? 'rgba(255,255,255,0.2)' : 'transparent',
          color: lang === l ? '#fff' : 'rgba(255,255,255,0.5)',
          transition: 'all 0.15s',
        }}>
          {l === 'en' ? 'EN' : 'עב'}
        </button>
      ))}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
function FleetManager() {
  const [branches, setBranches]   = useState([])
  const [drivers, setDrivers]     = useState([])
  const [cars, setCars]           = useState([])
  const [activeTab, setActiveTab] = useState('cars')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [search, setSearch]       = useState('')
  const [lang, setLang]           = useState('en')

  const t   = T[lang]
  const rtl = lang === 'he'
  const dir = rtl ? 'rtl' : 'ltr'

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: b }, { data: d }, { data: c }] = await Promise.all([
      supabase.from('branches').select('*').order('created_at'),
      supabase.from('drivers').select('*').order('created_at'),
      supabase.from('cars').select('*').order('created_at'),
    ])
    if (b) setBranches(b)
    if (d) setDrivers(d)
    if (c) setCars(c)
    setLoading(false)
  }

  async function addCar(form) {
    const { data } = await supabase.from('cars').insert([form]).select()
    if (data) setCars(prev => [...prev, data[0]])
    setShowAdd(false)
  }
  async function updateCar(form) {
    await supabase.from('cars').update(form).eq('id', form.id)
    setCars(prev => prev.map(c => c.id === form.id ? form : c))
    setEditingId(null)
  }
  async function deleteCar(id) {
    await supabase.from('cars').delete().eq('id', id)
    setCars(prev => prev.filter(c => c.id !== id))
  }

  async function addDriver(form) {
    const { data } = await supabase.from('drivers').insert([form]).select()
    if (data) setDrivers(prev => [...prev, data[0]])
    setShowAdd(false)
  }
  async function updateDriver(form) {
    await supabase.from('drivers').update(form).eq('id', form.id)
    setDrivers(prev => prev.map(d => d.id === form.id ? form : d))
    setEditingId(null)
  }
  async function deleteDriver(id) {
    await supabase.from('drivers').delete().eq('id', id)
    setDrivers(prev => prev.filter(d => d.id !== id))
  }

  async function addBranch(form) {
    const { data } = await supabase.from('branches').insert([form]).select()
    if (data) setBranches(prev => [...prev, data[0]])
    setShowAdd(false)
  }
  async function updateBranch(form) {
    await supabase.from('branches').update(form).eq('id', form.id)
    setBranches(prev => prev.map(b => b.id === form.id ? form : b))
    setEditingId(null)
  }
  async function deleteBranch(id) {
    await supabase.from('branches').delete().eq('id', id)
    setBranches(prev => prev.filter(b => b.id !== id))
  }

  function getBranchName(id) { return branches.find(b => b.id === id)?.name || '—' }
  function getBranchIdx(id)  { return branches.findIndex(b => b.id === id) }

  function switchTab(tab) {
    setActiveTab(tab)
    setEditingId(null)
    setShowAdd(false)
    setSearch('')
  }

  const q = search.toLowerCase()
  const filteredCars     = cars.filter(c     => c.plate?.toLowerCase().includes(q) || c.model?.toLowerCase().includes(q) || getBranchName(c.branch_id).toLowerCase().includes(q))
  const filteredDrivers  = drivers.filter(d  => d.name?.toLowerCase().includes(q)  || d.license?.toLowerCase().includes(q)  || getBranchName(d.branch_id).toLowerCase().includes(q))
  const filteredBranches = branches.filter(b => b.name?.toLowerCase().includes(q)  || b.location?.toLowerCase().includes(q))

  const tabs = [
    { id: 'cars',     label: t.fleet,    icon: '🚗', count: cars.length },
    { id: 'drivers',  label: t.drivers,  icon: '👤', count: drivers.length },
    { id: 'branches', label: t.branches, icon: '🏢', count: branches.length },
  ]

  const boardLabel    = activeTab === 'cars' ? t.allVehicles : activeTab === 'drivers' ? t.allDrivers : t.allBranches
  const currentCount  = activeTab === 'cars' ? filteredCars.length : activeTab === 'drivers' ? filteredDrivers.length : filteredBranches.length
  const thAlignStyle  = { ...thStyle, textAlign: rtl ? 'right' : 'left' }
  const tdAlignStyle  = { ...tdStyle, textAlign: rtl ? 'right' : 'left' }

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: C.bg, width: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${C.primary}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: C.textSecondary, margin: 0, fontSize: 14 }}>{t.loading}</p>
      </div>
    </div>
  )

  return (
    <div dir={dir} style={{ display: 'flex', height: '100vh', width: '100%', fontFamily: "'Figtree','Roboto',system-ui,sans-serif", background: C.bg, overflow: 'hidden' }}>

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside style={{ width: 240, background: C.sidebarBg, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Logo + lang toggle */}
        <div style={{ padding: '18px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: `linear-gradient(135deg, ${C.primary}, #a25ddc)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,115,234,0.4)',
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>F</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{t.appName}</p>
              <p style={{ margin: 0, color: C.sidebarText, fontSize: 11 }}>{t.workspace}</p>
            </div>
          </div>
          <LangToggle lang={lang} setLang={setLang} />
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1 }}>
          <p style={{ color: C.sidebarText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', margin: '0 0 6px' }}>{t.boards}</p>
          {tabs.map(item => (
            <button key={item.id} onClick={() => switchTab(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '9px 12px',
              borderRadius: 6, border: 'none', cursor: 'pointer',
              marginBottom: 2, textAlign: rtl ? 'right' : 'left',
              background: activeTab === item.id ? C.sidebarActive : 'transparent',
              color: activeTab === item.id ? C.sidebarActiveText : C.sidebarText,
              transition: 'background 0.15s',
              flexDirection: rtl ? 'row-reverse' : 'row',
            }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: activeTab === item.id ? 600 : 400 }}>{item.label}</span>
              <span style={{
                background: 'rgba(255,255,255,0.15)',
                color: activeTab === item.id ? '#fff' : C.sidebarText,
                borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
              }}>{item.count}</span>
            </button>
          ))}
        </nav>

        {/* Stats */}
        <div style={{ padding: '12px 14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 10px' }}>
            <p style={{ color: C.sidebarText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px', textAlign: 'center' }}>{t.overview}</p>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              {[[t.cars, cars.length], [t.drivers, drivers.length], [t.branches, branches.length]].map(([label, n]) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 20, margin: 0, lineHeight: 1 }}>{n}</p>
                  <p style={{ color: C.sidebarText, fontSize: 10, margin: '3px 0 0' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: '0 24px', height: 60,
          display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          flexDirection: rtl ? 'row-reverse' : 'row',
        }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.textPrimary, flex: 1 }}>
            {tabs.find(tab => tab.id === activeTab)?.icon}{' '}
            {tabs.find(tab => tab.id === activeTab)?.label}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', width: 220, flexDirection: rtl ? 'row-reverse' : 'row' }}>
            <span style={{ fontSize: 13, color: C.textMuted }}>🔍</span>
            <input placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: C.textPrimary, width: '100%', textAlign: rtl ? 'right' : 'left' }} />
          </div>
          <button onClick={() => { setShowAdd(true); setEditingId(null) }} style={{
            background: C.primary, color: '#fff', border: 'none',
            borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            boxShadow: '0 2px 8px rgba(0,115,234,0.35)', transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = C.primaryHover}
            onMouseLeave={e => e.currentTarget.style.background = C.primary}>
            {t.newItem}
          </button>
        </header>

        {/* Board */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div style={{ background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', animation: 'fadeIn 0.2s ease' }}>

            {/* Group header */}
            <div style={{ background: C.primary, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, flexDirection: rtl ? 'row-reverse' : 'row' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{boardLabel}</span>
              <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{currentCount}</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {activeTab === 'cars' && <>
                    <th style={thAlignStyle}>{t.plate}</th>
                    <th style={thAlignStyle}>{t.model}</th>
                    <th style={thAlignStyle}>{t.branch}</th>
                    <th style={{ ...thAlignStyle, width: 140 }}>{t.actions}</th>
                  </>}
                  {activeTab === 'drivers' && <>
                    <th style={thAlignStyle}>{t.name}</th>
                    <th style={thAlignStyle}>{t.license}</th>
                    <th style={thAlignStyle}>{t.branch}</th>
                    <th style={{ ...thAlignStyle, width: 140 }}>{t.actions}</th>
                  </>}
                  {activeTab === 'branches' && <>
                    <th style={thAlignStyle}>{t.branchName}</th>
                    <th style={thAlignStyle}>{t.location}</th>
                    <th style={{ ...thAlignStyle, width: 140 }}>{t.actions}</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {activeTab === 'cars' && filteredCars.map(car =>
                  editingId === car.id
                    ? <EditableCarRow key={car.id} car={car} branches={branches} onSave={updateCar} onCancel={() => setEditingId(null)} t={t} />
                    : <CarRow key={car.id} car={car} branches={branches} getBranchName={getBranchName} getBranchIdx={getBranchIdx} onEdit={() => setEditingId(car.id)} onDelete={() => deleteCar(car.id)} t={t} />
                )}
                {activeTab === 'cars' && filteredCars.length === 0 && !showAdd && (
                  <tr><td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>{t.noCars}</td></tr>
                )}
                {activeTab === 'cars' && showAdd && <AddCarRow branches={branches} onAdd={addCar} onCancel={() => setShowAdd(false)} t={t} />}

                {activeTab === 'drivers' && filteredDrivers.map(driver =>
                  editingId === driver.id
                    ? <EditableDriverRow key={driver.id} driver={driver} branches={branches} onSave={updateDriver} onCancel={() => setEditingId(null)} t={t} />
                    : <DriverRow key={driver.id} driver={driver} branches={branches} getBranchName={getBranchName} getBranchIdx={getBranchIdx} onEdit={() => setEditingId(driver.id)} onDelete={() => deleteDriver(driver.id)} t={t} />
                )}
                {activeTab === 'drivers' && filteredDrivers.length === 0 && !showAdd && (
                  <tr><td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>{t.noDrivers}</td></tr>
                )}
                {activeTab === 'drivers' && showAdd && <AddDriverRow branches={branches} onAdd={addDriver} onCancel={() => setShowAdd(false)} t={t} />}

                {activeTab === 'branches' && filteredBranches.map((branch, i) =>
                  editingId === branch.id
                    ? <EditableBranchRow key={branch.id} branch={branch} onSave={updateBranch} onCancel={() => setEditingId(null)} t={t} />
                    : <BranchRow key={branch.id} branch={branch} index={i} onEdit={() => setEditingId(branch.id)} onDelete={() => deleteBranch(branch.id)} t={t} />
                )}
                {activeTab === 'branches' && filteredBranches.length === 0 && !showAdd && (
                  <tr><td colSpan={3} style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>{t.noBranches}</td></tr>
                )}
                {activeTab === 'branches' && showAdd && <AddBranchRow onAdd={addBranch} onCancel={() => setShowAdd(false)} t={t} />}
              </tbody>
            </table>

            {/* Footer */}
            <div style={{ padding: '8px 18px', borderTop: `1px solid ${C.border}`, background: '#fafbfc' }}>
              <button onClick={() => { setShowAdd(true); setEditingId(null) }} style={{
                background: 'transparent', border: 'none', color: C.textSecondary,
                cursor: 'pointer', fontSize: 13, padding: '4px 0',
                display: 'flex', alignItems: 'center', gap: 6,
                flexDirection: rtl ? 'row-reverse' : 'row',
              }}>
                <span style={{ fontSize: 16, color: C.primary, fontWeight: 700 }}>+</span>
                {t.addItem}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default FleetManager
