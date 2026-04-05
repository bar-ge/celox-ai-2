import { supabase } from './supabaseClient'
import { useState, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'

// ── Mobile breakpoint hook ──────────────────────────────────────────────────
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint)
  const handler = useCallback(() => setIsMobile(window.innerWidth < breakpoint), [breakpoint])
  useEffect(() => {
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [handler])
  return isMobile
}

// ── Design tokens ───────────────────────────────────────────────────────────
const C = {
  navBg:        '#0f172a',
  navBorder:    'rgba(255,255,255,0.07)',
  navText:      '#94a3b8',
  navActive:    '#f8fafc',
  navActiveBg:  'rgba(255,255,255,0.1)',
  primary:      '#3b82f6',
  primaryHover: '#2563eb',
  indigo:       '#6366f1',
  bg:           '#f1f5f9',
  bgSubtle:     '#f8fafc',
  surface:      '#ffffff',
  border:       '#e2e8f0',
  textPrimary:  '#0f172a',
  textSecondary:'#475569',
  textMuted:    '#94a3b8',
  success:      '#10b981',
  successText:  '#007a45',
  danger:       '#ef4444',
  warning:      '#f59e0b',
  overlay:      'rgba(15,23,42,0.55)',
  rowHover:     '#f0f7ff',
  rowAdd:       '#eff6ff',
  footerBg:     '#f8fafc',
}

const BRANCH_COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#f97316','#ec4899']
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
    driver:'Driver', noBranch:'No branch', noDriver:'No driver',
    noCars:'No vehicles found. Click + New Item to add one.',
    noDrivers:'No drivers found. Click + New Item to add one.',
    noBranches:'No branches found. Click + New Item to add one.',
    loading:'Loading your workspace…',
    settings:'Settings', companyName:'Company Name', inviteCode:'Invite Code',
    copyCode:'Copy', codeCopied:'Copied!', members:'Team Members', removeMember:'Remove',
    role:'Role', admin:'Admin', member:'Member', you:'You',
    createCompany:'Create Company', companyNamePlaceholder:'Company name', create:'Create',
    allCompanies:'All Companies', noCompanies:'No companies yet.',
    activeStatus:'Active', closedStatus:'Closed', manage:'Manage',
    closeCompany:'Close', reopenCompany:'Reopen',
    companyCreated:(name, code) => `Company "${name}" created with code ${code}`,
    alreadyInvited:'This email was already invited.',
    inviteSent:(email) => `Invite sent to ${email}`,
    inviteByEmail:'Invite by Email', sendInvite:'Send Invite',
    shareCodeHint:'Share this code with teammates so they can join your company.',
    selectCompanyPrompt:'Select a company to manage',
    selectCompanyHint:'Go to Settings → click Manage next to a company',
    files:'Files', uploadFile:'Upload File', noFiles:'No files yet.',
    expiryDate:'Expiry Date', expired:'Expired', expiresIn:'Expires in', clearExpiry:'Clear',
    maxCars:'Max Vehicles', maxUsers:'Max Users',
    limitReachedCars:'Vehicle limit reached for this company.',
    limitReachedUsers:'User limit reached for this company.',
    signOut:'Sign Out', loadingShort:'Loading…', emailPlaceholder:'colleague@example.com',
    confirmDelete:'Are you sure you want to delete this item?',
    customLists:'Custom Lists', defaults:'Defaults',
    listCarStatus:'Vehicle Status', listDriverStatus:'Driver Status',
    listFuelType:'Fuel Types', listFileType:'Document Types', listCarType:'Vehicle Types',
    addValue:'Add value…', noCustomValues:'No custom values yet.', docType:'Document Type',
    // maintenance
    maintenanceTab:'Maintenance', serviceType:'Service Type', serviceDate:'Date', nextDue:'Next Due',
    noMaintenance:'No maintenance records yet.',
    oilChange:'Oil Change', tireRotation:'Tire Rotation', inspection:'Inspection',
    brakeService:'Brake Service', otherService:'Other',
    scheduled:'Scheduled', done:'Done', overdue:'Overdue',
    // costs
    costsTab:'Costs', category:'Category', amount:'Amount', totalCosts:'Total Costs',
    noCosts:'No cost records yet.',
    catFuel:'Fuel', catInsurance:'Insurance', catFine:'Fine', catRepair:'Repair', catOther:'Other',
    // history
    history:'Assignment History', assignedAt:'Assigned', unassignedAt:'Unassigned', current:'Current',
    noHistory:'No assignment history.',
    // activity
    activityLog:'Activity Log', activityAction:'Action', activityEntity:'Item', activityUser:'User', activityTime:'Time',
    actionAdd:'Added', actionUpdate:'Updated', actionDelete:'Deleted',
    noActivity:'No activity yet.',
    // bulk & export
    selectAll:'Select All', bulkDelete:'Delete Selected', bulkAssign:'Assign Branch',
    exportExcel:'Export Excel', exportPDF:'Export PDF',
    // dashboard filter
    filterAll:'All Time', filterMonth:'This Month', filterQuarter:'This Quarter', filterYear:'This Year',
    // photo
    photo:'Photo', uploadPhoto:'Upload Photo', changePhoto:'Change Photo',
    description:'Description', unlimited:'Unlimited', itemsSelected:'selected',
    totalCost:'Total Cost', costByCategory:'Cost by Category', recentCosts:'Recent Costs',
    maintenanceDue:'Maintenance Due', maintenanceHistory:'Service History',
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
    driver:'נהג', noBranch:'ללא סניף', noDriver:'ללא נהג',
    noCars:'לא נמצאו רכבים. לחץ על + פריט חדש להוספה.',
    noDrivers:'לא נמצאו נהגים. לחץ על + פריט חדש להוספה.',
    noBranches:'לא נמצאו סניפים. לחץ על + פריט חדש להוספה.',
    loading:'טוען את סביבת העבודה…',
    settings:'הגדרות', companyName:'שם חברה', inviteCode:'קוד הזמנה',
    copyCode:'העתק', codeCopied:'הועתק!', members:'חברי צוות', removeMember:'הסר',
    role:'תפקיד', admin:'מנהל', member:'חבר', you:'אתה',
    createCompany:'צור חברה', companyNamePlaceholder:'שם חברה', create:'צור',
    allCompanies:'כל החברות', noCompanies:'אין חברות עדיין.',
    activeStatus:'פעיל', closedStatus:'סגור', manage:'נהל',
    closeCompany:'סגור', reopenCompany:'פתח מחדש',
    companyCreated:(name, code) => `חברה "${name}" נוצרה עם קוד ${code}`,
    alreadyInvited:'האימייל הזה כבר הוזמן.',
    inviteSent:(email) => `הזמנה נשלחה אל ${email}`,
    inviteByEmail:'הזמן באימייל', sendInvite:'שלח הזמנה',
    shareCodeHint:'שתף קוד זה עם עמיתים כדי שיוכלו להצטרף לחברה שלך.',
    selectCompanyPrompt:'בחר חברה לניהול',
    selectCompanyHint:'עבור להגדרות ← לחץ נהל ליד חברה',
    files:'קבצים', uploadFile:'העלה קובץ', noFiles:'אין קבצים עדיין.',
    expiryDate:'תאריך תפוגה', expired:'פג תוקף', expiresIn:'פג בעוד', clearExpiry:'נקה',
    maxCars:'מקסימום רכבים', maxUsers:'מקסימום משתמשים',
    limitReachedCars:'הגעת למגבלת הרכבים של החברה.',
    limitReachedUsers:'הגעת למגבלת המשתמשים של החברה.',
    signOut:'התנתק', loadingShort:'טוען…', emailPlaceholder:'עמית@example.com',
    confirmDelete:'האם אתה בטוח שברצונך למחוק פריט זה?',
    customLists:'רשימות מותאמות', defaults:'ברירות מחדל',
    listCarStatus:'סטטוס רכב', listDriverStatus:'סטטוס נהג',
    listFuelType:'סוגי דלק', listFileType:'סוגי מסמכים', listCarType:'סוגי רכב',
    addValue:'הוסף ערך…', noCustomValues:'אין ערכים מותאמים עדיין.', docType:'סוג מסמך',
    // maintenance
    maintenanceTab:'תחזוקה', serviceType:'סוג שירות', serviceDate:'תאריך', nextDue:'תאריך הבא',
    noMaintenance:'אין רשומות תחזוקה עדיין.',
    oilChange:'החלפת שמן', tireRotation:'סיבוב צמיגים', inspection:'בדיקה תקופתית',
    brakeService:'שירות בלמים', otherService:'אחר',
    scheduled:'מתוכנן', done:'בוצע', overdue:'באיחור',
    // costs
    costsTab:'עלויות', category:'קטגוריה', amount:'סכום', totalCosts:'סה"כ עלויות',
    noCosts:'אין רשומות עלויות עדיין.',
    catFuel:'דלק', catInsurance:'ביטוח', catFine:'קנס', catRepair:'תיקון', catOther:'אחר',
    // history
    history:'היסטוריית שיבוץ', assignedAt:'שובץ', unassignedAt:'הוסר', current:'נוכחי',
    noHistory:'אין היסטוריית שיבוץ.',
    // activity
    activityLog:'יומן פעילות', activityAction:'פעולה', activityEntity:'פריט', activityUser:'משתמש', activityTime:'זמן',
    actionAdd:'נוסף', actionUpdate:'עודכן', actionDelete:'נמחק',
    noActivity:'אין פעילות עדיין.',
    // bulk & export
    selectAll:'בחר הכל', bulkDelete:'מחק נבחרים', bulkAssign:'שבץ סניף',
    exportExcel:'ייצא Excel', exportPDF:'ייצא PDF',
    // dashboard filter
    filterAll:'כל הזמן', filterMonth:'חודש זה', filterQuarter:'רבעון זה', filterYear:'שנה זו',
    // photo
    photo:'תמונה', uploadPhoto:'העלה תמונה', changePhoto:'החלף תמונה',
    description:'תיאור', unlimited:'ללא הגבלה', itemsSelected:'נבחרו',
    totalCost:'סה"כ עלות', costByCategory:'עלות לפי קטגוריה', recentCosts:'עלויות אחרונות',
    maintenanceDue:'תחזוקה קרובה', maintenanceHistory:'היסטוריית שירות',
  },
}

// ── Shared style constants ───────────────────────────────────────────────────
const gradient = `linear-gradient(135deg, ${C.primary}, ${C.indigo})`

const btnPrimary = {
  background: gradient, color: '#fff', border: 'none',
  borderRadius: 8, fontWeight: 700, cursor: 'pointer',
  boxShadow: '0 2px 10px rgba(59,130,246,0.35)', transition: 'opacity 0.15s',
}
const btnGhost = {
  background: 'transparent', border: `1px solid ${C.border}`,
  color: C.textPrimarySecondary, borderRadius: 6, cursor: 'pointer',
}
const btnDanger = {
  background: C.danger + '18', color: C.danger,
  border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer',
}
const closeBtn = {
  background: 'transparent', border: 'none',
  fontSize: 20, cursor: 'pointer', color: C.textPrimaryMuted, lineHeight: 1,
}
const rowStyle = { padding: '10px 0', borderBottom: `1px solid ${C.border}` }

// ── Shared table style atoms ────────────────────────────────────────────────
const mkTh = (rtl, mobile) => ({
  padding: mobile ? '8px 10px' : '11px 16px',
  fontSize: mobile ? 10 : 11,
  fontWeight: 700,
  color: C.textPrimaryMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  borderBottom: `2px solid ${C.border}`,
  background: C.bgSubtle,
  whiteSpace: 'nowrap',
  textAlign: rtl ? 'right' : 'left',
})

const mkTd = (rtl, mobile) => ({
  padding: mobile ? '7px 10px' : '10px 16px',
  fontSize: mobile ? 12 : 14,
  color: C.textPrimaryPrimary,
  borderBottom: `1px solid ${C.border}`,
  verticalAlign: 'middle',
  textAlign: rtl ? 'right' : 'left',
})

const inlineInput = (rtl) => ({
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 14,
  color: C.textPrimaryPrimary,
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
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: color + '15', color,
      border: `1px solid ${color}30`,
      borderRadius: 6, padding: '3px 10px',
      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '0.01em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}

// ── Action button ───────────────────────────────────────────────────────────
function ActionBtn({ onClick, variant, children }) {
  const variants = {
    edit:   { background: C.primary + '18', color: C.primary },
    save:   { background: C.success + '22', color: C.successText },
    cancel: { background: C.bg, color: C.textPrimarySecondary },
    delete: { background: C.danger + '18', color: C.danger },
  }
  return (
    <button onClick={onClick} style={{
      border: 'none', borderRadius: 6, padding: '5px 10px',
      fontSize: 12, fontWeight: 600, cursor: 'pointer', ...variants[variant],
    }}>{children}</button>
  )
}

// ── Files Modal ─────────────────────────────────────────────────────────────
function FilesModal({ entity, entityType, companyId, onClose, t }) {
  const [docs, setDocs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const [pendingFile, setPendingFile] = useState(null) // file staged for upload
  const [expiryDate, setExpiryDate]   = useState('')
  const [docType, setDocType]         = useState('')
  const [editingExpiry, setEditingExpiry] = useState(null) // doc id being edited
  const [editExpiryVal, setEditExpiryVal] = useState('')

  useEffect(() => { loadDocs() }, [entity.id])

  async function loadDocs() {
    setLoading(true)
    const { data } = await supabase.from('documents')
      .select('*').eq('entity_id', entity.id).order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  function pickFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setPendingFile(file)
    setExpiryDate('')
    setDocType('')
    setError('')
    e.target.value = ''
  }

  async function confirmUpload() {
    if (!pendingFile) return
    setUploading(true); setError('')
    const safeName = pendingFile.name.replace(/[^\w.\-]/g, '_').replace(/^\.+/, '').replace(/\s+/g, '_')
    const path = `${companyId}/${entityType}/${entity.id}/${Date.now()}_${safeName}`
    const { error: uploadErr } = await supabase.storage.from('fleet-documents').upload(path, pendingFile)
    if (uploadErr) { setError(uploadErr.message); setUploading(false); return }
    const { error: dbErr } = await supabase.from('documents').insert({
      company_id: companyId, entity_type: entityType, entity_id: entity.id,
      name: pendingFile.name, storage_path: path, size: pendingFile.size,
      expires_at: expiryDate || null, doc_type: docType || null,
    })
    if (dbErr) { setError(dbErr.message) } else { await loadDocs(); setPendingFile(null); setExpiryDate('') }
    setUploading(false)
  }

  async function saveExpiry(doc) {
    const { error } = await supabase.from('documents').update({ expires_at: editExpiryVal || null }).eq('id', doc.id)
    if (error) { setError(error.message); return }
    setDocs(p => p.map(d => d.id === doc.id ? { ...d, expires_at: editExpiryVal || null } : d))
    setEditingExpiry(null)
  }

  async function downloadFile(doc) {
    const { data } = await supabase.storage.from('fleet-documents').createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function deleteFile(doc) {
    const { error: dbErr } = await supabase.from('documents').delete().eq('id', doc.id)
    if (dbErr) { setError(dbErr.message); return }
    await supabase.storage.from('fleet-documents').remove([doc.storage_path])
    setDocs(p => p.filter(d => d.id !== doc.id))
  }

  function formatSize(bytes) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  function expiryStatus(doc) {
    if (!doc.expires_at) return null
    const today = new Date(); today.setHours(0,0,0,0)
    const exp = new Date(doc.expires_at)
    const days = Math.round((exp - today) / 86400000)
    if (days < 0)  return { label: t.expired,          color: C.danger,  bg: C.danger  + '10' }
    if (days <= 30) return { label: `${t.expiresIn} ${days}d`, color: C.warning, bg: C.warning + '10' }
    return { label: new Date(doc.expires_at).toLocaleDateString(), color: C.success, bg: C.success + '10' }
  }

  const entityLabel = entityType === 'car' ? (entity.plate || entity.make) : entity.name

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: C.overlay, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: C.surface, borderRadius: 12, width: '100%', maxWidth: 500,
        boxShadow: '0 8px 40px rgba(0,0,0,0.2)', border: `1px solid ${C.border}`,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.textPrimaryPrimary }}>📎 {t.files}</div>
            <div style={{ fontSize: 12, color: C.textPrimarySecondary, marginTop: 2 }}>{entityLabel}</div>
          </div>
          <button onClick={onClose} style={{ ...closeBtn, padding: 4 }}>×</button>
        </div>

        {/* File list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
          {loading ? (
            <p style={{ color: C.textPrimarySecondary, fontSize: 14, textAlign: 'center', padding: '20px 0' }}>{t.loadingShort}</p>
          ) : docs.length === 0 ? (
            <p style={{ color: C.textPrimarySecondary, fontSize: 14, textAlign: 'center', padding: '20px 0' }}>{t.noFiles}</p>
          ) : docs.map(doc => {
            const status = expiryStatus(doc)
            return (
              <div key={doc.id} style={rowStyle}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{getFileIcon(doc.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimaryPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                    <div style={{ fontSize: 11, color: C.textPrimarySecondary, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span>{formatSize(doc.size)} · {new Date(doc.created_at).toLocaleDateString()}</span>
                      {status && (
                        <span style={{ background: status.bg, color: status.color, borderRadius: 4, padding: '1px 6px', fontWeight: 700, fontSize: 11 }}>
                          {status.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    <button onClick={() => { setEditingExpiry(doc.id); setEditExpiryVal(doc.expires_at || '') }} style={{ ...btnGhost, padding: '5px 8px', fontSize: 13 }}>📅</button>
                    <button onClick={() => downloadFile(doc)} style={{ background: C.primary + '18', color: C.primary, border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>↓</button>
                    <button onClick={() => deleteFile(doc)} style={{ ...btnDanger, padding: '5px 10px', fontSize: 12 }}>✕</button>
                  </div>
                </div>
                {/* Inline expiry editor */}
                {editingExpiry === doc.id && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, paddingLeft: 32 }}>
                    <input type="date" value={editExpiryVal} onChange={e => setEditExpiryVal(e.target.value)}
                      style={{ padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: 'none' }} />
                    <button onClick={() => saveExpiry(doc)} style={{ ...btnPrimary, padding: '5px 10px', fontSize: 12 }}>{t.save}</button>
                    <button onClick={() => { setEditingExpiry(null); setEditExpiryVal('') }} style={{ ...btnGhost, padding: '5px 8px', fontSize: 12 }}>{t.cancel}</button>
                    {doc.expires_at && <button onClick={() => { setEditExpiryVal(''); saveExpiry({ ...doc, id: doc.id }) }} style={{ ...closeBtn, color: C.danger, fontSize: 12 }}>{t.clearExpiry}</button>}
                  </div>
                )}
              </div>
            )
          })}
          {error && <div style={{ color: C.danger, fontSize: 12, marginTop: 8 }}>{error}</div>}
        </div>

        {/* Upload area */}
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}` }}>
          {pendingFile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, color: C.textPrimaryPrimary, fontWeight: 600 }}>📎 {pendingFile.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12, color: C.textPrimarySecondary, whiteSpace: 'nowrap' }}>📅 {t.expiryDate}</label>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmUpload} disabled={uploading} style={{
                  ...btnPrimary, flex: 1, padding: '10px', fontSize: 13,
                  cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1,
                }}>{uploading ? '…' : `⬆ ${t.uploadFile}`}</button>
                <button onClick={() => setPendingFile(null)} style={{ ...btnGhost, padding: '10px 14px', fontSize: 13 }}>{t.cancel}</button>
              </div>
            </div>
          ) : (
            <label style={{
              ...btnPrimary, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8, padding: '10px', fontSize: 13,
            }}>
              ⬆ {t.uploadFile}
              <input type="file" style={{ display: 'none' }} onChange={pickFile} />
            </label>
          )}
        </div>
      </div>
    </div>
  )
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase()
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return '🖼️'
  if (['pdf'].includes(ext)) return '📄'
  if (['doc','docx'].includes(ext)) return '📝'
  if (['xls','xlsx'].includes(ext)) return '📊'
  return '📎'
}

// ── Vehicle photo thumbnail ─────────────────────────────────────────────────
function PhotoThumb({ path, onUpload, t }) {
  const [url, setUrl] = useState(null)
  const inputRef = useRef(null)
  useEffect(() => {
    if (!path) { setUrl(null); return }
    supabase.storage.from('fleet-documents').createSignedUrl(path, 86400)
      .then(({ data }) => { if (data) setUrl(data.signedUrl) })
  }, [path])
  return (
    <>
      <div onClick={() => inputRef.current?.click()} title={path ? t.changePhoto : t.uploadPhoto}
        style={{ width: 32, height: 32, borderRadius: 7, overflow: 'hidden', cursor: 'pointer', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
        onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
        {url
          ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 14 }}>📷</span>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; if (f) onUpload(f); e.target.value = '' }} />
    </>
  )
}

// ── Status badge helpers ────────────────────────────────────────────────────
const CAR_STATUS_COLOR   = { Available: C.success, 'In Use': C.primary, Maintenance: C.warning }
const DRIVER_STATUS_COLOR = { Active: C.success, Inactive: C.textPrimaryMuted }

// Maps DB value → translation key
const CAR_STATUS_KEY = { Available: 'available', 'In Use': 'inUse', Maintenance: 'maintenance' }
const CAR_FUEL_KEY   = { Petrol: 'petrol', Diesel: 'diesel', Electric: 'electric', Hybrid: 'hybrid' }
const DRIVER_STATUS_KEY = { Active: 'active', Inactive: 'inactive' }

// ── Custom list defaults & helper ────────────────────────────────────────────
const DEFAULT_LISTS = {
  car_status:    ['Available', 'In Use', 'Maintenance'],
  driver_status: ['Active', 'Inactive'],
  fuel_type:     ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
  file_type:     ['License', 'Invoice', 'Insurance', 'Registration', 'Inspection', 'ID', 'Other'],
  car_type:      ['Sedan', 'SUV', 'Truck', 'Van', 'Bus', 'Motorcycle'],
}
function getListOptions(type) {
  return DEFAULT_LISTS[type] || []
}

// ── Data rows ───────────────────────────────────────────────────────────────
function CarRow({ car, getBranchName, getBranchIdx, drivers, selected, onSelect, onEdit, onDelete, onFiles, onPhotoChange, t, rtl, mobile }) {
  const [hover, setHover] = useState(false)
  const td = mkTd(rtl, mobile)
  const statusColor = CAR_STATUS_COLOR[car.status] || C.textPrimaryMuted
  const assignedDriver = drivers.find(d => d.id === car.driver_id)
  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: selected ? C.primary + '08' : hover ? C.rowHover : C.surface, transition: 'background 0.12s' }}>
      <td style={{ ...td, width: 36, padding: '10px 12px' }}><input type="checkbox" checked={!!selected} onChange={onSelect} style={{ cursor: 'pointer' }} /></td>
      <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PhotoThumb path={car.photo_url} onUpload={onPhotoChange} t={t} />
          {car.plate}
        </span>
      </td>
      <td style={td}>{car.make} {car.model}</td>
      <td style={td}>{car.year || '—'}</td>
      <td style={td}><Badge label={t[CAR_STATUS_KEY[car.status]] || car.status || t.available} color={statusColor} /></td>
      <td style={td}>{t[CAR_FUEL_KEY[car.fuel]] || car.fuel || '—'}</td>
      <td style={td}>
        {getBranchName(car.branch_id) !== '—'
          ? <Badge label={getBranchName(car.branch_id)} color={branchColor(getBranchIdx(car.branch_id))} />
          : <span style={{ color: C.textPrimaryMuted }}>—</span>}
      </td>
      <td style={td}>
        {assignedDriver
          ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: C.primary, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                {assignedDriver.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
              <span style={{ fontSize: 13 }}>{assignedDriver.name}</span>
            </span>
          : <span style={{ color: C.textPrimaryMuted }}>—</span>}
      </td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6, justifyContent: rtl ? 'flex-end' : 'flex-start' }}>
          <ActionBtn variant="edit" onClick={onEdit}>{t.edit}</ActionBtn>
          <ActionBtn variant="delete" onClick={onDelete}>{t.delete}</ActionBtn>
          <button onClick={onFiles} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textPrimarySecondary, borderRadius: 6, padding: '5px 8px', fontSize: 12, cursor: 'pointer' }}>📎</button>
        </span>
      </td>
    </tr>
  )
}

function EditableCarRow({ car, branches, drivers, onSave, onCancel, t, rtl, mobile }) {
  const [form, setForm] = useState({ ...car })
  const td = mkTd(rtl, mobile)
  const inp = inlineInput(rtl)
  return (
    <tr style={{ background: C.rowHover }}>
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
      <td style={td}>
        <select value={form.driver_id || ''} onChange={e => setForm({ ...form, driver_id: e.target.value })} style={inp}>
          <option value="">{t.noDriver}</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
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

function DriverRow({ driver, getBranchName, getBranchIdx, selected, onSelect, onEdit, onDelete, onFiles, t, rtl, mobile }) {
  const [hover, setHover] = useState(false)
  const td = mkTd(rtl, mobile)
  const statusColor = DRIVER_STATUS_COLOR[driver.status] || C.success
  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: selected ? C.primary + '08' : hover ? C.rowHover : C.surface, transition: 'background 0.12s' }}>
      <td style={{ ...td, width: 36, padding: '10px 12px' }}><input type="checkbox" checked={!!selected} onChange={onSelect} style={{ cursor: 'pointer' }} /></td>
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
      <td style={td}><Badge label={t[DRIVER_STATUS_KEY[driver.status]] || driver.status || t.active} color={statusColor} /></td>
      <td style={td}>
        {getBranchName(driver.branch_id) !== '—'
          ? <Badge label={getBranchName(driver.branch_id)} color={branchColor(getBranchIdx(driver.branch_id))} />
          : <span style={{ color: C.textPrimaryMuted }}>—</span>}
      </td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6, justifyContent: rtl ? 'flex-end' : 'flex-start' }}>
          <ActionBtn variant="edit" onClick={onEdit}>{t.edit}</ActionBtn>
          <ActionBtn variant="delete" onClick={onDelete}>{t.delete}</ActionBtn>
          <button onClick={onFiles} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textPrimarySecondary, borderRadius: 6, padding: '5px 8px', fontSize: 12, cursor: 'pointer' }}>📎</button>
        </span>
      </td>
    </tr>
  )
}

function EditableDriverRow({ driver, branches, onSave, onCancel, t, rtl, mobile }) {
  const [form, setForm] = useState({ ...driver })
  const td = mkTd(rtl, mobile)
  const inp = inlineInput(rtl)
  return (
    <tr style={{ background: C.rowHover }}>
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

function BranchRow({ branch, index, selected, onSelect, onEdit, onDelete, t, rtl, mobile }) {
  const [hover, setHover] = useState(false)
  const td = mkTd(rtl, mobile)
  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: selected ? C.primary + '08' : hover ? C.rowHover : C.surface, transition: 'background 0.12s' }}>
      <td style={{ ...td, width: 36, padding: '10px 12px' }}><input type="checkbox" checked={!!selected} onChange={onSelect} style={{ cursor: 'pointer' }} /></td>
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

function EditableBranchRow({ branch, onSave, onCancel, t, rtl, mobile }) {
  const [form, setForm] = useState({ ...branch })
  const td = mkTd(rtl, mobile)
  const inp = inlineInput(rtl)
  return (
    <tr style={{ background: C.rowHover }}>
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
function AddCarRow({ branches, drivers, onAdd, onCancel, t, rtl, mobile }) {
  const [form, setForm] = useState({ plate: '', make: '', model: '', year: '', status: 'Available', fuel: 'Petrol', branch_id: '', driver_id: '' })
  const td = mkTd(rtl, mobile)
  const inp = inlineInput(rtl)
  function submit() { if (form.plate.trim() && form.make.trim() && form.model.trim()) onAdd(form) }
  return (
    <tr style={{ background: C.rowAdd }}>
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
      <td style={td}><select value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })} style={inp}><option value="">{t.noDriver}</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}><span style={{ display: 'flex', gap: 6 }}><ActionBtn variant="save" onClick={submit}>{t.add}</ActionBtn><ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn></span></td>
    </tr>
  )
}

function AddDriverRow({ branches, onAdd, onCancel, t, rtl, mobile }) {
  const [form, setForm] = useState({ name: '', license: '', phone: '', status: 'Active', branch_id: '' })
  const td = mkTd(rtl, mobile)
  const inp = inlineInput(rtl)
  function submit() { if (form.name.trim() && form.license.trim()) onAdd(form) }
  return (
    <tr style={{ background: C.rowAdd }}>
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

function AddBranchRow({ onAdd, onCancel, t, rtl, mobile }) {
  const [form, setForm] = useState({ name: '', city: '', address: '', manager: '', phone: '' })
  const td = mkTd(rtl, mobile)
  const inp = inlineInput(rtl)
  function submit() { if (form.name.trim() && form.city.trim()) onAdd(form) }
  return (
    <tr style={{ background: C.rowAdd }}>
      <td style={td}><input autoFocus placeholder={t.branchName} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={td}><input placeholder={t.city} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={inp} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={td}><input placeholder={t.address} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inp} /></td>
      <td style={td}><input placeholder={t.manager} value={form.manager} onChange={e => setForm({ ...form, manager: e.target.value })} style={inp} /></td>
      <td style={td}><input placeholder={t.phone} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} /></td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}><span style={{ display: 'flex', gap: 6 }}><ActionBtn variant="save" onClick={submit}>{t.add}</ActionBtn><ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn></span></td>
    </tr>
  )
}

// ── Maintenance Tab ──────────────────────────────────────────────────────────
function MaintenanceTab({ cars, companyId, t, rtl }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ car_id: '', type: 'Oil Change', description: '', cost: '', date: '', next_due: '', status: 'done' })
  const inp = inlineInput(rtl)
  const isMobile = useIsMobile()

  useEffect(() => { load() }, [companyId])
  async function load() {
    setLoading(true)
    const { data } = await supabase.from('maintenance').select('*').eq('company_id', companyId).order('date', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }
  async function add(e) {
    e.preventDefault()
    const { data, error } = await supabase.from('maintenance').insert([{
      company_id: companyId, car_id: parseInt(form.car_id), type: form.type,
      description: form.description || null, cost: parseFloat(form.cost) || 0,
      date: form.date, next_due: form.next_due || null, status: form.status,
    }]).select()
    if (!error && data) { setRecords(p => [data[0], ...p]); setShowAdd(false); setForm({ car_id: '', type: 'Oil Change', description: '', cost: '', date: '', next_due: '', status: 'done' }) }
  }
  async function del(id) {
    if (!window.confirm(t.confirmDelete)) return
    await supabase.from('maintenance').delete().eq('id', id)
    setRecords(p => p.filter(r => r.id !== id))
  }

  const statusColor = { done: C.success, scheduled: C.primary, overdue: C.danger }
  const statusLabel = { done: t.done, scheduled: t.scheduled, overdue: t.overdue }
  const carName = id => cars.find(c => c.id === parseInt(id))?.plate || id

  const upcoming = records.filter(r => r.next_due && new Date(r.next_due) > new Date() && r.status !== 'done')
  const overdueCount = records.filter(r => r.status === 'overdue').length

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 24, direction: rtl ? 'rtl' : 'ltr' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: t.maintenanceHistory, value: records.length, color: C.primary, icon: '🔧' },
          { label: t.maintenanceDue, value: upcoming.length, color: C.warning, icon: '📅' },
          { label: t.overdue, value: overdueCount, color: C.danger, icon: '⚠️' },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ height: 3, background: s.color }} />
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <span style={{ fontSize: 30, fontWeight: 800, color: s.color }}>{s.value}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: C.textPrimarySecondary, fontWeight: 500 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ background: gradient, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>🔧 {t.maintenanceTab}</span>
          <button onClick={() => setShowAdd(p => !p)} style={{ ...btnPrimary, padding: '5px 14px', fontSize: 12, boxShadow: 'none', background: 'rgba(255,255,255,0.2)' }}>
            {showAdd ? t.cancel : t.newItem}
          </button>
        </div>
        {showAdd && (
          <form onSubmit={add} style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textPrimarySecondary }}>{t.cars}</label>
              <select required value={form.car_id} onChange={e => setForm({ ...form, car_id: e.target.value })} style={inp}>
                <option value="">—</option>
                {cars.map(c => <option key={c.id} value={c.id}>{c.plate} {c.make}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textPrimarySecondary }}>{t.serviceType}</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inp}>
                {['Oil Change','Tire Rotation','Inspection','Brake Service','Other'].map(v => <option key={v} value={v}>{t[v.toLowerCase().replace(/ /g,'')] || v}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textPrimarySecondary }}>{t.serviceDate}</label>
              <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textPrimarySecondary }}>{t.nextDue}</label>
              <input type="date" value={form.next_due} onChange={e => setForm({ ...form, next_due: e.target.value })} style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textPrimarySecondary }}>{t.amount}</label>
              <input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textPrimarySecondary }}>{t.status}</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
                <option value="done">{t.done}</option>
                <option value="scheduled">{t.scheduled}</option>
                <option value="overdue">{t.overdue}</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textPrimarySecondary }}>{t.actions}</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t.description + '…'} style={inp} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" style={{ ...btnPrimary, padding: '8px 18px', fontSize: 13, width: '100%' }}>{t.add}</button>
            </div>
          </form>
        )}
      </div>

      {/* Records table */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>
                {[t.cars, t.serviceType, t.serviceDate, t.nextDue, t.amount, t.status, t.actions].map(h => (
                  <th key={h} style={mkTh(rtl)}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: C.textPrimaryMuted }}>{t.loadingShort}</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: C.textPrimaryMuted }}>{t.noMaintenance}</td></tr>
              ) : records.map(r => (
                <tr key={r.id} style={{ background: C.surface }}>
                  <td style={mkTd(rtl)}><span style={{ fontWeight: 600, color: C.primary }}>{carName(r.car_id)}</span></td>
                  <td style={mkTd(rtl)}>{r.type}</td>
                  <td style={mkTd(rtl)}>{r.date}</td>
                  <td style={mkTd(rtl)}>{r.next_due || '—'}</td>
                  <td style={mkTd(rtl)}>{r.cost ? `$${parseFloat(r.cost).toFixed(2)}` : '—'}</td>
                  <td style={mkTd(rtl)}><Badge label={statusLabel[r.status] || r.status} color={statusColor[r.status] || C.textPrimaryMuted} /></td>
                  <td style={mkTd(rtl)}><ActionBtn variant="delete" onClick={() => del(r.id)}>{t.delete}</ActionBtn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Costs Tab ────────────────────────────────────────────────────────────────
function CostsTab({ cars, drivers, companyId, t, rtl }) {
  const [costs, setCosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ car_id: '', driver_id: '', category: 'Fuel', amount: '', description: '', date: '' })
  const inp = inlineInput(rtl)
  const isMobile = useIsMobile()

  useEffect(() => { load() }, [companyId])
  async function load() {
    setLoading(true)
    const { data } = await supabase.from('costs').select('*').eq('company_id', companyId).order('date', { ascending: false })
    setCosts(data || [])
    setLoading(false)
  }
  async function add(e) {
    e.preventDefault()
    const { data, error } = await supabase.from('costs').insert([{
      company_id: companyId,
      car_id: form.car_id ? parseInt(form.car_id) : null,
      driver_id: form.driver_id ? parseInt(form.driver_id) : null,
      category: form.category, amount: parseFloat(form.amount),
      description: form.description || null, date: form.date,
    }]).select()
    if (!error && data) { setCosts(p => [data[0], ...p]); setShowAdd(false); setForm({ car_id: '', driver_id: '', category: 'Fuel', amount: '', description: '', date: '' }) }
  }
  async function del(id) {
    if (!window.confirm(t.confirmDelete)) return
    await supabase.from('costs').delete().eq('id', id)
    setCosts(p => p.filter(c => c.id !== id))
  }

  const total = costs.reduce((s, c) => s + parseFloat(c.amount || 0), 0)
  const byCategory = costs.reduce((acc, c) => { acc[c.category] = (acc[c.category] || 0) + parseFloat(c.amount || 0); return acc }, {})
  const catColors = { Fuel: C.primary, Insurance: C.success, Fine: C.danger, Repair: C.warning, Maintenance: '#8b5cf6', Other: C.textPrimaryMuted }
  const catLabel = { Fuel: t.catFuel, Insurance: t.catInsurance, Fine: t.catFine, Repair: t.catRepair, Maintenance: t.maintenance, Other: t.catOther }
  const carName = id => cars.find(c => c.id === parseInt(id))?.plate || id

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 24, direction: rtl ? 'rtl' : 'ltr' }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill,minmax(180px,1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: C.surface, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', gridColumn: 'span 1' }}>
          <div style={{ height: 3, background: gradient }} />
          <div style={{ padding: '16px 20px' }}>
            <span style={{ fontSize: 22 }}>💰</span>
            <p style={{ margin: '8px 0 0', fontSize: 30, fontWeight: 800, color: C.primary }}>${total.toFixed(2)}</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: C.textPrimarySecondary }}>{t.totalCost}</p>
          </div>
        </div>
        {Object.entries(byCategory).sort((a,b) => b[1]-a[1]).slice(0,4).map(([cat, amt]) => (
          <div key={cat} style={{ background: C.surface, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ height: 3, background: catColors[cat] || C.textPrimaryMuted }} />
            <div style={{ padding: '16px 20px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: catColors[cat] || C.textPrimaryMuted }}>${amt.toFixed(2)}</p>
              <p style={{ margin: 0, fontSize: 13, color: C.textPrimarySecondary }}>{catLabel[cat] || cat}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}>
        <div style={{ background: gradient, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>💰 {t.costsTab}</span>
          <button onClick={() => setShowAdd(p => !p)} style={{ ...btnPrimary, padding: '5px 14px', fontSize: 12, boxShadow: 'none', background: 'rgba(255,255,255,0.2)' }}>
            {showAdd ? t.cancel : t.newItem}
          </button>
        </div>
        {showAdd && (
          <form onSubmit={add} style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textPrimarySecondary }}>{t.category}</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inp}>
                {['Fuel','Insurance','Fine','Repair','Maintenance','Other'].map(v => <option key={v} value={v}>{catLabel[v] || v}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textPrimarySecondary }}>{t.amount}</label>
              <input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textPrimarySecondary }}>{t.serviceDate}</label>
              <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textPrimarySecondary }}>{t.cars}</label>
              <select value={form.car_id} onChange={e => setForm({ ...form, car_id: e.target.value })} style={inp}>
                <option value="">—</option>
                {cars.map(c => <option key={c.id} value={c.id}>{c.plate} {c.make}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textPrimarySecondary }}>{t.driver}</label>
              <select value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })} style={inp}>
                <option value="">—</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textPrimarySecondary }}>{t.actions}</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t.description + '…'} style={inp} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" style={{ ...btnPrimary, padding: '8px 18px', fontSize: 13, width: '100%' }}>{t.add}</button>
            </div>
          </form>
        )}
      </div>

      {/* Table */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
            <thead>
              <tr>
                {[t.serviceDate, t.category, t.amount, t.cars, t.driver, t.actions].map(h => (
                  <th key={h} style={mkTh(rtl)}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: C.textPrimaryMuted }}>{t.loadingShort}</td></tr>
              ) : costs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: C.textPrimaryMuted }}>{t.noCosts}</td></tr>
              ) : costs.map(c => (
                <tr key={c.id} style={{ background: C.surface }}>
                  <td style={mkTd(rtl)}>{c.date}</td>
                  <td style={mkTd(rtl)}><Badge label={catLabel[c.category] || c.category} color={catColors[c.category] || C.textPrimaryMuted} /></td>
                  <td style={{ ...mkTd(rtl), fontWeight: 700, color: C.textPrimaryPrimary }}>${parseFloat(c.amount).toFixed(2)}</td>
                  <td style={mkTd(rtl)}>{c.car_id ? carName(c.car_id) : '—'}</td>
                  <td style={mkTd(rtl)}>{c.driver_id ? (drivers.find(d => d.id === c.driver_id)?.name || '—') : '—'}</td>
                  <td style={mkTd(rtl)}><ActionBtn variant="delete" onClick={() => del(c.id)}>{t.delete}</ActionBtn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Activity Log section ─────────────────────────────────────────────────────
function ActivityLogSection({ companyId, t }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('activity_log').select('*').eq('company_id', companyId)
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [companyId])

  const actionLabel = { add: t.actionAdd, update: t.actionUpdate, delete: t.actionDelete }
  const actionColor = { add: C.success, update: C.primary, delete: C.danger }

  return (
    <div style={{ background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.textPrimaryPrimary }}>📋 {t.activityLog}</h3>
      {loading ? (
        <p style={{ color: C.textPrimarySecondary, fontSize: 14 }}>{t.loadingShort}</p>
      ) : logs.length === 0 ? (
        <p style={{ color: C.textPrimaryMuted, fontSize: 14 }}>{t.noActivity}</p>
      ) : logs.map(l => (
        <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: actionColor[l.action] || C.textPrimaryMuted, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, color: C.textPrimaryPrimary, fontWeight: 500 }}>
              <strong style={{ color: actionColor[l.action] || C.textPrimaryMuted }}>{actionLabel[l.action] || l.action}</strong>
              {' '}{l.entity_type}{l.entity_name ? ` — ${l.entity_name}` : ''}
            </span>
            <div style={{ fontSize: 11, color: C.textPrimaryMuted, marginTop: 2 }}>{l.user_email} · {new Date(l.created_at).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Dashboard component ─────────────────────────────────────────────────────
function filterByDate(items, filter) {
  if (filter === 'all') return items
  const now = new Date()
  return items.filter(item => {
    const d = new Date(item.created_at)
    if (filter === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    if (filter === 'quarter') return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3)
    if (filter === 'year') return d.getFullYear() === now.getFullYear()
    return true
  })
}

function Dashboard({ cars, drivers, branches, t, rtl, dashFilter, setDashFilter, onExport }) {
  const isMobile = useIsMobile()
  const filtCars     = filterByDate(cars,     dashFilter)
  const filtDrivers  = filterByDate(drivers,  dashFilter)
  const filtBranches = filterByDate(branches, dashFilter)

  const unassigned = filtCars.filter(c => !c.branch_id).length

  const carsPerBranch = filtBranches.map((b, i) => ({
    name: b.name, color: branchColor(i),
    count: filtCars.filter(c => c.branch_id === b.id).length,
  }))
  const driversPerBranch = filtBranches.map((b, i) => ({
    name: b.name, color: branchColor(i),
    count: filtDrivers.filter(d => d.branch_id === b.id).length,
  }))
  const maxCars    = Math.max(...carsPerBranch.map(b => b.count), 1)
  const maxDrivers = Math.max(...driversPerBranch.map(b => b.count), 1)

  const modelCounts = {}
  filtCars.forEach(c => { if (c.model) modelCounts[c.model] = (modelCounts[c.model] || 0) + 1 })
  const topModels = Object.entries(modelCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxModel  = Math.max(...topModels.map(([, n]) => n), 1)

  const card = (icon, value, label, color) => (
    <div key={label} style={{ background: C.surface, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
      <div style={{ padding: '18px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
          <p style={{ margin: 0, fontSize: 38, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: C.textPrimarySecondary, fontWeight: 500 }}>{label}</p>
      </div>
    </div>
  )

  const barChart = (title, data, max) => (
    <div style={{ background: C.surface, borderRadius: 10, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <h3 style={{ margin: '0 0 18px', fontSize: 14, fontWeight: 700, color: C.textPrimaryPrimary }}>{title}</h3>
      {data.length === 0
        ? <p style={{ color: C.textPrimaryMuted, fontSize: 13 }}>{t.noData}</p>
        : data.map(b => (
          <div key={b.name} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: C.textPrimaryPrimary, fontWeight: 500 }}>{b.name}</span>
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
    <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 24, direction: rtl ? 'rtl' : 'ltr' }}>

      {/* Dashboard toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 4 }}>
          {[['all', t.filterAll], ['month', t.filterMonth], ['quarter', t.filterQuarter], ['year', t.filterYear]].map(([k, l]) => (
            <button key={k} onClick={() => setDashFilter(k)} style={{
              padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: dashFilter === k ? C.primary : 'transparent',
              color: dashFilter === k ? '#fff' : C.textPrimarySecondary,
              transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={onExport} style={{ ...btnPrimary, padding: '7px 16px', fontSize: 12 }}>📥 {t.exportExcel}</button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : `repeat(${unassigned > 0 ? 4 : 3}, 1fr)`, gap: isMobile ? 10 : 16, marginBottom: 20 }}>
        {card('🚗', filtCars.length,     t.totalFleet,    C.primary)}
        {card('👤', filtDrivers.length,  t.totalDrivers,  C.success)}
        {card('🏢', filtBranches.length, t.totalBranches, '#8b5cf6')}
        {unassigned > 0 && card('⚠️', unassigned, t.unassigned, C.warning)}
      </div>

      {/* Bar charts */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 10 : 16, marginBottom: 20 }}>
        {barChart(t.carsByBranch,    carsPerBranch,    maxCars)}
        {barChart(t.driversByBranch, driversPerBranch, maxDrivers)}
      </div>

      {/* Top models + Branch table */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 10 : 16 }}>

        {/* Top models */}
        <div style={{ background: C.surface, borderRadius: 10, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: C.textPrimaryPrimary }}>{t.topModels}</h3>
          {topModels.length === 0
            ? <p style={{ color: C.textPrimaryMuted, fontSize: 13 }}>{t.noData}</p>
            : topModels.map(([model, count], i) => (
              <div key={model} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: branchColor(i), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, color: C.textPrimaryPrimary, fontWeight: 500 }}>{model}</span>
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
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: C.textPrimaryPrimary }}>{t.branchOverview}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: rtl ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: C.textPrimaryMuted, padding: '0 0 10px', borderBottom: `2px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.branchName}</th>
                <th style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.textPrimaryMuted, padding: '0 0 10px', borderBottom: `2px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.cars}</th>
                <th style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.textPrimaryMuted, padding: '0 0 10px', borderBottom: `2px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.drivers}</th>
              </tr>
            </thead>
            <tbody>
              {filtBranches.length === 0
                ? <tr><td colSpan={3} style={{ padding: '20px 0', textAlign: 'center', color: C.textPrimaryMuted, fontSize: 13 }}>{t.noData}</td></tr>
                : filtBranches.map((b, i) => (
                  <tr key={b.id}>
                    <td style={{ padding: '10px 0', fontSize: 13, color: C.textPrimaryPrimary, borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: rtl ? 'row-reverse' : 'row' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: branchColor(i), flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{b.name}</span>
                        <span style={{ fontSize: 11, color: C.textPrimaryMuted }}>{b.city}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.primary, background: C.primary + '12', borderRadius: 6, padding: '2px 10px' }}>
                        {filtCars.filter(c => c.branch_id === b.id).length}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.success, background: C.success + '12', borderRadius: 6, padding: '2px 10px' }}>
                        {filtDrivers.filter(d => d.branch_id === b.id).length}
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

// ── Settings Tab ────────────────────────────────────────────────────────────
function SettingsTab({ profile, companyId, session, isMaster, onSelectCompany, t, rtl }) {
  const company  = profile?.companies
  const isAdmin  = profile?.role === 'admin'

  // Shared member list state
  const [members, setMembers]   = useState([])
  const [copied, setCopied]     = useState(false)
  const [loading, setLoading]   = useState(true)

  // Admin: invite by email
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg]     = useState('')
  const [inviteErr, setInviteErr]     = useState('')
  const [inviting, setInviting]       = useState(false)

  // Master: company list + create
  const [companies, setCompanies]   = useState([])
  const [newName, setNewName]       = useState('')
  const [creating, setCreating]     = useState(false)
  const [masterMsg, setMasterMsg]   = useState('')
  const [masterErr, setMasterErr]   = useState('')
  const [editingLimits, setEditingLimits] = useState(null) // company id being edited
  const [limitCars, setLimitCars]   = useState('')
  const [limitUsers, setLimitUsers] = useState('')

  useEffect(() => {
    if (isMaster) {
      supabase.from('companies').select('*').order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setCompanies(data); setLoading(false) })
    } else {
      supabase.from('profiles').select('*').eq('company_id', companyId).order('created_at')
        .then(({ data }) => { if (data) setMembers(data); setLoading(false) })
    }
  }, [companyId, isMaster])

  function copyCode() {
    navigator.clipboard.writeText(company?.invite_code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function removeMember(memberId) {
    const { error } = await supabase.from('profiles').delete().eq('id', memberId)
    if (!error) setMembers(p => p.filter(m => m.id !== memberId))
  }

  async function sendInvite(e) {
    e.preventDefault()
    setInviteErr(''); setInviteMsg(''); setInviting(true)
    const email = inviteEmail.trim().toLowerCase()
    const { error } = await supabase.from('invites').insert({
      company_id: companyId,
      email,
      invited_by: session.user.id,
    })
    if (error) {
      setInviteErr(error.code === '23505' ? t.alreadyInvited : error.message)
    } else {
      setInviteMsg(t.inviteSent(email))
      setInviteEmail('')
    }
    setInviting(false)
  }

  async function createCompany(e) {
    e.preventDefault()
    setMasterErr(''); setMasterMsg(''); setCreating(true)
    const name = newName.trim()
    // Generate random 8-char invite code
    const code = Math.random().toString(36).substring(2, 6).toUpperCase() +
                 Math.random().toString(36).substring(2, 6).toUpperCase()
    const { data, error } = await supabase.from('companies').insert({
      name, invite_code: code, is_active: true,
    }).select().single()
    if (error) {
      setMasterErr(error.message)
    } else {
      setCompanies(p => [data, ...p])
      setNewName('')
      setMasterMsg(t.companyCreated(name, code))
    }
    setCreating(false)
  }

  async function toggleActive(company) {
    const { data } = await supabase.from('companies')
      .update({ is_active: !company.is_active })
      .eq('id', company.id)
      .select().single()
    if (data) setCompanies(p => p.map(c => c.id === data.id ? data : c))
  }

  function startEditLimits(co) {
    setEditingLimits(co.id)
    setLimitCars(co.max_cars ?? '')
    setLimitUsers(co.max_users ?? '')
  }

  async function saveLimits(co) {
    const { data } = await supabase.from('companies')
      .update({
        max_cars:  limitCars  === '' ? null : parseInt(limitCars),
        max_users: limitUsers === '' ? null : parseInt(limitUsers),
      })
      .eq('id', co.id)
      .select().single()
    if (data) setCompanies(p => p.map(c => c.id === data.id ? data : c))
    setEditingLimits(null)
  }

  const row   = { padding: '14px 0', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }
  const lbl   = { fontSize: 11, fontWeight: 700, color: C.textPrimarySecondary, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }
  const card  = { background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }
  const inp   = { width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: C.textPrimaryPrimary, background: C.bg }
  const msgOk = { color: C.success, fontSize: 13, background: C.success + '10', padding: '8px 12px', borderRadius: 6, border: `1px solid ${C.success}40` }
  const msgEr = { color: C.danger,  fontSize: 13, background: C.danger  + '10', padding: '8px 12px', borderRadius: 6, border: `1px solid ${C.danger}40`  }

  // ── MASTER VIEW ──────────────────────────────────────────────────────────
  if (isMaster) {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Create company */}
          <div style={card}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.textPrimary }}>➕ {t.createCompany}</h3>
            <form onSubmit={createCompany} style={{ display: 'flex', gap: 10 }}>
              <input
                value={newName} required
                onChange={e => setNewName(e.target.value)}
                placeholder={t.companyNamePlaceholder}
                style={{ ...inp, flex: 1 }}
              />
              <button type="submit" disabled={creating} style={{
                background: C.primary, color: '#fff', border: 'none',
                borderRadius: 7, padding: '9px 18px', fontSize: 13, fontWeight: 700,
                cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1, whiteSpace: 'nowrap',
              }}>
                {creating ? '…' : t.create}
              </button>
            </form>
            {masterMsg && <div style={{ ...msgOk, marginTop: 10 }}>{masterMsg}</div>}
            {masterErr && <div style={{ ...msgEr, marginTop: 10 }}>{masterErr}</div>}
          </div>

          {/* All companies list */}
          <div style={card}>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
              🏢 {t.allCompanies}
              <span style={{ marginLeft: 8, background: C.bg, color: C.textPrimarySecondary, borderRadius: 10, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>
                {companies.length}
              </span>
            </h3>
            {loading ? (
              <p style={{ color: C.textPrimarySecondary, fontSize: 14, paddingTop: 16 }}>{t.loadingShort}</p>
            ) : companies.length === 0 ? (
              <p style={{ color: C.textPrimarySecondary, fontSize: 14, paddingTop: 16 }}>{t.noCompanies}</p>
            ) : companies.map(co => (
              <div key={co.id} style={{ ...row, flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                {/* Row top: name + buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimaryPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {co.name}
                      <span style={{
                        fontSize: 11, borderRadius: 4, padding: '2px 7px', fontWeight: 700,
                        background: co.is_active ? C.success + '15' : C.danger + '15',
                        color: co.is_active ? C.success : C.danger,
                      }}>
                        {co.is_active ? t.activeStatus : t.closedStatus}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textPrimarySecondary, marginTop: 2, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                      {co.invite_code}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => onSelectCompany(co)} style={{
                      background: C.primary, color: '#fff', border: 'none',
                      borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>{t.manage}</button>
                    <button onClick={() => startEditLimits(co)} style={{
                      background: 'transparent', border: `1px solid ${C.border}`,
                      color: C.textPrimarySecondary, borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>⚙️</button>
                    <button onClick={() => toggleActive(co)} style={{
                      background: 'transparent',
                      border: `1px solid ${co.is_active ? C.danger + '40' : C.success + '40'}`,
                      color: co.is_active ? C.danger : C.success,
                      borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>{co.is_active ? t.closeCompany : t.reopenCompany}</button>
                  </div>
                </div>
                {/* Limits row — current values always visible */}
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.textPrimarySecondary }}>
                  <span>🚗 {t.maxCars}: <strong style={{ color: co.max_cars != null ? C.textPrimary : C.textPrimarySecondary }}>{co.max_cars ?? '∞'}</strong></span>
                  <span>👤 {t.maxUsers}: <strong style={{ color: co.max_users != null ? C.textPrimary : C.textPrimarySecondary }}>{co.max_users ?? '∞'}</strong></span>
                </div>
                {/* Inline limits editor */}
                {editingLimits === co.id && (
                  <div style={{ background: C.bg, borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ fontSize: 12, color: C.textPrimarySecondary, whiteSpace: 'nowrap' }}>🚗 {t.maxCars}</label>
                      <input type="number" min="0" value={limitCars} onChange={e => setLimitCars(e.target.value)}
                        placeholder={t.unlimited} style={{ width: 70, padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ fontSize: 12, color: C.textPrimarySecondary, whiteSpace: 'nowrap' }}>👤 {t.maxUsers}</label>
                      <input type="number" min="0" value={limitUsers} onChange={e => setLimitUsers(e.target.value)}
                        placeholder={t.unlimited} style={{ width: 70, padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: 'none' }} />
                    </div>
                    <button onClick={() => saveLimits(co)} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t.save}</button>
                    <button onClick={() => setEditingLimits(null)} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textPrimarySecondary, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>{t.cancel}</button>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    )
  }

  // ── REGULAR USER VIEW ────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Company info */}
        <div style={card}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: C.textPrimary }}>🏢 {t.companyName}</h3>

          <div style={{ marginBottom: 20 }}>
            <div style={lbl}>{t.companyName}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.textPrimary }}>{company?.name}</div>
          </div>

          <div>
            <div style={lbl}>{t.inviteCode}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontFamily: 'monospace', fontSize: 22, fontWeight: 900,
                letterSpacing: '0.15em', color: C.primary,
                background: C.primary + '12', padding: '8px 16px', borderRadius: 8,
                border: `1px solid ${C.primary}30`,
              }}>
                {company?.invite_code}
              </span>
              <button onClick={copyCode} style={{
                background: copied ? C.success : C.primary, color: '#fff',
                border: 'none', borderRadius: 8, padding: '8px 16px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s',
              }}>
                {copied ? t.codeCopied : t.copyCode}
              </button>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: C.textPrimarySecondary }}>
              {t.shareCodeHint}
            </p>
          </div>
        </div>

        {/* Admin: invite by email */}
        {isAdmin && (
          <div style={card}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: C.textPrimary }}>📨 {t.inviteByEmail}</h3>
            <form onSubmit={sendInvite} style={{ display: 'flex', gap: 10 }}>
              <input
                type="email" value={inviteEmail} required
                onChange={e => setInviteEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                style={{ ...inp, flex: 1 }}
              />
              <button type="submit" disabled={inviting} style={{
                background: C.primary, color: '#fff', border: 'none',
                borderRadius: 7, padding: '9px 18px', fontSize: 13, fontWeight: 700,
                cursor: inviting ? 'not-allowed' : 'pointer', opacity: inviting ? 0.7 : 1, whiteSpace: 'nowrap',
              }}>
                {inviting ? '…' : t.sendInvite}
              </button>
            </form>
            {inviteMsg && <div style={{ ...msgOk, marginTop: 10 }}>{inviteMsg}</div>}
            {inviteErr && <div style={{ ...msgEr, marginTop: 10 }}>{inviteErr}</div>}
          </div>
        )}

        {/* Members */}
        <div style={card}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
            👥 {t.members}
            <span style={{ marginLeft: 8, background: C.bg, color: C.textPrimarySecondary, borderRadius: 10, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>
              {members.length}
            </span>
          </h3>

          {loading ? (
            <p style={{ color: C.textPrimarySecondary, fontSize: 14 }}>{t.loadingShort}</p>
          ) : members.map(m => (
            <div key={m.id} style={row}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${C.navBg}, ${C.primary})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 14,
              }}>
                {(m.email || '?')[0].toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimaryPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {m.email}
                  {m.id === session.user.id && (
                    <span style={{ fontSize: 11, background: C.primary + '15', color: C.primary, borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>
                      {t.you}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: C.textPrimarySecondary, marginTop: 2 }}>
                  {m.role === 'admin' ? t.admin : t.member}
                </div>
              </div>

              {isAdmin && m.id !== session.user.id && (
                <button onClick={() => removeMember(m.id)} style={{
                  background: 'transparent', border: `1px solid ${C.danger}40`,
                  color: C.danger, borderRadius: 6, padding: '5px 10px',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                  {t.removeMember}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Activity log — admin only */}
        {isAdmin && companyId && <ActivityLogSection companyId={companyId} t={t} />}

      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
function FleetManager({ session, profile, isMaster, companyId, onSignOut, initialLang }) {
  const [branches, setBranches]   = useState([])
  const [drivers, setDrivers]     = useState([])
  const [cars, setCars]           = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [search, setSearch]       = useState('')
  const [lang, setLang]           = useState(initialLang || 'en')
  const isMobile                  = useIsMobile()
  const [filesFor, setFilesFor]   = useState(null)
  const [companyLimits, setCompanyLimits] = useState({ max_cars: null, max_users: null })
  const [viewCompanyId, setViewCompanyId]   = useState(isMaster ? null : companyId)
  const [viewCompanyName, setViewCompanyName] = useState(null)
  // New feature state
  const [selectedIds, setSelectedIds] = useState([])
  const [dashFilter, setDashFilter]   = useState('all')
  const realtimeRef = useRef(null)

  const t   = T[lang]
  const rtl = lang === 'he'
  const activeCompanyId = isMaster ? viewCompanyId : companyId

  useEffect(() => { loadAll() }, [activeCompanyId])

  // ── Real-time sync ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeCompanyId) return
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current)
    const channel = supabase.channel(`fleet-${activeCompanyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cars',     filter: `company_id=eq.${activeCompanyId}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers',  filter: `company_id=eq.${activeCompanyId}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branches', filter: `company_id=eq.${activeCompanyId}` }, () => loadAll())
      .subscribe()
    realtimeRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [activeCompanyId])

  async function loadAll() {
    setLoading(true)
    if (!activeCompanyId) { setBranches([]); setDrivers([]); setCars([]); setLoading(false); return }
    const [{ data: b }, { data: d }, { data: c }, { data: co }] = await Promise.all([
      supabase.from('branches').select('*').eq('company_id', activeCompanyId).order('created_at'),
      supabase.from('drivers').select('*').eq('company_id', activeCompanyId).order('created_at'),
      supabase.from('cars').select('*').eq('company_id', activeCompanyId).order('created_at'),
      supabase.from('companies').select('max_cars, max_users').eq('id', activeCompanyId).maybeSingle(),
    ])
    if (b) setBranches(b)
    if (d) setDrivers(d)
    if (c) setCars(c)
    if (co) setCompanyLimits(co)
    setLoading(false)
  }

  // ── Activity logging ──────────────────────────────────────────────────────
  async function logActivity(action, entityType, entityName) {
    if (!activeCompanyId) return
    await supabase.from('activity_log').insert([{
      company_id: activeCompanyId,
      user_email: session.user.email,
      action, entity_type: entityType, entity_name: entityName,
    }])
  }

  // ── Export to Excel ───────────────────────────────────────────────────────
  function exportExcel() {
    const wb = XLSX.utils.book_new()
    const carSheet  = XLSX.utils.json_to_sheet(cars.map(c => ({ Plate: c.plate, Make: c.make, Model: c.model, Year: c.year, Status: c.status, Fuel: c.fuel, Branch: getBranchName(c.branch_id) })))
    const drvSheet  = XLSX.utils.json_to_sheet(drivers.map(d => ({ Name: d.name, License: d.license, Phone: d.phone, Status: d.status, Branch: getBranchName(d.branch_id) })))
    const brnSheet  = XLSX.utils.json_to_sheet(branches.map(b => ({ Name: b.name, City: b.city, Address: b.address, Manager: b.manager, Phone: b.phone })))
    XLSX.utils.book_append_sheet(wb, carSheet, 'Vehicles')
    XLSX.utils.book_append_sheet(wb, drvSheet, 'Drivers')
    XLSX.utils.book_append_sheet(wb, brnSheet, 'Branches')
    XLSX.writeFile(wb, `fleet-export-${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  // ── Vehicle photo upload ──────────────────────────────────────────────────
  async function uploadCarPhoto(carId, file) {
    const safeName = file.name.replace(/[^\w.\-]/g, '_').replace(/^\.+/, '').replace(/\s+/g, '_')
    const path = `${activeCompanyId}/car-photos/${carId}/${Date.now()}_${safeName}`
    const { error: uploadErr } = await supabase.storage.from('fleet-documents').upload(path, file, { upsert: true })
    if (uploadErr) { setCrudError(uploadErr.message); return }
    const { error: dbErr } = await supabase.from('cars').update({ photo_url: path }).eq('id', carId)
    if (dbErr) { setCrudError(dbErr.message); return }
    setCars(p => p.map(c => c.id === carId ? { ...c, photo_url: path } : c))
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────
  function toggleSelect(id) { setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]) }
  function toggleSelectAll(items) {
    const ids = items.map(i => i.id)
    setSelectedIds(p => p.length === ids.length && ids.every(id => p.includes(id)) ? [] : ids)
  }
  async function bulkDelete(tab) {
    if (!selectedIds.length || !window.confirm(t.confirmDelete)) return
    const table = tab === 'cars' ? 'cars' : tab === 'drivers' ? 'drivers' : 'branches'
    await supabase.from(table).delete().in('id', selectedIds)
    if (tab === 'cars')    setCars(p => p.filter(x => !selectedIds.includes(x.id)))
    if (tab === 'drivers') setDrivers(p => p.filter(x => !selectedIds.includes(x.id)))
    if (tab === 'branches') setBranches(p => p.filter(x => !selectedIds.includes(x.id)))
    setSelectedIds([])
    logActivity('delete', tab, `${selectedIds.length} items`)
  }

  function switchToCompany(co) {
    setViewCompanyId(co.id)
    setViewCompanyName(co.name)
    switchTab('cars')
  }

  function cleanCar(f)    { return { plate: f.plate, make: f.make, model: f.model, year: f.year ? parseInt(f.year) : null, status: f.status || 'Available', fuel: f.fuel || 'Petrol', branch_id: f.branch_id || null, driver_id: f.driver_id || null, company_id: activeCompanyId } }
  function cleanDriver(f) { return { name: f.name, license: f.license, phone: f.phone || null, status: f.status || 'Active', branch_id: f.branch_id || null, company_id: activeCompanyId } }
  function cleanBranch(f) { return { name: f.name, city: f.city, address: f.address || null, manager: f.manager || null, phone: f.phone || null, company_id: activeCompanyId } }

  const [crudError, setCrudError] = useState('')

  async function addCar(form) {
    if (companyLimits.max_cars != null && cars.length >= companyLimits.max_cars) {
      setCrudError(t.limitReachedCars); return
    }
    const { data, error } = await supabase.from('cars').insert([cleanCar(form)]).select()
    if (error) { setCrudError(error.message); return }
    setCars(p => [...p, data[0]]); setShowAdd(false); setCrudError('')
    logActivity('add', 'car', `${form.plate} ${form.make}`)
  }
  async function updateCar(form) {
    const c = { ...cleanCar(form), id: form.id }
    const { error } = await supabase.from('cars').update(c).eq('id', c.id)
    if (error) { setCrudError(error.message); return }
    // Log driver assignment change for history
    const prev = cars.find(x => x.id === form.id)
    if (prev && prev.driver_id !== form.driver_id) {
      await supabase.from('driver_car_history').insert([{
        company_id: activeCompanyId, car_id: form.id,
        driver_id: form.driver_id || null,
        driver_name: drivers.find(d => d.id === form.driver_id)?.name || null,
        assigned_at: new Date().toISOString(),
      }])
    }
    setCars(p => p.map(x => x.id === c.id ? { ...x, ...c } : x)); setEditingId(null); setCrudError('')
    logActivity('update', 'car', `${form.plate} ${form.make}`)
  }
  async function deleteCar(id) {
    if (!window.confirm(t.confirmDelete)) return
    const car = cars.find(c => c.id === id)
    const { error } = await supabase.from('cars').delete().eq('id', id)
    if (error) { setCrudError(error.message); return }
    setCars(p => p.filter(c => c.id !== id))
    logActivity('delete', 'car', `${car?.plate} ${car?.make}`)
  }
  async function addDriver(form) {
    if (companyLimits.max_users != null && drivers.length >= companyLimits.max_users) {
      setCrudError(t.limitReachedUsers); return
    }
    const { data, error } = await supabase.from('drivers').insert([cleanDriver(form)]).select()
    if (error) { setCrudError(error.message); return }
    setDrivers(p => [...p, data[0]]); setShowAdd(false); setCrudError('')
    logActivity('add', 'driver', form.name)
  }
  async function updateDriver(form) {
    const d = { ...cleanDriver(form), id: form.id }
    const { error } = await supabase.from('drivers').update(d).eq('id', d.id)
    if (error) { setCrudError(error.message); return }
    setDrivers(p => p.map(x => x.id === d.id ? { ...x, ...d } : x)); setEditingId(null); setCrudError('')
    logActivity('update', 'driver', form.name)
  }
  async function deleteDriver(id) {
    if (!window.confirm(t.confirmDelete)) return
    const drv = drivers.find(d => d.id === id)
    const { error } = await supabase.from('drivers').delete().eq('id', id)
    if (error) { setCrudError(error.message); return }
    setDrivers(p => p.filter(d => d.id !== id))
    logActivity('delete', 'driver', drv?.name)
  }
  async function addBranch(form) {
    const { data, error } = await supabase.from('branches').insert([cleanBranch(form)]).select()
    if (error) { setCrudError(error.message); return }
    setBranches(p => [...p, data[0]]); setShowAdd(false); setCrudError('')
    logActivity('add', 'branch', form.name)
  }
  async function updateBranch(form) {
    const b = { ...cleanBranch(form), id: form.id }
    const { error } = await supabase.from('branches').update(b).eq('id', b.id)
    if (error) { setCrudError(error.message); return }
    setBranches(p => p.map(x => x.id === b.id ? { ...x, ...b } : x)); setEditingId(null); setCrudError('')
    logActivity('update', 'branch', form.name)
  }
  async function deleteBranch(id) {
    if (!window.confirm(t.confirmDelete)) return
    const brn = branches.find(b => b.id === id)
    const { error } = await supabase.from('branches').delete().eq('id', id)
    if (error) { setCrudError(error.message); return }
    setBranches(p => p.filter(b => b.id !== id))
    logActivity('delete', 'branch', brn?.name)
  }

  function getBranchName(id) { return branches.find(b => b.id === id)?.name || '—' }
  function getBranchIdx(id)  { return branches.findIndex(b => b.id === id) }
  function switchTab(tab)    { setActiveTab(tab); setEditingId(null); setShowAdd(false); setSearch(''); setSelectedIds([]); setCrudError('') }

  const q = search.toLowerCase()
  const filteredCars     = cars.filter(c     => c.plate?.toLowerCase().includes(q) || c.make?.toLowerCase().includes(q) || c.model?.toLowerCase().includes(q) || getBranchName(c.branch_id).toLowerCase().includes(q))
  const filteredDrivers  = drivers.filter(d  => d.name?.toLowerCase().includes(q)  || d.license?.toLowerCase().includes(q) || d.phone?.toLowerCase().includes(q) || getBranchName(d.branch_id).toLowerCase().includes(q))
  const filteredBranches = branches.filter(b => b.name?.toLowerCase().includes(q)  || b.city?.toLowerCase().includes(q) || b.manager?.toLowerCase().includes(q))

  const tabs = [
    { id: 'dashboard',   label: t.dashboard,      icon: '📊', count: null },
    { id: 'cars',        label: t.fleet,          icon: '🚗', count: cars.length },
    { id: 'drivers',     label: t.drivers,        icon: '👤', count: drivers.length },
    { id: 'branches',    label: t.branches,       icon: '🏢', count: branches.length },
    { id: 'maintenance', label: t.maintenanceTab, icon: '🔧', count: null },
    { id: 'costs',       label: t.costsTab,       icon: '💰', count: null },
    { id: 'settings',    label: t.settings,       icon: '⚙️', count: null },
  ]

  const activeTabData  = tabs.find(tab => tab.id === activeTab)
  const boardLabel     = activeTab === 'cars' ? t.allVehicles : activeTab === 'drivers' ? t.allDrivers : t.allBranches
  const currentCount   = activeTab === 'cars' ? filteredCars.length : activeTab === 'drivers' ? filteredDrivers.length : filteredBranches.length

  if (loading && activeCompanyId) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: C.bg, width: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${C.primary}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: C.textPrimarySecondary, margin: 0, fontSize: 14 }}>{t.loading}</p>
      </div>
    </div>
  )

  return (
    // Outer wrapper: always LTR so the nav never flips
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', fontFamily: "'Inter','Figtree',system-ui,sans-serif", background: C.bg }}>

      {/* ── TOP NAVIGATION BAR ────────────────────────────────────────────── */}
      <nav style={{
        background: C.navBg,
        borderBottom: `1px solid ${C.navBorder}`,
        height: isMobile ? 44 : 56,
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '0 10px' : '0 24px',
        gap: 6,
        flexShrink: 0,
        direction: 'ltr',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: isMobile ? 0 : 24, flex: isMobile ? 1 : 'none' }}>
          <div style={{
            width: isMobile ? 26 : 34, height: isMobile ? 26 : 34, borderRadius: isMobile ? 7 : 9, flexShrink: 0,
            background: `linear-gradient(135deg, ${C.primary}, ${C.indigo})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(59,130,246,0.45)',
          }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: isMobile ? 11 : 15, letterSpacing: '-0.5px' }}>FL</span>
          </div>
          {!isMobile && <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>{t.appName}</span>}
        </div>

        {/* Nav tabs — desktop only, hidden on mobile (tabs move to bottom bar) */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, direction: rtl ? 'rtl' : 'ltr' }}>
            {tabs.map(item => (
              <button key={item.id} onClick={() => switchTab(item.id)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                minWidth: 110,
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
        )}

        {/* User email + sign out */}
        {session && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isMobile && <span style={{ color: C.navText, fontSize: 12, whiteSpace: 'nowrap' }}>{session.user.email}</span>}
            {isMaster && viewCompanyName && (
              <span style={{
                background: C.primary + '40', color: C.navActive,
                borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              }}>
                🏢 {viewCompanyName}
              </span>
            )}
            <button onClick={onSignOut} style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: C.navText, borderRadius: 5, padding: isMobile ? '3px 7px' : '4px 10px',
              fontSize: isMobile ? 11 : 12, fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.15s', whiteSpace: 'nowrap',
            }}>
              {isMobile ? '↩' : t.signOut}
            </button>
          </div>
        )}

        {/* Language toggle */}
        <div style={{ display: 'flex', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', overflow: 'hidden', flexShrink: 0 }}>
          {['en', 'he'].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              padding: isMobile ? '3px 7px' : '5px 14px', border: 'none', cursor: 'pointer',
              fontSize: isMobile ? 10 : 12, fontWeight: 700, letterSpacing: '0.04em',
              background: lang === l ? 'rgba(255,255,255,0.2)' : 'transparent',
              color: lang === l ? '#fff' : 'rgba(255,255,255,0.45)',
              transition: 'all 0.15s',
            }}>
              {l === 'en' ? 'EN' : 'HE'}
            </button>
          ))}
        </div>
      </nav>

      {/* ── MOBILE BOTTOM TAB BAR ─────────────────────────────────────────── */}
      {isMobile && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: C.navBg, borderTop: `1px solid ${C.navBorder}`,
          display: 'flex', direction: 'ltr',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {tabs.map(item => (
            <button key={item.id} onClick={() => switchTab(item.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 1, padding: '6px 2px',
              border: 'none', cursor: 'pointer', background: 'transparent',
              color: activeTab === item.id ? '#fff' : C.navText,
              borderTop: activeTab === item.id ? `2px solid ${C.primary}` : '2px solid transparent',
              transition: 'color 0.15s', minWidth: 0,
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {activeTab === item.id && (
                <span style={{ fontSize: 8, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', padding: '0 2px' }}>{item.label}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      <div dir={rtl ? 'rtl' : 'ltr'} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: isMobile ? 48 : 0 }}>

        {/* Sub-header */}
        <div style={{
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: isMobile ? '0 10px' : '0 24px',
          height: isMobile && activeTab !== 'dashboard' && activeTab !== 'settings' ? 'auto' : (isMobile ? 44 : 56),
          minHeight: isMobile ? 44 : 56,
          display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 14, flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          paddingTop: isMobile && activeTab !== 'dashboard' && activeTab !== 'settings' ? 8 : 0,
          paddingBottom: isMobile && activeTab !== 'dashboard' && activeTab !== 'settings' ? 8 : 0,
        }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? 13 : 17, fontWeight: 700, color: C.textPrimaryPrimary, flex: 1 }}>
            {activeTabData?.icon} {activeTabData?.label}
          </h2>

          {/* Search + New item — hidden on dashboard and settings */}
          {activeTab !== 'dashboard' && activeTab !== 'settings' && <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: isMobile ? '5px 8px' : '6px 12px', width: isMobile ? '100%' : 220, order: isMobile ? 3 : 0 }}>
              <span style={{ fontSize: 12, color: C.textPrimaryMuted, order: rtl ? 1 : 0 }}>🔍</span>
              <input placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: isMobile ? 12 : 13, color: C.textPrimaryPrimary, width: '100%', direction: rtl ? 'rtl' : 'ltr' }} />
            </div>
            <button onClick={() => { setShowAdd(true); setEditingId(null) }} style={{
              background: `linear-gradient(135deg, ${C.primary}, ${C.indigo})`, color: '#fff', border: 'none',
              borderRadius: 7, padding: isMobile ? '6px 10px' : '8px 18px',
              fontSize: isMobile ? 16 : 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 2px 10px rgba(59,130,246,0.35)', transition: 'opacity 0.15s',
              whiteSpace: 'nowrap', minWidth: isMobile ? 34 : 'auto', letterSpacing: '0.01em',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              {isMobile ? '+' : t.newItem}
            </button>
          </>}
        </div>

        {/* Dashboard view */}
        {activeTab === 'dashboard' && (
          <Dashboard cars={cars} drivers={drivers} branches={branches} t={t} rtl={rtl} dashFilter={dashFilter} setDashFilter={setDashFilter} onExport={exportExcel} />
        )}

        {/* Settings view */}
        {activeTab === 'settings' && (
          <SettingsTab profile={profile} companyId={activeCompanyId} session={session} isMaster={isMaster} onSelectCompany={switchToCompany} t={t} rtl={rtl} />
        )}

        {/* Maintenance tab */}
        {activeTab === 'maintenance' && activeCompanyId && (
          <MaintenanceTab cars={cars} companyId={activeCompanyId} t={t} rtl={rtl} />
        )}

        {/* Costs tab */}
        {activeTab === 'costs' && activeCompanyId && (
          <CostsTab cars={cars} drivers={drivers} companyId={activeCompanyId} t={t} rtl={rtl} />
        )}

        {/* Board */}
        {activeTab !== 'dashboard' && activeTab !== 'settings' && isMaster && !activeCompanyId && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: C.textPrimarySecondary }}>
            <span style={{ fontSize: 40 }}>🏢</span>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{t.selectCompanyPrompt}</p>
            <p style={{ margin: 0, fontSize: 13 }}>{t.selectCompanyHint}</p>
          </div>
        )}
        {activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'maintenance' && activeTab !== 'costs' && (!isMaster || activeCompanyId) && <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 8 : 24 }}>
          <div style={{ background: C.surface, borderRadius: isMobile ? 8 : 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', animation: 'fadeIn 0.2s ease' }}>

            {/* Group header */}
            <div style={{ background: `linear-gradient(90deg, ${C.primary}, ${C.indigo})`, padding: isMobile ? '8px 12px' : '12px 20px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: isMobile ? 12 : 13, letterSpacing: '0.01em' }}>{boardLabel}</span>
              <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{currentCount}</span>
              <div style={{ flex: 1 }} />
              {/* Export button */}
              {!isMobile && <button onClick={exportExcel} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                📥 {t.exportExcel}
              </button>}
            </div>

            {/* Bulk actions bar */}
            {selectedIds.length > 0 && (
              <div style={{ background: C.primary + '10', borderBottom: `1px solid ${C.primary}30`, padding: isMobile ? '6px 10px' : '8px 18px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: isMobile ? 11 : 13, color: C.primary, fontWeight: 600 }}>{selectedIds.length} {t.itemsSelected}</span>
                <button onClick={() => bulkDelete(activeTab)} style={{ ...btnDanger, padding: isMobile ? '4px 10px' : '5px 14px', fontSize: 11 }}>🗑 {t.bulkDelete}</button>
                <button onClick={() => setSelectedIds([])} style={{ ...btnGhost, padding: isMobile ? '4px 7px' : '5px 10px', fontSize: 11 }}>✕</button>
              </div>
            )}

            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 600 : 'auto' }}>
              <thead>
                <tr>
                  {/* Checkbox select-all */}
                  <th style={{ ...mkTh(rtl, isMobile), width: 36, padding: isMobile ? '8px 8px' : '11px 12px' }}>
                    <input type="checkbox"
                      checked={selectedIds.length > 0 && (activeTab === 'cars' ? filteredCars : activeTab === 'drivers' ? filteredDrivers : filteredBranches).every(x => selectedIds.includes(x.id))}
                      onChange={() => toggleSelectAll(activeTab === 'cars' ? filteredCars : activeTab === 'drivers' ? filteredDrivers : filteredBranches)}
                      style={{ cursor: 'pointer' }} />
                  </th>
                  {activeTab === 'cars' && <>
                    <th style={mkTh(rtl, isMobile)}>{t.plate}</th>
                    <th style={mkTh(rtl, isMobile)}>{t.make} / {t.model}</th>
                    <th style={mkTh(rtl, isMobile)}>{t.year}</th>
                    <th style={mkTh(rtl, isMobile)}>{t.status}</th>
                    <th style={mkTh(rtl, isMobile)}>{t.fuel}</th>
                    <th style={mkTh(rtl, isMobile)}>{t.branch}</th>
                    <th style={mkTh(rtl, isMobile)}>{t.driver}</th>
                    <th style={{ ...mkTh(rtl, isMobile), width: isMobile ? 90 : 140 }}>{t.actions}</th>
                  </>}
                  {activeTab === 'drivers' && <>
                    <th style={mkTh(rtl, isMobile)}>{t.name}</th>
                    <th style={mkTh(rtl, isMobile)}>{t.license}</th>
                    <th style={mkTh(rtl, isMobile)}>{t.phone}</th>
                    <th style={mkTh(rtl, isMobile)}>{t.driverStatus}</th>
                    <th style={mkTh(rtl, isMobile)}>{t.branch}</th>
                    <th style={{ ...mkTh(rtl, isMobile), width: isMobile ? 90 : 140 }}>{t.actions}</th>
                  </>}
                  {activeTab === 'branches' && <>
                    <th style={mkTh(rtl, isMobile)}>{t.branchName}</th>
                    <th style={mkTh(rtl, isMobile)}>{t.city}</th>
                    <th style={mkTh(rtl, isMobile)}>{t.address}</th>
                    <th style={mkTh(rtl, isMobile)}>{t.manager}</th>
                    <th style={mkTh(rtl, isMobile)}>{t.phone}</th>
                    <th style={{ ...mkTh(rtl, isMobile), width: isMobile ? 90 : 140 }}>{t.actions}</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {activeTab === 'cars' && filteredCars.map(car =>
                  editingId === car.id
                    ? <EditableCarRow key={car.id} car={car} branches={branches} drivers={drivers} onSave={updateCar} onCancel={() => setEditingId(null)} t={t} rtl={rtl} mobile={isMobile} />
                    : <CarRow key={car.id} car={car} getBranchName={getBranchName} getBranchIdx={getBranchIdx} drivers={drivers}
                        selected={selectedIds.includes(car.id)} onSelect={() => toggleSelect(car.id)}
                        onEdit={() => setEditingId(car.id)} onDelete={() => deleteCar(car.id)} onFiles={() => setFilesFor({ entity: car, entityType: 'car' })}
                        onPhotoChange={file => uploadCarPhoto(car.id, file)} t={t} rtl={rtl} mobile={isMobile} />
                )}
                {activeTab === 'cars' && filteredCars.length === 0 && !showAdd && <tr><td colSpan={9} style={{ padding: isMobile ? '24px 12px' : '40px', textAlign: 'center', color: C.textPrimaryMuted, fontSize: isMobile ? 12 : 14 }}>{t.noCars}</td></tr>}
                {activeTab === 'cars' && showAdd && <AddCarRow branches={branches} drivers={drivers} onAdd={addCar} onCancel={() => setShowAdd(false)} t={t} rtl={rtl} mobile={isMobile} />}

                {activeTab === 'drivers' && filteredDrivers.map(driver =>
                  editingId === driver.id
                    ? <EditableDriverRow key={driver.id} driver={driver} branches={branches} onSave={updateDriver} onCancel={() => setEditingId(null)} t={t} rtl={rtl} mobile={isMobile} />
                    : <DriverRow key={driver.id} driver={driver} getBranchName={getBranchName} getBranchIdx={getBranchIdx}
                        selected={selectedIds.includes(driver.id)} onSelect={() => toggleSelect(driver.id)}
                        onEdit={() => setEditingId(driver.id)} onDelete={() => deleteDriver(driver.id)} onFiles={() => setFilesFor({ entity: driver, entityType: 'driver' })} t={t} rtl={rtl} mobile={isMobile} />
                )}
                {activeTab === 'drivers' && filteredDrivers.length === 0 && !showAdd && <tr><td colSpan={7} style={{ padding: isMobile ? '24px 12px' : '40px', textAlign: 'center', color: C.textPrimaryMuted, fontSize: isMobile ? 12 : 14 }}>{t.noDrivers}</td></tr>}
                {activeTab === 'drivers' && showAdd && <AddDriverRow branches={branches} onAdd={addDriver} onCancel={() => setShowAdd(false)} t={t} rtl={rtl} mobile={isMobile} />}

                {activeTab === 'branches' && filteredBranches.map((branch, i) =>
                  editingId === branch.id
                    ? <EditableBranchRow key={branch.id} branch={branch} onSave={updateBranch} onCancel={() => setEditingId(null)} t={t} rtl={rtl} mobile={isMobile} />
                    : <BranchRow key={branch.id} branch={branch} index={i}
                        selected={selectedIds.includes(branch.id)} onSelect={() => toggleSelect(branch.id)}
                        onEdit={() => setEditingId(branch.id)} onDelete={() => deleteBranch(branch.id)} t={t} rtl={rtl} mobile={isMobile} />
                )}
                {activeTab === 'branches' && filteredBranches.length === 0 && !showAdd && <tr><td colSpan={7} style={{ padding: isMobile ? '24px 12px' : '40px', textAlign: 'center', color: C.textPrimaryMuted, fontSize: isMobile ? 12 : 14 }}>{t.noBranches}</td></tr>}
                {activeTab === 'branches' && showAdd && <AddBranchRow onAdd={addBranch} onCancel={() => setShowAdd(false)} t={t} rtl={rtl} mobile={isMobile} />}
              </tbody>
            </table>
            </div>{/* end overflowX scroll wrapper */}

            {/* Inline error banner */}
            {crudError && (
              <div style={{ padding: '10px 18px', background: C.danger + '10', borderTop: `1px solid ${C.danger}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: C.danger, fontWeight: 600 }}>⚠ {crudError}</span>
                <button onClick={() => setCrudError('')} style={{ ...closeBtn, fontSize: 16 }}>×</button>
              </div>
            )}

            {/* Footer add link */}
            <div style={{ padding: '8px 18px', borderTop: `1px solid ${C.border}`, background: C.footerBg }}>
              <button onClick={() => { setShowAdd(true); setEditingId(null); setCrudError('') }} style={{
                background: 'transparent', border: 'none', color: C.textPrimarySecondary,
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

      {/* Files modal */}
      {filesFor && (
        <FilesModal
          entity={filesFor.entity}
          entityType={filesFor.entityType}
          companyId={activeCompanyId}
          onClose={() => setFilesFor(null)}
          t={t}
        />
      )}
    </div>
  )
}

export default FleetManager
