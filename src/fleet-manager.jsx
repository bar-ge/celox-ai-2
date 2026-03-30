import { supabase } from './supabaseClient'
import { useState, useEffect } from 'react'

// ── Design tokens ───────────────────────────────────────────────────────────
const C = {
  navBg:        '#1f3a5f',
  navBorder:    'rgba(255,255,255,0.08)',
  navText:      '#c3d4e8',
  navActive:    '#ffffff',
  navActiveBg:  'rgba(255,255,255,0.15)',
  primary:      '#0073ea',
  primaryHover: '#0060c0',
  bg:           '#f6f7fb',
  surface:      '#ffffff',
  border:       '#e6e9ef',
  textPrimary:  '#323338',
  textSecondary:'#676879',
  textMuted:    '#9699a6',
  success:      '#00c875',
  danger:       '#e2445c',
  warning:      '#fdab3d',
}

const BRANCH_COLORS = ['#0073ea','#00c875','#fdab3d','#a25ddc','#e2445c','#579bfc','#ff7575','#03c4a1']
const branchColor = idx => BRANCH_COLORS[Math.max(idx, 0) % BRANCH_COLORS.length]

// ── Translations ────────────────────────────────────────────────────────────
const T = {
  en: {
    appName:'Fleet Manager', dashboard:'Dashboard', fleet:'Fleet', drivers:'Drivers', branches:'Branches', cars:'Cars',
    totalFleet:'Total Vehicles', totalDrivers:'Total Drivers', totalBranches:'Total Branches', unassigned:'Unassigned Vehicles',
    carsByBranch:'Vehicles by Branch', driversByBranch:'Drivers by Branch', topModels:'Top Vehicle Models', branchOverview:'Branch Overview', noData:'No data yet.',
    search:'Search…', newItem:'+ New Item', allVehicles:'All Vehicles', allDrivers:'All Drivers', allBranches:'All Branches',
    actions:'Actions', edit:'Edit', delete:'Delete', save:'Save', cancel:'Cancel', add:'Add', addItem:'Add item',
    // cars
    plate:'Plate', make:'Make', model:'Model', year:'Year', status:'Status', fuel:'Fuel', mileage:'Mileage', branch:'Branch',
    available:'Available', inUse:'In Use', maintenance:'Maintenance',
    petrol:'Petrol', diesel:'Diesel', electric:'Electric', hybrid:'Hybrid',
    // drivers
    name:'Name', license:'License', phone:'Phone', driverStatus:'Status', active:'Active', inactive:'Inactive',
    // branches
    branchName:'Branch Name', city:'City', address:'Address', manager:'Manager',
    noBranch:'No branch', noDriver:'No driver',
    noCars:'No vehicles found. Click + New Item to add one.',
    noDrivers:'No drivers found. Click + New Item to add one.',
    noBranches:'No branches found. Click + New Item to add one.',
    loading:'Loading your workspace…',
  },
  he: {
    appName:'מנהל הצי', dashboard:'לוח בקרה', fleet:'צי רכבים', drivers:'נהגים', branches:'סניפים', cars:'רכבים',
    totalFleet:'סה"כ רכבים', totalDrivers:'סה"כ נהגים', totalBranches:'סה"כ סניפים', unassigned:'רכבים ללא סניף',
    carsByBranch:'רכבים לפי סניף', driversByBranch:'נהגים לפי סניף', topModels:'דגמי רכב מובילים', branchOverview:'סקירת סניפים', noData:'אין נתונים עדיין.',
    search:'חיפוש…', newItem:'+ פריט חדש', allVehicles:'כל הרכבים', allDrivers:'כל הנהגים', allBranches:'כל הסניפים',
    actions:'פעולות', edit:'עריכה', delete:'מחיקה', save:'שמור', cancel:'ביטול', add:'הוסף', addItem:'הוסף פריט',
    // cars
    plate:'לוחית', make:'יצרן', model:'דגם', year:'שנה', status:'סטטוס', fuel:'דלק', mileage:'ק"מ', branch:'סניף',
    available:'פנוי', inUse:'בשימוש', maintenance:'תחזוקה',
    petrol:'בנזין', diesel:'דיזל', electric:'חשמלי', hybrid:'היברידי',
    // drivers
    name:'שם', license:'רישיון', phone:'טלפון', driverStatus:'סטטוס', active:'פעיל', inactive:'לא פעיל',
    // branches
    branchName:'שם סניף', city:'עיר', address:'כתובת', manager:'מנהל',
    noBranch:'ללא סניף', noDriver:'ללא נהג',
    noCars:'לא נמצאו רכבים. לחץ על + פריט חדש להוספה.',
    noDrivers:'לא נמצאו נהגים. לחץ על + פריט חדש להוספה.',
    noBranches:'לא נמצאו סניפים. לחץ על + פריט חדש להוספה.',
    loading:'טוען את סביבת העבודה…',
  },
}

// ── Shared table style atoms ────────────────────────────────────────────────
const mkTh = (rtl) => ({
  padding: '10px 16px',
  fontSize: 12,
  fontWeight: 600,
  color: C.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: `1px solid ${C.border}`,
  background: '#f8f9fb',
  whiteSpace: 'nowrap',
  textAlign: rtl ? 'right' : 'left',
})

const mkTd = (rtl) => ({
  padding: '10px 16px',
  fontSize: 14,
  color: C.textPrimary,
  borderBottom: `1px solid ${C.border}`,
  verticalAlign: 'middle',
  textAlign: rtl ? 'right' : 'left',
})

const inlineInput = (rtl) => ({
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 14,
  color: C.textPrimary,
  background: C.surface,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  direction: rtl ? 'rtl' : 'ltr',
  textAlign: rtl ? 'right' : 'left',
})

// ── Badge ───────────────────────────────────────────────────────────────────
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

// ── Action button ───────────────────────────────────────────────────────────
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
      fontSize: 12, fontWeight: 600, cursor: 'pointer', ...variants[variant],
    }}>{children}</button>
  )
}

// ── Status badge helpers ────────────────────────────────────────────────────
const CAR_STATUS_COLOR   = { Available: C.success, 'In Use': C.primary, Maintenance: C.warning }
const DRIVER_STATUS_COLOR = { Active: C.success, Inactive: C.textMuted }

// ── Data rows ───────────────────────────────────────────────────────────────
function CarRow({ car, getBranchName, getBranchIdx, onEdit, onDelete, t, rtl }) {
  const [hover, setHover] = useState(false)
  const td = mkTd(rtl)
  const statusColor = CAR_STATUS_COLOR[car.status] || C.textMuted
  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? '#f0f6ff' : C.surface, transition: 'background 0.1s' }}>
      <td style={{ ...td, fontWeight: 600 }}>{car.plate}</td>
      <td style={td}>{car.make} {car.model}</td>
      <td style={td}>{car.year || '—'}</td>
      <td style={td}><Badge label={car.status || 'Available'} color={statusColor} /></td>
      <td style={td}>{car.fuel || '—'}</td>
      <td style={td}>
        {getBranchName(car.branch_id) !== '—'
          ? <Badge label={getBranchName(car.branch_id)} color={branchColor(getBranchIdx(car.branch_id))} />
          : <span style={{ color: C.textMuted }}>—</span>}
      </td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6, justifyContent: rtl ? 'flex-end' : 'flex-start' }}>
          <ActionBtn variant="edit" onClick={onEdit}>{t.edit}</ActionBtn>
          <ActionBtn variant="delete" onClick={onDelete}>{t.delete}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

function EditableCarRow({ car, branches, onSave, onCancel, t, rtl }) {
  const [form, setForm] = useState({ ...car })
  const td = mkTd(rtl)
  const inp = inlineInput(rtl)
  return (
    <tr style={{ background: '#f0f6ff' }}>
      <td style={td}><input value={form.plate || ''} placeholder={t.plate} onChange={e => setForm({ ...form, plate: e.target.value })} style={inp} /></td>
      <td style={td}>
        <div style={{ display: 'flex', gap: 4 }}>
          <input value={form.make || ''} placeholder={t.make} onChange={e => setForm({ ...form, make: e.target.value })} style={{ ...inp, width: '50%' }} />
          <input value={form.model || ''} placeholder={t.model} onChange={e => setForm({ ...form, model: e.target.value })} style={{ ...inp, width: '50%' }} />
        </div>
      </td>
      <td style={td}><input type="number" value={form.year || ''} placeholder={t.year} onChange={e => setForm({ ...form, year: e.target.value })} style={inp} /></td>
      <td style={td}>
        <select value={form.status || 'Available'} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
          <option value="Available">{t.available}</option>
          <option value="In Use">{t.inUse}</option>
          <option value="Maintenance">{t.maintenance}</option>
        </select>
      </td>
      <td style={td}>
        <select value={form.fuel || 'Petrol'} onChange={e => setForm({ ...form, fuel: e.target.value })} style={inp}>
          <option value="Petrol">{t.petrol}</option>
          <option value="Diesel">{t.diesel}</option>
          <option value="Electric">{t.electric}</option>
          <option value="Hybrid">{t.hybrid}</option>
        </select>
      </td>
      <td style={td}>
        <select value={form.branch_id || ''} onChange={e => setForm({ ...form, branch_id: e.target.value })} style={inp}>
          <option value="">{t.noBranch}</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6 }}>
          <ActionBtn variant="save" onClick={() => onSave(form)}>{t.save}</ActionBtn>
          <ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

function DriverRow({ driver, getBranchName, getBranchIdx, onEdit, onDelete, t, rtl }) {
  const [hover, setHover] = useState(false)
  const td = mkTd(rtl)
  const statusColor = DRIVER_STATUS_COLOR[driver.status] || C.success
  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? '#f0f6ff' : C.surface, transition: 'background 0.1s' }}>
      <td style={{ ...td, fontWeight: 600 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: rtl ? 'row-reverse' : 'row', justifyContent: rtl ? 'flex-end' : 'flex-start' }}>
          <span style={{ width: 28, height: 28, borderRadius: '50%', background: C.primary, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {driver.name?.charAt(0)?.toUpperCase() || '?'}
          </span>
          {driver.name}
        </span>
      </td>
      <td style={td}><Badge label={driver.license} color={C.warning} /></td>
      <td style={td}>{driver.phone || '—'}</td>
      <td style={td}><Badge label={driver.status || 'Active'} color={statusColor} /></td>
      <td style={td}>
        {getBranchName(driver.branch_id) !== '—'
          ? <Badge label={getBranchName(driver.branch_id)} color={branchColor(getBranchIdx(driver.branch_id))} />
          : <span style={{ color: C.textMuted }}>—</span>}
      </td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6, justifyContent: rtl ? 'flex-end' : 'flex-start' }}>
          <ActionBtn variant="edit" onClick={onEdit}>{t.edit}</ActionBtn>
          <ActionBtn variant="delete" onClick={onDelete}>{t.delete}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

function EditableDriverRow({ driver, branches, onSave, onCancel, t, rtl }) {
  const [form, setForm] = useState({ ...driver })
  const td = mkTd(rtl)
  const inp = inlineInput(rtl)
  return (
    <tr style={{ background: '#f0f6ff' }}>
      <td style={td}><input value={form.name || ''} placeholder={t.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} /></td>
      <td style={td}><input value={form.license || ''} placeholder={t.license} onChange={e => setForm({ ...form, license: e.target.value })} style={inp} /></td>
      <td style={td}><input value={form.phone || ''} placeholder={t.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} /></td>
      <td style={td}>
        <select value={form.status || 'Active'} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
          <option value="Active">{t.active}</option>
          <option value="Inactive">{t.inactive}</option>
        </select>
      </td>
      <td style={td}>
        <select value={form.branch_id || ''} onChange={e => setForm({ ...form, branch_id: e.target.value })} style={inp}>
          <option value="">{t.noBranch}</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6 }}>
          <ActionBtn variant="save" onClick={() => onSave(form)}>{t.save}</ActionBtn>
          <ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

function BranchRow({ branch, index, onEdit, onDelete, t, rtl }) {
  const [hover, setHover] = useState(false)
  const td = mkTd(rtl)
  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? '#f0f6ff' : C.surface, transition: 'background 0.1s' }}>
      <td style={{ ...td, fontWeight: 600 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: rtl ? 'row-reverse' : 'row', justifyContent: rtl ? 'flex-end' : 'flex-start' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: branchColor(index), flexShrink: 0 }} />
          {branch.name}
        </span>
      </td>
      <td style={td}>{branch.city || '—'}</td>
      <td style={td}>{branch.address || '—'}</td>
      <td style={td}>{branch.manager || '—'}</td>
      <td style={td}>{branch.phone || '—'}</td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6, justifyContent: rtl ? 'flex-end' : 'flex-start' }}>
          <ActionBtn variant="edit" onClick={onEdit}>{t.edit}</ActionBtn>
          <ActionBtn variant="delete" onClick={onDelete}>{t.delete}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

function EditableBranchRow({ branch, onSave, onCancel, t, rtl }) {
  const [form, setForm] = useState({ ...branch })
  const td = mkTd(rtl)
  const inp = inlineInput(rtl)
  return (
    <tr style={{ background: '#f0f6ff' }}>
      <td style={td}><input value={form.name || ''} placeholder={t.branchName} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} /></td>
      <td style={td}><input value={form.city || ''} placeholder={t.city} onChange={e => setForm({ ...form, city: e.target.value })} style={inp} /></td>
      <td style={td}><input value={form.address || ''} placeholder={t.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inp} /></td>
      <td style={td}><input value={form.manager || ''} placeholder={t.manager} onChange={e => setForm({ ...form, manager: e.target.value })} style={inp} /></td>
      <td style={td}><input value={form.phone || ''} placeholder={t.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} /></td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6 }}>
          <ActionBtn variant="save" onClick={() => onSave(form)}>{t.save}</ActionBtn>
          <ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

// ── Add-item inline rows ────────────────────────────────────────────────────
function AddCarRow({ branches, onAdd, onCancel, t, rtl }) {
  const [form, setForm] = useState({ plate: '', make: '', model: '', year: '', status: 'Available', fuel: 'Petrol', branch_id: '' })
  const td = mkTd(rtl)
  const inp = inlineInput(rtl)
  function submit() { if (form.plate.trim() && form.make.trim() && form.model.trim()) onAdd(form) }
  return (
    <tr style={{ background: '#eef4ff' }}>
      <td style={td}><input autoFocus placeholder={t.plate} value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} style={inp} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={td}>
        <div style={{ display: 'flex', gap: 4 }}>
          <input placeholder={t.make} value={form.make} onChange={e => setForm({ ...form, make: e.target.value })} style={{ ...inp, width: '50%' }} />
          <input placeholder={t.model} value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} style={{ ...inp, width: '50%' }} />
        </div>
      </td>
      <td style={td}><input type="number" placeholder={t.year} value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} style={inp} /></td>
      <td style={td}>
        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
          <option value="Available">{t.available}</option>
          <option value="In Use">{t.inUse}</option>
          <option value="Maintenance">{t.maintenance}</option>
        </select>
      </td>
      <td style={td}>
        <select value={form.fuel} onChange={e => setForm({ ...form, fuel: e.target.value })} style={inp}>
          <option value="Petrol">{t.petrol}</option>
          <option value="Diesel">{t.diesel}</option>
          <option value="Electric">{t.electric}</option>
          <option value="Hybrid">{t.hybrid}</option>
        </select>
      </td>
      <td style={td}><select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })} style={inp}><option value="">{t.noBranch}</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}><span style={{ display: 'flex', gap: 6 }}><ActionBtn variant="save" onClick={submit}>{t.add}</ActionBtn><ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn></span></td>
    </tr>
  )
}

function AddDriverRow({ branches, onAdd, onCancel, t, rtl }) {
  const [form, setForm] = useState({ name: '', license: '', phone: '', status: 'Active', branch_id: '' })
  const td = mkTd(rtl)
  const inp = inlineInput(rtl)
  function submit() { if (form.name.trim() && form.license.trim()) onAdd(form) }
  return (
    <tr style={{ background: '#eef4ff' }}>
      <td style={td}><input autoFocus placeholder={t.name} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={td}><input placeholder={t.license} value={form.license} onChange={e => setForm({ ...form, license: e.target.value })} style={inp} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={td}><input placeholder={t.phone} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} /></td>
      <td style={td}>
        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
          <option value="Active">{t.active}</option>
          <option value="Inactive">{t.inactive}</option>
        </select>
      </td>
      <td style={td}><select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })} style={inp}><option value="">{t.noBranch}</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}><span style={{ display: 'flex', gap: 6 }}><ActionBtn variant="save" onClick={submit}>{t.add}</ActionBtn><ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn></span></td>
    </tr>
  )
}

function AddBranchRow({ onAdd, onCancel, t, rtl }) {
  const [form, setForm] = useState({ name: '', city: '', address: '', manager: '', phone: '' })
  const td = mkTd(rtl)
  const inp = inlineInput(rtl)
  function submit() { if (form.name.trim() && form.city.trim()) onAdd(form) }
  return (
    <tr style={{ background: '#eef4ff' }}>
      <td style={td}><input autoFocus placeholder={t.branchName} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={td}><input placeholder={t.city} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={inp} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={td}><input placeholder={t.address} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inp} /></td>
      <td style={td}><input placeholder={t.manager} value={form.manager} onChange={e => setForm({ ...form, manager: e.target.value })} style={inp} /></td>
      <td style={td}><input placeholder={t.phone} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} /></td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}><span style={{ display: 'flex', gap: 6 }}><ActionBtn variant="save" onClick={submit}>{t.add}</ActionBtn><ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn></span></td>
    </tr>
  )
}

// ── Dashboard component ─────────────────────────────────────────────────────
function Dashboard({ cars, drivers, branches, t, rtl }) {
  const unassigned = cars.filter(c => !c.branch_id).length

  const carsPerBranch = branches.map((b, i) => ({
    name: b.name, color: branchColor(i),
    count: cars.filter(c => c.branch_id === b.id).length,
  }))
  const driversPerBranch = branches.map((b, i) => ({
    name: b.name, color: branchColor(i),
    count: drivers.filter(d => d.branch_id === b.id).length,
  }))
  const maxCars    = Math.max(...carsPerBranch.map(b => b.count), 1)
  const maxDrivers = Math.max(...driversPerBranch.map(b => b.count), 1)

  const modelCounts = {}
  cars.forEach(c => { if (c.model) modelCounts[c.model] = (modelCounts[c.model] || 0) + 1 })
  const topModels = Object.entries(modelCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxModel  = Math.max(...topModels.map(([, n]) => n), 1)

  const card = (icon, value, label, color) => (
    <div key={label} style={{ background: C.surface, borderRadius: 10, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
      </div>
      <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: C.textSecondary }}>{label}</p>
    </div>
  )

  const barChart = (title, data, max) => (
    <div style={{ background: C.surface, borderRadius: 10, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <h3 style={{ margin: '0 0 18px', fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{title}</h3>
      {data.length === 0
        ? <p style={{ color: C.textMuted, fontSize: 13 }}>{t.noData}</p>
        : data.map(b => (
          <div key={b.name} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{b.name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: b.color }}>{b.count}</span>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: C.border }}>
              <div style={{ height: 10, borderRadius: 5, background: b.color, width: `${(b.count / max) * 100}%`, transition: 'width 0.6s ease', minWidth: b.count > 0 ? 10 : 0 }} />
            </div>
          </div>
        ))
      }
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24, direction: rtl ? 'rtl' : 'ltr' }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {card('🚗', cars.length,     t.totalFleet,    C.primary)}
        {card('👤', drivers.length,  t.totalDrivers,  C.success)}
        {card('🏢', branches.length, t.totalBranches, '#a25ddc')}
        {card('⚠️', unassigned,      t.unassigned,    C.warning)}
      </div>

      {/* Bar charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {barChart(t.carsByBranch,    carsPerBranch,    maxCars)}
        {barChart(t.driversByBranch, driversPerBranch, maxDrivers)}
      </div>

      {/* Top models + Branch table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Top models */}
        <div style={{ background: C.surface, borderRadius: 10, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{t.topModels}</h3>
          {topModels.length === 0
            ? <p style={{ color: C.textMuted, fontSize: 13 }}>{t.noData}</p>
            : topModels.map(([model, count], i) => (
              <div key={model} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: branchColor(i), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{model}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: branchColor(i), background: branchColor(i) + '18', borderRadius: 10, padding: '2px 8px' }}>{count}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: C.border, marginLeft: 32 }}>
                  <div style={{ height: 6, borderRadius: 3, background: branchColor(i), width: `${(count / maxModel) * 100}%`, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))
          }
        </div>

        {/* Branch overview table */}
        <div style={{ background: C.surface, borderRadius: 10, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{t.branchOverview}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: rtl ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: C.textMuted, padding: '0 0 10px', borderBottom: `2px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.branchName}</th>
                <th style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.textMuted, padding: '0 0 10px', borderBottom: `2px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.cars}</th>
                <th style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.textMuted, padding: '0 0 10px', borderBottom: `2px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.drivers}</th>
              </tr>
            </thead>
            <tbody>
              {branches.length === 0
                ? <tr><td colSpan={3} style={{ padding: '20px 0', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>{t.noData}</td></tr>
                : branches.map((b, i) => (
                  <tr key={b.id}>
                    <td style={{ padding: '10px 0', fontSize: 13, color: C.textPrimary, borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: rtl ? 'row-reverse' : 'row' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: branchColor(i), flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{b.name}</span>
                        <span style={{ fontSize: 11, color: C.textMuted }}>{b.location}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.primary, background: C.primary + '12', borderRadius: 6, padding: '2px 10px' }}>
                        {cars.filter(c => c.branch_id === b.id).length}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.success, background: C.success + '12', borderRadius: 6, padding: '2px 10px' }}>
                        {drivers.filter(d => d.branch_id === b.id).length}
                      </span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
function FleetManager({ session, onSignOut }) {
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

  function cleanCar(f)    { return { plate: f.plate, make: f.make, model: f.model, year: f.year ? parseInt(f.year) : null, status: f.status || 'Available', fuel: f.fuel || 'Petrol', branch_id: f.branch_id || null } }
  function cleanDriver(f) { return { name: f.name, license: f.license, phone: f.phone || null, status: f.status || 'Active', branch_id: f.branch_id || null } }
  function cleanBranch(f) { return { name: f.name, city: f.city, address: f.address || null, manager: f.manager || null, phone: f.phone || null } }

  async function addCar(form)       { const { data } = await supabase.from('cars').insert([cleanCar(form)]).select(); if (data) setCars(p => [...p, data[0]]); setShowAdd(false) }
  async function updateCar(form)    { const c = { ...cleanCar(form), id: form.id }; await supabase.from('cars').update(c).eq('id', c.id); setCars(p => p.map(x => x.id === c.id ? { ...x, ...c } : x)); setEditingId(null) }
  async function deleteCar(id)      { await supabase.from('cars').delete().eq('id', id); setCars(p => p.filter(c => c.id !== id)) }
  async function addDriver(form)    { const { data } = await supabase.from('drivers').insert([cleanDriver(form)]).select(); if (data) setDrivers(p => [...p, data[0]]); setShowAdd(false) }
  async function updateDriver(form) { const d = { ...cleanDriver(form), id: form.id }; await supabase.from('drivers').update(d).eq('id', d.id); setDrivers(p => p.map(x => x.id === d.id ? { ...x, ...d } : x)); setEditingId(null) }
  async function deleteDriver(id)   { await supabase.from('drivers').delete().eq('id', id); setDrivers(p => p.filter(d => d.id !== id)) }
  async function addBranch(form)    { const { data } = await supabase.from('branches').insert([cleanBranch(form)]).select(); if (data) setBranches(p => [...p, data[0]]); setShowAdd(false) }
  async function updateBranch(form) { const b = { ...cleanBranch(form), id: form.id }; await supabase.from('branches').update(b).eq('id', b.id); setBranches(p => p.map(x => x.id === b.id ? { ...x, ...b } : x)); setEditingId(null) }
  async function deleteBranch(id)   { await supabase.from('branches').delete().eq('id', id); setBranches(p => p.filter(b => b.id !== id)) }

  function getBranchName(id) { return branches.find(b => b.id === id)?.name || '—' }
  function getBranchIdx(id)  { return branches.findIndex(b => b.id === id) }
  function switchTab(tab)    { setActiveTab(tab); setEditingId(null); setShowAdd(false); setSearch('') }

  const q = search.toLowerCase()
  const filteredCars     = cars.filter(c     => c.plate?.toLowerCase().includes(q) || c.make?.toLowerCase().includes(q) || c.model?.toLowerCase().includes(q) || getBranchName(c.branch_id).toLowerCase().includes(q))
  const filteredDrivers  = drivers.filter(d  => d.name?.toLowerCase().includes(q)  || d.license?.toLowerCase().includes(q) || d.phone?.toLowerCase().includes(q) || getBranchName(d.branch_id).toLowerCase().includes(q))
  const filteredBranches = branches.filter(b => b.name?.toLowerCase().includes(q)  || b.city?.toLowerCase().includes(q) || b.manager?.toLowerCase().includes(q))

  const tabs = [
    { id: 'dashboard', label: t.dashboard, icon: '📊', count: null },
    { id: 'cars',      label: t.fleet,     icon: '🚗', count: cars.length },
    { id: 'drivers',   label: t.drivers,   icon: '👤', count: drivers.length },
    { id: 'branches',  label: t.branches,  icon: '🏢', count: branches.length },
  ]

  const activeTabData  = tabs.find(tab => tab.id === activeTab)
  const boardLabel     = activeTab === 'cars' ? t.allVehicles : activeTab === 'drivers' ? t.allDrivers : t.allBranches
  const currentCount   = activeTab === 'cars' ? filteredCars.length : activeTab === 'drivers' ? filteredDrivers.length : filteredBranches.length

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: C.bg, width: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${C.primary}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: C.textSecondary, margin: 0, fontSize: 14 }}>{t.loading}</p>
      </div>
    </div>
  )

  return (
    // Outer wrapper: always LTR so the nav never flips
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', fontFamily: "'Figtree','Roboto',system-ui,sans-serif", background: C.bg }}>

      {/* ── TOP NAVIGATION BAR (always LTR, never moves) ──────────────── */}
      <nav style={{
        background: C.navBg,
        borderBottom: `1px solid ${C.navBorder}`,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 8,
        flexShrink: 0,
        // direction is always LTR — nav never flips
        direction: 'ltr',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 24 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: `linear-gradient(135deg, ${C.primary}, #a25ddc)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,115,234,0.4)',
          }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>F</span>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>{t.appName}</span>
        </div>

        {/* Nav tabs — each has a fixed min-width so text changes never shift neighbours */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          {tabs.map(item => (
            <button key={item.id} onClick={() => switchTab(item.id)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              minWidth: 110,           // fixed width → switching language never shifts the nav
              padding: '7px 14px',
              borderRadius: 6, border: 'none', cursor: 'pointer',
              background: activeTab === item.id ? C.navActiveBg : 'transparent',
              color: activeTab === item.id ? C.navActive : C.navText,
              fontWeight: activeTab === item.id ? 700 : 400,
              fontSize: 14,
              transition: 'background 0.15s, color 0.15s',
              whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
              {item.count !== null && (
                <span style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: activeTab === item.id ? '#fff' : C.navText,
                  borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 700,
                }}>{item.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* User email + sign out */}
        {session && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 12 }}>
            <span style={{ color: C.navText, fontSize: 12, whiteSpace: 'nowrap' }}>{session.user.email}</span>
            <button onClick={onSignOut} style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: C.navText, borderRadius: 6, padding: '4px 10px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.15s',
            }}>
              Sign Out
            </button>
          </div>
        )}

        {/* Language toggle — always on the far right, never moves */}
        <div style={{ display: 'flex', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', overflow: 'hidden', flexShrink: 0 }}>
          {['en', 'he'].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              padding: '5px 14px', border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
              background: lang === l ? 'rgba(255,255,255,0.2)' : 'transparent',
              color: lang === l ? '#fff' : 'rgba(255,255,255,0.45)',
              transition: 'all 0.15s',
            }}>
              {l === 'en' ? 'EN' : 'עב'}
            </button>
          ))}
        </div>
      </nav>

      {/* ── CONTENT (dir switches here, nav is unaffected above) ────────── */}
      <div dir={rtl ? 'rtl' : 'ltr'} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Sub-header */}
        <div style={{
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: '0 24px', height: 56,
          display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.textPrimary, flex: 1 }}>
            {activeTabData?.icon} {activeTabData?.label}
          </h2>

          {/* Search + New item — hidden on dashboard */}
          {activeTab !== 'dashboard' && <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', width: 220 }}>
              <span style={{ fontSize: 13, color: C.textMuted, order: rtl ? 1 : 0 }}>🔍</span>
              <input placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: C.textPrimary, width: '100%', direction: rtl ? 'rtl' : 'ltr' }} />
            </div>
            <button onClick={() => { setShowAdd(true); setEditingId(null) }} style={{
              background: C.primary, color: '#fff', border: 'none',
              borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              boxShadow: '0 2px 8px rgba(0,115,234,0.3)', transition: 'background 0.15s',
              whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => e.currentTarget.style.background = C.primaryHover}
              onMouseLeave={e => e.currentTarget.style.background = C.primary}>
              {t.newItem}
            </button>
          </>}
        </div>

        {/* Dashboard view */}
        {activeTab === 'dashboard' && (
          <Dashboard cars={cars} drivers={drivers} branches={branches} t={t} rtl={rtl} />
        )}

        {/* Board */}
        {activeTab !== 'dashboard' && <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div style={{ background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', animation: 'fadeIn 0.2s ease' }}>

            {/* Group header */}
            <div style={{ background: C.primary, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{boardLabel}</span>
              <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{currentCount}</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {activeTab === 'cars' && <>
                    <th style={mkTh(rtl)}>{t.plate}</th>
                    <th style={mkTh(rtl)}>{t.make} / {t.model}</th>
                    <th style={mkTh(rtl)}>{t.year}</th>
                    <th style={mkTh(rtl)}>{t.status}</th>
                    <th style={mkTh(rtl)}>{t.fuel}</th>
                    <th style={mkTh(rtl)}>{t.branch}</th>
                    <th style={{ ...mkTh(rtl), width: 140 }}>{t.actions}</th>
                  </>}
                  {activeTab === 'drivers' && <>
                    <th style={mkTh(rtl)}>{t.name}</th>
                    <th style={mkTh(rtl)}>{t.license}</th>
                    <th style={mkTh(rtl)}>{t.phone}</th>
                    <th style={mkTh(rtl)}>{t.driverStatus}</th>
                    <th style={mkTh(rtl)}>{t.branch}</th>
                    <th style={{ ...mkTh(rtl), width: 140 }}>{t.actions}</th>
                  </>}
                  {activeTab === 'branches' && <>
                    <th style={mkTh(rtl)}>{t.branchName}</th>
                    <th style={mkTh(rtl)}>{t.city}</th>
                    <th style={mkTh(rtl)}>{t.address}</th>
                    <th style={mkTh(rtl)}>{t.manager}</th>
                    <th style={mkTh(rtl)}>{t.phone}</th>
                    <th style={{ ...mkTh(rtl), width: 140 }}>{t.actions}</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {activeTab === 'cars' && filteredCars.map(car =>
                  editingId === car.id
                    ? <EditableCarRow key={car.id} car={car} branches={branches} onSave={updateCar} onCancel={() => setEditingId(null)} t={t} rtl={rtl} />
                    : <CarRow key={car.id} car={car} getBranchName={getBranchName} getBranchIdx={getBranchIdx} onEdit={() => setEditingId(car.id)} onDelete={() => deleteCar(car.id)} t={t} rtl={rtl} />
                )}
                {activeTab === 'cars' && filteredCars.length === 0 && !showAdd && <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>{t.noCars}</td></tr>}
                {activeTab === 'cars' && showAdd && <AddCarRow branches={branches} onAdd={addCar} onCancel={() => setShowAdd(false)} t={t} rtl={rtl} />}

                {activeTab === 'drivers' && filteredDrivers.map(driver =>
                  editingId === driver.id
                    ? <EditableDriverRow key={driver.id} driver={driver} branches={branches} onSave={updateDriver} onCancel={() => setEditingId(null)} t={t} rtl={rtl} />
                    : <DriverRow key={driver.id} driver={driver} getBranchName={getBranchName} getBranchIdx={getBranchIdx} onEdit={() => setEditingId(driver.id)} onDelete={() => deleteDriver(driver.id)} t={t} rtl={rtl} />
                )}
                {activeTab === 'drivers' && filteredDrivers.length === 0 && !showAdd && <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>{t.noDrivers}</td></tr>}
                {activeTab === 'drivers' && showAdd && <AddDriverRow branches={branches} onAdd={addDriver} onCancel={() => setShowAdd(false)} t={t} rtl={rtl} />}

                {activeTab === 'branches' && filteredBranches.map((branch, i) =>
                  editingId === branch.id
                    ? <EditableBranchRow key={branch.id} branch={branch} onSave={updateBranch} onCancel={() => setEditingId(null)} t={t} rtl={rtl} />
                    : <BranchRow key={branch.id} branch={branch} index={i} onEdit={() => setEditingId(branch.id)} onDelete={() => deleteBranch(branch.id)} t={t} rtl={rtl} />
                )}
                {activeTab === 'branches' && filteredBranches.length === 0 && !showAdd && <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>{t.noBranches}</td></tr>}
                {activeTab === 'branches' && showAdd && <AddBranchRow onAdd={addBranch} onCancel={() => setShowAdd(false)} t={t} rtl={rtl} />}
              </tbody>
            </table>

            {/* Footer add link */}
            <div style={{ padding: '8px 18px', borderTop: `1px solid ${C.border}`, background: '#fafbfc' }}>
              <button onClick={() => { setShowAdd(true); setEditingId(null) }} style={{
                background: 'transparent', border: 'none', color: C.textSecondary,
                cursor: 'pointer', fontSize: 13, padding: '4px 0',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 16, color: C.primary, fontWeight: 700 }}>+</span>
                {t.addItem}
              </button>
            </div>
          </div>
        </div>}
      </div>
    </div>
  )
}

export default FleetManager
