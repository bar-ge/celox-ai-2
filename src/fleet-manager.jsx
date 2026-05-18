import { supabase } from './supabaseClient'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import ExcelJS from 'exceljs'
import { isEmpty, isIsraeliPlate, isIsraeliPhone, isMinLen, isYear, isPositive, friendlyDbError } from './validators'

async function xlsxDownload(wb, filename) {
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
function xlsxAddSheet(wb, sheetName, rows) {
  if (!rows?.length) return
  const ws = wb.addWorksheet(sheetName)
  ws.columns = Object.keys(rows[0]).map(k => ({ header: k, key: k, width: 20 }))
  ws.addRows(rows)
}

// ── Date input (DD/MM/YY format) ───────────────────────────────────────────
function DateInput({ value, onChange, style, required, placeholder }) {
  const toDisplay = iso => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return ''
    return `${d}/${m}/${y.slice(-2)}`
  }
  const toISO = digits => {
    if (digits.length < 6) return ''
    const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 6)
    return `20${y}-${m}-${d}`
  }
  const [text, setText] = useState(() => toDisplay(value))
  useEffect(() => { setText(toDisplay(value)) }, [value])

  const handleChange = e => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    let formatted = digits
    if (digits.length > 4) formatted = digits.slice(0,2) + '/' + digits.slice(2,4) + '/' + digits.slice(4)
    else if (digits.length > 2) formatted = digits.slice(0,2) + '/' + digits.slice(2)
    setText(formatted)
    const iso = toISO(digits)
    if (iso.match(/^\d{4}-\d{2}-\d{2}$/)) onChange({ target: { value: iso } })
    else if (!digits) onChange({ target: { value: '' } })
  }

  return (
    <input
      type="text"
      value={text}
      onChange={handleChange}
      placeholder={placeholder || 'DD/MM/YY'}
      maxLength={8}
      style={style}
      required={required}
    />
  )
}

// Convert YYYY-MM-DD → DD/MM/YY for display
function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y.slice(-2)}`
}

// ── Multi-select checkbox dropdown ─────────────────────────────────────────
// Uses a portal so the dropdown is never clipped by table overflow or z-index
function MultiSelect({ options, value = [], onChange, placeholder, style, getLabel }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState({ top: 0, left: 0, width: 180 })
  const triggerRef  = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handler(e) {
      const inTrigger  = triggerRef.current  && triggerRef.current.contains(e.target)
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target)
      if (!inTrigger && !inDropdown) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleOpen() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 2, left: r.left, width: Math.max(r.width, 180) })
    }
    setOpen(p => !p)
  }

  const toggle = v => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  const lbl    = v => getLabel ? getLabel(v) : v

  return (
    <div ref={triggerRef} onClick={handleOpen}
      style={{ ...style, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
      <span style={{ color: value.length ? '#1e293b' : '#94a3b8', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        {value.length ? value.map(lbl).join(', ') : placeholder}
      </span>
      <span style={{ fontSize: 10, marginInlineStart: 4, color: '#64748b', flexShrink: 0 }}>▾</span>

      {open && createPortal(
        <div ref={dropdownRef} onMouseDown={e => e.stopPropagation()}
          className="dropdown-enter"
          style={{
            position: 'fixed', zIndex: 99999,
            top: pos.top, left: pos.left, width: pos.width,
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            padding: '6px 0', maxHeight: 240, overflowY: 'auto',
          }}>
          {options.map(opt => (
            <label key={opt} onClick={e => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13, color: '#1e293b' }}>
              <input type="checkbox" checked={value.includes(opt)}
                onChange={() => toggle(opt)}
                style={{ accentColor: '#0891b2', width: 15, height: 15 }} />
              {lbl(opt)}
            </label>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

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
  primary:      '#0891b2',
  primaryHover: '#0e7490',
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
  rowHover:     '#ecfeff',
  rowAdd:       '#ecfeff',
  footerBg:     '#f8fafc',
}

const BRANCH_COLORS = ['#0891b2','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#f97316','#ec4899']
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
    // file types
    ftLicense:'License', ftInvoice:'Invoice', ftInsurance:'Insurance', ftRegistration:'Registration',
    ftInspection:'Inspection', ftID:'ID', ftOther:'Other',
    // vehicle types
    vtSedan:'Sedan', vtSUV:'SUV', vtTruck:'Truck', vtVan:'Van', vtBus:'Bus', vtMotorcycle:'Motorcycle',
    // drivers
    name:'Name', license:'License', phone:'Phone', driverStatus:'Status', active:'Active', inactive:'Inactive',
    // branches
    branchName:'Branch Name', city:'City', address:'Address', manager:'Manager',
    driver:'Driver', noBranch:'No branch', noDriver:'No driver',
    noCars:'No vehicles found. Click + New Item to add one.',
    noDrivers:'No drivers found. Click + New Item to add one.',
    noBranches:'No branches found. Click + New Item to add one.',
    noMatches:'No matches found', noVehiclesYet:'No vehicles yet', noDriversYet:'No drivers yet', noBranchesYet:'No branches yet',
    tryDifferentSearch:'Try a different search term',
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
    exportAllData:'Export All Data', exportAllDataDesc:'Download all company data as an Excel file (vehicles, drivers, costs, maintenance, documents, activity log).',
    exporting:'Exporting…',
    inviteByEmail:'Invite by Email', sendInvite:'Send Invite',
    shareCodeHint:'Share this code with teammates so they can join your company.',
    selectCompanyPrompt:'Select a company to manage',
    selectCompanyHint:'Go to Settings → click Manage next to a company',
    files:'Files', uploadFile:'Upload File', noFiles:'No files yet.',
    expiryDate:'Expiry Date', expired:'Expired', expiresIn:'Expires in', clearExpiry:'Clear',
    maxCars:'Max Vehicles', maxUsers:'Max Users',
    limitReachedCars:'Vehicle limit reached for this company.',
    limitReachedUsers:'User limit reached for this company.',
    requiredFields:'Plate, make and model are required.',
    yearRange:'Year must be between 1900 and 2099.',
    signOut:'Sign Out', loadingShort:'Loading…', emailPlaceholder:'colleague@example.com',
    confirmDelete:'Are you sure you want to delete this item?',
    customLists:'Custom Lists', defaults:'Defaults',
    listCarStatus:'Vehicle Status', listDriverStatus:'Driver Status',
    listFuelType:'Fuel Types', listFileType:'Document Types', listMaintenanceType:'Maintenance Types',
    listLicenseLevel:'License Levels', licenseLevel:'License Level', licenseExpiry:'License Expiry',
    addValue:'Add value…', noCustomValues:'No custom values yet.', docType:'Document Type',
    customListsHint:'Add custom options to the dropdowns used across the app. Built-in defaults cannot be removed.',
    // maintenance
    maintenanceTab:'Maintenance', serviceType:'Service Type', serviceDate:'Date', nextDue:'Next Due',
    noMaintenance:'No maintenance records yet.',
    oilChange:'Oil Change', tireRotation:'Tire Rotation', inspection:'Inspection',
    brakeService:'Brake Service', otherService:'Other',
    scheduled:'Scheduled', done:'Done', overdue:'Overdue',
    upcomingMaintenance:'Upcoming & Overdue', historyMaintenance:'Service History',
    maintenancePlans:'Maintenance Plans', newPlan:'+ New Plan', noPlans:'No maintenance plans yet.',
    planInterval:'Interval', planKm:'Every (km)', planMonths:'Every (months)', planLastKm:'Last Service (km)',
    planLastDate:'Last Service Date', planNextKm:'Next at (km)', planNextDate:'Next Date',
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
    noActivity:'No activity yet.', loadMore:'Load more…',
    // bulk & export
    selectAll:'Select All', bulkDelete:'Delete Selected', bulkAssign:'Assign Branch',
    exportExcel:'Export Excel', exportPDF:'Export PDF',
    // dashboard filter
    filterAll:'All Time', filterMonth:'This Month', filterQuarter:'This Quarter', filterYear:'This Year',
    // photo
    photo:'Photo', uploadPhoto:'Upload Photo', changePhoto:'Change Photo',
    description:'Description', unlimited:'Unlimited', itemsSelected:'selected',
    fileTooLarge:'File too large (max 10 MB).', fileTypeNotAllowed:'File type not allowed.',
    photoTooLarge:'Photo too large (max 5 MB).', photoTypeNotAllowed:'Only JPG, PNG, WebP or GIF images allowed.',
    totalCost:'Total Cost', costByCategory:'Cost by Category', recentCosts:'Recent Costs',
    maintenanceDue:'Maintenance Due', maintenanceHistory:'Service History',
    // dashboard extras
    fleetStatus:'Fleet Status', utilizationRate:'Driver Utilization Rate', driverAssignment:'Driver Assignment',
    recentVehicles:'Recently Added Vehicles', noRecentVehicles:'No vehicles added yet.',
    assigned:'Assigned', unassignedDrivers:'Unassigned',
    // csv import (fuel)
    importCsv:'Import CSV', csvImportTitle:'Import Fuel CSV', csvSelectFile:'Import CSV file',
    csvPreview:'Preview', csvConfirmImport: n => `Import ${n} rows`, csvImporting:'Importing…',
    csvImported: n => `${n} records imported successfully.`, csvError:'Failed to read file.',
    csvStation:'Station', csvLiters:'Liters', csvFuelType:'Fuel Type',
    csvSkipNote:'Rows where the vehicle plate is not found in the system will be skipped.',
    csvNoRows:'No valid rows found in file.', csvVehicleNotFound:'Not found',
    // csv import (cars/drivers)
    importCsvCars:'Import Vehicles CSV', importCsvDrivers:'Import Drivers CSV',
    csvCarsCols:'Expected columns: Plate, Make, Model, Year, Status, Fuel, Branch, Driver',
    csvDriversCols:'Expected columns: Name, License, Phone, Status, Branch',
    csvEditNote:'You can edit any row before importing.',
    csvDuplicateSkipped:'(duplicate plate — will be skipped)',
    csvImportedCars: n => `${n} vehicles imported successfully.`,
    csvImportedDrivers: n => `${n} drivers imported successfully.`,
    csvRowError:'Some rows have errors and will be skipped.',
    // plate lookup
    plateLookup:'Lookup', plateLookupLoading:'Searching…', plateLookupNotFound:'Plate not found',
    plateLookupFilled:'Details filled from Ministry of Transport',
    // accident report
    accidentReports:'Accident Reports', newAccidentReport:'+ New Report',
    accidentFormTitle:'Accident Report', accidentFormSub:'Report a new vehicle accident',
    myCar:'My Vehicle', otherDriverInfo:"Other Driver's Info",
    otherPlate:'Plate Number', otherMake:'Make', otherModel:'Model',
    otherDriverName:'Driver Name', otherDriverPhone:'Phone',
    incidentDate:'Incident Date', incidentDesc:'What happened?',
    incidentDescPlaceholder:'Describe what happened — location, damage, circumstances…',
    attachFiles:'Attach Files (photos / police report)',
    uploading:'Uploading…', submitReport:'Submit Report',
    reportSubmitted:'Report submitted successfully.',
    noAccidentReports:'No accident reports yet.',
    accidentFiles:'Files', viewReport:'View',
    accidentOnHold:'On Hold', accidentOpen:'Open', accidentClosed:'Closed',
    holdReport:'⏸ Hold', resumeReport:'▶ Resume',
    sendEmailReport:'📧 Email', sendViaEmail:'Send via Email',
    viewDetails:'👁 View Details',
    // legal & privacy
    legalTitle:'Legal', legalDesc:'Read our policies on data protection and terms of use.',
    legalContact:'Questions? Contact us at',
    privacyPolicy:'Privacy Policy', privacyPolicyDesc:'How we collect and protect your data',
    termsOfService:'Terms of Service', termsOfServiceDesc:'Rules and conditions for using Celox AI',
    privacyClose:'Close',
    tosTitle:'Terms of Service — Celox AI',
    tosUpdated:'Last updated: April 16, 2026',
    tos1Title:'1. Acceptance of Terms',
    tos1:'By accessing or using Celox AI ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.',
    tos2Title:'2. Description of Service',
    tos2:'Celox AI provides a SaaS fleet management platform including vehicle tracking, driver management, maintenance scheduling, and reporting tools.',
    tos3Title:'3. Account Responsibilities',
    tos3Items:['You are responsible for maintaining the confidentiality of your account credentials.','You must provide accurate and complete information when registering.','You are responsible for all activity that occurs under your account.','You must notify us immediately of any unauthorized use of your account.'],
    tos4Title:'4. Acceptable Use',
    tos4:'You agree not to misuse the Service. Prohibited activities include: unauthorized access to other accounts, uploading malicious content, reverse engineering the platform, or using the Service for unlawful purposes.',
    tos5Title:'5. Data and Privacy',
    tos5:'Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to the collection and use of your information as described therein.',
    tos6Title:'6. Payment and Billing',
    tos6:'Paid plans are billed in advance. All fees are non-refundable except as required by law. We reserve the right to change pricing with 30 days notice.',
    tos7Title:'7. Termination',
    tos7:'We reserve the right to suspend or terminate your account for violation of these terms. You may cancel your account at any time. Upon termination, your data will be retained for 30 days then deleted.',
    tos8Title:'8. Limitation of Liability',
    tos8:'Celox AI is provided "as is". We are not liable for indirect, incidental, or consequential damages. Our total liability shall not exceed the amount you paid us in the 12 months prior to the claim.',
    tos9Title:'9. Governing Law',
    tos9:'These terms are governed by the laws of the State of Israel. Any disputes shall be resolved in the competent courts of Tel Aviv.',
    tos10Title:'10. Contact',
    tos10:'For questions about these Terms, contact us at support@celoxai.com.',
    privacyTitle:'Privacy Policy — Celox AI',
    privacyUpdated:'Last updated: April 12, 2026',
    privacyIntroTitle:'1. Introduction',
    privacyIntro:'Celox AI Ltd. ("we", "our") operates a SaaS fleet management platform. This policy explains what personal data we collect, how we use it, and the rights you have under the Israeli Privacy Protection Law (1981) and its 2017 Security Regulations.',
    privacyDataTitle:'2. Data We Collect',
    privacyDataItems:[
      'Account holders: name, email address, role in organization.',
      'Drivers: name, phone number, license number, license level.',
      'Vehicles: plate number, make, model, mileage, maintenance history.',
      'Usage logs: actions performed within the system (add, edit, delete), timestamps.',
      'Files & documents: uploaded licenses, invoices, insurance documents.',
    ],
    privacyPurposeTitle:'3. Purpose of Processing',
    privacyPurposeItems:[
      'Fleet management and vehicle tracking.',
      'Driver assignment and license compliance monitoring.',
      'Maintenance scheduling and cost tracking.',
      'System security, audit logs, and support.',
      'Sending automated maintenance reminder emails.',
    ],
    privacyStorageTitle:'4. Data Storage & Processors',
    privacyStorage:'Your data is stored on Supabase (PostgreSQL database, USA). Email delivery is provided by Resend (USA). Hosting is provided by Vercel (USA). All providers are bound by Data Processing Agreements (DPA) and operate under contractual safeguards for cross-border data transfers.',
    privacyRetentionTitle:'5. Retention',
    privacyRetention:'Personal data is retained for as long as your account is active. Upon account deletion, data is removed within 30 days except where retention is required by law.',
    privacyRightsTitle:'6. Your Rights',
    privacyRightsItems:[
      'Right of access: request a copy of your personal data.',
      'Right of correction: request correction of inaccurate data.',
      'Right of deletion: request deletion of your data (subject to legal obligations).',
      'Right to object: object to specific uses of your data.',
    ],
    privacyRightsContact:'To exercise your rights, contact us at: privacy@celoxai.com',
    privacySecurityTitle:'7. Security',
    privacySecurity:'We apply encryption in transit (HTTPS/TLS) and at rest. Access is controlled by role-based authentication. All data access events are logged.',
    privacyContactTitle:'8. Contact',
    privacyContact:'For privacy-related inquiries: privacy@celoxai.com | Celox AI Ltd., Israel.',
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
    // file types
    ftLicense:'רישיון', ftInvoice:'חשבונית', ftInsurance:'ביטוח', ftRegistration:'רישום',
    ftInspection:'טסט', ftID:'תעודת זהות', ftOther:'אחר',
    // vehicle types
    vtSedan:'סדאן', vtSUV:'רכב שטח', vtTruck:'משאית', vtVan:'ואן', vtBus:'אוטובוס', vtMotorcycle:'אופנוע',
    // drivers
    name:'שם', license:'רישיון', phone:'טלפון', driverStatus:'סטטוס', active:'פעיל', inactive:'לא פעיל',
    // branches
    branchName:'שם סניף', city:'עיר', address:'כתובת', manager:'מנהל',
    driver:'נהג', noBranch:'ללא סניף', noDriver:'ללא נהג',
    noCars:'לא נמצאו רכבים. לחץ על + פריט חדש להוספה.',
    noDrivers:'לא נמצאו נהגים. לחץ על + פריט חדש להוספה.',
    noBranches:'לא נמצאו סניפים. לחץ על + פריט חדש להוספה.',
    noMatches:'אין תוצאות', noVehiclesYet:'אין רכבים עדיין', noDriversYet:'אין נהגים עדיין', noBranchesYet:'אין סניפים עדיין',
    tryDifferentSearch:'נסה מונח חיפוש אחר',
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
    exportAllData:'ייצוא כל הנתונים', exportAllDataDesc:'הורד את כל נתוני החברה כקובץ Excel (רכבים, נהגים, עלויות, תחזוקה, מסמכים, יומן פעילות).',
    exporting:'מייצא…',
    inviteByEmail:'הזמן באימייל', sendInvite:'שלח הזמנה',
    shareCodeHint:'שתף קוד זה עם עמיתים כדי שיוכלו להצטרף לחברה שלך.',
    selectCompanyPrompt:'בחר חברה לניהול',
    selectCompanyHint:'עבור להגדרות ← לחץ נהל ליד חברה',
    files:'קבצים', uploadFile:'העלה קובץ', noFiles:'אין קבצים עדיין.',
    expiryDate:'תאריך תפוגה', expired:'פג תוקף', expiresIn:'פג בעוד', clearExpiry:'נקה',
    maxCars:'מקסימום רכבים', maxUsers:'מקסימום משתמשים',
    limitReachedCars:'הגעת למגבלת הרכבים של החברה.',
    limitReachedUsers:'הגעת למגבלת המשתמשים של החברה.',
    requiredFields:'לוחית, יצרן ודגם הם שדות חובה.',
    yearRange:'שנת הייצור חייבת להיות בין 1900 ל-2099.',
    signOut:'התנתק', loadingShort:'טוען…', emailPlaceholder:'עמית@example.com',
    confirmDelete:'האם אתה בטוח שברצונך למחוק פריט זה?',
    customLists:'רשימות מותאמות', defaults:'ברירות מחדל',
    listCarStatus:'סטטוס רכב', listDriverStatus:'סטטוס נהג',
    listFuelType:'סוגי דלק', listFileType:'סוגי מסמכים', listMaintenanceType:'סוגי תחזוקה',
    listLicenseLevel:'רמות רישיון', licenseLevel:'רמת רישיון', licenseExpiry:'תפוגת רישיון',
    addValue:'הוסף ערך…', noCustomValues:'אין ערכים מותאמים עדיין.', docType:'סוג מסמך',
    customListsHint:'הוסף אפשרויות מותאמות לרשימות הנפתחות בכל האפליקציה. ערכי ברירת המחדל לא ניתנים למחיקה.',
    // maintenance
    maintenanceTab:'תחזוקה', serviceType:'סוג שירות', serviceDate:'תאריך', nextDue:'תאריך הבא',
    noMaintenance:'אין רשומות תחזוקה עדיין.',
    oilChange:'החלפת שמן', tireRotation:'סיבוב צמיגים', inspection:'בדיקה תקופתית',
    brakeService:'שירות בלמים', otherService:'אחר',
    scheduled:'מתוכנן', done:'בוצע', overdue:'באיחור',
    upcomingMaintenance:'קרובות ובאיחור', historyMaintenance:'היסטוריית שירות',
    maintenancePlans:'תוכניות תחזוקה', newPlan:'+ תוכנית חדשה', noPlans:'אין תוכניות תחזוקה עדיין.',
    planInterval:'מרווח', planKm:'כל (ק"מ)', planMonths:'כל (חודשים)', planLastKm:'ק"מ בשירות אחרון',
    planLastDate:'תאריך שירות אחרון', planNextKm:'ק"מ הבא', planNextDate:'תאריך הבא',
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
    noActivity:'אין פעילות עדיין.', loadMore:'טען עוד…',
    // bulk & export
    selectAll:'בחר הכל', bulkDelete:'מחק נבחרים', bulkAssign:'שבץ סניף',
    exportExcel:'ייצא Excel', exportPDF:'ייצא PDF',
    // dashboard filter
    filterAll:'כל הזמן', filterMonth:'חודש זה', filterQuarter:'רבעון זה', filterYear:'שנה זו',
    // photo
    photo:'תמונה', uploadPhoto:'העלה תמונה', changePhoto:'החלף תמונה',
    description:'תיאור', unlimited:'ללא הגבלה', itemsSelected:'נבחרו',
    fileTooLarge:'הקובץ גדול מדי (מקסימום 10 MB).', fileTypeNotAllowed:'סוג קובץ לא מורשה.',
    photoTooLarge:'התמונה גדולה מדי (מקסימום 5 MB).', photoTypeNotAllowed:'מותר רק JPG, PNG, WebP או GIF.',
    totalCost:'סה"כ עלות', costByCategory:'עלות לפי קטגוריה', recentCosts:'עלויות אחרונות',
    maintenanceDue:'תחזוקה קרובה', maintenanceHistory:'היסטוריית שירות',
    // dashboard extras
    fleetStatus:'מצב הצי', utilizationRate:'אחוז ניצולת נהגים', driverAssignment:'שיוך נהגים',
    recentVehicles:'רכבים שנוספו לאחרונה', noRecentVehicles:'טרם נוספו רכבים.',
    assigned:'משויכים', unassignedDrivers:'ללא שיוך',
    // csv import (fuel)
    importCsv:'ייבוא CSV', csvImportTitle:'ייבוא קובץ דלק', csvSelectFile:'ייבוא קובץ CSV',
    csvPreview:'תצוגה מקדימה', csvConfirmImport: n => `ייבא ${n} שורות`, csvImporting:'מייבא…',
    csvImported: n => `${n} רשומות יובאו בהצלחה.`, csvError:'שגיאה בקריאת הקובץ.',
    csvStation:'תחנה', csvLiters:'ליטרים', csvFuelType:'סוג דלק',
    csvSkipNote:'שורות שבהן לוחית הרישוי אינה קיימת במערכת תדולגנה.',
    csvNoRows:'לא נמצאו שורות תקינות בקובץ.', csvVehicleNotFound:'לא נמצא',
    // csv import (cars/drivers)
    importCsvCars:'ייבוא רכבים CSV', importCsvDrivers:'ייבוא נהגים CSV',
    csvCarsCols:'עמודות נדרשות: לוחית, יצרן, דגם, שנה, סטטוס, דלק, סניף, נהג',
    csvDriversCols:'עמודות נדרשות: שם, רישיון, טלפון, סטטוס, סניף',
    csvEditNote:'ניתן לערוך כל שורה לפני הייבוא.',
    csvDuplicateSkipped:'(לוחית כפולה — תדולג)',
    csvImportedCars: n => `${n} רכבים יובאו בהצלחה.`,
    csvImportedDrivers: n => `${n} נהגים יובאו בהצלחה.`,
    csvRowError:'חלק מהשורות שגויות ויידולגו.',
    // plate lookup
    plateLookup:'בדיקה', plateLookupLoading:'מחפש…', plateLookupNotFound:'הלוחית לא נמצאה',
    plateLookupFilled:'הפרטים הושלמו ממשרד התחבורה',
    // accident report
    accidentReports:'דוחות תאונה', newAccidentReport:'+ דוח חדש',
    accidentFormTitle:'דוח תאונת דרכים', accidentFormSub:'דיווח על תאונה חדשה',
    myCar:'הרכב שלי', otherDriverInfo:'פרטי הנהג השני',
    otherPlate:'לוחית רישוי', otherMake:'יצרן', otherModel:'דגם',
    otherDriverName:'שם הנהג', otherDriverPhone:'טלפון',
    incidentDate:'תאריך האירוע', incidentDesc:'מה קרה?',
    incidentDescPlaceholder:'תאר את האירוע — מיקום, נזק, נסיבות…',
    attachFiles:'צרף קבצים (תמונות / דוח משטרה)',
    uploading:'מעלה…', submitReport:'שלח דוח',
    reportSubmitted:'הדוח נשלח בהצלחה.',
    noAccidentReports:'אין דוחות תאונה עדיין.',
    accidentFiles:'קבצים', viewReport:'צפה',
    accidentOnHold:'בהמתנה', accidentOpen:'פתוח', accidentClosed:'סגור',
    holdReport:'⏸ השהה', resumeReport:'▶ המשך',
    sendEmailReport:'📧 אימייל', sendViaEmail:'שלח באימייל',
    viewDetails:'👁 פרטים',
    // legal & privacy
    legalTitle:'משפטי', legalDesc:'קרא את המדיניות שלנו בנושא הגנת נתונים ותנאי שימוש.',
    legalContact:'שאלות? צור קשר:',
    privacyPolicy:'מדיניות פרטיות', privacyPolicyDesc:'כיצד אנו אוספים ומגינים על הנתונים שלך',
    termsOfService:'תנאי שירות', termsOfServiceDesc:'כללים ותנאים לשימוש ב-Celox AI',
    privacyClose:'סגור',
    tosTitle:'תנאי שירות — Celox AI',
    tosUpdated:'עדכון אחרון: 16 באפריל 2026',
    tos1Title:'1. קבלת התנאים',
    tos1:'על ידי גישה לשירות Celox AI או שימוש בו, אתה מסכים להיות מחויב לתנאי שירות אלה. אם אינך מסכים, אל תשתמש בשירות.',
    tos2Title:'2. תיאור השירות',
    tos2:'Celox AI מספקת פלטפורמת SaaS לניהול צי רכבים הכוללת מעקב רכבים, ניהול נהגים, תזמון תחזוקה וכלי דיווח.',
    tos3Title:'3. אחריות החשבון',
    tos3Items:['אתה אחראי לשמירה על סודיות פרטי הגישה לחשבונך.','עליך לספק מידע מדויק ומלא בעת ההרשמה.','אתה אחראי לכל פעילות שמתרחשת תחת חשבונך.','עליך להודיע לנו מיידית על כל שימוש לא מורשה בחשבונך.'],
    tos4Title:'4. שימוש מותר',
    tos4:'אתה מסכים שלא לעשות שימוש לרעה בשירות. פעילויות אסורות כוללות: גישה לא מורשית לחשבונות אחרים, העלאת תוכן זדוני, הנדסה לאחור של הפלטפורמה, או שימוש בשירות למטרות בלתי חוקיות.',
    tos5Title:'5. נתונים ופרטיות',
    tos5:'השימוש שלך בשירות כפוף גם למדיניות הפרטיות שלנו. על ידי שימוש בשירות, אתה מסכים לאיסוף ושימוש במידע שלך כמתואר בה.',
    tos6Title:'6. תשלום וחיוב',
    tos6:'תוכניות בתשלום מחויבות מראש. כל התשלומים אינם ניתנים להחזר אלא כנדרש על פי חוק. אנו שומרים את הזכות לשנות מחירים עם הודעה של 30 יום.',
    tos7Title:'7. סיום שירות',
    tos7:'אנו שומרים את הזכות להשעות או לסיים את חשבונך בשל הפרת תנאים אלה. תוכל לבטל את חשבונך בכל עת. עם הסיום, הנתונים שלך יישמרו 30 יום ולאחר מכן יימחקו.',
    tos8Title:'8. הגבלת אחריות',
    tos8:'Celox AI ניתנת "כמו שהיא". אנחנו לא אחראים לנזקים עקיפים, אגביים או תוצאתיים. האחריות הכוללת שלנו לא תעלה על הסכום ששילמת לנו ב-12 החודשים שקדמו לתביעה.',
    tos9Title:'9. דין החל',
    tos9:'תנאים אלה כפופים לחוקי מדינת ישראל. כל מחלוקות יפתרו בבתי המשפט המוסמכים בתל אביב.',
    tos10Title:'10. יצירת קשר',
    tos10:'לשאלות בנוגע לתנאים אלה, צור קשר בכתובת support@celoxai.com.',
    privacyTitle:'מדיניות פרטיות — Celox AI',
    privacyUpdated:'עדכון אחרון: 12 באפריל 2026',
    privacyIntroTitle:'1. מבוא',
    privacyIntro:'Celox AI בע"מ ("אנחנו") מפעילה פלטפורמת SaaS לניהול צי רכבים. מדיניות זו מסבירה אילו נתונים אישיים אנו אוספים, כיצד אנו משתמשים בהם, ומהן הזכויות שלך לפי חוק הגנת הפרטיות (תשמ"א-1981) ותקנות האבטחה משנת 2017.',
    privacyDataTitle:'2. מידע שאנו אוספים',
    privacyDataItems:[
      'בעלי חשבון: שם, כתובת אימייל, תפקיד בארגון.',
      'נהגים: שם, טלפון, מספר רישיון נהיגה, רמות רישיון.',
      'רכבים: לוחית רישוי, יצרן, דגם, קילומטראז׳, היסטוריית תחזוקה.',
      'לוגים של פעילות: פעולות שבוצעו במערכת (הוספה, עריכה, מחיקה) עם חותמות זמן.',
      'קבצים ומסמכים: רישיונות, חשבוניות, ביטוחים שהועלו.',
    ],
    privacyPurposeTitle:'3. מטרות העיבוד',
    privacyPurposeItems:[
      'ניהול צי רכבים ומעקב רכבים.',
      'שיוך נהגים ומעקב תוקף רישיונות.',
      'תזמון תחזוקה ומעקב עלויות.',
      'אבטחת מערכת, לוגים ותמיכה.',
      'שליחת תזכורות תחזוקה אוטומטיות בדוא"ל.',
    ],
    privacyStorageTitle:'4. אחסון מידע ומעבדים',
    privacyStorage:'המידע שלך מאוחסן ב-Supabase (בסיס נתונים PostgreSQL, ארה"ב). משלוח אימיילים מסופק על ידי Resend (ארה"ב). האירוח מסופק על ידי Vercel (ארה"ב). כל הספקים כפופים להסכמי עיבוד מידע (DPA) ולערבויות חוזיות להעברות מידע חוצות גבולות.',
    privacyRetentionTitle:'5. שמירת מידע',
    privacyRetention:'המידע האישי נשמר כל עוד החשבון שלך פעיל. עם מחיקת החשבון, המידע יוסר תוך 30 יום, למעט מקרים שבהם שמירה נדרשת על פי חוק.',
    privacyRightsTitle:'6. הזכויות שלך',
    privacyRightsItems:[
      'זכות עיון: בקשה לקבל עותק של המידע האישי שלך.',
      'זכות תיקון: בקשה לתיקון מידע לא מדויק.',
      'זכות מחיקה: בקשה למחיקת המידע שלך (בכפוף לחובות חוקיות).',
      'זכות התנגדות: התנגדות לשימושים ספציפיים במידע שלך.',
    ],
    privacyRightsContact:'לממש את זכויותיך, צור קשר: privacy@celoxai.com',
    privacySecurityTitle:'7. אבטחת מידע',
    privacySecurity:'אנו מיישמים הצפנה בתעבורה (HTTPS/TLS) ובאחסון. הגישה נשלטת על ידי אימות מבוסס תפקידים. כל אירועי גישה למידע מתועדים.',
    privacyContactTitle:'8. יצירת קשר',
    privacyContact:'לפניות בנושא פרטיות: privacy@celoxai.com | Celox AI בע"מ, ישראל.',
  },
}

// ── Nav SVG Icons ─────────────────────────────────────────────────────────────
function TabIcon({ id, size = 15 }) {
  const s = { width: size, height: size, flexShrink: 0 }
  if (id === 'dashboard') return (
    <svg style={s} viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity=".5"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity=".5"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity=".9"/></svg>
  )
  if (id === 'cars') return (
    <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M3 9.5h10M4.5 7l1.5-3h4l1.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><rect x="1.5" y="9" width="13" height="4" rx="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="4.5" cy="13.5" r="1.2" fill="currentColor"/><circle cx="11.5" cy="13.5" r="1.2" fill="currentColor"/></svg>
  )
  if (id === 'drivers') return (
    <svg style={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
  )
  if (id === 'branches') return (
    <svg style={s} viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M5 15V11h2.5v4M8.5 15V11H11v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M1 7.5L8 2l7 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
  )
  if (id === 'maintenance') return (
    <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M10.5 2a3.5 3.5 0 0 1 .55 6.95L5 15a1.5 1.5 0 0 1-2.12-2.12l6.05-6.05A3.5 3.5 0 0 1 10.5 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10.5" cy="5.5" r="1" fill="currentColor"/></svg>
  )
  if (id === 'costs') return (
    <svg style={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 4.5v1M8 10.5v1M6 7c0-.83.9-1.5 2-1.5s2 .67 2 1.5S9.1 8.5 8 8.5 6 9.17 6 10s.9 1.5 2 1.5 2-.67 2-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
  )
  if (id === 'settings') return (
    <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="1.4"/><path d="M13.2 9.6a5.4 5.4 0 0 0 .13-.6l1.17-.9a.5.5 0 0 0 .12-.64l-1.1-1.9a.5.5 0 0 0-.61-.22l-1.38.55a5.3 5.3 0 0 0-1.03-.6l-.21-1.47A.5.5 0 0 0 9.8 3h-2.2a.5.5 0 0 0-.5.43l-.2 1.47a5.3 5.3 0 0 0-1.04.6L4.47 5a.5.5 0 0 0-.61.22l-1.1 1.9a.5.5 0 0 0 .12.64l1.17.9a5.4 5.4 0 0 0 0 1.2l-1.17.9a.5.5 0 0 0-.12.64l1.1 1.9a.5.5 0 0 0 .61.22l1.38-.55a5.3 5.3 0 0 0 1.04.6l.2 1.47a.5.5 0 0 0 .5.43h2.2a.5.5 0 0 0 .49-.43l.2-1.47a5.3 5.3 0 0 0 1.04-.6l1.38.55a.5.5 0 0 0 .61-.22l1.1-1.9a.5.5 0 0 0-.12-.64l-1.17-.9Z" stroke="currentColor" strokeWidth="1.3"/></svg>
  )
  if (id === 'violations') return (
    <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 6v3.5M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
  )
  if (id === 'reports') return (
    <svg style={s} viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5 8h6M5 10.5h4M5 5.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
  )
  return <span style={{ fontSize: size }}></span>
}

// ── Plate number formatter ───────────────────────────────────────────────────
function formatPlate(plate) {
  if (!plate) return plate
  const digits = plate.replace(/\D/g, '')
  const n = digits.length
  if (n === 8) return `${digits.slice(0,3)}-${digits.slice(3,5)}-${digits.slice(5,8)}`
  if (n === 7) return `${digits.slice(0,2)}-${digits.slice(2,5)}-${digits.slice(5,7)}`
  if (n === 6) return `${digits.slice(0,3)}-${digits.slice(3,6)}`
  if (n >= 1)  return digits
  return plate
}

// ── Shared style constants ───────────────────────────────────────────────────
const gradient = `linear-gradient(135deg, ${C.primary}, ${C.indigo})`

const btnPrimary = {
  background: gradient, color: '#fff', border: 'none',
  borderRadius: 8, fontWeight: 700, cursor: 'pointer',
  boxShadow: '0 2px 10px rgba(59,130,246,0.35)', transition: 'opacity 0.15s, transform 0.1s',
}
const btnGhost = {
  background: 'transparent', border: `1px solid ${C.border}`,
  color: C.textSecondary, borderRadius: 6, cursor: 'pointer',
}
const btnDanger = {
  background: C.danger + '18', color: C.danger,
  border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer',
}
const closeBtn = {
  background: 'transparent', border: 'none',
  fontSize: 20, cursor: 'pointer', color: C.textMuted, lineHeight: 1,
}
const rowStyle = { padding: '10px 0', borderBottom: `1px solid ${C.border}` }

// ── Shared table style atoms ────────────────────────────────────────────────
const mkTh = (rtl, mobile) => ({
  padding: mobile ? '8px 10px' : '11px 16px',
  fontSize: mobile ? 10 : 11,
  fontWeight: 700,
  color: C.textMuted,
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
    cancel: { background: C.bg, color: C.textSecondary },
    delete: { background: C.danger + '18', color: C.danger },
  }
  return (
    <button onClick={onClick} style={{
      border: 'none', borderRadius: 6, padding: '5px 10px',
      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.12s, transform 0.1s', ...variants[variant],
    }}>{children}</button>
  )
}

// ── Files Modal ─────────────────────────────────────────────────────────────
function FilesModal({ entity, entityType, companyId, onClose, t, isMobile }) {
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

  const ALLOWED_DOC_TYPES = [
    'image/jpeg','image/png','image/webp','image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]

  async function confirmUpload() {
    if (!pendingFile) return
    if (pendingFile.size > 10 * 1024 * 1024) { setError(t.fileTooLarge); return }
    if (!ALLOWED_DOC_TYPES.includes(pendingFile.type)) { setError(t.fileTypeNotAllowed); return }
    setUploading(true); setError('')
    const safeName = pendingFile.name.replace(/[^\w.\-]/g, '_').replace(/^\.+/, '').replace(/\s+/g, '_')
    const path = `${companyId}/${entityType}/${entity.id}/${Date.now()}_${safeName}`
    const { error: uploadErr } = await supabase.storage.from('fleet-documents').upload(path, pendingFile)
    if (uploadErr) { setError(friendlyDbError(uploadErr)); setUploading(false); return }
    const { error: dbErr } = await supabase.from('documents').insert({
      company_id: companyId, entity_type: entityType, entity_id: entity.id,
      name: pendingFile.name, storage_path: path, size: pendingFile.size,
      expires_at: expiryDate || null, doc_type: docType || null,
    })
    if (dbErr) { setError(friendlyDbError(dbErr)) } else { await loadDocs(); setPendingFile(null); setExpiryDate('') }
    setUploading(false)
  }

  async function saveExpiry(doc) {
    const { error } = await supabase.from('documents').update({ expires_at: editExpiryVal || null }).eq('id', doc.id)
    if (error) { setError(friendlyDbError(error)); return }
    setDocs(p => p.map(d => d.id === doc.id ? { ...d, expires_at: editExpiryVal || null } : d))
    setEditingExpiry(null)
  }

  async function downloadFile(doc) {
    const { data } = await supabase.storage.from('fleet-documents').createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function deleteFile(doc) {
    const { error: dbErr } = await supabase.from('documents').delete().eq('id', doc.id)
    if (dbErr) { setError(friendlyDbError(dbErr)); return }
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
    return { label: fmtDate(doc.expires_at), color: C.success, bg: C.success + '10' }
  }

  const entityLabel = entityType === 'car' ? (entity.plate || entity.make) : entity.name

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: C.overlay, display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center', padding: isMobile ? 0 : 16,
    }} onClick={onClose}>
      <div className="modal-content" style={{
        background: C.surface, width: '100%', maxWidth: isMobile ? '100%' : 500,
        borderRadius: isMobile ? '18px 18px 0 0' : 12,
        boxShadow: '0 8px 40px rgba(0,0,0,0.2)', border: `1px solid ${C.border}`,
        maxHeight: isMobile ? '92vh' : '85vh', display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary }}>📎 {t.files}</div>
            <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{entityLabel}</div>
          </div>
          <button onClick={onClose} style={{ ...closeBtn, padding: 4 }}>×</button>
        </div>

        {/* File list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
          {loading ? (
            <p style={{ color: C.textSecondary, fontSize: 14, textAlign: 'center', padding: '20px 0' }}>{t.loadingShort}</p>
          ) : docs.length === 0 ? (
            <p style={{ color: C.textSecondary, fontSize: 14, textAlign: 'center', padding: '20px 0' }}>{t.noFiles}</p>
          ) : docs.map(doc => {
            const status = expiryStatus(doc)
            return (
              <div key={doc.id} style={rowStyle}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{getFileIcon(doc.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                    <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span>{formatSize(doc.size)} · {fmtDate(doc.created_at?.split('T')[0])}</span>
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
                    <DateInput value={editExpiryVal} onChange={e => setEditExpiryVal(e.target.value)}
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
              <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600 }}>📎 {pendingFile.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12, color: C.textSecondary, whiteSpace: 'nowrap' }}>📅 {t.expiryDate}</label>
                <DateInput value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
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

// ── Form Submissions Section (shown inside Documents tab) ────────────────────
const FORM_TYPE_LABELS = {
  car_checklist:    { he: 'רשימת בדיקה לרכב חדש', icon: '📋' },
  driver_car_check: { he: 'בדיקת רכב על ידי נהג',  icon: '🚗' },
  yearly_training:  { he: 'אימות הדרכה שנתית',      icon: '🎓' },
}

function FormSubmissionsSection({ entityId, entityType, companyId, rtl }) {
  const [subs,     setSubs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    async function load() {
      // 1. get form_links for this entity
      const col = entityType === 'car' ? 'car_id' : 'driver_id'
      const { data: links } = await supabase
        .from('form_links')
        .select('id, title, type')
        .eq('company_id', companyId)
        .eq(col, String(entityId))
      if (!links?.length) { setLoading(false); return }

      // 2. get submissions for those links
      const { data } = await supabase
        .from('form_submissions')
        .select('*')
        .in('form_link_id', links.map(l => l.id))
        .order('submitted_at', { ascending: false })

      // attach link metadata to each submission
      const linkMap = Object.fromEntries(links.map(l => [l.id, l]))
      setSubs((data || []).map(s => ({ ...s, _link: linkMap[s.form_link_id] })))
      setLoading(false)
    }
    load()
  }, [entityId, entityType, companyId])

  if (loading) return <div style={{ padding: '10px 0', color: '#94a3b8', fontSize: 13 }}>טוען טפסים...</div>
  if (!subs.length) return null

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 10 }}>
        {rtl ? 'טפסים שהוגשו' : 'Submitted Forms'}
      </div>
      {subs.map(sub => {
        const meta = FORM_TYPE_LABELS[sub.type] || { he: sub.type, icon: '📋' }
        const isOpen = expanded === sub.id
        return (
          <div key={sub.id} style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 8, overflow: 'hidden' }}>
            <div
              onClick={() => setExpanded(isOpen ? null : sub.id)}
              style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            >
              <span style={{ fontSize: 18 }}>{meta.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{sub.submitter_name || meta.he}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                  {meta.he} · {new Date(sub.submitted_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span style={{ color: '#94a3b8', fontSize: 14 }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 14px', fontSize: 12 }}>
                {Object.entries(sub.data || {}).filter(([k, v]) => v && k !== 'submitter_name' && k !== 'attachments').map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 12, padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b', minWidth: 130, fontWeight: 600 }}>{k.replace(/_/g, ' ')}</span>
                    <span style={{ color: '#0f172a', flex: 1 }}>{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                  </div>
                ))}
                {sub.data?.attachments?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>קבצים מצורפים</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {sub.data.attachments.map((a, i) => (
                        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                          style={{ background: '#0891b2', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          📎 {a.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Inline Documents Pane (used inside detail modals) ───────────────────────
function DocsPane({ entityId, entityType, companyId, t, rtl }) {
  const [docs, setDocs]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [uploading, setUploading]     = useState(false)
  const [error, setError]             = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  const [expiryDate, setExpiryDate]   = useState('')
  const [editingExpiry, setEditingExpiry] = useState(null)
  const [editExpiryVal, setEditExpiryVal] = useState('')

  useEffect(() => { loadDocs() }, [entityId])

  async function loadDocs() {
    setLoading(true)
    const { data } = await supabase.from('documents')
      .select('*').eq('entity_id', entityId).order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  function pickFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setPendingFile(file); setExpiryDate(''); setError(''); e.target.value = ''
  }

  const ALLOWED = ['image/jpeg','image/png','image/webp','image/gif','application/pdf',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']

  async function confirmUpload() {
    if (!pendingFile) return
    if (pendingFile.size > 10 * 1024 * 1024) { setError(t.fileTooLarge); return }
    if (!ALLOWED.includes(pendingFile.type)) { setError(t.fileTypeNotAllowed); return }
    setUploading(true); setError('')
    const safeName = pendingFile.name.replace(/[^\w.\-]/g, '_').replace(/^\.+/, '').replace(/\s+/g, '_')
    const path = `${companyId}/${entityType}/${entityId}/${Date.now()}_${safeName}`
    const { error: uploadErr } = await supabase.storage.from('fleet-documents').upload(path, pendingFile)
    if (uploadErr) { setError(friendlyDbError(uploadErr, rtl)); setUploading(false); return }
    const { error: dbErr } = await supabase.from('documents').insert({
      company_id: companyId, entity_type: entityType, entity_id: entityId,
      name: pendingFile.name, storage_path: path, size: pendingFile.size,
      expires_at: expiryDate || null,
    })
    if (dbErr) setError(friendlyDbError(dbErr, rtl))
    else { await loadDocs(); setPendingFile(null); setExpiryDate('') }
    setUploading(false)
  }

  async function saveExpiry(doc) {
    await supabase.from('documents').update({ expires_at: editExpiryVal || null }).eq('id', doc.id)
    setDocs(p => p.map(d => d.id === doc.id ? { ...d, expires_at: editExpiryVal || null } : d))
    setEditingExpiry(null)
  }

  async function downloadFile(doc) {
    const { data } = await supabase.storage.from('fleet-documents').createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function deleteFile(doc) {
    await supabase.from('documents').delete().eq('id', doc.id)
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
    if (days < 0)   return { label: t.expired,                    color: C.danger,  bg: C.danger  + '18' }
    if (days <= 30) return { label: `${t.expiresIn} ${days}d`,    color: C.warning, bg: C.warning + '18' }
    return                 { label: fmtDate(doc.expires_at),       color: C.success, bg: C.success + '18' }
  }

  const row = { background: C.bg, borderRadius: 8, padding: '10px 12px', marginBottom: 8, border: `1px solid ${C.border}` }

  return (
    <div style={{ direction: rtl ? 'rtl' : 'ltr' }}>
      {loading ? (
        <p style={{ color: C.textMuted, textAlign: 'center', padding: '24px 0', fontSize: 14 }}>{t.loadingShort}</p>
      ) : docs.length === 0 ? (
        <p style={{ color: C.textMuted, textAlign: 'center', padding: '24px 0', fontSize: 14 }}>{t.noFiles}</p>
      ) : docs.map(doc => {
        const status = expiryStatus(doc)
        return (
          <div key={doc.id} style={row}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{getFileIcon(doc.name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span>{formatSize(doc.size)} · {fmtDate(doc.created_at?.split('T')[0])}</span>
                  {status && <span style={{ background: status.bg, color: status.color, borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>{status.label}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                <button onClick={() => { setEditingExpiry(doc.id); setEditExpiryVal(doc.expires_at || '') }}
                  style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 5, padding: '4px 7px', cursor: 'pointer', fontSize: 12 }}>📅</button>
                <button onClick={() => downloadFile(doc)}
                  style={{ background: C.primary + '18', color: C.primary, border: 'none', borderRadius: 5, padding: '4px 9px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>↓</button>
                <button onClick={() => deleteFile(doc)}
                  style={{ background: C.danger + '18', color: C.danger, border: 'none', borderRadius: 5, padding: '4px 9px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✕</button>
              </div>
            </div>
            {editingExpiry === doc.id && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, paddingInlineStart: 30 }}>
                <DateInput value={editExpiryVal} onChange={e => setEditExpiryVal(e.target.value)}
                  style={{ padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: 'none' }} />
                <button onClick={() => saveExpiry(doc)} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 5, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>{t.save}</button>
                <button onClick={() => { setEditingExpiry(null); setEditExpiryVal('') }}
                  style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, padding: '5px 8px', fontSize: 12, cursor: 'pointer' }}>{t.cancel}</button>
              </div>
            )}
          </div>
        )
      })}

      {error && <div style={{ color: C.danger, fontSize: 12, marginBottom: 8 }}>{error}</div>}

      {/* Upload */}
      <div style={{ marginTop: 12 }}>
        {pendingFile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600 }}>📎 {pendingFile.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap' }}>📅 {t.expiryDate}</label>
              <DateInput value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={confirmUpload} disabled={uploading}
                style={{ flex: 1, background: C.primary, color: '#fff', border: 'none', borderRadius: 7, padding: '10px', fontSize: 13, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
                {uploading ? '…' : `⬆ ${t.uploadFile}`}
              </button>
              <button onClick={() => setPendingFile(null)}
                style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '10px 14px', fontSize: 13, cursor: 'pointer' }}>{t.cancel}</button>
            </div>
          </div>
        ) : (
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.primary + '15', border: `1px dashed ${C.primary}60`, color: C.primary, borderRadius: 8, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            ⬆ {t.uploadFile}
            <input type="file" style={{ display: 'none' }} onChange={pickFile} />
          </label>
        )}
      </div>
    </div>
  )
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
const DRIVER_STATUS_COLOR = { Active: C.success, Inactive: C.textMuted }

// Maps DB value → translation key
const CAR_STATUS_KEY        = { Available: 'available', 'In Use': 'inUse', Maintenance: 'maintenance' }
const CAR_FUEL_KEY          = { Petrol: 'petrol', Diesel: 'diesel', Electric: 'electric', Hybrid: 'hybrid' }
const DRIVER_STATUS_KEY     = { Active: 'active', Inactive: 'inactive' }
const FILE_TYPE_KEY         = { License: 'ftLicense', Invoice: 'ftInvoice', Insurance: 'ftInsurance', Registration: 'ftRegistration', Inspection: 'ftInspection', ID: 'ftID', Other: 'ftOther' }
const MAINTENANCE_TYPE_KEY  = { 'Oil Change': 'oilChange', 'Tire Rotation': 'tireRotation', 'Inspection': 'inspection', 'Brake Service': 'brakeService', 'Other': 'otherService' }
const LICENSE_LEVEL_KEY     = { 'Other': 'otherService' }
const CAR_TYPE_KEY      = { Sedan: 'vtSedan', SUV: 'vtSUV', Truck: 'vtTruck', Van: 'vtVan', Bus: 'vtBus', Motorcycle: 'vtMotorcycle' }

function translateListValue(v, t) {
  return t[CAR_STATUS_KEY[v]] || t[CAR_FUEL_KEY[v]] || t[DRIVER_STATUS_KEY[v]] || t[FILE_TYPE_KEY[v]] || t[MAINTENANCE_TYPE_KEY[v]] || v
}

// ── Custom list defaults & helper ────────────────────────────────────────────
const DEFAULT_LISTS = {
  car_status:        ['Available', 'In Use', 'Maintenance'],
  driver_status:     ['Active', 'Inactive'],
  fuel_type:         ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
  license_level:     ['A', 'A1', 'A2', 'B', 'C', 'C1', 'D', 'D1', 'E', 'Other'],
  file_type:         ['License', 'Invoice', 'Insurance', 'Registration', 'Inspection', 'ID', 'Other'],
  maintenance_type:  ['Oil Change', 'Tire Rotation', 'Inspection', 'Brake Service', 'Other'],
}
function getMergedOptions(type, customLists = {}) {
  const defaults = DEFAULT_LISTS[type] || []
  const custom = (customLists[type] || []).filter(v => !defaults.includes(v))
  return [...defaults, ...custom]
}

// ── Car Detail Modal ─────────────────────────────────────────────────────────
function CarDetailModal({ car, getBranchName, drivers, companyId, t, rtl, onClose }) {
  const [tab, setTab]           = useState('overview')
  const [maintenance, setMaint] = useState([])
  const [costs, setCosts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [docsKey, setDocsKey]   = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: m }, { data: c }] = await Promise.all([
        supabase.from('maintenance').select('*').eq('car_id', car.id).order('date', { ascending: false }),
        supabase.from('costs').select('*').eq('car_id', car.id).order('date', { ascending: false }),
      ])
      setMaint(m || [])
      setCosts(c || [])
      setLoading(false)
    }
    load()
  }, [car.id])

  const driver = drivers.find(d => String(d.id) === String(car.driver_id) || String(d.car_id) === String(car.id))
  const totalMaint = maintenance.reduce((s, r) => s + (r.cost || 0), 0)
  const totalCost  = costs.reduce((s, r) => s + (r.amount || 0), 0)

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }
  const modal   = { background: C.surface, borderRadius: 16, width: '100%', maxWidth: 720, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', position: 'relative', direction: rtl ? 'rtl' : 'ltr' }
  const hdr     = { background: C.navBg, borderRadius: '16px 16px 0 0', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }
  const sectionStyle = { padding: '0 24px 20px' }
  const sTitle  = { fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 10, marginTop: 20 }
  const infoRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.borderLight}`, fontSize: 13 }
  const tabBar  = { display: 'flex', background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '0 24px' }
  const tabBtn  = active => ({ padding: '12px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', borderBottom: active ? `2px solid ${C.primary}` : '2px solid transparent', color: active ? C.primary : C.textMuted, transition: 'color 0.15s' })
  const card    = { background: C.bg, borderRadius: 10, padding: 14, marginBottom: 10, border: `1px solid ${C.border}` }

  const statusBg  = s => s === 'done' ? '#dcfce7' : s === 'overdue' ? '#fee2e2' : '#dbeafe'
  const statusClr = s => s === 'done' ? '#166534' : s === 'overdue' ? '#991b1b' : '#1e40af'

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        {/* Header */}
        <div style={hdr}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 10px', fontWeight: 700, fontSize: 14, color: '#f8fafc', letterSpacing: 1 }}>
                {formatPlate(car.plate)}
              </span>
              <Badge label={t[CAR_STATUS_KEY[car.status]] || car.status} color={s => s === 'Available' || s === t.available ? C.success : s === 'In Use' || s === t.inUse ? C.primary : C.warning} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#f8fafc' }}>{car.make} {car.model} {car.year ? `(${car.year})` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Tab bar */}
        <div style={tabBar}>
          {[['overview', '📋 ' + (rtl ? 'סקירה' : 'Overview')], ['maintenance', `🔧 ${rtl ? 'תחזוקה' : 'Service'} (${maintenance.length})`], ['costs', `💰 ${rtl ? 'עלויות' : 'Costs'} (${costs.length})`], ['documents', `📎 ${rtl ? 'מסמכים' : 'Documents'}`]].map(([id, label]) => (
            <button key={id} style={tabBtn(tab === id)} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.textMuted }}>Loading…</div>
        ) : (
          <div style={{ padding: '0 0 24px' }}>

            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <>
                <div style={sectionStyle}>
                  <div style={sTitle}>{rtl ? 'פרטי רכב' : 'Vehicle Details'}</div>
                  {[
                    [t.plate,   formatPlate(car.plate)],
                    [t.make,    car.make],
                    [t.model,   car.model],
                    [t.year,    car.year],
                    [t.fuel,    t[CAR_FUEL_KEY[car.fuel]] || car.fuel],
                    [t.mileage, car.mileage ? car.mileage.toLocaleString() + ' km' : null],
                    [t.branch,  getBranchName(car.branch_id)],
                  ].filter(([, v]) => v && v !== '—').map(([label, value]) => (
                    <div key={label} style={infoRow}>
                      <span style={{ color: C.textMuted }}>{label}</span>
                      <span style={{ fontWeight: 600, color: C.textPrimary }}>{value}</span>
                    </div>
                  ))}
                </div>

                <div style={sectionStyle}>
                  <div style={sTitle}>{rtl ? 'נהג נוכחי' : 'Current Driver'}</div>
                  {driver ? [
                    [rtl ? 'שם' : 'Name',    driver.name],
                    [rtl ? 'רישיון' : 'License', driver.license],
                    [rtl ? 'טלפון' : 'Phone',  driver.phone],
                    [rtl ? 'סטטוס' : 'Status', driver.status],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label} style={infoRow}>
                      <span style={{ color: C.textMuted }}>{label}</span>
                      <span style={{ fontWeight: 600, color: C.textPrimary }}>{value}</span>
                    </div>
                  )) : <div style={{ color: C.textMuted, fontSize: 13, paddingTop: 8 }}>{rtl ? 'אין נהג משויך' : 'No driver assigned'}</div>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, padding: '0 24px' }}>
                  {[[rtl ? 'רשומות תחזוקה' : 'Service Records', maintenance.length, C.primary],
                    [rtl ? 'עלות תחזוקה' : 'Maint. Cost', '₪' + totalMaint.toLocaleString(), C.warning],
                    [rtl ? 'עלויות אחרות' : 'Other Costs',  '₪' + totalCost.toLocaleString(),  C.danger],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ background: C.bg, borderRadius: 10, padding: '14px 12px', textAlign: 'center', border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color }}>{value}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── MAINTENANCE ── */}
            {tab === 'maintenance' && (
              <div style={sectionStyle}>
                <div style={sTitle}>{rtl ? 'היסטוריית שירות' : 'Service History'}</div>
                {maintenance.length === 0
                  ? <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>{t.noMaintenance}</div>
                  : maintenance.map(r => (
                    <div key={r.id} style={card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary }}>{r.service_type || r.type}</span>
                        <span style={{ background: statusBg(r.status), color: statusClr(r.status), borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>{r.status}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: C.textSecondary }}>
                        {r.date && <span>📅 {r.date}</span>}
                        {r.next_due && <span>⏭ {r.next_due}</span>}
                        {r.cost    && <span>₪{Number(r.cost).toLocaleString()}</span>}
                        {r.mileage && <span>{Number(r.mileage).toLocaleString()} km</span>}
                      </div>
                      {r.description && <div style={{ marginTop: 6, fontSize: 13, color: C.textMuted, fontStyle: 'italic' }}>{r.description}</div>}
                    </div>
                  ))
                }
              </div>
            )}

            {/* ── COSTS ── */}
            {tab === 'costs' && (
              <div style={sectionStyle}>
                {costs.length > 0 && (
                  <div style={{ background: C.bg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${C.border}`, marginTop: 16, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>{rtl ? 'סה״כ עלויות' : 'Total Costs'}</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: C.primary }}>₪{totalCost.toLocaleString()}</span>
                  </div>
                )}
                <div style={sTitle}>{rtl ? 'רשומות עלויות' : 'Cost Records'}</div>
                {costs.length === 0
                  ? <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>{rtl ? 'אין רשומות עלויות' : 'No cost records yet.'}</div>
                  : costs.map(r => {
                    const catLabel = { Fuel: t.catFuel, Insurance: t.catInsurance, Fine: t.catFine, Repair: t.catRepair, Maintenance: t.maintenance, Other: t.catOther, 'ביטוח': t.catInsurance, 'נתיב תשלום': rtl ? 'נתיב תשלום' : 'Toll' }
                    return (
                      <div key={r.id} style={card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary }}>{catLabel[r.category] || r.category}</span>
                          <span style={{ fontWeight: 800, fontSize: 15, color: C.primary }}>₪{Number(r.amount).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: C.textSecondary }}>
                          {r.date && <span>📅 {r.date}</span>}
                        </div>
                        {r.description && <div style={{ marginTop: 6, fontSize: 13, color: C.textMuted, fontStyle: 'italic' }}>{r.description}</div>}
                      </div>
                    )
                  })
                }
              </div>
            )}

            {/* ── DOCUMENTS ── */}
            {tab === 'documents' && (
              <div style={{ padding: '0 24px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 10, marginTop: 20 }}>
                  {rtl ? 'מסמכים' : 'Documents'}
                </div>
                <DocsPane key={docsKey} entityId={car.id} entityType="car" companyId={companyId} t={t} rtl={rtl} />
                <FormSubmissionsSection entityId={car.id} entityType="car" companyId={companyId} rtl={rtl} />
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

// ── Driver Detail Modal ──────────────────────────────────────────────────────
function DriverDetailModal({ driver, getBranchName, cars, companyId, t, rtl, onClose }) {
  const [tab, setTab]       = useState('overview')
  const [loading, setLoading] = useState(false)

  const assignedCar = cars.find(c => String(c.id) === String(driver.car_id) || String(c.driver_id) === String(driver.id))

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }
  const modal   = { background: C.surface, borderRadius: 16, width: '100%', maxWidth: 720, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', position: 'relative', direction: rtl ? 'rtl' : 'ltr' }
  const hdr     = { background: C.navBg, borderRadius: '16px 16px 0 0', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }
  const tabBar  = { display: 'flex', background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '0 24px' }
  const tabBtn  = active => ({ padding: '12px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', borderBottom: active ? `2px solid ${C.primary}` : '2px solid transparent', color: active ? C.primary : C.textMuted, transition: 'color 0.15s' })
  const sTitle  = { fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 10, marginTop: 20 }
  const infoRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.borderLight}`, fontSize: 13 }
  const card    = { background: C.bg, borderRadius: 10, padding: 14, marginBottom: 10, border: `1px solid ${C.border}` }
  const statusColor = DRIVER_STATUS_COLOR[driver.status] || C.success

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        {/* Header */}
        <div style={hdr}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
            {driver.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#f8fafc' }}>{driver.name}</span>
              <Badge label={t[DRIVER_STATUS_KEY[driver.status]] || driver.status} color={statusColor} />
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {[driver.license, driver.phone, getBranchName(driver.branch_id) !== '—' && getBranchName(driver.branch_id)].filter(Boolean).join(' · ')}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Tab bar */}
        <div style={tabBar}>
          {[['overview', '📋 ' + (rtl ? 'סקירה' : 'Overview')], ['certifications', `🏅 ${rtl ? 'הסמכות' : 'Certifications'}`], ['documents', `📎 ${rtl ? 'מסמכים' : 'Documents'}`]].map(([id, label]) => (
            <button key={id} style={tabBtn(tab === id)} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        <div style={{ padding: '0 0 24px' }}>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <>
              <div style={{ padding: '0 24px 20px' }}>
                <div style={sTitle}>{rtl ? 'פרטי נהג' : 'Driver Details'}</div>
                {[
                  [rtl ? 'שם' : 'Name',                       driver.name],
                  [rtl ? 'רישיון' : 'License',                driver.license],
                  [rtl ? 'טלפון' : 'Phone',                   driver.phone],
                  [rtl ? 'סטטוס' : 'Status',                  t[DRIVER_STATUS_KEY[driver.status]] || driver.status],
                  [t.branch,                                    getBranchName(driver.branch_id) !== '—' ? getBranchName(driver.branch_id) : null],
                  [rtl ? 'רמות רישיון' : 'License Levels',    (driver.license_levels || []).map(l => t[LICENSE_LEVEL_KEY[l]] || l).join(', ') || null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} style={infoRow}>
                    <span style={{ color: C.textMuted }}>{label}</span>
                    <span style={{ fontWeight: 600, color: C.textPrimary }}>{value}</span>
                  </div>
                ))}
                {driver.license_expiry && (() => {
                  const daysLeft = Math.ceil((new Date(driver.license_expiry) - new Date()) / 86400000)
                  const color = daysLeft < 0 ? C.danger : daysLeft <= 30 ? C.warning : C.success
                  const label = daysLeft < 0 ? (rtl ? 'פג תוקף' : 'Expired') : daysLeft <= 30 ? (rtl ? `פוקע בעוד ${daysLeft} ימים` : `Expires in ${daysLeft} days`) : (rtl ? 'בתוקף' : 'Valid')
                  return (
                    <div style={infoRow}>
                      <span style={{ color: C.textMuted }}>{t.licenseExpiry || (rtl ? 'תפוגת רישיון' : 'License Expiry')}</span>
                      <span style={{ fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {fmtDate(driver.license_expiry)} <span style={{ fontSize: 11, background: color + '18', padding: '2px 7px', borderRadius: 4 }}>{label}</span>
                      </span>
                    </div>
                  )
                })()}
              </div>

              <div style={{ padding: '0 24px 20px' }}>
                <div style={sTitle}>{rtl ? 'רכב משויך' : 'Assigned Vehicle'}</div>
                {assignedCar ? (
                  <div style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary, letterSpacing: 1 }}>{formatPlate(assignedCar.plate)}</span>
                      <Badge label={t[CAR_STATUS_KEY[assignedCar.status]] || assignedCar.status} color={s => s === 'Available' || s === t.available ? C.success : s === 'In Use' || s === t.inUse ? C.primary : C.warning} />
                    </div>
                    <div style={{ fontSize: 13, color: C.textSecondary }}>
                      {assignedCar.make} {assignedCar.model}{assignedCar.year ? ` · ${assignedCar.year}` : ''} · {t[CAR_FUEL_KEY[assignedCar.fuel]] || assignedCar.fuel}
                      {assignedCar.mileage ? ` · ${assignedCar.mileage.toLocaleString()} km` : ''}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: C.textMuted, fontSize: 13, paddingTop: 8 }}>{rtl ? 'אין רכב משויך' : 'No vehicle assigned'}</div>
                )}
              </div>
            </>
          )}

          {/* ── CERTIFICATIONS ── */}
          {tab === 'certifications' && (
            <div style={{ padding: '0 24px 20px' }}>
              <CertificationsPane driverId={driver.id} companyId={companyId} rtl={rtl} />
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {tab === 'documents' && (
            <div style={{ padding: '0 24px 20px' }}>
              <div style={sTitle}>{rtl ? 'מסמכים' : 'Documents'}</div>
              <DocsPane entityId={driver.id} entityType="driver" companyId={companyId} t={t} rtl={rtl} />
              <FormSubmissionsSection entityId={driver.id} entityType="driver" companyId={companyId} rtl={rtl} />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Data rows ───────────────────────────────────────────────────────────────
function CarRow({ car, getBranchName, getBranchIdx, drivers, selected, onSelect, onEdit, onDelete, onFiles, onPhotoChange, onMileageUpdate, onViewDetail, t, rtl, mobile }) {
  const [hover, setHover] = useState(false)
  const [editingKm, setEditingKm] = useState(false)
  const [kmVal, setKmVal] = useState(String(car.mileage || ''))
  const td = mkTd(rtl, mobile)
  const statusColor = CAR_STATUS_COLOR[car.status] || C.textMuted
  const assignedDriver = drivers.find(d => d.id === car.driver_id)

  function saveKm() {
    const val = parseInt(kmVal, 10)
    if (!isNaN(val) && val >= 0) onMileageUpdate(car.id, val)
    setEditingKm(false)
  }

  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: selected ? C.primary + '08' : hover ? C.rowHover : C.surface, transition: 'background 0.12s' }}>
      <td style={{ ...td, width: 36, padding: '10px 12px' }}><input type="checkbox" checked={!!selected} onChange={onSelect} style={{ cursor: 'pointer' }} /></td>
      <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PhotoThumb path={car.photo_url} onUpload={onPhotoChange} t={t} />
          {formatPlate(car.plate)}
        </span>
      </td>
      <td style={td}>{car.make} {car.model}</td>
      <td style={td}>{car.year || '—'}</td>
      <td style={{ ...td, cursor: 'pointer' }} onClick={() => { setKmVal(String(car.mileage || '')); setEditingKm(true) }}>
        {editingKm ? (
          <span style={{ display: 'flex', gap: 4, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <input autoFocus type="number" value={kmVal} onChange={e => setKmVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveKm(); if (e.key === 'Escape') setEditingKm(false) }}
              style={{ width: 70, padding: '3px 6px', border: `1px solid ${C.primary}`, borderRadius: 5, fontSize: 12, outline: 'none' }} />
            <button onClick={saveKm} style={{ background: C.success, color: '#fff', border: 'none', borderRadius: 4, padding: '3px 7px', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>✓</button>
            <button onClick={() => setEditingKm(false)} style={{ background: C.border, color: C.textSecondary, border: 'none', borderRadius: 4, padding: '3px 7px', fontSize: 11, cursor: 'pointer' }}>✕</button>
          </span>
        ) : (
          <span style={{ fontSize: 13, color: car.mileage ? C.textPrimary : C.textMuted }}>
            {car.mileage ? car.mileage.toLocaleString() : '—'}
            <span style={{ fontSize: 10, color: C.textMuted, marginInlineStart: 3 }}>✏️</span>
          </span>
        )}
      </td>
      <td style={td}><Badge label={t[CAR_STATUS_KEY[car.status]] || car.status || t.available} color={statusColor} /></td>
      <td style={td}>{t[CAR_FUEL_KEY[car.fuel]] || car.fuel || '—'}</td>
      <td style={td}>
        {getBranchName(car.branch_id) !== '—'
          ? <Badge label={getBranchName(car.branch_id)} color={branchColor(getBranchIdx(car.branch_id))} />
          : <span style={{ color: C.textMuted }}>—</span>}
      </td>
      <td style={td}>
        {assignedDriver
          ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: C.primary, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                {assignedDriver.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
              <span style={{ fontSize: 13 }}>{assignedDriver.name}</span>
            </span>
          : <span style={{ color: C.textMuted }}>—</span>}
      </td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6, justifyContent: rtl ? 'flex-end' : 'flex-start' }}>
          <button onClick={onViewDetail} style={{ background: C.primary + '15', border: `1px solid ${C.primary}30`, color: C.primary, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
            {rtl ? '👁 פרטים' : '👁 View'}
          </button>
          <ActionBtn variant="edit" onClick={onEdit}>{t.edit}</ActionBtn>
          <ActionBtn variant="delete" onClick={onDelete}>{t.delete}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

function EditableCarRow({ car, branches, drivers, onSave, onCancel, t, rtl, mobile, customLists }) {
  const [form, setForm] = useState({ ...car })
  const td = mkTd(rtl, mobile)
  const inp = inlineInput(rtl)
  return (
    <tr style={{ background: C.rowHover }}>
      <td style={td} />
      <td style={td}><input value={form.plate || ''} placeholder={t.plate} maxLength={20} onChange={e => setForm({ ...form, plate: e.target.value })} style={inp} /></td>
      <td style={td}>
        <div style={{ display: 'flex', gap: 4 }}>
          <input value={form.make || ''} placeholder={t.make} maxLength={50} onChange={e => setForm({ ...form, make: e.target.value })} style={{ ...inp, width: '50%' }} />
          <input value={form.model || ''} placeholder={t.model} maxLength={50} onChange={e => setForm({ ...form, model: e.target.value })} style={{ ...inp, width: '50%' }} />
        </div>
      </td>
      <td style={td}><input type="number" value={form.year || ''} placeholder={t.year} min={1900} max={2099} onChange={e => setForm({ ...form, year: e.target.value })} style={inp} /></td>
      <td style={td}><input type="number" value={form.mileage || ''} placeholder={t.mileage} min={0} max={9999999} onChange={e => setForm({ ...form, mileage: e.target.value })} style={inp} /></td>
      <td style={td}>
        <select value={form.status || 'Available'} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
          {getMergedOptions('car_status', customLists).map(v => <option key={v} value={v}>{t[CAR_STATUS_KEY[v]] || v}</option>)}
        </select>
      </td>
      <td style={td}>
        <select value={form.fuel || 'Petrol'} onChange={e => setForm({ ...form, fuel: e.target.value })} style={inp}>
          {getMergedOptions('fuel_type', customLists).map(v => <option key={v} value={v}>{t[CAR_FUEL_KEY[v]] || v}</option>)}
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

function DriverRow({ driver, getBranchName, getBranchIdx, selected, onSelect, onEdit, onDelete, onViewDetail, t, rtl, mobile }) {
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
      <td style={td}>{driver.license ? <Badge label={driver.license} color={C.warning} /> : '—'}</td>
      <td style={td}>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(driver.license_levels || []).length > 0
            ? (driver.license_levels).map(l => <Badge key={l} label={t[LICENSE_LEVEL_KEY[l]] || l} color={C.primary} />)
            : <span style={{ color: C.textMuted }}>—</span>}
        </span>
      </td>
      <td style={td}>{driver.phone || '—'}</td>
      <td style={td}><Badge label={t[DRIVER_STATUS_KEY[driver.status]] || driver.status || t.active} color={statusColor} /></td>
      <td style={td}>
        {getBranchName(driver.branch_id) !== '—'
          ? <Badge label={getBranchName(driver.branch_id)} color={branchColor(getBranchIdx(driver.branch_id))} />
          : <span style={{ color: C.textMuted }}>—</span>}
      </td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 6, justifyContent: rtl ? 'flex-end' : 'flex-start' }}>
          <button onClick={onViewDetail} style={{ background: C.primary + '15', border: `1px solid ${C.primary}30`, color: C.primary, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
            {rtl ? '👁 פרטים' : '👁 View'}
          </button>
          <ActionBtn variant="edit" onClick={onEdit}>{t.edit}</ActionBtn>
          <ActionBtn variant="delete" onClick={onDelete}>{t.delete}</ActionBtn>
        </span>
      </td>
    </tr>
  )
}

function EditableDriverRow({ driver, branches, onSave, onCancel, t, rtl, mobile, customLists }) {
  const [form, setForm] = useState({ ...driver })
  const td = mkTd(rtl, mobile)
  const inp = inlineInput(rtl)
  return (
    <tr style={{ background: C.rowHover }}>
      <td style={td} />
      <td style={td}><input value={form.name || ''} placeholder={t.name} maxLength={80} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} /></td>
      <td style={td}><input value={form.license || ''} placeholder={t.license} maxLength={20} onChange={e => setForm({ ...form, license: e.target.value })} style={inp} /></td>
      <td style={td}>
        <MultiSelect options={getMergedOptions('license_level', customLists)} value={form.license_levels || []} onChange={v => setForm({ ...form, license_levels: v })} placeholder={t.licenseLevel} style={inp} getLabel={l => t[LICENSE_LEVEL_KEY[l]] || l} />
      </td>
      <td style={td}><input value={form.phone || ''} placeholder={t.phone} maxLength={20} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} /></td>
      <td style={td}>
        <select value={form.status || 'Active'} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
          {getMergedOptions('driver_status', customLists).map(v => <option key={v} value={v}>{t[DRIVER_STATUS_KEY[v]] || v}</option>)}
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
      <td style={td} />
      <td style={td}><input value={form.name || ''} placeholder={t.branchName} maxLength={80} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} /></td>
      <td style={td}><input value={form.city || ''} placeholder={t.city} maxLength={60} onChange={e => setForm({ ...form, city: e.target.value })} style={inp} /></td>
      <td style={td}><input value={form.address || ''} placeholder={t.address} maxLength={150} onChange={e => setForm({ ...form, address: e.target.value })} style={inp} /></td>
      <td style={td}><input value={form.manager || ''} placeholder={t.manager} maxLength={80} onChange={e => setForm({ ...form, manager: e.target.value })} style={inp} /></td>
      <td style={td}><input value={form.phone || ''} placeholder={t.phone} maxLength={20} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} /></td>
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
// ── Ministry of Transport vehicle lookup ────────────────────────────────────
const FUEL_MAP = { 'בנזין': 'Petrol', 'דיזל': 'Diesel', 'גז': 'Petrol', 'חשמל': 'Electric', 'היברידי': 'Hybrid', 'היבריד': 'Hybrid' }
async function lookupPlate(rawPlate, signal) {
  const plate = rawPlate.replace(/\D/g, '')
  if (!plate) return null
  const RESOURCE_IDS = [
    '053cea08-09bc-40ec-8f7a-156f0677aff3', // פרטי ומסחרי
    '0866573c-40cd-4ca8-91d2-9dd2d7a492e5', // פרטי ומסחרי המשך
    'cd3acc5c-03c3-4c89-9c54-d40f93c0d790', // כבד מעל 3.5 טון
    '7975b823-7dd0-4e6a-b408-a9bd59b3fb5a', // ציבורי (אוטובוסים)
  ]
  for (const rid of RESOURCE_IDS) {
    try {
      if (signal?.aborted) return null
      const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${rid}&filters=${encodeURIComponent(JSON.stringify({ mispar_rechev: plate }))}&limit=1`
      const res = await fetch(url, { signal })
      const data = await res.json()
      const rec = data?.result?.records?.[0]
      if (rec) {
        const make  = (rec.tozeret_nm || '').trim()
        const model = (rec.kinuy_mishari || rec.degem_nm || '').trim()
        const year  = rec.shnat_yitzur ? String(rec.shnat_yitzur) : ''
        const fuelHe = (rec.sug_delek_nm || '').trim()
        const fuel  = FUEL_MAP[fuelHe] || 'Petrol'
        const color = (rec.tzeva_rechev || '').trim()
        return { make, model, year, fuel, color }
      }
    } catch (e) { if (e?.name === 'AbortError') return null /* cancelled */ }
  }
  return null
}

function AddCarRow({ branches, drivers, onAdd, onCancel, t, rtl, mobile, customLists }) {
  const [form, setForm] = useState({ plate: '', make: '', model: '', year: '', mileage: '', status: 'Available', fuel: 'Petrol', branch_id: '', driver_id: '' })
  const [lookupState, setLookupState] = useState('idle') // idle | loading | found | notfound
  const abortRef = useRef(null)
  const td = mkTd(rtl, mobile)
  const inp = inlineInput(rtl)

  async function doLookup() {
    if (!form.plate.trim()) return
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setLookupState('loading')
    const result = await lookupPlate(form.plate, abortRef.current.signal)
    if (result === null && abortRef.current?.signal.aborted) return
    if (result) {
      setForm(f => ({ ...f, ...result }))
      setLookupState('found')
    } else {
      setLookupState('notfound')
    }
    setTimeout(() => setLookupState('idle'), 3000)
  }

  function submit() { if (form.plate.trim() && form.make.trim() && form.model.trim()) onAdd(form) }
  return (
    <tr style={{ background: C.rowAdd }}>
      <td style={td} />
      <td style={td}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input autoFocus placeholder={t.plate} value={form.plate} maxLength={20} onChange={e => { setForm({ ...form, plate: e.target.value }); setLookupState('idle') }} style={{ ...inp, flex: 1 }} onKeyDown={e => e.key === 'Enter' && doLookup()} />
          <button onClick={doLookup} disabled={lookupState === 'loading' || !form.plate.trim()} title={t.plateLookup} style={{
            background: lookupState === 'found' ? C.success : lookupState === 'notfound' ? C.danger : C.primary,
            color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11,
            fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            opacity: lookupState === 'loading' ? 0.7 : 1,
          }}>
            {lookupState === 'loading' ? '⏳' : lookupState === 'found' ? '✓' : lookupState === 'notfound' ? '✗' : '🔍'}
          </button>
        </div>
      </td>
      <td style={td}>
        <div style={{ display: 'flex', gap: 4 }}>
          <input placeholder={t.make} value={form.make} maxLength={50} onChange={e => setForm({ ...form, make: e.target.value })} style={{ ...inp, width: '50%' }} />
          <input placeholder={t.model} value={form.model} maxLength={50} onChange={e => setForm({ ...form, model: e.target.value })} style={{ ...inp, width: '50%' }} />
        </div>
      </td>
      <td style={td}><input type="number" placeholder={t.year} value={form.year} min={1900} max={2099} onChange={e => setForm({ ...form, year: e.target.value })} style={inp} /></td>
      <td style={td}><input type="number" placeholder={t.mileage} value={form.mileage} min={0} max={9999999} onChange={e => setForm({ ...form, mileage: e.target.value })} style={inp} /></td>
      <td style={td}>
        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
          {getMergedOptions('car_status', customLists).map(v => <option key={v} value={v}>{t[CAR_STATUS_KEY[v]] || v}</option>)}
        </select>
      </td>
      <td style={td}>
        <select value={form.fuel} onChange={e => setForm({ ...form, fuel: e.target.value })} style={inp}>
          {getMergedOptions('fuel_type', customLists).map(v => <option key={v} value={v}>{t[CAR_FUEL_KEY[v]] || v}</option>)}
        </select>
      </td>
      <td style={td}><select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })} style={inp}><option value="">{t.noBranch}</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></td>
      <td style={td}><select value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })} style={inp}><option value="">{t.noDriver}</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}><span style={{ display: 'flex', gap: 6 }}><ActionBtn variant="save" onClick={submit}>{t.add}</ActionBtn><ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn></span></td>
    </tr>
  )
}

function AddDriverRow({ branches, onAdd, onCancel, t, rtl, mobile, customLists }) {
  const [form, setForm] = useState({ name: '', license: '', license_levels: [], phone: '', status: 'Active', branch_id: '' })
  const td = mkTd(rtl, mobile)
  const inp = inlineInput(rtl)
  function submit() { if (form.name.trim()) onAdd(form) }
  return (
    <tr style={{ background: C.rowAdd }}>
      <td style={td} />
      <td style={td}><input autoFocus placeholder={t.name} value={form.name} maxLength={80} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={td}><input placeholder={t.license} value={form.license} maxLength={20} onChange={e => setForm({ ...form, license: e.target.value })} style={inp} /></td>
      <td style={td}>
        <MultiSelect options={getMergedOptions('license_level', customLists)} value={form.license_levels} onChange={v => setForm({ ...form, license_levels: v })} placeholder={t.licenseLevel} style={inp} />
      </td>
      <td style={td}><input placeholder={t.phone} value={form.phone} maxLength={20} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} /></td>
      <td style={td}>
        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
          {getMergedOptions('driver_status', customLists).map(v => <option key={v} value={v}>{t[DRIVER_STATUS_KEY[v]] || v}</option>)}
        </select>
      </td>
      <td style={td}><select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })} style={inp}><option value="">{t.noBranch}</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}><span style={{ display: 'flex', gap: 6 }}><ActionBtn variant="save" onClick={submit}>{t.add}</ActionBtn><ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn></span></td>
    </tr>
  )
}

// ── Mobile card views ──────────────────────────────────────────────────────
function MobileCarCard({ car, getBranchName, getBranchIdx, drivers, selected, onSelect, onEdit, onDelete, onFiles, onPhotoChange, onViewDetail, t, rtl }) {
  const assignedDriver = drivers.find(d => d.id === car.driver_id)
  const statusColor    = CAR_STATUS_COLOR[car.status] || C.textMuted
  const branchName     = getBranchName(car.branch_id)
  const branchIdx      = getBranchIdx(car.branch_id)
  return (
    <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: '12px 14px', marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', position: 'relative', direction: rtl ? 'rtl' : 'ltr' }}>
      <input type="checkbox" checked={!!selected} onChange={onSelect} style={{ position: 'absolute', top: 12, [rtl ? 'left' : 'right']: 12, cursor: 'pointer' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, paddingRight: rtl ? 0 : 22, paddingLeft: rtl ? 22 : 0 }}>
        <PhotoThumb path={car.photo_url} onUpload={onPhotoChange} t={t} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary }}>{formatPlate(car.plate)}</div>
          <div style={{ fontSize: 12, color: C.textSecondary }}>{car.make} {car.model}{car.year ? ` · ${car.year}` : ''}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <Badge label={t[CAR_STATUS_KEY[car.status]] || car.status || t.available} color={statusColor} />
        {car.fuel && <Badge label={t[CAR_FUEL_KEY[car.fuel]] || car.fuel} color={C.textMuted} />}
        {branchName !== '—' && <Badge label={branchName} color={branchColor(branchIdx)} />}
        {assignedDriver && <Badge label={assignedDriver.name} color={C.primary} />}
      </div>
      <div style={{ display: 'flex', gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
        <button onClick={onViewDetail} style={{ background: C.primary + '15', border: `1px solid ${C.primary}30`, color: C.primary, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
          {rtl ? '👁 פרטים' : '👁 View'}
        </button>
        <ActionBtn variant="edit" onClick={onEdit}>{t.edit}</ActionBtn>
        <ActionBtn variant="delete" onClick={onDelete}>{t.delete}</ActionBtn>
      </div>
    </div>
  )
}

function MobileDriverCard({ driver, getBranchName, getBranchIdx, selected, onSelect, onEdit, onDelete, onViewDetail, t, rtl }) {
  const statusColor = DRIVER_STATUS_COLOR[driver.status] || C.success
  const branchName  = getBranchName(driver.branch_id)
  const branchIdx   = getBranchIdx(driver.branch_id)
  return (
    <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: '12px 14px', marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', position: 'relative', direction: rtl ? 'rtl' : 'ltr' }}>
      <input type="checkbox" checked={!!selected} onChange={onSelect} style={{ position: 'absolute', top: 12, [rtl ? 'left' : 'right']: 12, cursor: 'pointer' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, paddingRight: rtl ? 0 : 22, paddingLeft: rtl ? 22 : 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
          {driver.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary }}>{driver.name}</div>
          <div style={{ fontSize: 12, color: C.textSecondary }}>{driver.phone || driver.license || ''}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <Badge label={t[DRIVER_STATUS_KEY[driver.status]] || driver.status || t.active} color={statusColor} />
        {driver.license && <Badge label={driver.license} color={C.warning} />}
        {(driver.license_levels || []).map(l => <Badge key={l} label={t[LICENSE_LEVEL_KEY[l]] || l} color={C.primary} />)}
        {branchName !== '—' && <Badge label={branchName} color={branchColor(branchIdx)} />}
      </div>
      <div style={{ display: 'flex', gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
        <button onClick={onViewDetail} style={{ background: C.primary + '15', border: `1px solid ${C.primary}30`, color: C.primary, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
          {rtl ? '👁 פרטים' : '👁 View'}
        </button>
        <ActionBtn variant="edit" onClick={onEdit}>{t.edit}</ActionBtn>
        <ActionBtn variant="delete" onClick={onDelete}>{t.delete}</ActionBtn>
      </div>
    </div>
  )
}

function MobileBranchCard({ branch, index, selected, onSelect, onEdit, onDelete, t, rtl }) {
  return (
    <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: '12px 14px', marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', position: 'relative', direction: rtl ? 'rtl' : 'ltr' }}>
      <input type="checkbox" checked={!!selected} onChange={onSelect} style={{ position: 'absolute', top: 12, [rtl ? 'left' : 'right']: 12, cursor: 'pointer' }} />
      <div style={{ paddingRight: rtl ? 0 : 22, paddingLeft: rtl ? 22 : 0, marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary }}>{branch.name}</div>
        <div style={{ fontSize: 12, color: C.textSecondary }}>{branch.city}{branch.address ? ` · ${branch.address}` : ''}</div>
      </div>
      {(branch.manager || branch.phone) && (
        <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {branch.manager && <span>👤 {branch.manager}</span>}
          {branch.phone   && <span>📞 {branch.phone}</span>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
        <ActionBtn variant="edit" onClick={onEdit}>{t.edit}</ActionBtn>
        <ActionBtn variant="delete" onClick={onDelete}>{t.delete}</ActionBtn>
      </div>
    </div>
  )
}

// ── Mobile bottom-sheet form (add / edit) ───────────────────────────────────
function MobileFormModal({ mode, tab, item, branches, drivers, customLists, onSave, onCancel, t, rtl }) {
  const isEdit = mode === 'edit'
  const defaults = {
    cars:    { plate: '', make: '', model: '', year: '', mileage: '', color: '', status: 'Available', fuel: 'Petrol', branch_id: '', driver_id: '' },
    drivers: { name: '', license: '', phone: '', status: 'Active', branch_id: '' },
    branches:{ name: '', city: '', address: '', manager: '', phone: '' },
  }
  const [form, setForm] = useState(isEdit && item ? { ...item } : defaults[tab] || {})
  const [err, setErr]   = useState('')
  const [lookupState, setLookupState] = useState('idle')
  const [lookupMsg, setLookupMsg]     = useState('')
  const abortRef = useRef(null)

  async function doLookup() {
    if (!form.plate?.trim()) return
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setLookupState('loading'); setLookupMsg('')
    const result = await lookupPlate(form.plate, abortRef.current.signal)
    if (result === null && abortRef.current?.signal.aborted) return
    if (result) {
      setForm(f => ({ ...f, ...result }))
      setLookupState('found')
      setLookupMsg(t.plateLookupFilled)
    } else {
      setLookupState('notfound')
      setLookupMsg(t.plateLookupNotFound)
    }
    setTimeout(() => { setLookupState('idle'); setLookupMsg('') }, 3000)
  }

  const inp = { width: '100%', padding: '11px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 15, outline: 'none', boxSizing: 'border-box', color: C.textPrimary, background: C.bg }
  const fw  = { display: 'flex', flexDirection: 'column', gap: 5 }
  const lbl = { fontSize: 12, fontWeight: 600, color: C.textSecondary }
  const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }

  async function handleSave() {
    setErr('')
    if (tab === 'cars') {
      if (isEmpty(form.plate)) { setErr(rtl ? 'לוחית רישוי היא שדה חובה' : 'License plate is required'); return }
      if (!isIsraeliPlate(form.plate)) { setErr(rtl ? 'לוחית רישוי לא תקינה (7–8 ספרות)' : 'Invalid license plate (7–8 digits)'); return }
      if (form.year && !isYear(form.year)) { setErr(rtl ? 'שנה לא תקינה (1900–2099)' : 'Invalid year (1900–2099)'); return }
      if (form.mileage && !isPositive(form.mileage)) { setErr(rtl ? 'קילומטראז׳ לא תקין' : 'Invalid mileage'); return }
    }
    if (tab === 'drivers') {
      if (!isMinLen(form.name, 2)) { setErr(rtl ? 'שם חובה (לפחות 2 תווים)' : 'Name required (at least 2 characters)'); return }
      if (form.phone && !isIsraeliPhone(form.phone)) { setErr(rtl ? 'מספר טלפון לא תקין' : 'Invalid phone number'); return }
    }
    if (tab === 'branches') {
      if (!isMinLen(form.name, 2)) { setErr(rtl ? 'שם סניף חובה (לפחות 2 תווים)' : 'Branch name required (at least 2 characters)'); return }
      if (form.phone && !isIsraeliPhone(form.phone)) { setErr(rtl ? 'מספר טלפון לא תקין' : 'Invalid phone number'); return }
    }
    await onSave(form)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onCancel}>
      <div style={{ background: C.surface, width: '100%', borderRadius: '18px 18px 0 0', padding: '16px 16px 28px', maxHeight: '92vh', overflowY: 'auto', direction: rtl ? 'rtl' : 'ltr' }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2, margin: '0 auto 16px' }} />
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: C.textPrimary }}>{isEdit ? t.edit : t.newItem}</h3>
        {err && <div style={{ color: C.danger, fontSize: 13, marginBottom: 10, padding: '8px 12px', background: C.danger+'10', borderRadius: 6 }}>{err}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tab === 'cars' && <>
            <div style={fw}>
              <label style={lbl}>{t.plate}</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={form.plate||''} maxLength={20} onChange={e=>{ setForm({...form,plate:e.target.value}); setLookupState('idle'); setLookupMsg('') }} placeholder={t.plate} style={{ ...inp, flex: 1 }} autoFocus={!isEdit} />
                <button onClick={doLookup} disabled={lookupState==='loading' || !form.plate?.trim()} style={{
                  background: lookupState==='found' ? C.success : lookupState==='notfound' ? C.danger : C.primary,
                  color:'#fff', border:'none', borderRadius:8, padding:'11px 14px',
                  fontSize:14, fontWeight:700, cursor:'pointer', flexShrink:0,
                  opacity: lookupState==='loading' ? 0.7 : 1,
                }}>
                  {lookupState==='loading' ? '⏳' : lookupState==='found' ? '✓' : lookupState==='notfound' ? '✗' : '🔍'}
                </button>
              </div>
              {lookupMsg && <div style={{ fontSize:12, marginTop:4, color: lookupState==='found' ? C.success : C.danger, fontWeight:600 }}>{lookupMsg}</div>}
            </div>
            <div style={row2}>
              <div style={fw}><label style={lbl}>{t.make}</label><input value={form.make||''} maxLength={50} onChange={e=>setForm({...form,make:e.target.value})} placeholder={t.make} style={inp} /></div>
              <div style={fw}><label style={lbl}>{t.model}</label><input value={form.model||''} maxLength={50} onChange={e=>setForm({...form,model:e.target.value})} placeholder={t.model} style={inp} /></div>
            </div>
            <div style={row2}>
              <div style={fw}><label style={lbl}>{t.year}</label><input type="number" value={form.year||''} min={1900} max={2099} onChange={e=>setForm({...form,year:e.target.value})} placeholder={t.year} style={inp} /></div>
              <div style={fw}><label style={lbl}>{t.mileage}</label><input type="number" value={form.mileage||''} min={0} max={9999999} onChange={e=>setForm({...form,mileage:e.target.value})} placeholder={t.mileage} style={inp} /></div>
            </div>
            <div style={fw}><label style={lbl}>{t.status}</label>
              <select value={form.status||'Available'} onChange={e=>setForm({...form,status:e.target.value})} style={inp}>
                {getMergedOptions('car_status',customLists).map(v=><option key={v} value={v}>{t[CAR_STATUS_KEY[v]]||v}</option>)}
              </select>
            </div>
            <div style={fw}><label style={lbl}>{t.fuel}</label>
              <select value={form.fuel||'Petrol'} onChange={e=>setForm({...form,fuel:e.target.value})} style={inp}>
                {getMergedOptions('fuel_type',customLists).map(v=><option key={v} value={v}>{t[CAR_FUEL_KEY[v]]||v}</option>)}
              </select>
            </div>
            <div style={fw}><label style={lbl}>{t.branch}</label>
              <select value={form.branch_id||''} onChange={e=>setForm({...form,branch_id:e.target.value})} style={inp}>
                <option value="">{t.noBranch}</option>
                {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div style={fw}><label style={lbl}>{t.driver}</label>
              <select value={form.driver_id||''} onChange={e=>setForm({...form,driver_id:e.target.value})} style={inp}>
                <option value="">{t.noDriver}</option>
                {drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </>}

          {tab === 'drivers' && <>
            <div style={fw}><label style={lbl}>{t.name}</label><input value={form.name||''} maxLength={80} onChange={e=>setForm({...form,name:e.target.value})} placeholder={t.name} style={inp} autoFocus={!isEdit} /></div>
            <div style={row2}>
              <div style={fw}><label style={lbl}>{t.license}</label><input value={form.license||''} maxLength={20} onChange={e=>setForm({...form,license:e.target.value})} placeholder={t.license} style={inp} /></div>
              <div style={fw}><label style={lbl}>{t.phone}</label><input value={form.phone||''} maxLength={20} onChange={e=>setForm({...form,phone:e.target.value})} placeholder={t.phone} style={inp} /></div>
            </div>
            <div style={fw}><label style={lbl}>{t.licenseLevel}</label>
              <MultiSelect options={getMergedOptions('license_level', customLists)} value={form.license_levels||[]} onChange={v=>setForm({...form,license_levels:v})} placeholder={t.licenseLevel} style={inp} />
            </div>
            <div style={fw}><label style={lbl}>{t.driverStatus}</label>
              <select value={form.status||'Active'} onChange={e=>setForm({...form,status:e.target.value})} style={inp}>
                {getMergedOptions('driver_status',customLists).map(v=><option key={v} value={v}>{t[DRIVER_STATUS_KEY[v]]||v}</option>)}
              </select>
            </div>
            <div style={fw}>
              <label style={lbl}>{t.licenseExpiry || (t.rtl ? 'תפוגת רישיון' : 'License Expiry')}</label>
              <DateInput value={form.license_expiry||''} onChange={e=>setForm({...form,license_expiry:e.target.value})} style={inp} placeholder="DD/MM/YY" />
            </div>
            <div style={fw}><label style={lbl}>{t.branch}</label>
              <select value={form.branch_id||''} onChange={e=>setForm({...form,branch_id:e.target.value})} style={inp}>
                <option value="">{t.noBranch}</option>
                {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </>}

          {tab === 'branches' && <>
            <div style={fw}><label style={lbl}>{t.branchName}</label><input value={form.name||''} maxLength={80} onChange={e=>setForm({...form,name:e.target.value})} placeholder={t.branchName} style={inp} autoFocus={!isEdit} /></div>
            <div style={row2}>
              <div style={fw}><label style={lbl}>{t.city}</label><input value={form.city||''} maxLength={60} onChange={e=>setForm({...form,city:e.target.value})} placeholder={t.city} style={inp} /></div>
              <div style={fw}><label style={lbl}>{t.phone}</label><input value={form.phone||''} maxLength={20} onChange={e=>setForm({...form,phone:e.target.value})} placeholder={t.phone} style={inp} /></div>
            </div>
            <div style={fw}><label style={lbl}>{t.address}</label><input value={form.address||''} maxLength={150} onChange={e=>setForm({...form,address:e.target.value})} placeholder={t.address} style={inp} /></div>
            <div style={fw}><label style={lbl}>{t.manager}</label><input value={form.manager||''} maxLength={80} onChange={e=>setForm({...form,manager:e.target.value})} placeholder={t.manager} style={inp} /></div>
          </>}

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button onClick={handleSave} style={{ ...btnPrimary, flex: 1, padding: '13px', fontSize: 15 }}>{isEdit ? t.save : t.add}</button>
            <button onClick={onCancel} style={{ ...btnGhost, padding: '13px 20px', fontSize: 15 }}>{t.cancel}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddBranchRow({ onAdd, onCancel, t, rtl, mobile }) {
  const [form, setForm] = useState({ name: '', city: '', address: '', manager: '', phone: '' })
  const td = mkTd(rtl, mobile)
  const inp = inlineInput(rtl)
  function submit() { if (form.name.trim() && form.city.trim()) onAdd(form) }
  return (
    <tr style={{ background: C.rowAdd }}>
      <td style={td} />
      <td style={td}><input autoFocus placeholder={t.branchName} value={form.name} maxLength={80} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={td}><input placeholder={t.city} value={form.city} maxLength={60} onChange={e => setForm({ ...form, city: e.target.value })} style={inp} onKeyDown={e => e.key === 'Enter' && submit()} /></td>
      <td style={td}><input placeholder={t.address} value={form.address} maxLength={150} onChange={e => setForm({ ...form, address: e.target.value })} style={inp} /></td>
      <td style={td}><input placeholder={t.manager} value={form.manager} maxLength={80} onChange={e => setForm({ ...form, manager: e.target.value })} style={inp} /></td>
      <td style={td}><input placeholder={t.phone} value={form.phone} maxLength={20} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} /></td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}><span style={{ display: 'flex', gap: 6 }}><ActionBtn variant="save" onClick={submit}>{t.add}</ActionBtn><ActionBtn variant="cancel" onClick={onCancel}>{t.cancel}</ActionBtn></span></td>
    </tr>
  )
}

// ── Maintenance Tab ──────────────────────────────────────────────────────────
function MaintenanceTab({ cars, companyId, t, rtl, customLists }) {
  // All hooks first
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ car_id: '', type: 'Oil Change', description: '', cost: '', date: '', next_due: '', status: 'done', mileage: '', next_service_mileage: '' })
  const [plans, setPlans] = useState([])
  const [showPlanAdd, setShowPlanAdd] = useState(false)
  const [planForm, setPlanForm] = useState({ car_id: '', type: 'Oil Change', km_interval: '', month_interval: '', last_km: '', last_date: '' })
  const inp = inlineInput(rtl)
  const isMobile = useIsMobile()

  useEffect(() => { load() }, [companyId])
  useEffect(() => {
    supabase.from('maintenance_plans').select('*').eq('company_id', companyId).order('created_at', { ascending: false })
      .then(({ data }) => setPlans(data || []))
  }, [companyId])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('maintenance').select('*').eq('company_id', companyId).order('date', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }
  async function add(e) {
    e.preventDefault()
    const { data, error } = await supabase.from('maintenance').insert([{
      company_id: companyId, car_id: form.car_id || null, type: form.type,
      description: form.description || null, cost: parseFloat(form.cost) || 0,
      date: form.date, next_due: form.next_due || null, status: form.status,
      mileage: form.mileage ? parseInt(form.mileage, 10) : null,
      next_service_mileage: form.next_service_mileage ? parseInt(form.next_service_mileage, 10) : null,
    }]).select()
    if (!error && data) { setRecords(p => [data[0], ...p]); setShowAdd(false); setForm({ car_id: '', type: 'Oil Change', description: '', cost: '', date: '', next_due: '', status: 'done', mileage: '', next_service_mileage: '' }) }
  }
  async function del(id) {
    if (!window.confirm(t.confirmDelete)) return
    await supabase.from('maintenance').delete().eq('id', id)
    setRecords(p => p.filter(r => r.id !== id))
  }

  const statusColor = { done: C.success, scheduled: C.primary, overdue: C.danger }
  const statusLabel = { done: t.done, scheduled: t.scheduled, overdue: t.overdue }
  const carName = id => formatPlate(cars.find(c => String(c.id) === String(id))?.plate) || id

  const today = new Date(); today.setHours(0,0,0,0)
  const overdueRecords = records.filter(r => r.status === 'overdue' || (r.next_due && new Date(r.next_due) < today && r.status !== 'done'))
  const upcomingRecords = records.filter(r => r.status !== 'done' && r.next_due && new Date(r.next_due) >= today)
  const historyRecords = records.filter(r => r.status === 'done')

  const typeLabel = { 'Oil Change': t.oilChange, 'Tire Rotation': t.tireRotation, 'Inspection': t.inspection, 'Brake Service': t.brakeService, 'Other': t.otherService }

  async function addPlan(e) {
    e.preventDefault()
    if (!planForm.km_interval && !planForm.month_interval) {
      alert(rtl ? 'יש להגדיר מרווח ק"מ או מרווח חודשים' : 'Please set a km interval or a month interval.')
      return
    }
    const payload = {
      company_id: companyId,
      car_id: planForm.car_id ? parseInt(planForm.car_id, 10) : null,
      type: planForm.type,
      km_interval: planForm.km_interval ? parseInt(planForm.km_interval, 10) : null,
      month_interval: planForm.month_interval ? parseInt(planForm.month_interval, 10) : null,
      last_km: planForm.last_km ? parseInt(planForm.last_km, 10) : null,
      last_date: planForm.last_date || null,
    }
    const { data, error } = await supabase.from('maintenance_plans').insert([payload]).select()
    if (error) { console.error('[DB]', error); alert(rtl ? 'שגיאה בשמירה. נסה שוב.' : 'Save failed. Please try again.'); return }
    if (data) {
      setPlans(p => [data[0], ...p])
      setShowPlanAdd(false)
      setPlanForm({ car_id: '', type: 'Oil Change', km_interval: '', month_interval: '', last_km: '', last_date: '' })
    }
  }

  async function delPlan(id) {
    if (!window.confirm(t.confirmDelete)) return
    await supabase.from('maintenance_plans').delete().eq('id', id)
    setPlans(p => p.filter(pl => pl.id !== id))
  }

  function planNextKm(pl) {
    if (!pl.km_interval || !pl.last_km) return null
    return pl.last_km + pl.km_interval
  }
  function planNextDate(pl) {
    if (!pl.month_interval || !pl.last_date) return null
    const d = new Date(pl.last_date)
    d.setMonth(d.getMonth() + pl.month_interval)
    return d.toISOString().split('T')[0]
  }

  const tableSection = (title, rows, color, emptyMsg) => (
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}>
      <div style={{ height: 3, background: color }} />
      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 13, color }}>
        {title} <span style={{ fontWeight: 400, color: C.textMuted, fontSize: 12 }}>({rows.length})</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 520 : 600 }}>
          <thead>
            <tr>{[t.cars, t.serviceType, t.serviceDate, t.nextDue, rtl ? 'ק"מ' : 'Mileage', t.amount, t.status, t.actions].map(h => (
              <th key={h} style={mkTh(rtl, isMobile)}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>{emptyMsg}</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                <td style={mkTd(rtl, isMobile)}><span style={{ fontWeight: 600, color: C.primary }}>{carName(r.car_id)}</span></td>
                <td style={mkTd(rtl, isMobile)}>{t[MAINTENANCE_TYPE_KEY[r.type]] || r.type}</td>
                <td style={mkTd(rtl, isMobile)}>{fmtDate(r.date)}</td>
                <td style={mkTd(rtl, isMobile)}>{fmtDate(r.next_due)}</td>
                <td style={mkTd(rtl, isMobile)}>
                  {r.mileage ? r.mileage.toLocaleString() : '—'}
                  {r.mileage && r.next_service_mileage ? <span style={{ color: C.textMuted, fontSize: 11 }}> → {r.next_service_mileage.toLocaleString()}</span> : ''}
                </td>
                <td style={mkTd(rtl, isMobile)}>{r.cost ? `₪${parseFloat(r.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                <td style={mkTd(rtl, isMobile)}><Badge label={statusLabel[r.status] || r.status} color={statusColor[r.status] || C.textMuted} /></td>
                <td style={mkTd(rtl, isMobile)}><ActionBtn variant="delete" onClick={() => del(r.id)}>{t.delete}</ActionBtn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 24, direction: rtl ? 'rtl' : 'ltr' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: t.maintenanceHistory, value: historyRecords.length, color: C.primary, icon: '🔧' },
          { label: t.maintenanceDue, value: upcomingRecords.length, color: C.warning, icon: '📅' },
          { label: t.overdue, value: overdueRecords.length, color: C.danger, icon: '⚠️' },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ height: 3, background: s.color }} />
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <span style={{ fontSize: 30, fontWeight: 800, color: s.color }}>{s.value}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: C.textSecondary, fontWeight: 500 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add service record form */}
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
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.cars}</label>
              <select required value={form.car_id} onChange={e => setForm({ ...form, car_id: e.target.value })} style={inp}>
                <option value="">—</option>
                {cars.map(c => <option key={c.id} value={c.id}>{c.plate} {c.make}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.serviceType}</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inp}>
                {getMergedOptions('maintenance_type', customLists).map(v => (
                  <option key={v} value={v}>{typeLabel[v] || v}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.serviceDate}</label>
              <DateInput required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.nextDue}</label>
              <DateInput value={form.next_due} onChange={e => setForm({ ...form, next_due: e.target.value })} style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.amount}</label>
              <input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.status}</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
                <option value="done">{t.done}</option>
                <option value="scheduled">{t.scheduled}</option>
                <option value="overdue">{t.overdue}</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{rtl ? 'ק"מ נוכחי' : 'Mileage (km)'}</label>
              <input type="number" min="0" value={form.mileage} onChange={e => setForm({ ...form, mileage: e.target.value })} placeholder="0" style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{rtl ? 'ק"מ לטיפול הבא' : 'Next Service (km)'}</label>
              <input type="number" min="0" value={form.next_service_mileage} onChange={e => setForm({ ...form, next_service_mileage: e.target.value })} placeholder="0" style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.description}</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t.description + '…'} style={inp} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" style={{ ...btnPrimary, padding: '8px 18px', fontSize: 13, width: '100%' }}>{t.add}</button>
            </div>
          </form>
        )}
      </div>

      {/* Upcoming & Overdue */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.textMuted }}>{t.loadingShort}</div>
      ) : (
        <>
          {tableSection(
            `⚠️ ${t.upcomingMaintenance}`,
            [...overdueRecords, ...upcomingRecords.filter(r => r.status !== 'overdue')],
            C.danger,
            t.noMaintenance
          )}
          {tableSection(`📋 ${t.historyMaintenance}`, historyRecords, C.success, t.noMaintenance)}
        </>
      )}

      {/* ── Maintenance Plans ── */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden', marginTop: 8 }}>
        <div style={{ background: gradient, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>📆 {t.maintenancePlans}</span>
          <button onClick={() => setShowPlanAdd(p => !p)} style={{ ...btnPrimary, padding: '5px 14px', fontSize: 12, boxShadow: 'none', background: 'rgba(255,255,255,0.2)' }}>
            {showPlanAdd ? t.cancel : t.newPlan}
          </button>
        </div>

        {showPlanAdd && (
          <form onSubmit={addPlan} style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.cars}</label>
              <select required value={planForm.car_id} onChange={e => setPlanForm({ ...planForm, car_id: e.target.value })} style={inp}>
                <option value="">—</option>
                {cars.map(c => <option key={c.id} value={c.id}>{c.plate} {c.make}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.serviceType}</label>
              <select value={planForm.type} onChange={e => setPlanForm({ ...planForm, type: e.target.value })} style={inp}>
                {getMergedOptions('maintenance_type', customLists).map(v => (
                  <option key={v} value={v}>{typeLabel[v] || v}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.planKm}</label>
              <input type="number" min="0" value={planForm.km_interval} onChange={e => setPlanForm({ ...planForm, km_interval: e.target.value })} placeholder="15000" style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.planMonths}</label>
              <input type="number" min="0" value={planForm.month_interval} onChange={e => setPlanForm({ ...planForm, month_interval: e.target.value })} placeholder="12" style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.planLastKm}</label>
              <input type="number" min="0" value={planForm.last_km} onChange={e => setPlanForm({ ...planForm, last_km: e.target.value })} placeholder="80000" style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.planLastDate}</label>
              <DateInput value={planForm.last_date} onChange={e => setPlanForm({ ...planForm, last_date: e.target.value })} style={inp} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" style={{ ...btnPrimary, padding: '8px 18px', fontSize: 13, width: '100%' }}>{t.add}</button>
            </div>
          </form>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>{[t.cars, t.serviceType, t.planKm, t.planMonths, t.planNextKm, t.planNextDate, t.actions].map(h => (
                <th key={h} style={mkTh(rtl, isMobile)}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>{t.noPlans}</td></tr>
              ) : plans.map(pl => {
                const nextKm = planNextKm(pl)
                const nextDate = planNextDate(pl)
                const car = cars.find(c => String(c.id) === String(pl.car_id))
                const isKmDue = nextKm && car?.mileage && car.mileage >= nextKm
                const isDateDue = nextDate && new Date(nextDate) <= today
                const isDue = isKmDue || isDateDue
                return (
                  <tr key={pl.id} style={{ background: isDue ? '#fff5f5' : C.surface, borderBottom: `1px solid ${C.border}` }}>
                    <td style={mkTd(rtl, isMobile)}><span style={{ fontWeight: 600, color: C.primary }}>{carName(pl.car_id)}</span></td>
                    <td style={mkTd(rtl, isMobile)}>{typeLabel[pl.type] || pl.type}</td>
                    <td style={mkTd(rtl, isMobile)}>{pl.km_interval ? pl.km_interval.toLocaleString() : '—'}</td>
                    <td style={mkTd(rtl, isMobile)}>{pl.month_interval || '—'}</td>
                    <td style={mkTd(rtl, isMobile)}>
                      {nextKm ? <span style={{ color: isKmDue ? C.danger : C.textPrimary, fontWeight: isKmDue ? 700 : 400 }}>{nextKm.toLocaleString()} {isKmDue ? '⚠️' : ''}</span> : '—'}
                    </td>
                    <td style={mkTd(rtl, isMobile)}>
                      {nextDate ? <span style={{ color: isDateDue ? C.danger : C.textPrimary, fontWeight: isDateDue ? 700 : 400 }}>{fmtDate(nextDate)} {isDateDue ? '⚠️' : ''}</span> : '—'}
                    </td>
                    <td style={mkTd(rtl, isMobile)}>
                      <span style={{ display: 'flex', gap: 6 }}>
                        {isDue && (
                          <button onClick={async () => {
                            const today = new Date().toISOString().split('T')[0]
                            const { data: rec } = await supabase.from('maintenance').insert([{
                              company_id: companyId, car_id: parseInt(pl.car_id, 10),
                              type: pl.type, date: today, status: 'done', cost: 0,
                            }]).select()
                            if (rec?.[0]) {
                              // Update plan's last_date and last_km
                              const updPlan = { last_date: today }
                              if (car?.mileage) updPlan.last_km = car.mileage
                              await supabase.from('maintenance_plans').update(updPlan).eq('id', pl.id)
                              setPlans(p => p.map(x => x.id === pl.id ? { ...x, ...updPlan } : x))
                            }
                          }} style={{ background: C.success, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            ✓ {rtl ? 'בוצע' : 'Done'}
                          </button>
                        )}
                        <ActionBtn variant="delete" onClick={() => delPlan(pl.id)}>{t.delete}</ActionBtn>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Cars / Drivers CSV Import Modal ──────────────────────────────────────────
// Generic editable CSV import for cars and drivers.
// type = 'cars' | 'drivers'
function CsvEntityImportModal({ open, onClose, type, branches, cars: existingCars, drivers, companyId, t, rtl, onImported }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState('')
  const [fileName, setFileName] = useState('')
  const [updateMode, setUpdateMode] = useState(false) // update existing instead of skip

  function reset() { setRows([]); setError(''); setDone(''); setFileName(''); setUpdateMode(false) }

  // ── Parse CSV into rows ──
  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name); setError(''); setDone(''); setRows([])
    const reader = new FileReader()
    reader.onload = evt => {
      try {
        // Decode: try UTF-8 first; if result contains replacement chars (garbled), use windows-1255
        let text = new TextDecoder('utf-8').decode(evt.target.result)
        if (text.includes('\uFFFD')) {
          text = new TextDecoder('windows-1255').decode(evt.target.result)
        }
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        if (lines.length === 0) { setError(t.csvNoRows); return }

        // Detect header row — skip if first cell matches known headers
        const firstCells = lines[0].split(',').map(s => s.trim().toLowerCase())
        const hasHeader = type === 'cars'
          ? firstCells.some(c => ['plate','לוחית','make','יצרן','model','דגם'].includes(c))
          : firstCells.some(c => ['name','שם','license','רישיון'].includes(c))
        const dataLines = hasHeader ? lines.slice(1) : lines

        // Maps for Hebrew (and alternate) CSV values → English DB values
        const STATUS_MAP = { 'בשימוש':'In Use', 'פנוי':'Available', 'תחזוקה':'Maintenance', 'in use':'In Use', 'available':'Available', 'maintenance':'Maintenance' }
        const FUEL_MAP   = { 'בנזין':'Petrol', 'דיזל':'Diesel', 'חשמלי':'Electric', 'היברידי':'Hybrid', 'petrol':'Petrol', 'diesel':'Diesel', 'electric':'Electric', 'hybrid':'Hybrid' }
        const DRV_STATUS_MAP = { 'פעיל':'Active', 'לא פעיל':'Inactive', 'active':'Active', 'inactive':'Inactive' }

        const normalizeStatus = v => STATUS_MAP[v?.trim().toLowerCase()] || STATUS_MAP[v?.trim()] || 'Available'
        const normalizeFuel   = v => FUEL_MAP[v?.trim().toLowerCase()]   || FUEL_MAP[v?.trim()]   || 'Petrol'
        const normalizeDrvSt  = v => DRV_STATUS_MAP[v?.trim().toLowerCase()] || DRV_STATUS_MAP[v?.trim()] || 'Active'

        const parsed = dataLines.map(line => {
          const col = line.split(',').map(s => s.replace(/^"|"$/g, '').trim())
          if (type === 'cars') {
            const driverName = (col[7]?.trim() === '0' ? '' : col[7]?.trim()) || ''
            // Match: 1) exact full name, 2) every word in CSV name appears in DB name
            const matchedDriver = driverName
              ? drivers.find(d => {
                  const dn = d.name?.trim().toLowerCase()
                  const cn = driverName.trim().toLowerCase()
                  if (dn === cn) return true
                  const words = cn.split(/\s+/).filter(w => w.length > 1)
                  return words.length > 0 && words.every(w => dn.includes(w))
                })
              : null
            return {
              _id: Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b=>b.toString(16).padStart(2,'0')).join(''),
              plate:       col[0] || '',
              make:        col[1] || '',
              model:       col[2] || '',
              year:        col[3] || '',
              status:      normalizeStatus(col[4]),
              fuel:        normalizeFuel(col[5]),
              branch:      col[6] || '',
              driver_id:   matchedDriver ? String(matchedDriver.id) : '',
              _driverName: driverName, // always show CSV name as hint
              _skip: false,
            }
          } else {
            return {
              _id: Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b=>b.toString(16).padStart(2,'0')).join(''),
              name:    col[0] || '',
              license: col[1] || '',
              phone:   col[2] || '',
              status:  normalizeDrvSt(col[3]),
              branch:  col[4] || '',
              _skip: false,
            }
          }
        }).filter(r => type === 'cars' ? r.plate : r.name)

        if (parsed.length === 0) { setError(t.csvNoRows); return }
        setRows(parsed)
      } catch { setError(t.csvError) }
    }
    reader.readAsArrayBuffer(file)
  }

  function updateRow(id, field, value) {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r))
  }
  function removeRow(id) {
    setRows(prev => prev.filter(r => r._id !== id))
  }

  // ── Import ──
  async function handleImport() {
    setImporting(true)
    const branchByName = name => branches.find(b => b.name?.toLowerCase() === name?.toLowerCase())?.id || null
    const existingPlates = new Set(existingCars.map(c => c.plate?.trim().toLowerCase()))
    // driver IDs are text (UUID) — just validate non-empty/non-zero
    const safeDriverId = id => {
      if (!id || id === '' || id === '0') return null
      return String(id).trim() || null
    }

    const validRows = rows.filter(r => !r._skip).filter(r => type === 'cars' ? r.plate : r.name)
    const toInsert = validRows.filter(r => type === 'cars' ? !existingPlates.has(r.plate.trim().toLowerCase()) : true)
    const toUpdate = type === 'cars' && updateMode
      ? validRows.filter(r => existingPlates.has(r.plate.trim().toLowerCase()))
      : []

    let totalCount = 0

    if (toInsert.length > 0) {
      const insertPayload = toInsert.map(r => type === 'cars'
        ? { company_id: companyId, plate: r.plate, make: r.make, model: r.model,
            year: r.year ? parseInt(r.year, 10) : null,
            status: r.status || 'Available', fuel: r.fuel || 'Petrol',
            branch_id: branchByName(r.branch),
            driver_id: safeDriverId(r.driver_id) }
        : { company_id: companyId, name: r.name, license: r.license,
            phone: r.phone || null, status: r.status || 'Active',
            branch_id: branchByName(r.branch) }
      )
      const { error: insErr } = await supabase
        .from(type === 'cars' ? 'cars' : 'drivers')
        .insert(insertPayload)
      if (insErr) { setError(friendlyDbError(insErr, rtl)); setImporting(false); return }
      totalCount += toInsert.length
    }

    // Update existing rows (driver_id + branch_id only)
    for (const r of toUpdate) {
      const car = existingCars.find(c =>
        c.plate?.trim().toLowerCase() === r.plate.trim().toLowerCase() &&
        c.company_id === companyId
      )
      if (!car) continue
      const driverId = safeDriverId(r.driver_id)
      const branchId = branchByName(r.branch) || car.branch_id || null
      const { error: updErr } = await supabase.from('cars')
        .update({ driver_id: driverId, branch_id: branchId })
        .eq('id', car.id)
      if (updErr) { setError(friendlyDbError(updErr, rtl)); setImporting(false); return }
      totalCount++
    }

    setImporting(false)
    if (totalCount === 0) { setError(t.csvNoRows); return }
    const msg = type === 'cars' ? t.csvImportedCars : t.csvImportedDrivers
    setDone(typeof msg === 'function' ? msg(totalCount) : `${totalCount} imported.`)
    onImported()
  }

  const CAR_STATUSES   = [{ v:'Available', l:t.available }, { v:'In Use', l:t.inUse }, { v:'Maintenance', l:t.maintenance }]
  const CAR_FUELS      = [{ v:'Petrol', l:t.petrol }, { v:'Diesel', l:t.diesel }, { v:'Electric', l:t.electric }, { v:'Hybrid', l:t.hybrid }]
  const DRV_STATUSES   = [{ v:'Active', l:t.active }, { v:'Inactive', l:t.inactive }]

  const overlay  = { position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }
  const box      = { background:C.surface, borderRadius:16, width:'100%', maxWidth:960, maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,0.25)', direction: rtl ? 'rtl' : 'ltr' }
  const thStyle  = { padding:'9px 10px', fontSize:11, fontWeight:700, color:C.textSecondary, background:C.bgSubtle, textAlign: rtl ? 'right' : 'left', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }
  const cellInp  = { border:`1px solid ${C.border}`, borderRadius:4, padding:'4px 7px', fontSize:12, color:C.textPrimary, background:'#fff', width:'100%', boxSizing:'border-box' }
  const cellSel  = { ...cellInp, cursor:'pointer' }

  const title = type === 'cars' ? t.importCsvCars : t.importCsvDrivers
  const hint  = type === 'cars' ? t.csvCarsCols   : t.csvDriversCols
  const existingPlatesSet = new Set(existingCars.map(c => c.plate?.trim().toLowerCase()))

  const modal = (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) { reset(); onClose() } }}>
      <div style={box}>
        {/* Header */}
        <div style={{ background:gradient, padding:'14px 20px', borderRadius:'16px 16px 0 0', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <span style={{ color:'#fff', fontWeight:700, fontSize:15 }}>📥 {title}</span>
            <p style={{ margin:'2px 0 0', fontSize:11, color:'rgba(255,255,255,0.75)' }}>{hint}</p>
          </div>
          <button onClick={() => { reset(); onClose() }} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', borderRadius:6, padding:'4px 12px', cursor:'pointer', fontWeight:700 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding:16, overflowY:'auto', flex:1 }}>
          {/* File picker */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <label style={{ ...btnPrimary, padding:'8px 16px', fontSize:13, boxShadow:'none', cursor:'pointer', display:'inline-block' }}>
              📂 {t.csvSelectFile}
              <input type="file" accept=".csv" style={{ display:'none' }} onChange={handleFile} />
            </label>
            {fileName && <span style={{ fontSize:13, color:C.textSecondary }}>{fileName}</span>}
          </div>

          {error && <div style={{ background:'#fee2e2', color:'#b91c1c', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:13 }}>{error}</div>}
          {done  && <div style={{ background:'#dcfce7', color:'#15803d', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:13 }}>{done}</div>}

          {rows.length > 0 && !done && (
            <>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, flexWrap:'wrap', gap:8 }}>
                <p style={{ margin:0, fontSize:12, color:C.textMuted }}>✏️ {t.csvEditNote}</p>
                {type === 'cars' && (
                  <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, fontWeight:600, color: updateMode ? C.primary : C.textSecondary }}>
                    <input type="checkbox" checked={updateMode} onChange={e => setUpdateMode(e.target.checked)} style={{ cursor:'pointer' }} />
                    {rtl ? 'עדכן רכבים קיימים (קשר נהג)' : 'Update existing vehicles (link driver)'}
                  </label>
                )}
              </div>
              {type === 'cars' && drivers.length === 0 && (
                <div style={{ background:'#fff7ed', color:'#b45309', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:12 }}>
                  ⚠️ {rtl ? 'לא נמצאו נהגים במערכת. ייבא נהגים קודם כדי לקשר רכבים.' : 'No drivers found in the system. Import drivers first to link vehicles.'}
                </div>
              )}
              <div style={{ overflowX:'auto', borderRadius:8, border:`1px solid ${C.border}` }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth: type === 'cars' ? 720 : 560 }}>
                  <thead>
                    <tr>
                      {type === 'cars'
                        ? [t.plate, t.make, t.model, t.year, t.mileage, t.status, t.fuel, t.branch, t.driver].map(h => <th key={h} style={thStyle}>{h}</th>)
                        : [t.name, t.license, t.phone, t.driverStatus, t.branch].map(h => <th key={h} style={thStyle}>{h}</th>)
                      }
                      <th style={thStyle}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const isDupe = type === 'cars' && existingPlatesSet.has(r.plate?.trim().toLowerCase())
                      const rowBg  = isDupe ? '#fff7ed' : C.surface
                      const td     = { padding:'5px 8px', borderBottom:`1px solid ${C.border}`, background: rowBg }
                      return (
                        <tr key={r._id}>
                          {type === 'cars' ? <>
                            <td style={td}>
                              <input value={r.plate} onChange={e => updateRow(r._id, 'plate', e.target.value)} style={{ ...cellInp, borderColor: isDupe ? C.warning : C.border }} />
                              {isDupe && <div style={{ fontSize:10, color:C.warning, marginTop:2 }}>{t.csvDuplicateSkipped}</div>}
                            </td>
                            <td style={td}><input value={r.make}  onChange={e => updateRow(r._id, 'make',  e.target.value)} style={cellInp} /></td>
                            <td style={td}><input value={r.model} onChange={e => updateRow(r._id, 'model', e.target.value)} style={cellInp} /></td>
                            <td style={{ ...td, width:70 }}><input value={r.year} type="number" onChange={e => updateRow(r._id, 'year', e.target.value)} style={cellInp} /></td>
                            <td style={td}>
                              <select value={r.status} onChange={e => updateRow(r._id, 'status', e.target.value)} style={cellSel}>
                                {CAR_STATUSES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                              </select>
                            </td>
                            <td style={td}>
                              <select value={r.fuel} onChange={e => updateRow(r._id, 'fuel', e.target.value)} style={cellSel}>
                                {CAR_FUELS.map(f => <option key={f.v} value={f.v}>{f.l}</option>)}
                              </select>
                            </td>
                            <td style={td}>
                              <select value={r.branch} onChange={e => updateRow(r._id, 'branch', e.target.value)} style={cellSel}>
                                <option value="">—</option>
                                {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                              </select>
                            </td>
                            <td style={td}>
                              <select value={r.driver_id} onChange={e => updateRow(r._id, 'driver_id', e.target.value)} style={{ ...cellSel, borderColor: r._driverName && !r.driver_id ? C.warning : C.border }}>
                                <option value="">—</option>
                                {drivers.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                              </select>
                              {r._driverName && (
                                <div style={{ fontSize:10, color: r.driver_id ? C.success : C.warning, marginTop:2 }}>
                                  {r._driverName}{r.driver_id ? ' ✓' : ' ⚠ לא נמצא'}
                                </div>
                              )}
                            </td>
                          </> : <>
                            <td style={td}><input value={r.name}    onChange={e => updateRow(r._id, 'name',    e.target.value)} style={cellInp} /></td>
                            <td style={td}><input value={r.license} onChange={e => updateRow(r._id, 'license', e.target.value)} style={cellInp} /></td>
                            <td style={td}><input value={r.phone}   onChange={e => updateRow(r._id, 'phone',   e.target.value)} style={cellInp} /></td>
                            <td style={td}>
                              <select value={r.status} onChange={e => updateRow(r._id, 'status', e.target.value)} style={cellSel}>
                                {DRV_STATUSES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                              </select>
                            </td>
                            <td style={td}>
                              <select value={r.branch} onChange={e => updateRow(r._id, 'branch', e.target.value)} style={cellSel}>
                                <option value="">—</option>
                                {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                              </select>
                            </td>
                          </>}
                          <td style={{ ...td, width:36, textAlign:'center' }}>
                            <button onClick={() => removeRow(r._id)} title="Remove row" style={{ background:'none', border:'none', color:C.danger, cursor:'pointer', fontSize:15, lineHeight:1 }}>✕</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ margin:'8px 0 0', fontSize:12, color:C.textMuted }}>
                {rows.length} {t.itemsSelected} {type === 'cars' && ` · ${rows.filter(r => existingPlatesSet.has(r.plate?.trim().toLowerCase())).length > 0 ? rows.filter(r => existingPlatesSet.has(r.plate?.trim().toLowerCase())).length + ' ' + t.csvDuplicateSkipped : ''}`}
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        {rows.length > 0 && !done && (
          <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'flex-end', gap:10, flexShrink:0 }}>
            <button onClick={() => { reset(); onClose() }} style={{ ...btnGhost, padding:'8px 18px', fontSize:13 }}>{t.cancel}</button>
            <button onClick={handleImport} disabled={importing} style={{ ...btnPrimary, padding:'8px 20px', fontSize:13, opacity: importing ? 0.7 : 1 }}>
              {importing ? t.csvImporting : (typeof t.csvConfirmImport === 'function' ? t.csvConfirmImport(
                updateMode
                  ? rows.filter(r => !r._skip).length
                  : rows.filter(r => !r._skip && (type !== 'cars' || !existingPlatesSet.has(r.plate?.trim().toLowerCase()))).length
              ) : 'Import')}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return open ? createPortal(modal, document.body) : null
}

// ── Fuel CSV Import Modal ─────────────────────────────────────────────────────
function parseCsvLine(line) {
  const result = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = '' }
    else { cur += ch }
  }
  result.push(cur.trim())
  return result
}

const FUEL_CODE_MAP = { '050': 'בנזין / Petrol', '095': 'סולר / Diesel', '037': 'גז / Gas' }

function parseFuelCsv(text, cars) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  const rows = []
  for (const line of lines) {
    const col = parseCsvLine(line)
    if (col.length < 30) continue
    // Col indices (0-based): 3=date, 5=plate, 9=fuelCode, 10=liters, 18=amount, 23=station, 29=driver
    const rawDate = col[3]?.trim()
    const plate = col[5]?.trim()
    const fuelCode = col[9]?.trim()
    const liters = parseFloat(col[10]?.trim())
    const amount = parseFloat(col[18]?.trim())
    const station = col[23]?.trim()
    const driverName = col[29]?.trim()

    if (!rawDate || !plate || isNaN(amount)) continue
    // Skip header rows
    if (isNaN(Date.parse(rawDate.split('/').reverse().join('-')))) continue

    const parts = rawDate.split('/')
    const date = parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}` : null
    if (!date) continue

    const car = cars.find(c => c.plate?.trim() === plate)
    rows.push({ date, plate, car, fuelCode, fuelLabel: FUEL_CODE_MAP[fuelCode] || fuelCode, liters, amount, station, driverName })
  }
  return rows
}

function CsvImportModal({ open, onClose, cars, drivers, companyId, t, rtl, onImported }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState('')
  const [fileName, setFileName] = useState('')

  function reset() { setRows([]); setError(''); setDone(''); setFileName('') }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError(t.fileTooLarge); e.target.value = ''; return }
    setFileName(file.name)
    setError(''); setDone(''); setRows([])
    const reader = new FileReader()
    reader.onload = evt => {
      try {
        const text = new TextDecoder('windows-1255').decode(evt.target.result)
        const parsed = parseFuelCsv(text, cars)
        if (parsed.length === 0) { setError(t.csvNoRows); return }
        setRows(parsed)
      } catch { setError(t.csvError) }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleImport() {
    setImporting(true)
    const toInsert = rows.map(r => ({
      company_id: companyId,
      car_id: r.car ? r.car.id : null,
      driver_id: drivers.find(d => d.name?.trim() === r.driverName)?.id || null,
      category: 'Fuel',
      amount: r.amount,
      date: r.date,
      description: [r.station, r.liters ? `${r.liters}L` : '', r.fuelLabel].filter(Boolean).join(' | '),
    }))
    const { error: insErr } = await supabase.from('costs').insert(toInsert)
    setImporting(false)
    if (insErr) { setError(friendlyDbError(insErr, rtl)); return }
    setDone(typeof t.csvImported === 'function' ? t.csvImported(toInsert.length) : `${toInsert.length} imported.`)
    onImported()
  }

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }
  const box = { background: C.surface, borderRadius:16, width:'100%', maxWidth:820, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,0.25)', direction: rtl ? 'rtl' : 'ltr' }
  const th = { padding:'10px 14px', fontSize:12, fontWeight:700, color:C.textSecondary, background:C.bgSubtle, textAlign: rtl ? 'right' : 'left', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }
  const tdStyle = { padding:'9px 14px', fontSize:13, color:C.textPrimary, borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }

  const modal = (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) { reset(); onClose() } }}>
      <div style={box}>
        {/* Header */}
        <div style={{ background: gradient, padding:'16px 20px', borderRadius:'16px 16px 0 0', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ color:'#fff', fontWeight:700, fontSize:15 }}>📥 {t.csvImportTitle}</span>
          <button onClick={() => { reset(); onClose() }} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', borderRadius:6, padding:'4px 12px', cursor:'pointer', fontWeight:700 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding:20, overflowY:'auto', flex:1 }}>
          {/* File picker */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <label style={{ ...btnPrimary, padding:'8px 18px', fontSize:13, boxShadow:'none', cursor:'pointer', display:'inline-block' }}>
              📂 {t.csvSelectFile}
              <input type="file" accept=".csv" style={{ display:'none' }} onChange={handleFile} />
            </label>
            {fileName && <span style={{ fontSize:13, color:C.textSecondary }}>{fileName}</span>}
          </div>

          {error && <div style={{ background:'#fee2e2', color:'#b91c1c', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:13 }}>{error}</div>}
          {done  && <div style={{ background:'#dcfce7', color:'#15803d', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:13 }}>{done}</div>}

          {rows.length > 0 && !done && (
            <>
              <p style={{ margin:'0 0 10px', fontSize:12, color:C.textMuted }}>{t.csvSkipNote}</p>
              <div style={{ overflowX:'auto', borderRadius:8, border:`1px solid ${C.border}` }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
                  <thead>
                    <tr>
                      {[t.serviceDate, t.cars, t.driver, t.csvFuelType, t.csvLiters, t.amount, t.csvStation].map(h => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ background: r.car ? C.surface : '#fffbeb' }}>
                        <td style={tdStyle}>{fmtDate(r.date)}</td>
                        <td style={{ ...tdStyle, color: r.car ? C.primary : C.warning, fontWeight:600 }}>
                          {r.plate}{!r.car && <span style={{ fontSize:11, marginInlineStart:6, color:C.warning }}>({t.csvVehicleNotFound})</span>}
                        </td>
                        <td style={tdStyle}>{r.driverName || '—'}</td>
                        <td style={tdStyle}>{r.fuelLabel || r.fuelCode}</td>
                        <td style={tdStyle}>{isNaN(r.liters) ? '—' : r.liters.toFixed(2)}</td>
                        <td style={{ ...tdStyle, fontWeight:700 }}>₪{r.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={tdStyle}>{r.station || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {rows.length > 0 && !done && (
          <div style={{ padding:'14px 20px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'flex-end', gap:10, flexShrink:0 }}>
            <button onClick={() => { reset(); onClose() }} style={{ ...btnGhost, padding:'8px 18px', fontSize:13 }}>{t.cancel}</button>
            <button onClick={handleImport} disabled={importing} style={{ ...btnPrimary, padding:'8px 20px', fontSize:13, opacity: importing ? 0.7 : 1 }}>
              {importing ? t.csvImporting : (typeof t.csvConfirmImport === 'function' ? t.csvConfirmImport(rows.length) : `Import ${rows.length}`)}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return open ? createPortal(modal, document.body) : null
}

// ── Costs Tab ────────────────────────────────────────────────────────────────
function CostsTab({ cars, drivers, companyId, t, rtl }) {
  const [costs, setCosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addError, setAddError] = useState('')
  const [selectedCostIds, setSelectedCostIds] = useState([])
  const [form, setForm] = useState({ car_id: '', driver_id: '', category: 'Fuel', amount: '', description: '', date: '', cost_center: '' })
  const inp = inlineInput(rtl)
  const isMobile = useIsMobile()

  useEffect(() => { load() }, [companyId])
  async function load() {
    setLoading(true)
    if (!companyId) { setCosts([]); setLoading(false); return }
    const { data } = await supabase.from('costs').select('*').eq('company_id', companyId).order('date', { ascending: false })
    setCosts(data || [])
    setLoading(false)
  }
  async function add(e) {
    e.preventDefault()
    setAddError('')
    if (!companyId) return
    const amount = parseFloat(form.amount)
    if (!form.date || isNaN(amount) || amount <= 0) {
      setAddError(rtl ? 'סכום ותאריך הם שדות חובה.' : 'Amount and date are required.')
      return
    }
    const { data, error } = await supabase.from('costs').insert([{
      company_id: companyId,
      car_id: form.car_id ? parseInt(form.car_id, 10) : null,
      driver_id: form.driver_id || null,
      category: form.category, amount,
      description: form.description || null, date: form.date,
      cost_center: form.cost_center || null,
    }]).select()
    if (error) { setAddError(friendlyDbError(error, rtl)); return }
    if (data) { setCosts(p => [data[0], ...p]); setShowAdd(false); setAddError(''); setForm({ car_id: '', driver_id: '', category: 'Fuel', amount: '', description: '', date: '', cost_center: '' }) }
  }
  function exportAccountingCsv() {
    const headers = rtl
      ? ['תאריך', 'קטגוריה', 'סכום', 'מרכז עלות', 'רכב', 'נהג', 'תיאור']
      : ['Date', 'Category', 'Amount', 'Cost Center', 'Vehicle', 'Driver', 'Description']
    const rows = costs.map(c => [
      c.date || '',
      catLabel[c.category] || c.category,
      parseFloat(c.amount || 0).toFixed(2),
      c.cost_center || '',
      c.car_id ? carName(c.car_id) : '',
      c.driver_id ? (drivers.find(d => d.id === c.driver_id)?.name || '') : '',
      c.description || '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: `accounting-${new Date().toISOString().slice(0,10)}.csv` })
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  async function del(id) {
    if (!window.confirm(t.confirmDelete)) return
    const { error } = await supabase.from('costs').delete().eq('id', id).eq('company_id', companyId)
    if (!error) {
      setCosts(p => p.filter(c => c.id !== id))
      setSelectedCostIds(p => p.filter(x => x !== id))
    }
  }
  async function bulkDelCosts() {
    if (!selectedCostIds.length || !window.confirm(t.confirmDelete)) return
    const { error } = await supabase.from('costs').delete().in('id', selectedCostIds).eq('company_id', companyId)
    if (!error) {
      setCosts(p => p.filter(c => !selectedCostIds.includes(c.id)))
      setSelectedCostIds([])
    }
  }
  function toggleCost(id) { setSelectedCostIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]) }
  function toggleAllCosts() {
    setSelectedCostIds(p => p.length === costs.length ? [] : costs.map(c => c.id))
  }

  const total = costs.reduce((s, c) => s + parseFloat(c.amount || 0), 0)
  const byCategory = costs.reduce((acc, c) => { acc[c.category] = (acc[c.category] || 0) + parseFloat(c.amount || 0); return acc }, {})
  const catColors = { Fuel: C.primary, Insurance: C.success, Fine: C.danger, Repair: C.warning, Maintenance: '#8b5cf6', Other: C.textMuted, 'ביטוח': C.success, 'נתיב תשלום': C.primary }
  const catLabel = { Fuel: t.catFuel, Insurance: t.catInsurance, Fine: t.catFine, Repair: t.catRepair, Maintenance: t.maintenance, Other: t.catOther, 'ביטוח': t.catInsurance, 'נתיב תשלום': rtl ? 'נתיב תשלום' : 'Toll' }
  const carName = id => formatPlate(cars.find(c => c.id === parseInt(id, 10))?.plate) || id

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 24, direction: rtl ? 'rtl' : 'ltr' }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: C.surface, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ height: 3, background: gradient }} />
          <div style={{ padding: '14px 16px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: C.primary, direction: 'ltr', textAlign: rtl ? 'right' : 'left' }}>₪{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p style={{ margin: 0, fontSize: 12, color: C.textSecondary }}>{t.totalCost}</p>
          </div>
        </div>
        {Object.entries(byCategory).sort((a,b) => b[1]-a[1]).slice(0,4).map(([cat, amt]) => (
          <div key={cat} style={{ background: C.surface, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ height: 3, background: catColors[cat] || C.textMuted }} />
            <div style={{ padding: '14px 16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: catColors[cat] || C.textMuted, direction: 'ltr', textAlign: rtl ? 'right' : 'left' }}>₪{amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p style={{ margin: 0, fontSize: 12, color: C.textSecondary }}>{catLabel[cat] || cat}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}>
        <div style={{ background: gradient, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>💰 {t.costsTab}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {costs.length > 0 && (
              <button onClick={exportAccountingCsv} style={{ ...btnPrimary, padding: '5px 14px', fontSize: 12, boxShadow: 'none', background: 'rgba(255,255,255,0.15)' }}>
                📥 {rtl ? 'ייצוא הנהלת חשבונות' : 'Export CSV'}
              </button>
            )}
            <button onClick={() => setShowAdd(p => !p)} style={{ ...btnPrimary, padding: '5px 14px', fontSize: 12, boxShadow: 'none', background: 'rgba(255,255,255,0.2)' }}>
              {showAdd ? t.cancel : t.newItem}
            </button>
          </div>
        </div>
        {showAdd && (
          <form onSubmit={add} style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.category}</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inp}>
                {['Fuel','Insurance','Fine','Repair','Maintenance','Other'].map(v => <option key={v} value={v}>{catLabel[v] || v}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.amount}</label>
              <input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.serviceDate}</label>
              <DateInput required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.cars}</label>
              <select value={form.car_id} onChange={e => {
                const carId = e.target.value
                const car = cars.find(c => String(c.id) === carId)
                const autoDriver = car?.driver_id || ''
                setForm({ ...form, car_id: carId, driver_id: autoDriver })
              }} style={inp}>
                <option value="">—</option>
                {cars.map(c => <option key={c.id} value={c.id}>{formatPlate(c.plate)} {c.make}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.driver}</label>
              <select value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })} style={inp}>
                <option value="">—</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{rtl ? 'מרכז עלות' : 'Cost Center'}</label>
              <input value={form.cost_center} onChange={e => setForm({ ...form, cost_center: e.target.value })} placeholder={rtl ? 'לדוגמה: צי ת"א' : 'e.g. Fleet TLV'} style={inp} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{t.actions}</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t.description + '…'} style={inp} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" style={{ ...btnPrimary, padding: '8px 18px', fontSize: 13, width: '100%' }}>{t.add}</button>
            </div>
            {addError && (
              <div style={{ gridColumn: '1 / -1', padding: '8px 12px', background: C.danger + '10', border: `1px solid ${C.danger}30`, borderRadius: 8, fontSize: 13, color: C.danger, fontWeight: 600 }}>
                ⚠ {addError}
              </div>
            )}
          </form>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedCostIds.length > 0 && (
        <div style={{ background: C.primary + '10', border: `1px solid ${C.primary}30`, borderRadius: 8, padding: '8px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: C.primary, fontWeight: 600 }}>{selectedCostIds.length} {t.itemsSelected}</span>
          <button onClick={bulkDelCosts} style={{ ...btnDanger, padding: '5px 14px', fontSize: 12 }}>🗑 {t.bulkDelete}</button>
          <button onClick={() => setSelectedCostIds([])} style={{ ...btnGhost, padding: '5px 10px', fontSize: 12 }}>✕</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 420 : 500 }}>
            <thead>
              <tr>
                <th style={{ ...mkTh(rtl, isMobile), width: 36, padding: '11px 12px' }}>
                  <label style={{ cursor: 'pointer' }} title={t.selectAll}>
                    <input type="checkbox"
                      checked={costs.length > 0 && selectedCostIds.length === costs.length}
                      onChange={toggleAllCosts}
                      style={{ cursor: 'pointer' }} />
                  </label>
                </th>
                {[t.serviceDate, t.category, t.amount, rtl ? 'מרכז עלות' : 'Cost Center', t.cars, t.driver, t.actions].map(h => (
                  <th key={h} style={mkTh(rtl, isMobile)}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>{t.loadingShort}</td></tr>
              ) : costs.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>{t.noCosts}</td></tr>
              ) : costs.map(c => (
                <tr key={c.id} style={{ background: selectedCostIds.includes(c.id) ? C.primary + '08' : C.surface }}>
                  <td style={{ ...mkTd(rtl, isMobile), width: 36, padding: '10px 12px' }}>
                    <input type="checkbox" checked={selectedCostIds.includes(c.id)} onChange={() => toggleCost(c.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={mkTd(rtl, isMobile)}>{fmtDate(c.date)}</td>
                  <td style={mkTd(rtl, isMobile)}><Badge label={catLabel[c.category] || c.category} color={catColors[c.category] || C.textMuted} /></td>
                  <td style={{ ...mkTd(rtl, isMobile), fontWeight: 700, color: C.textPrimary }}>₪{parseFloat(c.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ ...mkTd(rtl, isMobile), color: C.textSecondary, fontSize: 12 }}>{c.cost_center || '—'}</td>
                  <td style={mkTd(rtl, isMobile)}>{c.car_id ? carName(c.car_id) : '—'}</td>
                  <td style={mkTd(rtl, isMobile)}>{c.driver_id ? (drivers.find(d => d.id === c.driver_id)?.name || '—') : '—'}</td>
                  <td style={mkTd(rtl, isMobile)}><ActionBtn variant="delete" onClick={() => del(c.id)}>{t.delete}</ActionBtn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Expiry Alerts Panel ───────────────────────────────────────────────────────
const MAINT_HE = {
  'Oil Change':    'החלפת שמן',
  'Tire Rotation': 'סיבוב צמיגים',
  'Inspection':    'בדיקה תקופתית',
  'Brake Service': 'שירות בלמים',
  'Other':         'אחר',
}

function AlertsPanel({ rtl, companyId }) {
  const [alerts, setAlerts] = useState([])
  const [open,   setOpen]   = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!companyId) return
    supabase.rpc('get_expiry_alerts').then(({ data, error }) => {
      if (error) console.error('get_expiry_alerts failed:', error.message)
      setAlerts(data || [])
      setLoaded(true)
    })
  }, [companyId])

  if (!loaded || alerts.length === 0) return null

  const overdue = alerts.filter(a => a.severity === 'overdue').length
  const typeIcon = { maintenance: '🔧', document: '📎', license: '🪪' }

  const localizeLabel = (label) => {
    if (!rtl || !label) return label
    let out = label
    Object.entries(MAINT_HE).forEach(([en, he]) => { out = out.replace(en, he) })
    return out
  }

  return (
    <div style={{ background: overdue > 0 ? '#fef2f2' : '#fffbeb', border: `1px solid ${overdue > 0 ? '#fecaca' : '#fde68a'}`, borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
      <div onClick={() => setOpen(p => !p)} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <span style={{ fontSize: 20 }}>{overdue > 0 ? '🔴' : '🟡'}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: overdue > 0 ? C.danger : '#92400e' }}>
            {overdue > 0
              ? (rtl ? `${overdue} פריטים באיחור · ${alerts.length} התראות סה"כ` : `${overdue} overdue · ${alerts.length} total alerts`)
              : (rtl ? `${alerts.length} פריטים מתקרבים לתפוגה` : `${alerts.length} items expiring soon`)}
          </span>
        </div>
        <span style={{ fontSize: 12, color: '#92400e' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${overdue > 0 ? '#fecaca' : '#fde68a'}`, padding: '8px 16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {alerts.map((a, i) => {
            const daysLeft = Math.ceil((new Date(a.date) - new Date()) / 86400000)
            const isOverdue = a.severity === 'overdue'
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', background: isOverdue ? '#fee2e2' : '#fef9c3', borderRadius: 7, fontSize: 13 }}>
                <span>{typeIcon[a.type] || '⚠'}</span>
                <span style={{ flex: 1, fontWeight: 600, color: isOverdue ? C.danger : '#92400e' }}>{localizeLabel(a.label)}</span>
                <span style={{ fontSize: 11, color: isOverdue ? C.danger : '#b45309', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {fmtDate(a.date)} {isOverdue ? (rtl ? '(באיחור)' : '(overdue)') : (rtl ? `(${daysLeft} ימים)` : `(${daysLeft}d)`)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Activity Log section ─────────────────────────────────────────────────────
function ActivityLogSection({ companyId, t }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const PAGE = 50

  useEffect(() => { if (companyId) loadPage(0) }, [companyId])

  async function loadPage(p) {
    if (!companyId) return
    setLoading(true)
    const { data } = await supabase.from('activity_log').select('*').eq('company_id', companyId)
      .order('created_at', { ascending: false }).range(p * PAGE, p * PAGE + PAGE)
    const rows = data || []
    setLogs(prev => p === 0 ? rows : [...prev, ...rows])
    setHasMore(rows.length === PAGE + 1)
    if (rows.length === PAGE + 1) rows.pop()
    setPage(p)
    setLoading(false)
  }

  async function exportLogs() {
    const rows = logs.map(l => ({
      [t.actionAdd === 'נוסף' ? 'פעולה' : 'Action']: l.action,
      'Entity': l.entity_type,
      'Name': l.entity_name || '',
      'User': l.user_email,
      'Date': new Date(l.created_at).toLocaleString('he-IL'),
    }))
    const wb = new ExcelJS.Workbook()
    xlsxAddSheet(wb, 'Activity Log', rows)
    await xlsxDownload(wb, `activity-log-${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const actionLabel = { add: t.actionAdd, update: t.actionUpdate, delete: t.actionDelete }
  const actionColor = { add: C.success, update: C.primary, delete: C.danger }

  return (
    <div style={{ background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.textPrimary }}>📋 {t.activityLog}</h3>
        {logs.length > 0 && <button onClick={exportLogs} style={{ background: C.success, color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📊 {t.exportExcel}</button>}
      </div>
      {logs.length === 0 && !loading ? (
        <p style={{ color: C.textMuted, fontSize: 14 }}>{t.noActivity}</p>
      ) : (
        <>
          {logs.map(l => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: actionColor[l.action] || C.textMuted, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
                  <strong style={{ color: actionColor[l.action] || C.textMuted }}>{actionLabel[l.action] || l.action}</strong>
                  {' '}{l.entity_type}{l.entity_name ? ` — ${l.entity_name}` : ''}
                </span>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{l.user_email} · {new Date(l.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
          {hasMore && (
            <button onClick={() => loadPage(page + 1)} disabled={loading} style={{ marginTop: 12, width: '100%', padding: '8px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSecondary, fontSize: 13, cursor: 'pointer' }}>
              {loading ? t.loadingShort : (t.loadMore || 'Load more…')}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── Donut chart (pure SVG, no library) ─────────────────────────────────────
function DonutChart({ segments, size = 160, thickness = 28, label, sublabel }) {
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const total = segments.reduce((s, seg) => s + seg.value, 0)

  let offset = 0
  const arcs = segments.map(seg => {
    const len = total > 0 ? (seg.value / total) * circumference : 0
    const gap = total > 0 ? 2 : 0
    const arc = { ...seg, dasharray: Math.max(len - gap, 0), dashoffset: -offset, len }
    offset += len
    return arc
  })

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={thickness} />
        {total === 0
          ? null
          : arcs.map((arc, i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={arc.color} strokeWidth={thickness}
              strokeDasharray={`${arc.dasharray} ${circumference}`}
              strokeDashoffset={arc.dashoffset}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          ))
        }
      </svg>
      {/* Center label */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: C.textPrimary, lineHeight: 1 }}>{label}</span>
        {sublabel && <span style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{sublabel}</span>}
      </div>
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

function Dashboard({ cars, drivers, branches, companyId, t, rtl, dashFilter, setDashFilter, onExport, onNavigate }) {
  const isMobile = useIsMobile()
  const [monthlyBudget,      setMonthlyBudget]      = useState(null)
  const [monthCostsTotal,    setMonthCostsTotal]    = useState(0)
  const [openAccidents,      setOpenAccidents]      = useState([])
  const [weeklySubsCount,    setWeeklySubsCount]    = useState(0)
  const [pendingFormLinks,   setPendingFormLinks]   = useState([])

  useEffect(() => {
    if (!companyId) return
    const thisMonth = new Date().toISOString().slice(0, 7)
    const weekAgo   = new Date(Date.now() - 7 * 86400000).toISOString()
    Promise.all([
      supabase.from('companies').select('monthly_budget').eq('id', companyId).single(),
      supabase.from('costs').select('amount').eq('company_id', companyId).gte('date', `${thisMonth}-01`),
      supabase.from('accident_reports').select('id,incident_date,created_at,other_plate,description,status').eq('company_id', companyId).eq('status', 'open').order('created_at', { ascending: false }).limit(5),
      supabase.from('form_submissions').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('submitted_at', weekAgo),
      supabase.from('form_links').select('id,title,type,driver_id').eq('company_id', companyId).eq('is_active', true).not('driver_id', 'is', null),
    ]).then(([{ data: co }, { data: cs }, { data: accidents }, { count: subsCnt }, { data: driverLinks }]) => {
      setMonthlyBudget(co?.monthly_budget || null)
      setMonthCostsTotal((cs || []).reduce((s, c) => s + parseFloat(c.amount || 0), 0))
      setOpenAccidents(accidents || [])
      setWeeklySubsCount(subsCnt || 0)
      // Find driver-assigned links with no submissions
      if (driverLinks?.length) {
        supabase.from('form_submissions').select('form_link_id').in('form_link_id', driverLinks.map(l => l.id))
          .then(({ data: subs }) => {
            const submitted = new Set((subs || []).map(s => s.form_link_id))
            setPendingFormLinks(driverLinks.filter(l => !submitted.has(l.id)))
          })
      }
    })
  }, [companyId])
  const filtCars     = filterByDate(cars,     dashFilter)
  const filtDrivers  = filterByDate(drivers,  dashFilter)
  const filtBranches = filterByDate(branches, dashFilter)

  const unassigned = filtCars.filter(c => !c.branch_id).length

  // Status breakdown for donut chart
  const statusAvailable   = filtCars.filter(c => c.status === 'Available').length
  const statusInUse       = filtCars.filter(c => c.status === 'In Use').length
  const statusMaintenance = filtCars.filter(c => c.status === 'Maintenance').length
  const statusOther       = filtCars.length - statusAvailable - statusInUse - statusMaintenance
  const driversWithCar  = filtDrivers.filter(d => filtCars.some(c => c.driver_id === d.id)).length
  const utilizationPct  = filtDrivers.length > 0 ? Math.round((driversWithCar / filtDrivers.length) * 100) : 0
  const assignedDrivers   = filtDrivers.filter(d => d.branch_id).length
  const driverAssignPct   = filtDrivers.length > 0 ? Math.round((assignedDrivers / filtDrivers.length) * 100) : 0

  const donutSegments = [
    { label: t.available,    value: statusAvailable,   color: C.success },
    { label: t.inUse,        value: statusInUse,       color: C.primary },
    { label: t.maintenance,  value: statusMaintenance, color: C.warning },
    ...(statusOther > 0 ? [{ label: '…', value: statusOther, color: C.textMuted }] : []),
  ]

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

  // Recent vehicles (last 5, by created_at)
  const recentVehicles = [...filtCars]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)

  const card = (icon, value, label, color, sub) => (
    <div key={label} style={{ background: C.surface, borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)' }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}80)` }} />
      <div style={{ padding: '18px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          {/* Double-bezel icon */}
          <div style={{ width: 48, height: 48, borderRadius: 12, background: color + '08', border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: color + '18', border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
          </div>
          <p style={{ margin: 0, fontSize: 38, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-1px' }}>{value}</p>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: C.textSecondary, fontWeight: 600 }}>{label}</p>
        {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: C.textMuted }}>{sub}</p>}
      </div>
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

  const budgetPct  = monthlyBudget > 0 ? Math.min((monthCostsTotal / monthlyBudget) * 100, 100) : null
  const budgetColor = budgetPct === null ? C.primary : budgetPct >= 90 ? C.danger : budgetPct >= 70 ? C.warning : C.success

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 24, direction: rtl ? 'rtl' : 'ltr' }}>

      {/* Expiry alerts panel */}
      <AlertsPanel rtl={rtl} companyId={companyId} />

      {/* Dashboard toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 4 }}>
          {[['all', t.filterAll], ['month', t.filterMonth], ['quarter', t.filterQuarter], ['year', t.filterYear]].map(([k, l]) => (
            <button key={k} onClick={() => setDashFilter(k)} style={{
              padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: dashFilter === k ? C.primary : 'transparent',
              color: dashFilter === k ? '#fff' : C.textSecondary,
              transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={onExport} style={{ ...btnPrimary, padding: '7px 16px', fontSize: 12 }}>📥 {t.exportExcel}</button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : `repeat(${unassigned > 0 ? 4 : 3}, 1fr)`, gap: isMobile ? 10 : 16, marginBottom: 16 }}>
        {card('🚗', filtCars.length,     t.totalFleet,    C.primary)}
        {card('👤', filtDrivers.length,  t.totalDrivers,  C.success)}
        {card('🏢', filtBranches.length, t.totalBranches, '#8b5cf6')}
        {unassigned > 0 && card('⚠️', unassigned, t.unassigned, C.warning)}
      </div>

      {/* Operations cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 16, marginBottom: 20 }}>
        {card('🚨', openAccidents.length,
          rtl ? 'תאונות פתוחות' : 'Open Accidents',
          openAccidents.length > 0 ? C.danger : C.success,
          openAccidents.length > 0 ? (rtl ? 'לחץ לטיפול' : 'Needs attention') : (rtl ? 'הכל תקין' : 'All clear')
        )}
        {card('📋', weeklySubsCount,
          rtl ? 'הגשות השבוע' : 'Submissions (7d)',
          C.primary,
          rtl ? 'טפסים שהתקבלו' : 'Forms received'
        )}
        {card('⏳', pendingFormLinks.length,
          rtl ? 'טפסים ממתינים' : 'Pending Forms',
          pendingFormLinks.length > 0 ? C.warning : C.success,
          rtl ? 'שויכו לנהג ולא הוגשו' : 'Assigned, not submitted'
        )}
      </div>

      {/* Needs Attention panel */}
      {(openAccidents.length > 0 || pendingFormLinks.length > 0) && (
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 20, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '12px 18px', background: '#fef9f0', borderBottom: `1px solid #fde68a`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🔔</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#92400e' }}>{rtl ? 'דרוש טיפול' : 'Needs Attention'}</span>
          </div>
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {openAccidents.map(acc => (
              <div key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fef2f2', borderRadius: 8, cursor: onNavigate ? 'pointer' : 'default' }}
                onClick={() => onNavigate?.('forms')}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>🚨</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.danger }}>{rtl ? 'תאונה פתוחה' : 'Open Accident'}{acc.other_plate ? ` · ${acc.other_plate}` : ''}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{fmtDate(acc.incident_date || acc.created_at?.slice(0,10))}</div>
                </div>
                {onNavigate && <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>{'←'}</span>}
              </div>
            ))}
            {pendingFormLinks.map(lnk => (
              <div key={lnk.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fffbeb', borderRadius: 8, cursor: onNavigate ? 'pointer' : 'default' }}
                onClick={() => onNavigate?.('forms')}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>📋</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>{lnk.title || (rtl ? 'טופס ממתין' : 'Pending Form')}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{rtl ? 'שויך לנהג ולא הוגש' : 'Assigned to driver — not submitted yet'}</div>
                </div>
                {onNavigate && <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>{'←'}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly budget bar */}
      {monthlyBudget > 0 && (
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>💰 {rtl ? 'תקציב חודשי' : 'Monthly Budget'}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: budgetColor }}>
              ₪{monthCostsTotal.toLocaleString()} / ₪{monthlyBudget.toLocaleString()} ({Math.round(budgetPct ?? 0)}%)
            </span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: C.border }}>
            <div style={{ height: 10, borderRadius: 5, background: budgetColor, width: `${budgetPct ?? 0}%`, transition: 'width 0.6s ease' }} />
          </div>
          {budgetPct >= 90 && <div style={{ fontSize: 11, color: C.danger, fontWeight: 700, marginTop: 6 }}>⚠ {rtl ? 'קרוב לגבול התקציב!' : 'Approaching budget limit!'}</div>}
        </div>
      )}

      {/* Fleet status donut + bar charts */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: isMobile ? 10 : 16, marginBottom: 20 }}>

        {/* Donut chart — Fleet Status */}
        <div style={{ background: C.surface, borderRadius: 10, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{t.fleetStatus}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <DonutChart
              size={150} thickness={26}
              segments={donutSegments}
              label={filtCars.length}
              sublabel={t.cars}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 100 }}>
              {donutSegments.map(seg => (
                <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: C.textSecondary }}>{seg.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: seg.color }}>{seg.value}</span>
                  <span style={{ fontSize: 11, color: C.textMuted, minWidth: 32, textAlign: 'right' }}>
                    {filtCars.length > 0 ? `${Math.round((seg.value / filtCars.length) * 100)}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar charts stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 16 }}>
          {barChart(t.carsByBranch,    carsPerBranch,    maxCars)}
          {barChart(t.driversByBranch, driversPerBranch, maxDrivers)}
        </div>
      </div>

      {/* Top models + Branch table */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 10 : 16, marginBottom: 20 }}>

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
              {filtBranches.length === 0
                ? <tr><td colSpan={3} style={{ padding: '20px 0', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>{t.noData}</td></tr>
                : filtBranches.map((b, i) => (
                  <tr key={b.id}>
                    <td style={{ padding: '10px 0', fontSize: 13, color: C.textPrimary, borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: rtl ? 'row-reverse' : 'row' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: branchColor(i), flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{b.name}</span>
                        <span style={{ fontSize: 11, color: C.textMuted }}>{b.city}</span>
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

      {/* Recently Added Vehicles */}
      <div style={{ background: C.surface, borderRadius: 10, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{t.recentVehicles}</h3>
        {recentVehicles.length === 0
          ? <p style={{ color: C.textMuted, fontSize: 13 }}>{t.noRecentVehicles}</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentVehicles.map((car, i) => {
                const branch = branches.find(b => b.id === car.branch_id)
                const statusColor = car.status === 'Available' ? C.success : car.status === 'In Use' ? C.primary : C.warning
                return (
                  <div key={car.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                    borderBottom: i < recentVehicles.length - 1 ? `1px solid ${C.border}` : 'none',
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: branchColor(i) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🚗</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formatPlate(car.plate)} · {car.make} {car.model}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
                        {branch ? branch.name : t.noBranch} · {car.year || '—'}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, background: statusColor + '15', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                      {car.status === 'Available' ? t.available : car.status === 'In Use' ? t.inUse : car.status === 'Maintenance' ? t.maintenance : car.status || t.available}
                    </span>
                    <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap' }}>
                      {car.created_at ? fmtDate(car.created_at.split('T')[0]) : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        }
      </div>
    </div>
  )
}

// ── Custom Lists Section (admin only) ────────────────────────────────────────
function CustomListsSection({ companyId, t, onCustomListsChange }) {
  const LIST_DEFS = [
    { key: 'car_status',       label: t.listCarStatus },
    { key: 'driver_status',    label: t.listDriverStatus },
    { key: 'fuel_type',        label: t.listFuelType },
    { key: 'file_type',        label: t.listFileType },
    { key: 'maintenance_type', label: t.listMaintenanceType },
    { key: 'license_level',    label: t.listLicenseLevel },
  ]
  const [items, setItems]   = useState([])
  const [adding, setAdding] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('custom_lists').select('*').eq('company_id', companyId).order('sort_order')
      .then(({ data }) => { if (data) setItems(data); setLoading(false) })
  }, [companyId])

  async function addValue(listKey) {
    const value = (adding[listKey] || '').trim()
    if (!value) return
    const { data, error } = await supabase.from('custom_lists').insert({
      company_id: companyId, list_type: listKey, value,
    }).select().single()
    if (!error && data) {
      setItems(p => [...p, data])
      setAdding(p => ({ ...p, [listKey]: '' }))
      onCustomListsChange()
    }
  }

  async function removeValue(item) {
    const { error } = await supabase.from('custom_lists').delete().eq('id', item.id)
    if (!error) {
      setItems(p => p.filter(i => i.id !== item.id))
      onCustomListsChange()
    }
  }

  const card  = { background: '#f8faff', borderRadius: 8, border: '1px solid #e4eaf4', padding: '10px 14px', marginBottom: 8 }
  const badge = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
    background: '#ecfeff', color: '#0891b2', borderRadius: 5, padding: '3px 8px', marginRight: 6, marginBottom: 4 }
  const defBadge = { ...badge, background: '#f3f4f6', color: '#6b7280', cursor: 'default' }

  if (loading) return <p style={{ color: C.textSecondary, fontSize: 13 }}>{t.loadingShort}</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {LIST_DEFS.map(({ key, label }) => {
        const defaults = DEFAULT_LISTS[key] || []
        const customs  = items.filter(i => i.list_type === key)
        return (
          <div key={key} style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              {label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 8 }}>
              {defaults.map(v => (
                <span key={v} style={defBadge} title={t.defaults}>🔒 {translateListValue(v, t)}</span>
              ))}
              {customs.map(item => (
                <span key={item.id} style={badge}>
                  {item.value}
                  <button onClick={() => removeValue(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#0891b2', fontWeight: 900, fontSize: 14, lineHeight: 1 }}>×</button>
                </span>
              ))}
              {customs.length === 0 && defaults.length === 0 && (
                <span style={{ fontSize: 12, color: C.textMuted }}>{t.noCustomValues}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={adding[key] || ''}
                onChange={e => setAdding(p => ({ ...p, [key]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addValue(key)}
                placeholder={t.addValue}
                style={{ flex: 1, padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: 'none', background: C.bg, color: C.textPrimary }}
              />
              <button onClick={() => addValue(key)} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                +
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Accident Form Modal ────────────────────────────────────────────────────────
const ALLOWED_ACCIDENT_TYPES = [
  'image/jpeg','image/png','image/webp','image/gif','application/pdf',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function AccidentFormModal({ companyId, cars, session, rtl, t, isMobile, onClose, onSaved }) {
  const [form, setForm] = useState({
    my_car_id: '', other_plate: '', other_make: '', other_model: '',
    other_driver_name: '', other_driver_phone: '', incident_date: '', description: '',
  })
  const [files, setFiles]     = useState([])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function pickFiles(e) {
    const picked = Array.from(e.target.files || [])
    const oversized = picked.find(f => f.size > 10 * 1024 * 1024)
    const badType   = picked.find(f => !ALLOWED_ACCIDENT_TYPES.includes(f.type))
    if (oversized) { setError(t.fileTooLarge); return }
    if (badType)   { setError(t.fileTypeNotAllowed); return }
    setFiles(prev => [...prev, ...picked])
    setError('')
    e.target.value = ''
  }

  function removeFile(idx) { setFiles(p => p.filter((_, i) => i !== idx)) }

  async function submit(e) {
    e.preventDefault()
    if (!form.my_car_id) { setError(rtl ? 'יש לבחור רכב' : 'Please select your vehicle'); return }
    setSaving(true); setError('')
    try {
      const uploadedPaths = []
      for (const file of files) {
        const safe = file.name.replace(/[^\w.\-]/g, '_').replace(/^\.+/, '').replace(/\s+/g, '_')
        const path = `${companyId}/accidents/${Date.now()}_${safe}`
        const { error: upErr } = await supabase.storage.from('fleet-documents').upload(path, file)
        if (upErr) { console.error('[upload]', upErr); throw new Error(rtl ? 'שגיאה בהעלאת קובץ. נסה שוב.' : 'File upload failed. Please try again.') }
        uploadedPaths.push({ name: file.name, path })
      }
      const { error: dbErr } = await supabase.from('accident_reports').insert({
        company_id:         companyId,
        created_by:         session?.user?.id || null,
        my_car_id:          Number(form.my_car_id),
        other_plate:        form.other_plate  || null,
        other_make:         form.other_make   || null,
        other_model:        form.other_model  || null,
        other_driver_name:  form.other_driver_name  || null,
        other_driver_phone: form.other_driver_phone || null,
        incident_date:      form.incident_date || null,
        description:        form.description  || null,
        file_paths:         uploadedPaths,
      })
      if (dbErr) { console.error('[DB]', dbErr); throw new Error(rtl ? 'שגיאה בשמירה. נסה שוב.' : 'Save failed. Please try again.') }
      onSaved()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const inp = {
    padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8,
    fontSize: 13, outline: 'none', background: C.bg, color: C.textPrimary,
    width: '100%', boxSizing: 'border-box',
  }
  const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }
  const label = (txt) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{txt}</div>
  )
  const section = (icon, title) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 18, marginBottom: 10 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: C.textPrimary }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9500,
      background: C.overlay, display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center', padding: isMobile ? 0 : 16,
    }} onClick={onClose}>
      <div style={{
        background: C.surface, width: '100%', maxWidth: isMobile ? '100%' : 560,
        borderRadius: isMobile ? '18px 18px 0 0' : 14,
        boxShadow: '0 8px 40px rgba(0,0,0,0.2)', border: `1px solid ${C.border}`,
        maxHeight: isMobile ? '95vh' : '90vh', display: 'flex', flexDirection: 'column',
        direction: rtl ? 'rtl' : 'ltr',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.textPrimary }}>🚨 {t.accidentFormTitle}</div>
            <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{t.accidentFormSub}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.textMuted, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Form body */}
        <form onSubmit={submit} style={{ overflowY: 'auto', flex: 1, padding: '4px 20px 20px' }}>

          {section('🚗', t.myCar)}
          <div style={row2}>
            <div style={{ gridColumn: '1 / -1' }}>
              <select
                value={form.my_car_id}
                onChange={e => set('my_car_id', e.target.value)}
                required
                style={{ ...inp }}
              >
                <option value="">{rtl ? '— בחר רכב —' : '— Select vehicle —'}</option>
                {cars.map(c => (
                  <option key={c.id} value={c.id}>{c.plate}{c.make ? ` · ${c.make}` : ''}{c.model ? ` ${c.model}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              {label(t.incidentDate)}
              <DateInput value={form.incident_date} onChange={e => set('incident_date', e.target.value)} style={inp} placeholder="DD/MM/YY" />
            </div>
          </div>

          {section('👤', t.otherDriverInfo)}
          <div style={row2}>
            <div>
              {label(t.otherPlate)}
              <input style={inp} value={form.other_plate} onChange={e => set('other_plate', e.target.value)} placeholder="123-45-678" />
            </div>
            <div>
              {label(t.otherMake)}
              <input style={inp} value={form.other_make} onChange={e => set('other_make', e.target.value)} placeholder="Toyota" />
            </div>
          </div>
          <div style={{ ...row2, marginTop: 10 }}>
            <div>
              {label(t.otherModel)}
              <input style={inp} value={form.other_model} onChange={e => set('other_model', e.target.value)} placeholder="Corolla" />
            </div>
            <div>
              {label(t.otherDriverName)}
              <input style={inp} value={form.other_driver_name} onChange={e => set('other_driver_name', e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            {label(t.otherDriverPhone)}
            <input style={inp} value={form.other_driver_phone} onChange={e => set('other_driver_phone', e.target.value)} type="tel" />
          </div>

          {section('📝', t.incidentDesc)}
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder={t.incidentDescPlaceholder}
            rows={4}
            style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
          />

          {section('📎', t.attachFiles)}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            border: `2px dashed ${C.border}`, borderRadius: 8, cursor: 'pointer',
            background: C.bgSubtle, color: C.textSecondary, fontSize: 13, fontWeight: 600,
          }}>
            <span>📁</span>
            <span>{rtl ? 'בחר קבצים' : 'Choose files'}</span>
            <input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx" onChange={pickFiles} style={{ display: 'none' }} />
          </label>
          {files.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: C.bg, borderRadius: 6, fontSize: 12 }}>
                  <span>📄</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.textPrimary }}>{f.name}</span>
                  <span style={{ color: C.textMuted, flexShrink: 0 }}>{(f.size / 1024).toFixed(0)} KB</span>
                  <button type="button" onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger, fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: C.danger + '10', border: `1px solid ${C.danger}30`, borderRadius: 8, fontSize: 13, color: C.danger, fontWeight: 600 }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: rtl ? 'flex-start' : 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {t.cancel}
            </button>
            <button type="submit" disabled={saving} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: saving ? C.textMuted : C.danger, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? t.uploading : t.submitReport}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Forms Tab ────────────────────────────────────────────────────────────────
const FORM_TYPES = [
  { id: 'car_checklist',    icon: '📋', label: 'רשימת בדיקה לרכב חדש',   labelEn: 'New Car Checklist' },
  { id: 'driver_car_check', icon: '🚗', label: 'בדיקת רכב על ידי נהג',    labelEn: 'Driver Car Check' },
  { id: 'yearly_training',  icon: '🎓', label: 'אימות הדרכה שנתית',        labelEn: 'Yearly Training' },
  { id: 'accident_report',  icon: '🚨', label: 'דוח תאונה לנהג',           labelEn: 'Driver Accident Report' },
  { id: 'custom',           icon: '🛠️', label: 'טופס מותאם אישית',         labelEn: 'Custom Form' },
]

const PRESET_FIELDS = [
  { preset: 'submitter_name', label: 'שם הממלא',        labelEn: 'Full Name',       icon: '👤' },
  { preset: 'plate',          label: 'לוחית רישוי',      labelEn: 'License Plate',   icon: '🚗' },
  { preset: 'driver_license', label: 'רישיון נהיגה',     labelEn: 'Driver License',  icon: '📄' },
  { preset: 'phone',          label: 'טלפון',            labelEn: 'Phone',           icon: '📞' },
  { preset: 'mileage',        label: 'קילומטראז׳',       labelEn: 'Mileage',         icon: '🔢' },
  { preset: 'date',           label: 'תאריך',            labelEn: 'Date',            icon: '📅' },
  { preset: 'fuel_level',     label: 'רמת דלק',          labelEn: 'Fuel Level',      icon: '⛽' },
  { preset: 'notes',          label: 'הערות',            labelEn: 'Notes',           icon: '📝' },
  { preset: 'signature',      label: 'חתימה / אישור',    labelEn: 'Signature / Confirm', icon: '✅' },
]

const SUB_FIELD_LABELS = {
  plate: 'לוחית רישוי', make: 'יצרן', model: 'דגם', year: 'שנה',
  mileage: 'קילומטראז׳', submitter_name: 'שם הממלא',
  insurance_provider: 'חברת ביטוח', insurance_policy: 'מספר פוליסה', insurance_expiry: 'תפוגת ביטוח',
  has_toll: 'נתיבי תשלום', toll_providers: 'חברות נתיבי תשלום', toll_tag: 'מספר תג',
  test_passed: 'טסט שנתי', test_date: 'תאריך טסט אחרון', test_next: 'טסט הבא',
  registration_expiry: 'תפוגת רישיון רכב', notes: 'הערות',
  fuel_level: 'רמת דלק', exterior_damage: 'נזקים חיצוניים',
  damage_desc: 'תיאור הנזק', interior_ok: 'מצב הפנים',
  driver_license: 'מספר רישיון נהיגה', training_date: 'תאריך הדרכה',
  trainer_name: 'שם המדריך', topics: 'נושאים שנלמדו', other_topic: 'נושא נוסף',
  confirmed: 'אישור הצהרה',
}
const SUB_VAL = { yes: 'כן', no: 'לא', 'true': 'כן', 'false': 'לא', ok: 'תקין', dirty: 'מלוכלך', damaged: 'פגום' }
const fmtSubVal = v => {
  if (Array.isArray(v)) return v.join(', ')
  const s = String(v)
  return SUB_VAL[s] || s
}

function FormsTab({ companyId, cars, drivers, session, t, rtl }) {
  const isMobile = useIsMobile()
  const [links,         setLinks]         = useState([])
  const [subCounts,     setSubCounts]     = useState({})
  const [loading,       setLoading]       = useState(true)
  const [showCreate,    setShowCreate]    = useState(false)
  // accident reports
  const [accidentReports,    setAccidentReports]    = useState([])
  const [accLoading,         setAccLoading]         = useState(true)
  const [showAccidentForm,   setShowAccidentForm]   = useState(false)
  const [viewAccidentReport, setViewAccidentReport] = useState(null)
  const [accQrReport,        setAccQrReport]        = useState(null)
  const [accSuccess,         setAccSuccess]         = useState(false)
  const [accFormShare,       setAccFormShare]       = useState(null)
  const [accFormShareBusy,   setAccFormShareBusy]   = useState(false)
  const [createType,    setCreateType]    = useState('car_checklist')
  const [createCar,     setCreateCar]     = useState('')
  const [createDriver,  setCreateDriver]  = useState('')
  const [createTitle,   setCreateTitle]   = useState('')
  const [createExpiry,  setCreateExpiry]  = useState('')
  const [createSingle,  setCreateSingle]  = useState(false)
  const [creating,      setCreating]      = useState(false)
  const [copied,        setCopied]        = useState(null)
  const [showQr,        setShowQr]        = useState(null)
  const [viewSubs,      setViewSubs]      = useState(null)
  const [subs,          setSubs]          = useState([])
  const [subsLoading,   setSubsLoading]   = useState(false)
  const [expandSub,     setExpandSub]     = useState(null)
  const [subSearch,     setSubSearch]     = useState('')
  const [subDateFrom,   setSubDateFrom]   = useState('')
  const [subDateTo,     setSubDateTo]     = useState('')
  const [printSub,      setPrintSub]      = useState(null)
  const [customFields,  setCustomFields]  = useState([])
  const [customFldType, setCustomFldType] = useState('text')
  // License agreement
  const [licenseLink,       setLicenseLink]       = useState(null)
  const [licenseBusy,       setLicenseBusy]       = useState(false)
  const [licenseCopied,     setLicenseCopied]     = useState(false)
  const [licenseSignatures, setLicenseSignatures] = useState([])
  const [licenseSigsLoad,   setLicenseSigsLoad]   = useState(true)
  const [viewLicenseSub,    setViewLicenseSub]    = useState(null)

  useEffect(() => { load(); loadAccidents(); loadLicenseData() }, [companyId])

  async function loadAccidents() {
    if (!companyId) return
    setAccLoading(true)
    const { data } = await supabase.from('accident_reports').select('*')
      .eq('company_id', companyId).order('created_at', { ascending: false })
    setAccidentReports(data || [])
    setAccLoading(false)
  }

  async function deleteAccident(id) {
    if (!window.confirm(t.confirmDelete)) return
    const rep = accidentReports.find(r => r.id === id)
    if (rep?.file_paths?.length) {
      await supabase.storage.from('fleet-documents').remove(rep.file_paths.map(f => f.path))
    }
    await supabase.from('accident_reports').delete().eq('id', id)
    setAccidentReports(p => p.filter(r => r.id !== id))
  }

  async function openAccidentFile(fileMeta) {
    const { data } = await supabase.storage.from('fleet-documents').createSignedUrl(fileMeta.path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function toggleAccidentHold(rep) {
    const next = rep.status === 'on_hold' ? 'open' : 'on_hold'
    await supabase.from('accident_reports').update({ status: next }).eq('id', rep.id)
    setAccidentReports(p => p.map(r => r.id === rep.id ? { ...r, status: next } : r))
  }

  async function openAccFormShare() {
    setAccFormShareBusy(true)
    // Reuse existing reusable accident_report link if one exists
    const { data: existing } = await supabase.from('form_links')
      .select('*').eq('company_id', companyId).eq('type', 'accident_report')
      .eq('is_active', true).is('expires_at', null).limit(1)
    if (existing?.length) {
      setAccFormShare(existing[0])
      setAccFormShareBusy(false)
      return
    }
    const { data: newLink } = await supabase.from('form_links').insert({
      company_id: companyId,
      type: 'accident_report',
      title: rtl ? 'טופס דוח תאונה לנהג' : 'Driver Accident Report Form',
      created_by: session.user.id,
      is_active: true,
      single_use: false,
    }).select()
    if (newLink?.[0]) {
      setAccFormShare(newLink[0])
      setLinks(p => [newLink[0], ...p])
    }
    setAccFormShareBusy(false)
  }

  async function loadLicenseData() {
    if (!companyId) return
    setLicenseSigsLoad(true)
    const [{ data: lLinks }, { data: sigs }] = await Promise.all([
      supabase.from('form_links').select('*').eq('company_id', companyId)
        .eq('type', 'license_agreement').eq('is_active', true).is('expires_at', null)
        .order('created_at', { ascending: false }).limit(1),
      supabase.from('form_submissions').select('*').eq('company_id', companyId)
        .eq('type', 'license_agreement').order('created_at', { ascending: false }),
    ])
    if (lLinks?.[0]) setLicenseLink(lLinks[0])
    setLicenseSignatures(sigs || [])
    setLicenseSigsLoad(false)
  }

  async function openLicenseFormLink() {
    setLicenseBusy(true)
    const { data: existing } = await supabase.from('form_links')
      .select('*').eq('company_id', companyId).eq('type', 'license_agreement')
      .eq('is_active', true).is('expires_at', null).limit(1)
    if (existing?.length) { setLicenseLink(existing[0]); setLicenseBusy(false); return }
    const { data: newLink } = await supabase.from('form_links').insert({
      company_id: companyId,
      type: 'license_agreement',
      title: rtl ? 'הסכם רישיון שימוש — Celox AI' : 'License Agreement — Celox AI',
      created_by: session.user.id,
      is_active: true,
      single_use: false,
    }).select().single()
    if (newLink) { setLicenseLink(newLink); setLinks(p => [newLink, ...p]) }
    setLicenseBusy(false)
  }

  async function newLicenseFormLink() {
    setLicenseBusy(true)
    const { data: newLink } = await supabase.from('form_links').insert({
      company_id: companyId,
      type: 'license_agreement',
      title: rtl ? 'הסכם רישיון שימוש — Celox AI' : 'License Agreement — Celox AI',
      created_by: session.user.id,
      is_active: true,
      single_use: false,
    }).select().single()
    if (newLink) { setLicenseLink(newLink); setLinks(p => [newLink, ...p]) }
    setLicenseBusy(false)
  }

  function accidentSummaryText(rep) {
    const myCar = cars.find(c => String(c.id) === String(rep.my_car_id))
    const myCarStr = myCar ? `${myCar.plate}${myCar.make ? ` ${myCar.make}` : ''}${myCar.model ? ` ${myCar.model}` : ''}` : '—'
    const lines = [
      rtl ? `🚨 דוח תאונת דרכים` : `🚨 Accident Report`,
      rtl ? `📅 תאריך: ${rep.incident_date ? fmtDate(rep.incident_date) : '—'}` : `📅 Date: ${rep.incident_date ? fmtDate(rep.incident_date) : '—'}`,
      rtl ? `🚗 הרכב שלי: ${myCarStr}` : `🚗 My vehicle: ${myCarStr}`,
      rep.other_plate ? (rtl ? `🚘 רכב שני: ${rep.other_plate}${rep.other_make ? ` ${rep.other_make}` : ''}${rep.other_model ? ` ${rep.other_model}` : ''}` : `🚘 Other vehicle: ${rep.other_plate}${rep.other_make ? ` ${rep.other_make}` : ''}${rep.other_model ? ` ${rep.other_model}` : ''}`) : '',
      rep.other_driver_name ? (rtl ? `👤 נהג שני: ${rep.other_driver_name}${rep.other_driver_phone ? ` | ${rep.other_driver_phone}` : ''}` : `👤 Other driver: ${rep.other_driver_name}${rep.other_driver_phone ? ` | ${rep.other_driver_phone}` : ''}`) : '',
      rep.description ? (rtl ? `📝 תיאור: ${rep.description}` : `📝 Description: ${rep.description}`) : '',
    ].filter(Boolean).join('\n')
    return lines
  }

  function sendAccidentWhatsApp(rep) {
    window.open(`https://wa.me/?text=${encodeURIComponent(accidentSummaryText(rep))}`, '_blank')
  }

  function sendAccidentEmail(rep) {
    const subj = rtl ? `דוח תאונת דרכים — ${rep.incident_date ? fmtDate(rep.incident_date) : ''}` : `Accident Report — ${rep.incident_date ? fmtDate(rep.incident_date) : ''}`
    window.location.href = `mailto:?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(accidentSummaryText(rep))}`
  }

  function accidentQrData(rep) {
    return accidentSummaryText(rep)
  }

  function cfAddPreset(preset) {
    if (customFields.some(f => f.preset === preset)) return
    const p = PRESET_FIELDS.find(x => x.preset === preset)
    if (!p) return
    setCustomFields(prev => [...prev, { id: crypto.randomUUID(), type: 'preset', preset: p.preset, label: p.label, labelEn: p.labelEn, required: preset === 'submitter_name', options: [] }])
  }
  function cfAddFree(type) {
    const labels = { text: 'שדה טקסט', textarea: 'טקסט ארוך', number: 'מספר', date: 'תאריך', select: 'בחירה מרשימה', yesno: 'כן / לא', checkbox: 'תיבת סימון' }
    const labelsEn = { text: 'Text Field', textarea: 'Long Text', number: 'Number', date: 'Date', select: 'Dropdown', yesno: 'Yes / No', checkbox: 'Checkbox' }
    setCustomFields(prev => [...prev, { id: crypto.randomUUID(), type, label: labels[type], labelEn: labelsEn[type], required: false, options: [] }])
  }
  function cfUpdate(id, updates) { setCustomFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f)) }
  function cfRemove(id) { setCustomFields(prev => prev.filter(f => f.id !== id)) }
  function cfMove(id, dir) {
    setCustomFields(prev => {
      const idx = prev.findIndex(f => f.id === id)
      const next = [...prev]
      const t = idx + dir
      if (t < 0 || t >= next.length) return prev
      ;[next[idx], next[t]] = [next[t], next[idx]]
      return next
    })
  }

  async function load() {
    setLoading(true)
    const [{ data: linksData }, { data: countsData }] = await Promise.all([
      supabase.from('form_links').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('form_submissions').select('form_link_id').eq('company_id', companyId),
    ])
    setLinks(linksData || [])
    const cm = {}
    ;(countsData || []).forEach(s => { cm[s.form_link_id] = (cm[s.form_link_id] || 0) + 1 })
    setSubCounts(cm)
    setLoading(false)
  }

  async function createLink() {
    setCreating(true)
    const typeMeta = FORM_TYPES.find(f => f.id === createType)
    const selectedDriver = drivers?.find(d => d.id === createDriver)
    const autoTitle = createTitle.trim() || [
      rtl ? typeMeta.label : typeMeta.labelEn,
      selectedDriver ? `· ${selectedDriver.name}` : '',
    ].filter(Boolean).join(' ')
    if (createType === 'custom') {
      if (customFields.length === 0) {
        alert(rtl ? 'יש להוסיף לפחות שדה אחד לטופס המותאם.' : 'Please add at least one field to the custom form.')
        setCreating(false); return
      }
      const badSelect = customFields.find(f => f.type === 'select' && !(f.options || []).some(Boolean))
      if (badSelect) {
        alert(rtl ? `שדה הרשימה "${badSelect.label}" חייב לכלול לפחות אפשרות אחת.` : `Dropdown "${badSelect.label}" must have at least one option.`)
        setCreating(false); return
      }
    }
    const cleanedFields = createType === 'custom'
      ? customFields.map(f => f.type === 'select' ? { ...f, options: (f.options || []).filter(Boolean) } : f)
      : null
    const { data, error } = await supabase.from('form_links').insert({
      company_id: companyId,
      type: createType,
      car_id: createCar || null,
      driver_id: createDriver || null,
      title: autoTitle,
      created_by: session.user.id,
      expires_at: createExpiry || null,
      is_active: true,
      single_use: createSingle,
      fields: cleanedFields,
    }).select()
    if (!error && data) {
      const row = { ...data[0], _driver: selectedDriver || null }
      setLinks(p => [row, ...p])
      setShowCreate(false)
      setCreateTitle(''); setCreateCar(''); setCreateDriver(''); setCreateExpiry(''); setCreateSingle(false); setCustomFields([])
    }
    setCreating(false)
  }

  async function toggleActive(link) {
    await supabase.from('form_links').update({ is_active: !link.is_active }).eq('id', link.id)
    setLinks(p => p.map(l => l.id === link.id ? { ...l, is_active: !l.is_active } : l))
  }

  async function deleteLink(link) {
    if (!window.confirm(rtl ? 'למחוק קישור זה?' : 'Delete this form link?')) return
    await supabase.from('form_links').delete().eq('id', link.id)
    setLinks(p => p.filter(l => l.id !== link.id))
  }

  async function openSubs(link) {
    setViewSubs(link); setSubSearch(''); setSubDateFrom(''); setSubDateTo(''); setExpandSub(null)
    setSubsLoading(true)
    const { data } = await supabase.from('form_submissions')
      .select('*').eq('form_link_id', link.id).order('submitted_at', { ascending: false })
    setSubs(data || [])
    setSubsLoading(false)
  }

  function copyLink(token) {
    const url = `${window.location.origin}/form/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  function sendWhatsApp(link) {
    const url = `${window.location.origin}/form/${link.token}`
    const linkedDriver = link.driver_id ? (drivers || []).find(d => String(d.id) === String(link.driver_id)) : null
    const driverName = linkedDriver?.name || ''
    const greeting = rtl
      ? (driverName ? `שלום ${driverName},\n` : 'שלום,\n')
      : (driverName ? `Hello ${driverName},\n` : 'Hello,\n')
    const body = rtl
      ? `נשלח אליך קישור למילוי הטופס: ${link.title}\n\n${url}`
      : `You have been sent a form to fill out: ${link.title}\n\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(greeting + body)}`, '_blank')
  }

  function sendFormEmail(link) {
    const url = `${window.location.origin}/form/${link.token}`
    const subject = rtl ? `טופס למילוי: ${link.title}` : `Form to fill out: ${link.title}`
    const body = rtl
      ? `שלום,\n\nנשלח אליך קישור למילוי הטופס הבא:\n${link.title}\n\n${url}\n\nתודה`
      : `Hello,\n\nYou have been sent the following form to fill out:\n${link.title}\n\n${url}\n\nThank you`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  async function exportSubs(subsToExport, link) {
    const meta = FORM_TYPES.find(f => f.id === link.type)
    const rows = subsToExport.map(s => {
      const row = { [rtl ? 'שם' : 'Name']: s.submitter_name, [rtl ? 'תאריך' : 'Date']: new Date(s.submitted_at).toLocaleString('he-IL') }
      Object.entries(s.data || {}).forEach(([k, v]) => {
        if (k === 'attachments') return
        row[SUB_FIELD_LABELS[k] || k] = fmtSubVal(v)
      })
      return row
    })
    const wb = new ExcelJS.Workbook()
    xlsxAddSheet(wb, 'Submissions', rows)
    await xlsxDownload(wb, `${link.title || meta?.labelEn}-submissions.xlsx`)
  }

  const formUrl = token => `${window.location.origin}/form/${token}`
  const qrUrl   = token => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(formUrl(token))}`

  const pad = { padding: isMobile => isMobile ? 12 : 24 }
  const card = { background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 10, overflow: 'hidden' }
  const cardHeader = { padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }
  const btnPrimary = { background: C.primary, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
  const btnGhost   = { background: 'transparent', color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 24, direction: rtl ? 'rtl' : 'ltr' }}>

      {/* Print overlay */}
      {printSub && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div id="print-area" style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', padding: 32, direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 20, color: '#0f172a', marginBottom: 4 }}>{viewSubs?.title}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{printSub.submitter_name} · {new Date(printSub.submitted_at).toLocaleString('he-IL')}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => window.print()} style={{ background: '#0891b2', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🖨️ הדפס</button>
                <button onClick={() => setPrintSub(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>סגור</button>
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '2px solid #e2e8f0', marginBottom: 20 }} />
            {Object.entries(printSub.data || {}).filter(([k, v]) => v && k !== 'attachments' && k !== 'submitter_name').map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                <span style={{ fontWeight: 700, color: '#475569', minWidth: 160 }}>{SUB_FIELD_LABELS[k] || k.replace(/_/g,' ')}</span>
                <span style={{ color: '#0f172a', textAlign: 'left', flex: 1 }}>{fmtSubVal(v)}</span>
              </div>
            ))}
            {printSub.data?.attachments?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, color: '#475569', marginBottom: 8 }}>קבצים מצורפים</div>
                {printSub.data.attachments.map((a, i) => <div key={i} style={{ fontSize: 13, color: '#0891b2' }}>📎 {a.name}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR code modal */}
      {showQr && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 320, width: '100%' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', marginBottom: 4 }}>{showQr.title}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>{rtl ? 'סרוק כדי לפתוח את הטופס' : 'Scan to open the form'}</div>
            <img src={qrUrl(showQr.token)} alt="QR" style={{ width: 220, height: 220, borderRadius: 10, border: '1px solid #e2e8f0' }} />
            <div style={{ marginTop: 16, fontSize: 11, color: '#94a3b8', wordBreak: 'break-all', direction: 'ltr' }}>{formUrl(showQr.token)}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
              <a href={qrUrl(showQr.token)} download={`qr-${showQr.title}.png`} style={{ background: '#0891b2', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>⬇️ {rtl ? 'הורד QR' : 'Download QR'}</a>
              <button onClick={() => setShowQr(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>{rtl ? 'סגור' : 'Close'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions drawer */}
      {viewSubs && (() => {
        const filtered = subs.filter(s => {
          const matchName = !subSearch || (s.submitter_name || '').toLowerCase().includes(subSearch.toLowerCase())
          const matchFrom = !subDateFrom || new Date(s.submitted_at) >= new Date(subDateFrom)
          const matchTo   = !subDateTo   || new Date(s.submitted_at) <= new Date(subDateTo + 'T23:59:59')
          return matchName && matchFrom && matchTo
        })
        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ background: C.surface, borderRadius: 16, width: '100%', maxWidth: 720, direction: rtl ? 'rtl' : 'ltr' }}>
            <div style={{ background: C.navBg, borderRadius: '16px 16px 0 0', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: 16 }}>{viewSubs.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>{filtered.length}/{subs.length} {rtl ? 'תגובות' : 'submissions'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {subs.length > 0 && (
                  <button onClick={() => exportSubs(filtered, viewSubs)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    📊 {rtl ? 'יצא Excel' : 'Export Excel'}
                  </button>
                )}
                <button onClick={() => setViewSubs(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#f8fafc', fontSize: 18 }}>✕</button>
              </div>
            </div>
            {/* Search & filter bar */}
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, flexWrap: 'wrap', background: C.bg }}>
              <input value={subSearch} onChange={e => setSubSearch(e.target.value)} placeholder={rtl ? '🔍 חפש לפי שם...' : '🔍 Search by name...'} style={{ flex: 1, minWidth: 140, padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, background: '#fff' }} />
              <input type="date" value={subDateFrom} onChange={e => setSubDateFrom(e.target.value)} style={{ padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, background: '#fff' }} />
              <input type="date" value={subDateTo} onChange={e => setSubDateTo(e.target.value)} style={{ padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, background: '#fff' }} />
              {(subSearch || subDateFrom || subDateTo) && <button onClick={() => { setSubSearch(''); setSubDateFrom(''); setSubDateTo('') }} style={{ padding: '7px 12px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, cursor: 'pointer', background: '#fff', color: C.danger }}>✕</button>}
            </div>
            <div style={{ padding: '16px 20px 24px' }}>
              {subsLoading
                ? <div style={{ textAlign: 'center', padding: 32, color: C.textMuted }}>טוען...</div>
                : filtered.length === 0
                  ? <div style={{ textAlign: 'center', padding: 32, color: C.textMuted }}>{subs.length === 0 ? (rtl ? 'אין תגובות עדיין' : 'No submissions yet') : (rtl ? 'אין תוצאות לפילטר' : 'No results match filter')}</div>
                  : filtered.map(sub => (
                    <div key={sub.id} style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => setExpandSub(expandSub === sub.id ? null : sub.id)}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary }}>{sub.submitter_name || '—'}</div>
                          <div style={{ fontSize: 12, color: C.textMuted }}>{new Date(sub.submitted_at).toLocaleString('he-IL')}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button onClick={e => { e.stopPropagation(); setPrintSub(sub) }} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#475569', fontWeight: 700 }}>🖨️</button>
                          <span style={{ color: C.textMuted, fontSize: 16 }}>{expandSub === sub.id ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      {expandSub === sub.id && (
                        <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 14px', fontSize: 13 }}>
                          {Object.entries(sub.data || {}).filter(([k, v]) => v && k !== 'submitter_name' && k !== 'attachments').map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', gap: 12, padding: '5px 0', borderBottom: `1px solid ${C.borderLight}` }}>
                              <span style={{ color: C.textMuted, minWidth: 150, fontWeight: 600 }}>{SUB_FIELD_LABELS[k] || k.replace(/_/g,' ')}</span>
                              <span style={{ color: C.textPrimary, flex: 1 }}>{fmtSubVal(v)}</span>
                            </div>
                          ))}
                          {sub.data?.attachments?.length > 0 && (
                            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {sub.data.attachments.map((a, i) => (
                                <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={{ background: C.primary, color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>📎 {a.name}</a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
        )
      })()}

      {/* Create link modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: C.surface, borderRadius: 16, width: '100%', maxWidth: createType === 'custom' ? 580 : 480, direction: rtl ? 'rtl' : 'ltr', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: C.navBg, borderRadius: '16px 16px 0 0', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#f8fafc', fontWeight: 800, fontSize: 15 }}>{rtl ? '➕ יצירת קישור טופס' : '➕ Create Form Link'}</span>
              <button onClick={() => { setShowCreate(false); setCustomFields([]) }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: '#f8fafc', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
              {/* Form type selector */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6, display: 'block' }}>{rtl ? 'סוג טופס' : 'Form Type'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {FORM_TYPES.map(f => (
                    <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 9, border: `2px solid ${createType === f.id ? C.primary : C.border}`, cursor: 'pointer', background: createType === f.id ? C.primary + '08' : C.bg, transition: 'all 0.15s' }}>
                      <input type="radio" name="formType" value={f.id} checked={createType === f.id} onChange={() => { setCreateType(f.id); setCustomFields([]) }} style={{ accentColor: C.primary }} />
                      <span style={{ fontSize: 16 }}>{f.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary }}>{rtl ? f.label : f.labelEn}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom form builder */}
              {createType === 'custom' && (
                <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.textPrimary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>{rtl ? '🛠 בנה את שדות הטופס' : '🛠 Build Form Fields'}</div>

                  {/* Preset field pills */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{rtl ? 'שדות מוכנים מראש — לחץ להוסיף:' : 'Preset fields — click to add:'}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {PRESET_FIELDS.map(p => {
                        const added = customFields.some(f => f.preset === p.preset)
                        return (
                          <button key={p.preset} type="button" onClick={() => cfAddPreset(p.preset)} disabled={added}
                            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: `1px solid ${added ? C.success : C.border}`, background: added ? C.success + '18' : '#fff', color: added ? C.success : C.textPrimary, cursor: added ? 'default' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {p.icon} {rtl ? p.label : p.labelEn} {added ? '✓' : ''}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Free field adder */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <select value={customFldType} onChange={e => setCustomFldType(e.target.value)}
                      style={{ flex: 1, padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, background: '#fff', color: C.textPrimary }}>
                      <option value="text">{rtl ? 'טקסט קצר' : 'Short Text'}</option>
                      <option value="textarea">{rtl ? 'טקסט ארוך' : 'Long Text'}</option>
                      <option value="number">{rtl ? 'מספר' : 'Number'}</option>
                      <option value="date">{rtl ? 'תאריך' : 'Date'}</option>
                      <option value="select">{rtl ? 'בחירה מרשימה' : 'Dropdown'}</option>
                      <option value="yesno">{rtl ? 'כן / לא' : 'Yes / No'}</option>
                      <option value="checkbox">{rtl ? 'תיבת סימון' : 'Checkbox'}</option>
                    </select>
                    <button type="button" onClick={() => cfAddFree(customFldType)}
                      style={{ padding: '7px 14px', borderRadius: 8, background: C.primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {rtl ? '+ הוסף שדה' : '+ Add Field'}
                    </button>
                  </div>

                  {/* Field list */}
                  {customFields.length === 0
                    ? <div style={{ textAlign: 'center', padding: '14px', border: `2px dashed ${C.border}`, borderRadius: 8, color: C.textMuted, fontSize: 12 }}>
                        {rtl ? 'הוסף שדות לטופס מהאפשרויות למעלה' : 'Add fields to your form using the options above'}
                      </div>
                    : customFields.map((f, idx) => (
                      <div key={f.id} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {/* Up/down */}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <button type="button" onClick={() => cfMove(f.id, -1)} disabled={idx === 0}
                              style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 9, color: idx === 0 ? C.border : C.textMuted, padding: 0, lineHeight: 1 }}>▲</button>
                            <button type="button" onClick={() => cfMove(f.id, 1)} disabled={idx === customFields.length - 1}
                              style={{ background: 'none', border: 'none', cursor: idx === customFields.length - 1 ? 'default' : 'pointer', fontSize: 9, color: idx === customFields.length - 1 ? C.border : C.textMuted, padding: 0, lineHeight: 1 }}>▼</button>
                          </div>
                          {/* Type badge */}
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: C.primary + '18', color: C.primary, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {f.type === 'preset' ? (f.preset) : (rtl ? { text:'טקסט', textarea:'ארוך', number:'מספר', date:'תאריך', select:'רשימה', yesno:'כן/לא', checkbox:'סימון' }[f.type] : f.type)}
                          </span>
                          {/* Label */}
                          <input value={f.label} onChange={e => cfUpdate(f.id, { label: e.target.value })}
                            style={{ flex: 1, padding: '4px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, minWidth: 0 }} />
                          {/* Required */}
                          <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: C.textSub, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <input type="checkbox" checked={!!f.required} onChange={e => cfUpdate(f.id, { required: e.target.checked })} style={{ accentColor: C.primary }} />
                            {rtl ? 'חובה' : 'Req.'}
                          </label>
                          {/* Remove */}
                          <button type="button" onClick={() => cfRemove(f.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger, fontSize: 15, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                        </div>
                        {/* Options editor for select type */}
                        {f.type === 'select' && (
                          <div style={{ marginTop: 6, paddingRight: rtl ? 0 : 26, paddingLeft: rtl ? 26 : 0 }}>
                            {(f.options || []).map((opt, oi) => (
                              <div key={oi} style={{ display: 'flex', gap: 5, marginBottom: 4 }}>
                                <input value={opt} onChange={e => { const o = [...(f.options||[])]; o[oi] = e.target.value; cfUpdate(f.id, { options: o }) }}
                                  placeholder={rtl ? `אפשרות ${oi + 1}` : `Option ${oi + 1}`}
                                  style={{ flex: 1, padding: '3px 7px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }} />
                                <button type="button" onClick={() => cfUpdate(f.id, { options: (f.options||[]).filter((_,i) => i !== oi) })}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger, fontSize: 13 }}>×</button>
                              </div>
                            ))}
                            <button type="button" onClick={() => cfUpdate(f.id, { options: [...(f.options||[]), ''] })}
                              style={{ fontSize: 11, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}>
                              {rtl ? '+ הוסף אפשרות' : '+ Add option'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  }
                </div>
              )}

              {/* Worker/driver */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6, display: 'block' }}>{rtl ? 'עובד / נהג (אופציונלי)' : 'Worker / Driver (optional)'}</label>
                <select value={createDriver} onChange={e => setCreateDriver(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.textPrimary, background: '#f8fafc' }}>
                  <option value="">{rtl ? '— ללא שיוך לעובד —' : '— No specific worker —'}</option>
                  {(drivers || []).map(d => <option key={d.id} value={d.id}>{d.name}{d.phone ? ` · ${d.phone}` : ''}</option>)}
                </select>
              </div>
              {(createType === 'car_checklist' || createType === 'driver_car_check') && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6, display: 'block' }}>{rtl ? 'רכב (אופציונלי)' : 'Vehicle (optional)'}</label>
                  <select value={createCar} onChange={e => setCreateCar(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.textPrimary, background: '#f8fafc' }}>
                    <option value="">{rtl ? '— ללא שיוך לרכב —' : '— No specific vehicle —'}</option>
                    {cars.map(c => <option key={c.id} value={c.id}>{c.plate} · {c.make} {c.model}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6, display: 'block' }}>{rtl ? 'כותרת (אופציונלי)' : 'Title (optional)'}</label>
                <input value={createTitle} onChange={e => setCreateTitle(e.target.value)} placeholder={rtl ? 'למשל: בדיקת רכב חדש ינואר 2026' : 'e.g. Fleet check Jan 2026'} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.textPrimary, background: '#f8fafc', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6, display: 'block' }}>{rtl ? 'תאריך תפוגה (אופציונלי)' : 'Expiry date (optional)'}</label>
                <input type="date" value={createExpiry} onChange={e => setCreateExpiry(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.textPrimary, background: '#f8fafc', boxSizing: 'border-box' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 9, border: `2px solid ${createSingle ? '#f59e0b' : C.border}`, cursor: 'pointer', background: createSingle ? '#fef3c708' : C.bg, transition: 'all 0.15s' }}>
                <input type="checkbox" checked={createSingle} onChange={e => setCreateSingle(e.target.checked)} style={{ accentColor: '#f59e0b', width: 16, height: 16 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary }}>{rtl ? '🔒 טופס חד-פעמי' : '🔒 Single-use form'}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{rtl ? 'לא ניתן למלא יותר מפעם אחת' : 'Cannot be filled more than once'}</div>
                </div>
              </label>
              <button onClick={createLink} disabled={creating} style={{ ...btnPrimary, padding: '12px', fontSize: 14, opacity: creating ? 0.7 : 1, cursor: creating ? 'not-allowed' : 'pointer' }}>
                {creating ? '…' : (rtl ? '🔗 צור קישור' : '🔗 Create Link')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* License Agreement Section */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.textPrimary }}>📄 {rtl ? 'הסכם רישיון' : 'License Agreement'}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{rtl ? 'שלח ללקוח לחתימה דיגיטלית על הסכם שימוש במערכת' : 'Send to client for digital signature on the usage agreement'}</div>
          </div>
          <button onClick={openLicenseFormLink} disabled={licenseBusy} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: licenseBusy ? 'not-allowed' : 'pointer', opacity: licenseBusy ? 0.6 : 1 }}>
            {licenseBusy ? '…' : (rtl ? '📤 שלח הסכם' : '📤 Send Agreement')}
          </button>
        </div>

        {/* Share link card */}
        {licenseLink && (
          <div style={{ background: C.surface, borderRadius: 12, padding: 16, border: `1px solid ${C.primary}30`, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
              {rtl ? 'קישור לחתימה על ההסכם — שלח ללקוח:' : 'Signing link — send to client:'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input readOnly value={formUrl(licenseLink.token)} onClick={e => e.target.select()}
                style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 10px', fontSize: 12, color: C.textSecondary, direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', outline: 'none' }} />
              <button onClick={() => { navigator.clipboard.writeText(formUrl(licenseLink.token)); setLicenseCopied(true); setTimeout(() => setLicenseCopied(false), 2000) }}
                style={{ ...btnPrimary, padding: '7px 14px', fontSize: 12, background: licenseCopied ? C.success : C.primary, flexShrink: 0 }}>
                {licenseCopied ? '✓ ' + (rtl ? 'הועתק' : 'Copied') : (rtl ? '📋 העתק' : '📋 Copy')}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent((rtl ? 'שלום,\nמצורף קישור לחתימה על הסכם רישיון שימוש במערכת Celox AI Fleet Manager:\n' : 'Hello,\nHere is a link to sign the Celox AI Fleet Manager license agreement:\n') + formUrl(licenseLink.token))}`, '_blank')}
                style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                📲 WhatsApp
              </button>
              <button onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(rtl ? 'הסכם רישיון — Celox AI Fleet Manager' : 'License Agreement — Celox AI Fleet Manager')}&body=${encodeURIComponent((rtl ? 'שלום,\nמצורף קישור לחתימה על הסכם רישיון:\n' : 'Hello,\nHere is the signing link:\n') + formUrl(licenseLink.token))}` }}
                style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                📧 {rtl ? 'אימייל' : 'Email'}
              </button>
              <button onClick={newLicenseFormLink} disabled={licenseBusy} style={{ ...btnGhost, fontSize: 12, opacity: licenseBusy ? 0.5 : 1 }}>
                {rtl ? '+ קישור חדש' : '+ New link'}
              </button>
            </div>
          </div>
        )}

        {/* Signed agreements list */}
        {!licenseSigsLoad && licenseSignatures.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              {rtl ? `${licenseSignatures.length} הסכמים חתומים` : `${licenseSignatures.length} signed agreement${licenseSignatures.length !== 1 ? 's' : ''}`}
            </div>
            {licenseSignatures.map(sig => (
              <div key={sig.id} style={{ background: C.surface, borderRadius: 10, padding: '12px 16px', marginBottom: 8, border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sig.data?.company_name || sig.submitter_name || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    👤 {sig.data?.signatory_name || '—'} &nbsp;·&nbsp; {sig.data?.sign_date || fmtDate(sig.created_at?.slice(0, 10))}
                    {sig.data?.id_number && ` · ח.פ/ת.ז: ${sig.data.id_number}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, background: C.success + '15', color: C.success, borderRadius: 5, padding: '2px 8px', fontWeight: 700 }}>✓ {rtl ? 'חתום' : 'Signed'}</span>
                  <button onClick={() => setViewLicenseSub(sig)} style={{ ...btnGhost, padding: '5px 10px', fontSize: 12 }}>
                    {rtl ? 'צפה' : 'View'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {!licenseSigsLoad && licenseSignatures.length === 0 && !licenseLink && (
          <div style={{ color: C.textMuted, fontSize: 13, padding: '8px 0' }}>
            {rtl ? 'לחץ על "שלח הסכם" ליצירת קישור חתימה.' : 'Click "Send Agreement" to generate a signing link.'}
          </div>
        )}
        {!licenseSigsLoad && licenseSignatures.length === 0 && licenseLink && (
          <div style={{ color: C.textMuted, fontSize: 13, padding: '8px 0' }}>
            {rtl ? 'לא נחתמו הסכמים עדיין.' : 'No signed agreements yet.'}
          </div>
        )}
      </div>

      {/* View signed agreement modal */}
      {viewLicenseSub && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: C.surface, borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto', direction: rtl ? 'rtl' : 'ltr', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.textPrimary }}>📄 {rtl ? 'הסכם חתום' : 'Signed Agreement'}</div>
              <button onClick={() => setViewLicenseSub(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.textMuted }}>×</button>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['🏢', rtl ? 'שם חברה / עסק' : 'Company Name', viewLicenseSub.data?.company_name],
                ['👤', rtl ? 'מורשה חתימה' : 'Signatory', viewLicenseSub.data?.signatory_name],
                ['💼', rtl ? 'תפקיד' : 'Role', viewLicenseSub.data?.signatory_role],
                ['🪪', rtl ? 'ח.פ. / ת.ז.' : 'ID / Reg No.', viewLicenseSub.data?.id_number],
                ['📞', rtl ? 'טלפון' : 'Phone', viewLicenseSub.data?.phone],
                ['📧', rtl ? 'אימייל' : 'Email', viewLicenseSub.data?.email],
                ['📅', rtl ? 'תאריך חתימה' : 'Sign Date', viewLicenseSub.data?.sign_date],
              ].filter(([, , v]) => v).map(([icon, label, val]) => (
                <div key={label} style={{ background: C.bg, borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{val}</div>
                  </div>
                </div>
              ))}
              {viewLicenseSub.data?.signature && (
                <div style={{ background: C.bg, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{rtl ? 'חתימה דיגיטלית' : 'Digital Signature'}</div>
                  <img src={viewLicenseSub.data.signature} alt="signature" style={{ maxWidth: '100%', border: `1px solid ${C.border}`, borderRadius: 6, background: '#fff' }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <span style={{ flex: 1, fontSize: 11, color: C.textMuted }}>
                  {rtl ? `נחתם: ${fmtDate(viewLicenseSub.created_at?.slice(0,10))}` : `Signed: ${fmtDate(viewLicenseSub.created_at?.slice(0,10))}`}
                </span>
                <button onClick={() => setViewLicenseSub(null)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.textSecondary }}>
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accident Reports Section */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.textPrimary }}>🚨 {t.accidentReports}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{rtl ? 'תיעוד תאונות ואירועי דרכים' : 'Document road accidents and incidents'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={openAccFormShare} disabled={accFormShareBusy} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: accFormShareBusy ? 0.6 : 1 }}>
              {accFormShareBusy ? '…' : (rtl ? '📤 שלח טופס לנהג' : '📤 Send Form to Driver')}
            </button>
            <button onClick={() => setShowAccidentForm(true)} style={{ background: C.danger, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {t.newAccidentReport}
            </button>
          </div>
        </div>

        {/* Accident form share modal */}
        {accFormShare && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: C.surface, borderRadius: 16, width: '100%', maxWidth: 380, direction: rtl ? 'rtl' : 'ltr', overflow: 'hidden' }}>
              <div style={{ background: C.navBg, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f8fafc', fontWeight: 800, fontSize: 15 }}>📤 {rtl ? 'שלח טופס דוח תאונה' : 'Share Accident Report Form'}</span>
                <button onClick={() => setAccFormShare(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: '#f8fafc', fontSize: 16 }}>✕</button>
              </div>
              <div style={{ padding: '20px 18px' }}>
                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16, textAlign: 'center' }}>
                  {rtl ? 'שלח את הקישור לנהג — הוא יוכל למלא את הדוח מהטלפון שלו באתר התאונה' : 'Share this link with the driver to fill out the report from their phone at the scene'}
                </div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(formUrl(accFormShare.token))}`} alt="QR" style={{ borderRadius: 10, border: `1px solid ${C.border}` }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input readOnly value={formUrl(accFormShare.token)} onClick={e => e.target.select()}
                    style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '8px 10px', fontSize: 12, color: C.textSecondary, direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis' }} />
                  <button onClick={() => copyLink(accFormShare.token)} style={{ ...btnPrimary, padding: '8px 14px', fontSize: 12, background: copied === accFormShare.token ? C.success : C.primary, flexShrink: 0 }}>
                    {copied === accFormShare.token ? '✓' : (rtl ? 'העתק' : 'Copy')}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => sendWhatsApp(accFormShare)} style={{ flex: 1, background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    📲 WhatsApp
                  </button>
                  <button onClick={() => sendFormEmail(accFormShare)} style={{ flex: 1, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    📧 {rtl ? 'אימייל' : 'Email'}
                  </button>
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: C.textMuted, textAlign: 'center' }}>
                  {rtl ? 'הקישור קבוע — ניתן לשיתוף כמה פעמים שתרצה' : 'Permanent link — share as many times as needed'}
                </div>
              </div>
            </div>
          </div>
        )}

        {accSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: C.success + '15', border: `1px solid ${C.success}40`, borderRadius: 8, marginBottom: 12, fontSize: 13, color: C.successText, fontWeight: 600 }}>
            ✓ {t.reportSubmitted}
            <button onClick={() => setAccSuccess(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.successText, marginInlineStart: 'auto', fontSize: 16 }}>×</button>
          </div>
        )}

        {/* QR modal for accident reports */}
        {accQrReport && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, textAlign: 'center', maxWidth: 300, width: '100%' }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>🚨 {rtl ? 'QR לדוח תאונה' : 'Accident Report QR'}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>{rtl ? 'סרוק לקבלת פרטי הדוח' : 'Scan to get report details'}</div>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(accidentQrData(accQrReport))}`}
                alt="QR" style={{ width: 200, height: 200, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <button onClick={() => setAccQrReport(null)} style={{ display: 'block', width: '100%', marginTop: 16, background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                {rtl ? 'סגור' : 'Close'}
              </button>
            </div>
          </div>
        )}

        {/* View accident detail modal — reads live data so status stays in sync */}
        {viewAccidentReport && (() => {
          const rep = accidentReports.find(r => r.id === viewAccidentReport.id) || viewAccidentReport
          const myCar = cars.find(c => String(c.id) === String(rep.my_car_id))
          const files = rep.file_paths || []
          const statusColor = rep.status === 'on_hold' ? C.warning : rep.status === 'closed' ? C.textMuted : C.success
          const statusLabel = rep.status === 'on_hold' ? t.accidentOnHold : rep.status === 'closed' ? t.accidentClosed : t.accidentOpen
          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div style={{ background: C.surface, borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', direction: rtl ? 'rtl' : 'ltr', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
                <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: C.textPrimary }}>🚨 {t.accidentFormTitle}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{rep.incident_date ? fmtDate(rep.incident_date) : fmtDate(rep.created_at?.slice(0, 10))}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: statusColor + '18', color: statusColor, borderRadius: 5, padding: '3px 9px' }}>{statusLabel}</span>
                    <button onClick={() => setViewAccidentReport(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.textMuted, lineHeight: 1, padding: 4 }}>×</button>
                  </div>
                </div>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* My car */}
                  <div style={{ background: C.bg, borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{t.myCar}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary }}>
                      {myCar ? `${myCar.plate}${myCar.make ? ` · ${myCar.make}` : ''}${myCar.model ? ` ${myCar.model}` : ''}` : '—'}
                    </div>
                  </div>
                  {/* Police / Ambulance indicators */}
                  {(rep.police_report != null || rep.called_ambulance != null) && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {rep.police_report != null && (
                        <div style={{ flex: 1, background: rep.police_report ? C.success + '15' : C.danger + '10', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 20, marginBottom: 4 }}>👮</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{rtl ? 'דוח משטרתי' : 'Police Report'}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: rep.police_report ? C.success : C.danger }}>{rep.police_report ? (rtl ? 'הוגש' : 'Filed') : (rtl ? 'לא הוגש' : 'Not filed')}</div>
                        </div>
                      )}
                      {rep.called_ambulance != null && (
                        <div style={{ flex: 1, background: rep.called_ambulance ? C.success + '15' : C.danger + '10', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 20, marginBottom: 4 }}>🚑</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{rtl ? 'אמבולנס' : 'Ambulance'}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: rep.called_ambulance ? C.success : C.danger }}>{rep.called_ambulance ? (rtl ? 'הוזמן' : 'Called') : (rtl ? 'לא הוזמן' : 'Not called')}</div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Other driver */}
                  {(rep.other_plate || rep.other_driver_name) && (
                    <div style={{ background: C.bg, borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{t.otherDriverInfo}</div>
                      {rep.other_plate && <div style={{ fontSize: 13, color: C.textPrimary, marginBottom: 2 }}>🚘 {rep.other_plate}{rep.other_make ? ` · ${rep.other_make}` : ''}{rep.other_model ? ` ${rep.other_model}` : ''}</div>}
                      {rep.other_driver_name && <div style={{ fontSize: 13, color: C.textPrimary, marginBottom: 2 }}>👤 {rep.other_driver_name}</div>}
                      {rep.other_driver_phone && <div style={{ fontSize: 13, color: C.textPrimary }}>📞 {rep.other_driver_phone}</div>}
                    </div>
                  )}
                  {/* Description */}
                  {rep.description && (
                    <div style={{ background: C.bg, borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{t.incidentDesc}</div>
                      <div style={{ fontSize: 13, color: C.textPrimary, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{rep.description}</div>
                    </div>
                  )}
                  {/* Files */}
                  {files.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{t.accidentFiles}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {files.map((f, i) => (
                          <button key={i} onClick={() => openAccidentFile(f)} style={{ background: C.primary + '15', color: C.primary, border: `1px solid ${C.primary}30`, borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            📎 {f.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={() => setViewAccidentReport(null)} style={{ marginTop: 4, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.textSecondary }}>
                    {t.cancel}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {accLoading ? (
          <div style={{ textAlign: 'center', padding: 20, color: C.textMuted, fontSize: 13 }}>{t.loadingShort}</div>
        ) : accidentReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 20px', color: C.textMuted, background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚗</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{t.noAccidentReports}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {accidentReports.map(rep => {
              const myCar = cars.find(c => String(c.id) === String(rep.my_car_id))
              const files = rep.file_paths || []
              const isHold = rep.status === 'on_hold'
              const statusColor = isHold ? C.warning : C.success
              const statusLabel = isHold ? t.accidentOnHold : t.accidentOpen
              return (
                <div key={rep.id} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', opacity: isHold ? 0.75 : 1 }}>
                  {/* Card header */}
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>🚨</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary }}>
                          {myCar ? `${myCar.plate}${myCar.make ? ` · ${myCar.make}` : ''}${myCar.model ? ` ${myCar.model}` : ''}` : '—'}
                        </span>
                        {rep.other_plate && (
                          <span style={{ fontSize: 12, color: C.textSecondary }}>⟷ {rep.other_plate}{rep.other_make ? ` ${rep.other_make}` : ''}</span>
                        )}
                        <span style={{ fontSize: 10, fontWeight: 700, background: statusColor + '18', color: statusColor, borderRadius: 4, padding: '2px 7px' }}>{statusLabel}</span>
                        <span style={{ marginInlineStart: 'auto', fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap' }}>
                          {rep.incident_date ? fmtDate(rep.incident_date) : fmtDate(rep.created_at?.slice(0, 10))}
                        </span>
                      </div>
                      {rep.other_driver_name && (
                        <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 2 }}>
                          👤 {rep.other_driver_name}{rep.other_driver_phone ? ` · ${rep.other_driver_phone}` : ''}
                        </div>
                      )}
                      {rep.description && (
                        <div style={{ fontSize: 12, color: C.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rep.description}
                        </div>
                      )}
                      {files.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
                          {files.map((f, i) => (
                            <button key={i} onClick={() => openAccidentFile(f)} style={{ background: C.primary + '15', color: C.primary, border: `1px solid ${C.primary}30`, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                              📎 {f.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Action bar */}
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: '8px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => setViewAccidentReport(rep)} style={{ background: C.primary + '08', color: C.primary, border: `1px solid ${C.primary}30`, borderRadius: 6, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {t.viewDetails}
                    </button>
                    <button onClick={() => sendAccidentWhatsApp(rep)} style={{ background: '#25d36608', color: '#25d366', border: '1px solid #25d36640', borderRadius: 6, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      📲 WhatsApp
                    </button>
                    <button onClick={() => sendAccidentEmail(rep)} style={{ background: '#6366f108', color: '#6366f1', border: '1px solid #6366f140', borderRadius: 6, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {t.sendEmailReport}
                    </button>
                    <button onClick={() => setAccQrReport(rep)} style={{ background: '#f59e0b08', color: '#f59e0b', border: '1px solid #f59e0b40', borderRadius: 6, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      ◼ QR
                    </button>
                    <button onClick={() => toggleAccidentHold(rep)} style={{ background: 'transparent', color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {isHold ? t.resumeReport : t.holdReport}
                    </button>
                    <button onClick={() => deleteAccident(rep.id)} style={{ background: C.danger + '08', color: C.danger, border: `1px solid ${C.danger}30`, borderRadius: 6, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      🗑 {t.delete}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {showAccidentForm && (
          <AccidentFormModal
            companyId={companyId}
            cars={cars}
            session={session}
            rtl={rtl}
            t={t}
            isMobile={isMobile}
            onClose={() => setShowAccidentForm(false)}
            onSaved={() => { setShowAccidentForm(false); setAccSuccess(true); loadAccidents() }}
          />
        )}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.textPrimary }}>📋 {rtl ? 'טפסים' : 'Forms'}</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>{rtl ? 'שלח קישורים לנהגים או לצוות למילוי טפסים' : 'Send links for drivers or staff to fill out forms'}</div>
        </div>
        <button onClick={() => setShowCreate(true)} style={btnPrimary}>
          {rtl ? '+ קישור חדש' : '+ New Link'}
        </button>
      </div>

      {/* Links list */}
      {loading
        ? <div style={{ textAlign: 'center', padding: 40, color: C.textMuted }}>טוען...</div>
        : links.length === 0
          ? <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{rtl ? 'אין קישורי טפסים עדיין' : 'No form links yet'}</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>{rtl ? 'לחץ על "+ קישור חדש" ליצירת הראשון' : 'Click "+ New Link" to create the first one'}</div>
            </div>
          : links.map(link => {
              const meta = FORM_TYPES.find(f => f.id === link.type)
              const expired = link.expires_at && new Date(link.expires_at) < new Date()
              const linkedCar    = link.car_id    ? (cars    || []).find(c => String(c.id) === String(link.car_id)) : null
              const linkedDriver = link.driver_id ? (drivers || []).find(d => String(d.id) === String(link.driver_id)) : null
              const subCount = subCounts[link.id] || 0
              const notSubmitted = link.driver_id && subCount === 0
              return (
                <div key={link.id} style={{ ...card, opacity: !link.is_active ? 0.6 : 1 }}>
                  <div style={cardHeader}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{meta?.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {link.title}
                        {link.single_use && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', borderRadius: 5, padding: '1px 6px', fontWeight: 700, flexShrink: 0 }}>🔒 {rtl ? 'חד-פעמי' : 'single-use'}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: C.textMuted, display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2, alignItems: 'center' }}>
                        <span>{rtl ? (meta?.label) : (meta?.labelEn)}</span>
                        {linkedDriver && <span>· 👤 {linkedDriver.name}</span>}
                        {linkedCar    && <span>· 🚗 {linkedCar.plate} {linkedCar.make}</span>}
                        {expired && <span style={{ color: C.danger, fontWeight: 700 }}>· {rtl ? 'פג תוקף' : 'Expired'}</span>}
                        {link.expires_at && !expired && <span>· {rtl ? 'עד' : 'until'} {new Date(link.expires_at).toLocaleDateString('he-IL')}</span>}
                        {subCount > 0 && <span style={{ background: C.primary + '18', color: C.primary, borderRadius: 5, padding: '1px 7px', fontWeight: 700, fontSize: 11 }}>{subCount} {rtl ? 'תגובות' : 'submissions'}</span>}
                        {notSubmitted && <span style={{ background: '#fee2e2', color: C.danger, borderRadius: 5, padding: '1px 7px', fontWeight: 700, fontSize: 11 }}>⚠ {rtl ? 'לא הוגש' : 'not submitted'}</span>}
                      </div>
                    </div>
                  </div>
                  {/* URL bar */}
                  <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input readOnly value={formUrl(link.token)} onClick={e => e.target.select()}
                      style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 10px', fontSize: 12, color: C.textSecondary, direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis' }} />
                    <button onClick={() => copyLink(link.token)} style={{ ...btnPrimary, padding: '7px 14px', fontSize: 12, background: copied === link.token ? C.success : C.primary, flexShrink: 0 }}>
                      {copied === link.token ? '✓ ' + (rtl ? 'הועתק' : 'Copied') : (rtl ? '📋 העתק' : '📋 Copy')}
                    </button>
                  </div>
                  {/* Actions */}
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => sendWhatsApp(link)} style={{ ...btnGhost, color: '#25d366', borderColor: '#25d36640', background: '#25d36608', fontWeight: 700 }}>
                      📲 {rtl ? 'שלח ב-WhatsApp' : 'Send via WhatsApp'}
                    </button>
                    <button onClick={() => sendFormEmail(link)} style={{ ...btnGhost, color: '#6366f1', borderColor: '#6366f140', background: '#6366f108', fontWeight: 700 }}>
                      📧 {rtl ? 'שלח באימייל' : 'Send via Email'}
                    </button>
                    <button onClick={() => openSubs(link)} style={{ ...btnGhost, color: C.primary, borderColor: C.primary + '40', background: C.primary + '08' }}>
                      {rtl ? '👁 תגובות' : '👁 Submissions'}{subCount > 0 ? ` (${subCount})` : ''}
                    </button>
                    <button onClick={() => setShowQr(link)} style={{ ...btnGhost, color: '#6366f1', borderColor: '#6366f140', background: '#6366f108' }}>
                      ◼ {rtl ? 'QR קוד' : 'QR Code'}
                    </button>
                    <button onClick={() => toggleActive(link)} style={btnGhost}>
                      {link.is_active ? (rtl ? '⏸ השבת' : '⏸ Disable') : (rtl ? '▶ הפעל' : '▶ Enable')}
                    </button>
                    <button onClick={() => deleteLink(link)} style={{ ...btnGhost, color: C.danger, borderColor: C.danger + '40' }}>
                      {rtl ? '🗑 מחק' : '🗑 Delete'}
                    </button>
                  </div>
                </div>
              )
            })
      }
    </div>
  )
}

// ── Budget Settings ──────────────────────────────────────────────────────────
function EmailNotifSettings({ companyId, company, t, rtl }) {
  const [alertsOn,    setAlertsOn]    = useState(company?.email_alerts_enabled !== false)
  const [lang,        setLang]        = useState(company?.email_lang ?? 'he')
  const [saved,       setSaved]       = useState(false)
  const [sending,     setSending]     = useState(false)
  const [sendResult,  setSendResult]  = useState(null) // { ok, alerts_sent, reason }
  const card = { background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }

  async function save() {
    await supabase.from('companies').update({ email_alerts_enabled: alertsOn, email_lang: lang }).eq('id', companyId)
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function sendNow() {
    setSending(true); setSendResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('trigger-alerts', { body: {} })
      if (error) { setSendResult({ ok: false, reason: 'error' }); return }
      setSendResult(data)
    } finally {
      setSending(false)
      setTimeout(() => setSendResult(null), 6000)
    }
  }

  const sendLabel = () => {
    if (sending) return rtl ? '⏳ שולח...' : '⏳ Sending...'
    if (sendResult?.ok === false) return rtl ? '✗ שגיאה' : '✗ Error'
    if (sendResult?.ok && sendResult.alerts_sent === 0) return rtl ? '✓ אין התראות פתוחות' : '✓ No open alerts'
    if (sendResult?.ok) return rtl ? `✓ נשלח (${sendResult.alerts_sent})` : `✓ Sent (${sendResult.alerts_sent})`
    return rtl ? '📤 שלח עכשיו' : '📤 Send Now'
  }

  const sendBg = sendResult?.ok === false ? C.danger : sendResult?.ok ? C.success : '#475569'

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
        📧 {rtl ? 'הגדרות התראות אימייל' : 'Email Notifications'}
      </h3>

      {/* Toggle */}
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{rtl ? 'שלח התראות יומיות' : 'Send daily alerts'}</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{rtl ? 'תחזוקה, מסמכים ורישיונות שפג תוקפם' : 'Maintenance, documents and expiring licenses'}</div>
        </div>
        <div
          onClick={() => setAlertsOn(p => !p)}
          style={{ width: 44, height: 24, borderRadius: 12, background: alertsOn ? C.primary : C.border, position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}>
          <div style={{ position: 'absolute', top: 3, left: alertsOn ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
        </div>
      </label>

      {/* Language */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
          {rtl ? 'שפת האימייל' : 'Email language'}
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ val: 'he', label: '🇮🇱 עברית' }, { val: 'en', label: '🇬🇧 English' }].map(opt => (
            <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `2px solid ${lang === opt.val ? C.primary : C.border}`, cursor: 'pointer', background: lang === opt.val ? C.primary + '08' : '#f8fafc', fontSize: 13, fontWeight: 600 }}>
              <input type="radio" name="emailLang" value={opt.val} checked={lang === opt.val} onChange={() => setLang(opt.val)} style={{ accentColor: C.primary }} />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={save} style={{ background: saved ? C.success : C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
          {saved ? (rtl ? '✓ נשמר' : '✓ Saved') : (rtl ? 'שמור' : 'Save')}
        </button>
        <button onClick={sendNow} disabled={sending} style={{ background: sending || sendResult ? sendBg : '#475569', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', transition: 'background 0.2s', opacity: sending ? 0.8 : 1 }}>
          {sendLabel()}
        </button>
      </div>
      {sendResult?.ok === false && (
        <div style={{ marginTop: 8, fontSize: 12, color: C.danger }}>
          {rtl ? 'שגיאה בשליחה, נסה שוב' : 'Failed to send, please try again'}
        </div>
      )}
    </div>
  )
}

function BudgetSettings({ companyId, t, rtl }) {
  const [budget, setBudget] = useState('')
  const [saved,  setSaved]  = useState(false)
  const [loaded, setLoaded] = useState(false)
  const card = { background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }

  useEffect(() => {
    supabase.from('companies').select('monthly_budget').eq('id', companyId).single()
      .then(({ data }) => { setBudget(data?.monthly_budget ?? ''); setLoaded(true) })
  }, [companyId])

  async function save() {
    await supabase.from('companies').update({ monthly_budget: budget ? parseFloat(budget) : null }).eq('id', companyId)
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  if (!loaded) return null
  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: C.textPrimary }}>💰 {rtl ? 'תקציב חודשי' : 'Monthly Budget'}</h3>
      <p style={{ margin: '0 0 14px', fontSize: 12, color: C.textSecondary }}>{rtl ? 'הגדר תקציב חודשי כולל. יוצג כסרגל בלוח הבקרה.' : 'Set a monthly spend cap. Shown as a progress bar on the dashboard.'}</p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.textSecondary }}>₪</span>
        <input type="number" value={budget} onChange={e => setBudget(e.target.value)} min={0} placeholder={rtl ? 'ללא מגבלה' : 'No limit'}
          style={{ flex: 1, padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.textPrimary, background: '#f8fafc' }} />
        <button onClick={save} style={{ background: saved ? C.success : C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
          {saved ? (rtl ? '✓ נשמר' : '✓ Saved') : (rtl ? 'שמור' : 'Save')}
        </button>
      </div>
    </div>
  )
}

// ── Settings Tab ────────────────────────────────────────────────────────────
function SettingsTab({ profile, companyId, session, isMaster, onSelectCompany, t, rtl, onCustomListsChange, onPrivacy, onTerms }) {
  const company  = profile?.companies
  const isAdmin  = profile?.role === 'admin'
  const isMobile = useIsMobile()

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
  const [editingAccess, setEditingAccess] = useState(null) // company id being edited
  const [accessUntil, setAccessUntil]     = useState('')
  // Master: send license agreement per company
  const [licenseCompany, setLicenseCompany] = useState(null)
  const [licenseLink,    setLicenseLink]    = useState(null)
  const [licenseBusy,    setLicenseBusy]    = useState(false)
  const [licenseCopied,  setLicenseCopied]  = useState(false)

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
      console.error('[DB]', error)
      setInviteErr(error.code === '23505' ? t.alreadyInvited : (rtl ? 'שגיאה בשמירה. נסה שוב.' : 'Save failed. Please try again.'))
    } else {
      setInviteMsg(t.inviteSent(email))
      setInviteEmail('')
      // Send email notification to invitee
      supabase.functions.invoke('send-notification', {
        body: { type: 'invite_sent', payload: { email, company_id: companyId, invited_by_email: session.user.email } },
      }).catch(() => {})
    }
    setInviting(false)
  }

  async function createCompany(e) {
    e.preventDefault()
    setMasterErr(''); setMasterMsg(''); setCreating(true)
    const name = newName.trim()
    // Generate random 12-char invite code using crypto for better randomness
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (0/O, 1/I)
    const arr = crypto.getRandomValues(new Uint8Array(12))
    const code = Array.from(arr).map(b => chars[b % chars.length]).join('')
    const { data, error } = await supabase.from('companies').insert({
      name, invite_code: code, is_active: true,
    }).select().single()
    if (error) {
      console.error('[DB]', error)
      setMasterErr(friendlyDbError(error, rtl))
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
        max_cars:  limitCars  === '' ? null : parseInt(limitCars, 10),
        max_users: limitUsers === '' ? null : parseInt(limitUsers, 10),
      })
      .eq('id', co.id)
      .select().single()
    if (data) setCompanies(p => p.map(c => c.id === data.id ? data : c))
    setEditingLimits(null)
  }

  function startEditAccess(co) {
    setEditingAccess(co.id)
    setAccessUntil(co.access_until ?? '')
  }

  async function saveAccessUntil(co) {
    const { data } = await supabase.from('companies')
      .update({ access_until: accessUntil || null })
      .eq('id', co.id)
      .select().single()
    if (data) setCompanies(p => p.map(c => c.id === data.id ? data : c))
    setEditingAccess(null)
  }

  async function openLicenseLink(co) {
    if (licenseCompany === co.id) { setLicenseCompany(null); setLicenseLink(null); return }
    setLicenseCompany(co.id)
    setLicenseLink(null)
    setLicenseBusy(true)
    const { data: existing } = await supabase.from('form_links')
      .select('*').eq('company_id', co.id).eq('type', 'license_agreement')
      .eq('is_active', true).is('expires_at', null).order('created_at', { ascending: false }).limit(1)
    if (existing?.length) { setLicenseLink(existing[0]); setLicenseBusy(false); return }
    const { data: newLink } = await supabase.from('form_links').insert({
      company_id: co.id,
      type: 'license_agreement',
      title: `הסכם רישיון — ${co.name}`,
      created_by: session.user.id,
      is_active: true,
      single_use: false,
    }).select().single()
    if (newLink) setLicenseLink(newLink)
    setLicenseBusy(false)
  }

  async function refreshLicenseLink(co) {
    setLicenseLink(null)
    setLicenseBusy(true)
    const { data: newLink } = await supabase.from('form_links').insert({
      company_id: co.id,
      type: 'license_agreement',
      title: `הסכם רישיון — ${co.name}`,
      created_by: session.user.id,
      is_active: true,
      single_use: false,
    }).select().single()
    if (newLink) setLicenseLink(newLink)
    setLicenseBusy(false)
  }

  const [exporting, setExporting] = useState(false)

  async function exportAllData() {
    setExporting(true)
    const [carsRes, driversRes, costsRes, maintRes, docsRes, logsRes] = await Promise.all([
      supabase.from('cars').select('*').eq('company_id', companyId),
      supabase.from('drivers').select('*').eq('company_id', companyId),
      supabase.from('costs').select('*').eq('company_id', companyId),
      supabase.from('maintenance').select('*').eq('company_id', companyId),
      supabase.from('documents').select('id, name, entity_type, entity_id, expires_at, created_at').eq('company_id', companyId),
      supabase.from('activity_log').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(1000),
    ])

    const wb = new ExcelJS.Workbook()
    xlsxAddSheet(wb, 'Cars',         carsRes.data   || [])
    xlsxAddSheet(wb, 'Drivers',      driversRes.data || [])
    xlsxAddSheet(wb, 'Costs',        costsRes.data   || [])
    xlsxAddSheet(wb, 'Maintenance',  maintRes.data   || [])
    xlsxAddSheet(wb, 'Documents',    docsRes.data    || [])
    xlsxAddSheet(wb, 'Activity Log', logsRes.data    || [])

    const date = new Date().toISOString().slice(0, 10)
    await xlsxDownload(wb, `fleet-export-${date}.xlsx`)
    setExporting(false)
  }

  const row   = { padding: '14px 0', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }
  const lbl   = { fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }
  const card  = { background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }
  const inp   = { width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: C.textPrimary, background: C.bg }
  const msgOk = { color: C.success, fontSize: 13, background: C.success + '10', padding: '8px 12px', borderRadius: 6, border: `1px solid ${C.success}40` }
  const msgEr = { color: C.danger,  fontSize: 13, background: C.danger  + '10', padding: '8px 12px', borderRadius: 6, border: `1px solid ${C.danger}40`  }

  // ── MASTER VIEW ──────────────────────────────────────────────────────────
  if (isMaster) {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 24 }}>
        <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>

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
              <span style={{ marginLeft: 8, background: C.bg, color: C.textSecondary, borderRadius: 10, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>
                {companies.length}
              </span>
            </h3>
            {loading ? (
              <p style={{ color: C.textSecondary, fontSize: 14, paddingTop: 16 }}>{t.loadingShort}</p>
            ) : companies.length === 0 ? (
              <p style={{ color: C.textSecondary, fontSize: 14, paddingTop: 16 }}>{t.noCompanies}</p>
            ) : companies.map(co => (
              <div key={co.id} style={{ ...row, flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                {/* Row top: name + buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {co.name}
                      <span style={{
                        fontSize: 11, borderRadius: 4, padding: '2px 7px', fontWeight: 700,
                        background: co.is_active ? C.success + '15' : C.danger + '15',
                        color: co.is_active ? C.success : C.danger,
                      }}>
                        {co.is_active ? t.activeStatus : t.closedStatus}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
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
                      color: C.textSecondary, borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>⚙️</button>
                    <button
                      onClick={() => openLicenseLink(co)}
                      title={rtl ? 'שלח הסכם רישיון' : 'Send License Agreement'}
                      style={{
                        background: licenseCompany === co.id ? C.primary + '18' : 'transparent',
                        border: `1px solid ${C.primary}50`,
                        color: C.primary, borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}
                    >📄</button>
                    <button onClick={() => toggleActive(co)} style={{
                      background: 'transparent',
                      border: `1px solid ${co.is_active ? C.danger + '40' : C.success + '40'}`,
                      color: co.is_active ? C.danger : C.success,
                      borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>{co.is_active ? t.closeCompany : t.reopenCompany}</button>
                  </div>
                </div>
                {/* Limits row — current values always visible */}
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.textSecondary, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>🚗 {t.maxCars}: <strong style={{ color: co.max_cars != null ? C.textPrimary : C.textSecondary }}>{co.max_cars ?? '∞'}</strong></span>
                  <span>👤 {t.maxUsers}: <strong style={{ color: co.max_users != null ? C.textPrimary : C.textSecondary }}>{co.max_users ?? '∞'}</strong></span>
                  {/* Access expiry */}
                  {(() => {
                    if (!co.access_until) return (
                      <span style={{ cursor: 'pointer', color: C.textSecondary }} onClick={() => startEditAccess(co)}>
                        📅 {rtl ? 'גישה: ללא הגבלה' : 'Access: unlimited'}
                      </span>
                    )
                    const daysLeft = Math.ceil((new Date(co.access_until) - new Date()) / 86400000)
                    const expired  = daysLeft < 0
                    const soon     = daysLeft >= 0 && daysLeft <= 14
                    return (
                      <span
                        onClick={() => startEditAccess(co)}
                        style={{
                          cursor: 'pointer', borderRadius: 4, padding: '2px 7px', fontWeight: 700,
                          background: expired ? C.danger + '15' : soon ? C.warning + '15' : C.success + '15',
                          color: expired ? C.danger : soon ? C.warning : C.success,
                        }}
                      >
                        📅 {expired
                          ? (rtl ? `פג תוקף ${co.access_until}` : `Expired ${co.access_until}`)
                          : soon
                            ? (rtl ? `פוקע בעוד ${daysLeft} ימים` : `Expires in ${daysLeft}d`)
                            : (rtl ? `עד ${co.access_until}` : `Until ${co.access_until}`)
                        }
                      </span>
                    )
                  })()}
                </div>
                {/* Inline access-until editor */}
                {editingAccess === co.id && (
                  <div style={{ background: C.bg, borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 12, color: C.textSecondary, whiteSpace: 'nowrap' }}>
                      📅 {rtl ? 'גישה בתוקף עד' : 'Access until'}
                    </label>
                    <input
                      type="date"
                      value={accessUntil}
                      onChange={e => setAccessUntil(e.target.value)}
                      style={{ padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: 'none' }}
                    />
                    <button onClick={() => saveAccessUntil(co)} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t.save}</button>
                    <button onClick={() => { setAccessUntil(''); saveAccessUntil({ ...co, access_until: null }) }} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
                      {rtl ? 'ללא הגבלה' : 'Unlimited'}
                    </button>
                    <button onClick={() => setEditingAccess(null)} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>{t.cancel}</button>
                  </div>
                )}
                {/* Inline license agreement panel */}
                {licenseCompany === co.id && (
                  <div style={{ background: C.bg, borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>
                      📄 {rtl ? 'הסכם רישיון' : 'License Agreement'} — {co.name}
                    </div>
                    {licenseBusy ? (
                      <div style={{ fontSize: 12, color: C.textSecondary }}>…{rtl ? 'יוצר קישור' : 'Generating'}</div>
                    ) : licenseLink ? (
                      <>
                        <div style={{ fontSize: 12, color: C.textSecondary }}>
                          {rtl ? 'שלח ללקוח לחתימה על ההסכם:' : 'Send to client to sign the agreement:'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <input
                            readOnly
                            value={`${window.location.origin}/form/${licenseLink.token}`}
                            onClick={e => e.target.select()}
                            style={{ flex: 1, minWidth: 0, padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, background: C.surface, color: C.textPrimary, outline: 'none', direction: 'ltr' }}
                          />
                          <button
                            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/form/${licenseLink.token}`); setLicenseCopied(true); setTimeout(() => setLicenseCopied(false), 2000) }}
                            style={{ background: licenseCopied ? C.success : C.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            {licenseCopied ? (rtl ? '✓ הועתק' : '✓ Copied') : (rtl ? 'העתק' : 'Copy')}
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`שלום,\nמצורף קישור לחתימה על הסכם רישיון שימוש במערכת Celox AI Fleet Manager:\n${window.location.origin}/form/${licenseLink.token}`)}`, '_blank')}
                            style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >📲 WhatsApp</button>
                          <button
                            onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent('הסכם רישיון — Celox AI Fleet Manager')}&body=${encodeURIComponent(`שלום,\nמצורף קישור לחתימה על הסכם רישיון:\n${window.location.origin}/form/${licenseLink.token}`)}` }}
                            style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >📧 {rtl ? 'אימייל' : 'Email'}</button>
                          <button
                            onClick={() => refreshLicenseLink(co)}
                            style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}
                          >{rtl ? '+ קישור חדש' : '+ New link'}</button>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: C.danger }}>{rtl ? 'שגיאה ביצירת הקישור.' : 'Failed to create link.'}</div>
                    )}
                    <button
                      onClick={() => { setLicenseCompany(null); setLicenseLink(null) }}
                      style={{ alignSelf: 'flex-start', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                    >{t.cancel}</button>
                  </div>
                )}
                {/* Inline limits editor */}
                {editingLimits === co.id && (
                  <div style={{ background: C.bg, borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ fontSize: 12, color: C.textSecondary, whiteSpace: 'nowrap' }}>🚗 {t.maxCars}</label>
                      <input type="number" min="0" value={limitCars} onChange={e => setLimitCars(e.target.value)}
                        placeholder={t.unlimited} style={{ width: 70, padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ fontSize: 12, color: C.textSecondary, whiteSpace: 'nowrap' }}>👤 {t.maxUsers}</label>
                      <input type="number" min="0" value={limitUsers} onChange={e => setLimitUsers(e.target.value)}
                        placeholder={t.unlimited} style={{ width: 70, padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: 'none' }} />
                    </div>
                    <button onClick={() => saveLimits(co)} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t.save}</button>
                    <button onClick={() => setEditingLimits(null)} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>{t.cancel}</button>
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
    <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 24 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 16,
        width: '100%',
        alignItems: 'start',
      }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Company info */}
          <div style={card}>
            <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: C.textPrimary }}>🏢 {t.companyName}</h3>
            <div style={{ marginBottom: 20 }}>
              <div style={lbl}>{t.companyName}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.textPrimary }}>{company?.name}</div>
            </div>
            <div>
              <div style={lbl}>{t.inviteCode}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: 20, fontWeight: 900,
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
              <p style={{ margin: '8px 0 0', fontSize: 12, color: C.textSecondary }}>{t.shareCodeHint}</p>
            </div>
          </div>

          {/* Monthly budget — admin only */}
          {isAdmin && companyId && (
            <BudgetSettings companyId={companyId} t={t} rtl={rtl} />
          )}

          {/* Email notifications — admin only */}
          {isAdmin && companyId && (
            <EmailNotifSettings companyId={companyId} company={company} t={t} rtl={rtl} />
          )}

          {/* Export all data — admin only */}
          {isAdmin && companyId && (
            <div style={card}>
              <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: C.textPrimary }}>📦 {t.exportAllData}</h3>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: C.textSecondary, lineHeight: 1.6 }}>{t.exportAllDataDesc}</p>
              <button
                onClick={exportAllData}
                disabled={exporting}
                style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.7 : 1 }}
              >
                {exporting ? t.exporting : `⬇️ ${t.exportAllData}`}
              </button>
            </div>
          )}

          {/* Custom Lists — admin only */}
          {isAdmin && companyId && (
            <div style={card}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: C.textPrimary }}>🗂 {t.customLists}</h3>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: C.textSecondary }}>{t.customListsHint}</p>
              <CustomListsSection companyId={companyId} t={t} onCustomListsChange={onCustomListsChange} />
            </div>
          )}

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

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
              <span style={{ marginLeft: 8, background: C.bg, color: C.textSecondary, borderRadius: 10, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>
                {members.length}
              </span>
            </h3>
            {loading ? (
              <p style={{ color: C.textSecondary, fontSize: 14 }}>{t.loadingShort}</p>
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
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {m.email}
                    {m.id === session.user.id && (
                      <span style={{ fontSize: 11, background: C.primary + '15', color: C.primary, borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>
                        {t.you}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
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

          {/* Legal card */}
          <div style={{ ...card, background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 100%)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: C.textPrimary }}>⚖️ {t.legalTitle}</h3>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: C.textSecondary, lineHeight: 1.6 }}>{t.legalDesc}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={onPrivacy} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '10px 14px', cursor: 'pointer', textAlign: rtl ? 'right' : 'left',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${C.primary}18` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none' }}
              >
                <span style={{ fontSize: 18 }}>🔒</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{t.privacyPolicy}</div>
                  <div style={{ fontSize: 11, color: C.textSecondary }}>{t.privacyPolicyDesc}</div>
                </div>
                <span style={{ fontSize: 12, color: C.textMuted }}>{rtl ? '←' : '→'}</span>
              </button>
              <button onClick={onTerms} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '10px 14px', cursor: 'pointer', textAlign: rtl ? 'right' : 'left',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${C.primary}18` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none' }}
              >
                <span style={{ fontSize: 18 }}>📋</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{t.termsOfService}</div>
                  <div style={{ fontSize: 11, color: C.textSecondary }}>{t.termsOfServiceDesc}</div>
                </div>
                <span style={{ fontSize: 12, color: C.textMuted }}>{rtl ? '←' : '→'}</span>
              </button>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 11, color: C.textMuted }}>
              {t.legalContact} <a href="mailto:privacy@celoxai.com" style={{ color: C.primary }}>privacy@celoxai.com</a>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Privacy Policy Modal ────────────────────────────────────────────────────
function PrivacyPolicyModal({ onClose, t, rtl }) {
  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{title}</h3>
      {children}
    </div>
  )
  const body = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content" style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        direction: rtl ? 'rtl' : 'ltr',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{t.privacyTitle}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>{t.privacyUpdated}</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b', lineHeight: 1, padding: '4px 8px', borderRadius: 6 }}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, fontSize: 14, color: '#334155', lineHeight: 1.7 }}>
          <Section title={t.privacyIntroTitle}>
            <p style={{ margin: 0 }}>{t.privacyIntro}</p>
          </Section>
          <Section title={t.privacyDataTitle}>
            <ul style={{ margin: 0, paddingInlineStart: 20 }}>
              {t.privacyDataItems.map((item, i) => <li key={i} style={{ marginBottom: 4 }}>{item}</li>)}
            </ul>
          </Section>
          <Section title={t.privacyPurposeTitle}>
            <ul style={{ margin: 0, paddingInlineStart: 20 }}>
              {t.privacyPurposeItems.map((item, i) => <li key={i} style={{ marginBottom: 4 }}>{item}</li>)}
            </ul>
          </Section>
          <Section title={t.privacyStorageTitle}>
            <p style={{ margin: 0 }}>{t.privacyStorage}</p>
          </Section>
          <Section title={t.privacyRetentionTitle}>
            <p style={{ margin: 0 }}>{t.privacyRetention}</p>
          </Section>
          <Section title={t.privacyRightsTitle}>
            <ul style={{ margin: '0 0 8px', paddingInlineStart: 20 }}>
              {t.privacyRightsItems.map((item, i) => <li key={i} style={{ marginBottom: 4 }}>{item}</li>)}
            </ul>
            <p style={{ margin: 0, fontWeight: 600, color: '#0891b2' }}>{t.privacyRightsContact}</p>
          </Section>
          <Section title={t.privacySecurityTitle}>
            <p style={{ margin: 0 }}>{t.privacySecurity}</p>
          </Section>
          <Section title={t.privacyContactTitle}>
            <p style={{ margin: 0 }}>{t.privacyContact}</p>
          </Section>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {t.privacyClose}
          </button>
        </div>
      </div>
    </div>
  )
  return createPortal(body, document.body)
}

function TermsOfServiceModal({ onClose, t, rtl }) {
  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{title}</h3>
      {children}
    </div>
  )
  const body = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content" style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        direction: rtl ? 'rtl' : 'ltr',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{t.tosTitle}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>{t.tosUpdated}</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b', lineHeight: 1, padding: '4px 8px', borderRadius: 6 }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, fontSize: 14, color: '#334155', lineHeight: 1.7 }}>
          <Section title={t.tos1Title}><p style={{ margin: 0 }}>{t.tos1}</p></Section>
          <Section title={t.tos2Title}><p style={{ margin: 0 }}>{t.tos2}</p></Section>
          <Section title={t.tos3Title}>
            <ul style={{ margin: 0, paddingInlineStart: 20 }}>
              {t.tos3Items.map((item, i) => <li key={i} style={{ marginBottom: 4 }}>{item}</li>)}
            </ul>
          </Section>
          <Section title={t.tos4Title}><p style={{ margin: 0 }}>{t.tos4}</p></Section>
          <Section title={t.tos5Title}><p style={{ margin: 0 }}>{t.tos5}</p></Section>
          <Section title={t.tos6Title}><p style={{ margin: 0 }}>{t.tos6}</p></Section>
          <Section title={t.tos7Title}><p style={{ margin: 0 }}>{t.tos7}</p></Section>
          <Section title={t.tos8Title}><p style={{ margin: 0 }}>{t.tos8}</p></Section>
          <Section title={t.tos9Title}><p style={{ margin: 0 }}>{t.tos9}</p></Section>
          <Section title={t.tos10Title}><p style={{ margin: 0 }}>{t.tos10}</p></Section>
        </div>
        <div style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {t.privacyClose}
          </button>
        </div>
      </div>
    </div>
  )
  return createPortal(body, document.body)
}

// ── Main component ──────────────────────────────────────────────────────────
// ── Notification Bell ────────────────────────────────────────────────────────
function urlBase64ToUint8Array(b64) {
  const pad  = '='.repeat((4 - b64.length % 4) % 4)
  const raw  = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

function NotificationBell({ companyId, userId, rtl }) {
  const [unread,      setUnread]      = useState(0)
  const [notes,       setNotes]       = useState([])
  const [open,        setOpen]        = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushBusy,    setPushBusy]    = useState(false)
  const ref = useRef()

  // Realtime: new form submissions
  useEffect(() => {
    if (!companyId) return
    const ch = supabase
      .channel('notif-' + companyId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'form_submissions', filter: `company_id=eq.${companyId}` }, p => {
        const s = p.new
        setNotes(prev => [{ id: s.id, msg: `${s.submitter_name || (rtl ? 'נהג' : 'Driver')} — ${s.type}`, time: new Date() }, ...prev].slice(0, 30))
        setUnread(n => n + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [companyId, rtl])

  // Check if push already subscribed
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setPushEnabled(!!sub))
    ).catch(() => {})
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  async function togglePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setPushBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
        setPushEnabled(false)
      } else {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') { setPushBusy(false); return }
        const sub  = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
        })
        const j = sub.toJSON()
        await supabase.from('push_subscriptions').upsert({
          company_id: companyId, user_id: userId,
          endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
        }, { onConflict: 'user_id,endpoint' })
        setPushEnabled(true)
      }
    } catch (err) { console.error('push toggle:', err) }
    setPushBusy(false)
  }

  const bellBtn = { position: 'relative', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 7, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => { setOpen(p => !p); if (!open) setUnread(0) }} title={rtl ? 'התראות' : 'Notifications'} style={bellBtn}>
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.85)" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', borderRadius: 10, minWidth: 15, height: 15, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-panel" style={{ position: 'absolute', top: 38, right: 0, width: 290, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 1000, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary }}>🔔 {rtl ? 'התראות' : 'Notifications'}</span>
            {'PushManager' in window && (
              <button onClick={togglePush} disabled={pushBusy} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, border: `1px solid ${pushEnabled ? C.success : C.border}`, background: pushEnabled ? C.success + '18' : 'transparent', color: pushEnabled ? C.success : C.textMuted, cursor: 'pointer' }}>
                {pushBusy ? '…' : pushEnabled ? (rtl ? '🔔 פעיל' : '🔔 On') : (rtl ? '🔕 כבוי' : '🔕 Off')}
              </button>
            )}
          </div>
          {notes.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>{rtl ? 'אין התראות חדשות' : 'No new notifications'}</div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {notes.map(n => (
                <div key={n.id} style={{ padding: '9px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                  <div style={{ color: C.textPrimary, fontWeight: 500 }}>{n.msg}</div>
                  <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>{n.time.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Shared SignaturePad (inline, fleet-manager version) ───────────────────────
function FMSignaturePad({ value, onChange, label = 'חתימה דיגיטלית', clearLabel = 'נקה' }) {
  const canvasRef = useRef()
  const drawing   = useRef(false)
  const lastPos   = useRef(null)

  function getPos(e) {
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    const touch  = e.touches?.[0] || e
    return { x: (touch.clientX - rect.left) * (canvas.width / rect.width), y: (touch.clientY - rect.top) * (canvas.height / rect.height) }
  }
  function startDraw(e) { e.preventDefault(); drawing.current = true; lastPos.current = getPos(e) }
  function draw(e) {
    e.preventDefault()
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
    onChange(canvasRef.current.toDataURL('image/png'))
  }
  function endDraw() { drawing.current = false; lastPos.current = null }
  function clear() { canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); onChange('') }

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>{label}</div>
      <div style={{ position: 'relative', border: `2px solid ${value ? C.primary : C.border}`, borderRadius: 8, overflow: 'hidden', background: '#fafafa' }}>
        <canvas ref={canvasRef} width={560} height={120}
          style={{ width: '100%', height: 120, cursor: 'crosshair', display: 'block', touchAction: 'none' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
        <button type="button" onClick={clear} style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(255,255,255,0.9)', border: `1px solid ${C.border}`, borderRadius: 5, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>{clearLabel}</button>
        {!value && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: C.textMuted, fontSize: 13 }}>✍️ חתום כאן</div>}
      </div>
    </div>
  )
}

// ── Traffic Violations Tab ────────────────────────────────────────────────────
const VIOLATION_TYPES_HE = ['מהירות יתר','אי מתן זכות קדימה','חנייה אסורה','שימוש בטלפון בנהיגה','אי עצירה ברמזור אדום','חריגה מנתיב','אחר']
const VIOLATION_TYPES_EN = ['Speeding','Right of way','Illegal parking','Phone while driving','Red light','Lane violation','Other']
const VIOLATION_STATUS_COLORS = { new: C?.warning || '#f59e0b', assigned: '#8b5cf6', signed: C?.primary || '#0891b2', submitted: C?.success || '#10b981', resolved: '#64748b' }

function ViolationsTab({ cars, drivers, companyId, rtl, session }) {
  const [violations, setViolations] = useState([])
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [signTarget, setSignTarget] = useState(null)
  const [signature, setSignature]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [form, setForm] = useState({ plate: '', car_id: '', violation_date: new Date().toISOString().slice(0,10), violation_type: VIOLATION_TYPES_HE[0], fine_number: '', location: '', amount: '', notes: '', driver_id: '' })
  const [addError, setAddError]     = useState('')
  const [matching, setMatching]     = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => { load() }, [companyId])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('traffic_violations').select('*').eq('company_id', companyId).order('violation_date', { ascending: false })
    setViolations(data || [])
    setLoading(false)
  }

  async function matchDriver() {
    if (!form.car_id || !form.violation_date) return
    setMatching(true)
    const { data } = await supabase.from('driver_car_history')
      .select('driver_id, driver_name')
      .eq('car_id', parseInt(form.car_id, 10))
      .lte('assigned_at', form.violation_date + 'T23:59:59')
      .order('assigned_at', { ascending: false })
      .limit(1)
    if (data?.[0]?.driver_id) {
      set('driver_id', data[0].driver_id)
    } else {
      const car = cars.find(c => c.id === parseInt(form.car_id, 10))
      if (car?.driver_id) set('driver_id', car.driver_id)
    }
    setMatching(false)
  }

  async function addViolation(e) {
    e.preventDefault()
    setAddError('')
    if (!form.plate || !form.violation_date) { setAddError(rtl ? 'לוחית רישוי ותאריך הם שדות חובה' : 'Plate and date are required'); return }
    const { data, error } = await supabase.from('traffic_violations').insert([{
      company_id:     companyId,
      plate:          form.plate.replace(/[-\s]/g,''),
      car_id:         form.car_id ? parseInt(form.car_id,10) : null,
      driver_id:      form.driver_id || null,
      violation_date: form.violation_date,
      violation_type: form.violation_type,
      fine_number:    form.fine_number || null,
      location:       form.location   || null,
      amount:         form.amount ? parseFloat(form.amount) : null,
      notes:          form.notes      || null,
      status:         form.driver_id  ? 'assigned' : 'new',
      created_by:     session?.user?.id || null,
    }]).select()
    if (error) { setAddError(friendlyDbError(error, rtl)); return }
    setViolations(p => [data[0], ...p])
    setShowAdd(false)
    setForm({ plate: '', car_id: '', violation_date: new Date().toISOString().slice(0,10), violation_type: VIOLATION_TYPES_HE[0], fine_number: '', location: '', amount: '', notes: '', driver_id: '' })
  }

  async function saveSignature() {
    if (!signature) return
    setSaving(true)
    const { data, error } = await supabase.from('traffic_violations').update({ signature_data: signature, signed_at: new Date().toISOString(), status: 'signed' }).eq('id', signTarget.id).select()
    if (!error && data?.[0]) {
      setViolations(p => p.map(v => v.id === signTarget.id ? data[0] : v))
      setSignTarget(null)
      setSignature('')
    }
    setSaving(false)
  }

  async function updateStatus(id, status) {
    const { data } = await supabase.from('traffic_violations').update({ status }).eq('id', id).select()
    if (data?.[0]) setViolations(p => p.map(v => v.id === id ? data[0] : v))
  }

  async function deleteViolation(id) {
    if (!window.confirm(rtl ? 'למחוק את הקנס?' : 'Delete this violation?')) return
    await supabase.from('traffic_violations').delete().eq('id', id)
    setViolations(p => p.filter(v => v.id !== id))
  }

  const statusLabel = { new: rtl?'חדש':'New', assigned: rtl?'שויך לנהג':'Assigned', signed: rtl?'נחתם':'Signed', submitted: rtl?'הוגש':'Submitted', resolved: rtl?'סגור':'Resolved' }
  const driverName  = id => drivers.find(d => d.id === id)?.name || id || '—'
  const carPlate    = id => id ? (formatPlate(cars.find(c => c.id === parseInt(id,10))?.plate) || id) : '—'
  const inp = { width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: C.textPrimary, background: C.bg }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24, direction: rtl ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: C.textPrimary }}>{rtl ? '🚦 ניהול קנסות תנועה' : '🚦 Traffic Violations'}</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.textSecondary }}>{rtl ? 'עקוב, שייך לנהג, וקבל חתימה לפני העברה למשרד הרישוי' : 'Track, assign to driver, collect signature before submitting to Ministry of Transport'}</p>
        </div>
        <button onClick={() => setShowAdd(p => !p)} style={{ background: `linear-gradient(135deg,${C.primary},${C.indigo})`, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {showAdd ? (rtl ? '✕ ביטול' : '✕ Cancel') : (rtl ? '+ הוסף קנס' : '+ Add Violation')}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>{rtl ? 'קנס חדש' : 'New Violation'}</h3>
          <form onSubmit={addViolation}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'לוחית רישוי *' : 'License Plate *'}</label>
                <input style={inp} value={form.plate} onChange={e => set('plate', e.target.value)} placeholder="12-345-67" required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'רכב מהצי' : 'Fleet Vehicle'}</label>
                <select style={inp} value={form.car_id} onChange={e => { set('car_id', e.target.value); if (e.target.value) set('plate', cars.find(c=>c.id===parseInt(e.target.value,10))?.plate?.replace(/\D/g,'')||form.plate) }}>
                  <option value="">{rtl ? 'בחר...' : 'Select...'}</option>
                  {cars.map(c => <option key={c.id} value={c.id}>{formatPlate(c.plate)}{c.make ? ` – ${c.make}` : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'תאריך הקנס *' : 'Violation Date *'}</label>
                <input type="date" style={inp} value={form.violation_date} onChange={e => set('violation_date', e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'סוג עבירה' : 'Violation Type'}</label>
                <select style={inp} value={form.violation_type} onChange={e => set('violation_type', e.target.value)}>
                  {(rtl ? VIOLATION_TYPES_HE : VIOLATION_TYPES_EN).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'מספר דוח' : 'Fine Number'}</label>
                <input style={inp} value={form.fine_number} onChange={e => set('fine_number', e.target.value)} placeholder="12345678" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'סכום (₪)' : 'Amount (₪)'}</label>
                <input type="number" style={inp} value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="250" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'מיקום' : 'Location'}</label>
                <input style={inp} value={form.location} onChange={e => set('location', e.target.value)} placeholder={rtl ? 'כביש 4, גבעת שמואל' : 'Highway 4, Tel Aviv'} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'נהג אחראי' : 'Responsible Driver'}</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select style={{ ...inp, flex: 1 }} value={form.driver_id} onChange={e => set('driver_id', e.target.value)}>
                    <option value="">{rtl ? 'לא ידוע' : 'Unknown'}</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  {form.car_id && (
                    <button type="button" onClick={matchDriver} disabled={matching} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '0 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {matching ? '…' : (rtl ? '🔍 איתור אוטו' : '🔍 Auto')}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'הערות' : 'Notes'}</label>
              <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
            {addError && <div style={{ color: C.danger, fontSize: 13, marginBottom: 10, padding: '8px 12px', background: C.danger + '12', borderRadius: 6 }}>{addError}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 7, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{rtl ? 'שמור קנס' : 'Save Violation'}</button>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: C.bg, color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>{rtl ? 'ביטול' : 'Cancel'}</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.textSecondary }}>…</div>
      ) : violations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.2 }}>🚦</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>{rtl ? 'אין קנסות רשומים' : 'No violations recorded'}</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>{rtl ? 'הוסף קנס חדש כדי להתחיל' : 'Add a violation to get started'}</div>
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {[rtl?'תאריך':'Date', rtl?'לוחית':'Plate', rtl?'עבירה':'Type', rtl?'נהג':'Driver', rtl?'סכום':'Amount', rtl?'מס׳ דוח':'Fine #', rtl?'סטטוס':'Status', rtl?'פעולות':'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: C.textSecondary, textAlign: rtl ? 'right' : 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {violations.map((v, i) => (
                <tr key={v.id} style={{ borderBottom: i < violations.length-1 ? `1px solid ${C.border}` : 'none', background: i % 2 === 0 ? 'transparent' : C.bg + '80' }}>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: C.textPrimary }}>{v.violation_date}</td>
                  <td style={{ padding: '12px 14px' }}><span style={{ fontWeight: 700, fontFamily: 'monospace', color: C.primary }}>{formatPlate(v.plate)}</span></td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: C.textPrimary }}>{v.violation_type}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: C.textPrimary }}>{driverName(v.driver_id)}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: C.danger }}>
                    {v.amount ? `₪${parseFloat(v.amount).toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: C.textSecondary, fontFamily: 'monospace' }}>{v.fine_number || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: (VIOLATION_STATUS_COLORS[v.status] || '#64748b') + '18', color: VIOLATION_STATUS_COLORS[v.status] || '#64748b' }}>
                      {statusLabel[v.status] || v.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {v.status !== 'signed' && v.status !== 'submitted' && v.status !== 'resolved' && (
                        <button onClick={() => { setSignTarget(v); setSignature('') }} style={{ background: '#8b5cf618', color: '#8b5cf6', border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          ✍️ {rtl ? 'חתימה' : 'Sign'}
                        </button>
                      )}
                      {v.status === 'signed' && (
                        <button onClick={() => updateStatus(v.id, 'submitted')} style={{ background: C.primary + '18', color: C.primary, border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          📤 {rtl ? 'הוגש' : 'Mark Submitted'}
                        </button>
                      )}
                      {v.status === 'submitted' && (
                        <button onClick={() => updateStatus(v.id, 'resolved')} style={{ background: C.success + '18', color: C.success, border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          ✅ {rtl ? 'סגור' : 'Close'}
                        </button>
                      )}
                      {v.signature_data && (
                        <button onClick={() => window.open(v.signature_data, '_blank')} style={{ background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: 5, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                          🖼 {rtl ? 'חתימה' : 'Sig'}
                        </button>
                      )}
                      <button onClick={() => deleteViolation(v.id)} style={{ background: C.danger + '14', color: C.danger, border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Signature modal */}
      {signTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 24, maxWidth: 600, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800 }}>{rtl ? '✍️ חתימת נהג על קנס' : '✍️ Driver Signature for Violation'}</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: C.textSecondary }}>
              {rtl ? `נהג: ${driverName(signTarget.driver_id)} | רכב: ${formatPlate(signTarget.plate)} | תאריך: ${signTarget.violation_date}` : `Driver: ${driverName(signTarget.driver_id)} | Plate: ${formatPlate(signTarget.plate)} | Date: ${signTarget.violation_date}`}
            </p>
            <div style={{ background: C.bg, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, direction: rtl ? 'rtl' : 'ltr' }}>
              <p style={{ margin: 0, fontWeight: 600 }}>{rtl ? 'הצהרת הנהג:' : 'Driver Declaration:'}</p>
              <p style={{ margin: '8px 0 0', color: C.textSecondary, lineHeight: 1.7 }}>
                {rtl
                  ? `אני ${driverName(signTarget.driver_id)} מאשר/ת שנהגתי ברכב ${formatPlate(signTarget.plate)} בתאריך ${signTarget.violation_date} ואני האחראי/ת לקנס מספר ${signTarget.fine_number || '—'} בסך ₪${signTarget.amount || '—'} בגין: ${signTarget.violation_type}.`
                  : `I, ${driverName(signTarget.driver_id)}, confirm that I drove vehicle ${formatPlate(signTarget.plate)} on ${signTarget.violation_date} and I am responsible for fine #${signTarget.fine_number || '—'} of ₪${signTarget.amount || '—'} for: ${signTarget.violation_type}.`
                }
              </p>
            </div>
            <FMSignaturePad value={signature} onChange={setSignature} label={rtl ? 'חתימת הנהג' : 'Driver Signature'} clearLabel={rtl ? 'נקה' : 'Clear'} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => { setSignTarget(null); setSignature('') }} style={{ background: C.bg, color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 18px', fontSize: 13, cursor: 'pointer' }}>
                {rtl ? 'ביטול' : 'Cancel'}
              </button>
              <button onClick={saveSignature} disabled={!signature || saving} style={{ background: signature ? C.primary : C.border, color: '#fff', border: 'none', borderRadius: 7, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: signature ? 'pointer' : 'not-allowed' }}>
                {saving ? '…' : (rtl ? '✅ שמור חתימה' : '✅ Save Signature')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
function ReportsTab({ cars, drivers, companyId, t, rtl }) {
  const [reportType, setReportType] = useState('fleet_status')
  const [recipients, setRecipients] = useState('')
  const [sending, setSending]       = useState(false)
  const [sent, setSent]             = useState('')
  const [sendError, setSendError]   = useState('')
  const [dateFrom, setDateFrom]     = useState(new Date(Date.now() - 30*24*3600*1000).toISOString().slice(0,10))
  const [dateTo, setDateTo]         = useState(new Date().toISOString().slice(0,10))
  const [costs, setCosts]           = useState([])

  useEffect(() => {
    if (!companyId) return
    supabase.from('costs').select('*').eq('company_id', companyId).then(({ data }) => setCosts(data || []))
  }, [companyId])

  const REPORT_TYPES = [
    { id: 'fleet_status',   label: rtl ? '🚗 סטטוס הצי'     : '🚗 Fleet Status'  },
    { id: 'cost_summary',   label: rtl ? '💰 סיכום עלויות'  : '💰 Cost Summary'  },
    { id: 'expiry_alerts',  label: rtl ? '⚠️ התראות תפוגה' : '⚠️ Expiry Alerts' },
  ]

  function buildFleetHtml() {
    const active    = cars.filter(c => c.status === 'In Use' || c.status === 'Available').length
    const inMaint   = cars.filter(c => c.status === 'Maintenance').length
    const rows = cars.map(c => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${formatPlate(c.plate)}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${c.make||''} ${c.model||''}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${c.status||''}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${c.mileage?.toLocaleString()||'—'}</td></tr>`).join('')
    return `<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:32px">
      <h1 style="color:#0f172a;margin:0 0 4px">דוח סטטוס צי</h1>
      <p style="color:#64748b;margin:0 0 24px">${new Date().toLocaleDateString('he-IL')}</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px">
        <div style="background:#eff6ff;border-radius:8px;padding:16px"><div style="font-size:28px;font-weight:800;color:#2563eb">${cars.length}</div><div style="font-size:13px;color:#64748b">סה"כ רכבים</div></div>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px"><div style="font-size:28px;font-weight:800;color:#16a34a">${active}</div><div style="font-size:13px;color:#64748b">פעילים</div></div>
        <div style="background:#fef9c3;border-radius:8px;padding:16px"><div style="font-size:28px;font-weight:800;color:#ca8a04">${inMaint}</div><div style="font-size:13px;color:#64748b">בתחזוקה</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <thead><tr style="background:#f8fafc"><th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b">לוחית</th><th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b">רכב</th><th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b">סטטוס</th><th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b">ק"מ</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
  }

  function buildCostHtml() {
    const filtered = costs.filter(c => c.date >= dateFrom && c.date <= dateTo)
    const total    = filtered.reduce((s,c) => s + parseFloat(c.amount||0), 0)
    const byCat    = filtered.reduce((acc,c) => { acc[c.category]=(acc[c.category]||0)+parseFloat(c.amount||0); return acc }, {})
    const catRows  = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat,amt]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${cat}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:700">₪${amt.toLocaleString('en',{minimumFractionDigits:2})}</td></tr>`).join('')
    return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px">
      <h1 style="color:#0f172a;margin:0 0 4px">סיכום עלויות</h1>
      <p style="color:#64748b;margin:0 0 24px">${dateFrom} – ${dateTo}</p>
      <div style="background:#eff6ff;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center">
        <div style="font-size:36px;font-weight:800;color:#2563eb">₪${total.toLocaleString('en',{minimumFractionDigits:2})}</div>
        <div style="font-size:13px;color:#64748b">סה"כ הוצאות</div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <tbody>${catRows}</tbody>
      </table>
    </div>`
  }

  function buildExpiryHtml() {
    const today   = new Date(); today.setHours(0,0,0,0)
    const soon    = new Date(today); soon.setDate(soon.getDate() + 30)
    const expRows = drivers.filter(d => d.license_expiry).map(d => {
      const exp = new Date(d.license_expiry); const days = Math.round((exp-today)/86400000)
      const color = days < 0 ? '#dc2626' : days < 30 ? '#d97706' : '#16a34a'
      return `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${d.name}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${d.license_expiry}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:${color};font-weight:700">${days < 0 ? 'פג תוקף' : days + ' ימים'}</td></tr>`
    }).join('')
    return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px">
      <h1 style="color:#0f172a;margin:0 0 4px">התראות תפוגה</h1>
      <p style="color:#64748b;margin:0 0 24px">${new Date().toLocaleDateString('he-IL')}</p>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f8fafc"><th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b">נהג</th><th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b">תפוגת רישיון</th><th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b">סטטוס</th></tr></thead>
        <tbody>${expRows || '<tr><td colspan="3" style="padding:20px;text-align:center;color:#64748b">אין התראות פעילות</td></tr>'}</tbody>
      </table>
    </div>`
  }

  function buildWhatsAppText() {
    if (reportType === 'fleet_status') {
      const active  = cars.filter(c => c.status === 'In Use' || c.status === 'Available').length
      const inMaint = cars.filter(c => c.status === 'Maintenance').length
      return `🚗 *דוח סטטוס צי – ${new Date().toLocaleDateString('he-IL')}*\n\nסה"כ רכבים: ${cars.length}\n✅ פעילים: ${active}\n🔧 בתחזוקה: ${inMaint}\nנהגים פעילים: ${drivers.filter(d=>d.status==='Active').length}`
    }
    if (reportType === 'cost_summary') {
      const filtered = costs.filter(c => c.date >= dateFrom && c.date <= dateTo)
      const total    = filtered.reduce((s,c) => s + parseFloat(c.amount||0), 0)
      return `💰 *סיכום עלויות ${dateFrom} – ${dateTo}*\n\nסה"כ: ₪${total.toLocaleString('en',{minimumFractionDigits:2})}\nמספר רשומות: ${filtered.length}`
    }
    const expired = drivers.filter(d => d.license_expiry && new Date(d.license_expiry) < new Date()).length
    const expiring = drivers.filter(d => { if (!d.license_expiry) return false; const days=(new Date(d.license_expiry)-new Date())/86400000; return days>=0&&days<30 }).length
    return `⚠️ *התראות תפוגה – ${new Date().toLocaleDateString('he-IL')}*\n\n🔴 פג תוקף: ${expired} נהגים\n🟡 פג תוקף בחודש הקרוב: ${expiring} נהגים`
  }

  async function sendEmail() {
    const toList = recipients.split(/[,\n]/).map(e=>e.trim()).filter(Boolean)
    if (!toList.length) { setSendError(rtl ? 'הזן כתובת אימייל אחת לפחות' : 'Enter at least one email'); return }
    setSending(true); setSendError(''); setSent('')
    const html = reportType === 'fleet_status' ? buildFleetHtml() : reportType === 'cost_summary' ? buildCostHtml() : buildExpiryHtml()
    const subjectMap = { fleet_status: 'דוח סטטוס צי', cost_summary: 'סיכום עלויות', expiry_alerts: 'התראות תפוגה' }
    const r = await fetch('https://dvjjxwcvxjgqpdcnnmvv.supabase.co/functions/v1/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: toList, subject: `${subjectMap[reportType]} – ${new Date().toLocaleDateString('he-IL')}`, html }),
    })
    setSending(false)
    if (r.ok) setSent(rtl ? `✅ הדוח נשלח ל-${toList.length} נמענים` : `✅ Report sent to ${toList.length} recipient(s)`)
    else setSendError(rtl ? 'שגיאה בשליחה. נסה שוב.' : 'Send failed. Please try again.')
  }

  function openWhatsApp() {
    const text = encodeURIComponent(buildWhatsAppText())
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const inp = { width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: C.textPrimary, background: C.bg }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24, direction: rtl ? 'rtl' : 'ltr' }}>
      <div style={{ maxWidth: 640 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: C.textPrimary }}>{rtl ? '📊 שליחת דוחות' : '📊 Send Reports'}</h2>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: C.textSecondary }}>{rtl ? 'שלח דוחות ישירות לאימייל או לוואטסאפ' : 'Send reports directly by email or WhatsApp'}</p>

        {/* Report type */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{rtl ? 'סוג דוח' : 'Report Type'}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {REPORT_TYPES.map(rt => (
              <label key={rt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: `2px solid ${reportType === rt.id ? C.primary : C.border}`, cursor: 'pointer', background: reportType === rt.id ? C.primary + '08' : 'transparent', transition: 'all 0.15s' }}>
                <input type="radio" name="reportType" value={rt.id} checked={reportType === rt.id} onChange={() => setReportType(rt.id)} style={{ accentColor: C.primary }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{rt.label}</span>
              </label>
            ))}
          </div>

          {reportType === 'cost_summary' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'מתאריך' : 'From'}</label>
                <input type="date" style={inp} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'עד תאריך' : 'To'}</label>
                <input type="date" style={inp} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Email */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>✉️ {rtl ? 'שליחה באימייל' : 'Send by Email'}</label>
          <textarea
            style={{ ...inp, minHeight: 70, resize: 'vertical', marginBottom: 10 }}
            value={recipients}
            onChange={e => setRecipients(e.target.value)}
            placeholder={rtl ? 'כתובות אימייל (מופרדות בפסיק או שורה חדשה)\nדוגמה: manager@company.com, cfo@company.com' : 'Email addresses (comma or newline separated)\nExample: manager@company.com, cfo@company.com'}
          />
          {sendError && <div style={{ color: C.danger, fontSize: 13, marginBottom: 8 }}>{sendError}</div>}
          {sent      && <div style={{ color: C.success, fontSize: 13, marginBottom: 8 }}>{sent}</div>}
          <button onClick={sendEmail} disabled={sending} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 7, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1 }}>
            {sending ? '…' : (rtl ? '📨 שלח דוח' : '📨 Send Report')}
          </button>
        </div>

        {/* WhatsApp */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>💬 {rtl ? 'שליחה בוואטסאפ' : 'Send via WhatsApp'}</label>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: C.textSecondary }}>{rtl ? 'ייפתח WhatsApp עם הדוח המוכן לשליחה. בחר איש קשר ולחץ שלח.' : 'Opens WhatsApp with a ready-to-send message. Select a contact and tap send.'}</p>
          <button onClick={openWhatsApp} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.06L2 22l5.07-1.34C8.5 21.52 10.2 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.69 0-3.27-.48-4.62-1.31L4 20l1.33-3.3C4.5 15.3 4 13.7 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/></svg>
            {rtl ? 'שלח בוואטסאפ' : 'Send via WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Driver Certifications Pane ────────────────────────────────────────────────
const CERT_TYPES_HE = ['עזרה ראשונה','כיבוי אש','נהיגה מונעת','חומרים מסוכנים','הדרכה שנתית','אחר']
const CERT_TYPES_EN = ['First Aid','Fire Safety','Defensive Driving','Hazmat','Yearly Training','Other']

function CertificationsPane({ driverId, companyId, rtl }) {
  const [certs,    setCerts]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')
  const [form, setForm] = useState({ cert_type: '', cert_name: '', completed_date: '', expiry_date: '', provider: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const today = new Date(); today.setHours(0,0,0,0)
  const daysUntil = dateStr => Math.round((new Date(dateStr) - today) / 86400000)
  const expiryColor = dateStr => {
    const d = daysUntil(dateStr)
    if (d < 0)  return C.danger
    if (d < 30) return C.warning || '#f59e0b'
    return C.success
  }

  useEffect(() => { load() }, [driverId])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('driver_certifications').select('*').eq('driver_id', driverId).order('completed_date', { ascending: false })
    setCerts(data || [])
    setLoading(false)
  }

  async function add(e) {
    e.preventDefault()
    setErr('')
    if (!form.cert_type || !form.completed_date) { setErr(rtl ? 'סוג ותאריך הם שדות חובה' : 'Type and date are required'); return }
    setSaving(true)
    const { data, error } = await supabase.from('driver_certifications').insert([{
      company_id: companyId, driver_id: driverId,
      cert_type: form.cert_type, cert_name: form.cert_name || null,
      completed_date: form.completed_date, expiry_date: form.expiry_date || null,
      provider: form.provider || null,
    }]).select()
    setSaving(false)
    if (error) { setErr(friendlyDbError(error, rtl)); return }
    setCerts(p => [data[0], ...p])
    setShowAdd(false)
    setForm({ cert_type: '', cert_name: '', completed_date: '', expiry_date: '', provider: '' })
  }

  async function del(id) {
    if (!window.confirm(rtl ? 'למחוק?' : 'Delete?')) return
    await supabase.from('driver_certifications').delete().eq('id', id)
    setCerts(p => p.filter(c => c.id !== id))
  }

  const inp = { width: '100%', padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: C.textPrimary, background: C.bg }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{rtl ? 'הסמכות ואישורים' : 'Certifications'}</span>
        <button onClick={() => setShowAdd(p => !p)} style={{ background: C.primary + '15', color: C.primary, border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {showAdd ? '✕' : `+ ${rtl ? 'הוסף' : 'Add'}`}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={add} style={{ background: C.bg, borderRadius: 8, padding: 14, marginBottom: 14, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'סוג הסמכה *' : 'Type *'}</label>
              <select style={inp} value={form.cert_type} onChange={e => set('cert_type', e.target.value)} required>
                <option value="">{rtl ? 'בחר...' : 'Select...'}</option>
                {(rtl ? CERT_TYPES_HE : CERT_TYPES_EN).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'שם קורס' : 'Course Name'}</label>
              <input style={inp} value={form.cert_name} onChange={e => set('cert_name', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'תאריך השלמה *' : 'Completed *'}</label>
              <input type="date" style={inp} value={form.completed_date} onChange={e => set('completed_date', e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'תפוגה' : 'Expiry'}</label>
              <input type="date" style={inp} value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 4 }}>{rtl ? 'ספק / מכון' : 'Provider'}</label>
              <input style={inp} value={form.provider} onChange={e => set('provider', e.target.value)} placeholder={rtl ? 'לדוגמה: מכון דרך ארץ' : 'e.g. Safe Drive Institute'} />
            </div>
          </div>
          {err && <div style={{ color: C.danger, fontSize: 12, marginBottom: 8 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{saving ? '…' : (rtl ? 'שמור' : 'Save')}</button>
            <button type="button" onClick={() => setShowAdd(false)} style={{ background: C.bg, color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>{rtl ? 'ביטול' : 'Cancel'}</button>
          </div>
        </form>
      )}

      {loading ? <div style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', padding: 16 }}>…</div> : certs.length === 0 ? (
        <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>{rtl ? 'אין הסמכות רשומות' : 'No certifications recorded'}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {certs.map(c => (
            <div key={c.id} style={{ background: C.bg, borderRadius: 8, padding: '10px 14px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{c.cert_type}{c.cert_name ? ` – ${c.cert_name}` : ''}</div>
                <div style={{ fontSize: 12, color: C.textSecondary }}>{rtl ? 'הושלם:' : 'Completed:'} {c.completed_date}{c.provider ? ` | ${c.provider}` : ''}</div>
              </div>
              {c.expiry_date && (
                <span style={{ fontSize: 12, fontWeight: 700, color: expiryColor(c.expiry_date), background: expiryColor(c.expiry_date) + '18', padding: '3px 8px', borderRadius: 6 }}>
                  {daysUntil(c.expiry_date) < 0 ? (rtl ? '⚠ פג' : '⚠ Expired') : `${daysUntil(c.expiry_date)}d`}
                </span>
              )}
              <button onClick={() => del(c.id)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}>🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Master: Forms tab license sender ─────────────────────────────────────────
function MasterLicenseSender({ session, t, rtl, isMobile }) {
  const [companies,      setCompanies]      = useState([])
  const [loading,        setLoading]        = useState(true)
  const [activeCompany,  setActiveCompany]  = useState(null) // company id with open panel
  const [licenseLink,    setLicenseLink]    = useState(null)
  const [linkBusy,       setLinkBusy]       = useState(false)
  const [copied,         setCopied]         = useState(false)

  useEffect(() => {
    supabase.from('companies').select('id, name, invite_code, is_active')
      .order('name').then(({ data }) => { if (data) setCompanies(data); setLoading(false) })
  }, [])

  async function openPanel(co) {
    if (activeCompany === co.id) { setActiveCompany(null); setLicenseLink(null); return }
    setActiveCompany(co.id)
    setLicenseLink(null)
    setLinkBusy(true)
    const { data: existing } = await supabase.from('form_links')
      .select('*').eq('company_id', co.id).eq('type', 'license_agreement')
      .eq('is_active', true).is('expires_at', null).order('created_at', { ascending: false }).limit(1)
    if (existing?.length) { setLicenseLink(existing[0]); setLinkBusy(false); return }
    const { data: newLink } = await supabase.from('form_links').insert({
      company_id: co.id, type: 'license_agreement',
      title: `הסכם רישיון — ${co.name}`,
      created_by: session.user.id, is_active: true, single_use: false,
    }).select().single()
    if (newLink) setLicenseLink(newLink)
    setLinkBusy(false)
  }

  async function newLink(co) {
    setLicenseLink(null); setLinkBusy(true)
    const { data: nl } = await supabase.from('form_links').insert({
      company_id: co.id, type: 'license_agreement',
      title: `הסכם רישיון — ${co.name}`,
      created_by: session.user.id, is_active: true, single_use: false,
    }).select().single()
    if (nl) setLicenseLink(nl)
    setLinkBusy(false)
  }

  const C2 = { surface: '#ffffff', bg: '#f1f5f9', border: '#e2e8f0', primary: '#0891b2', textPrimary: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8', success: '#10b981', danger: '#ef4444' }
  const card = { background: C2.surface, borderRadius: 10, border: `1px solid ${C2.border}`, padding: '14px 18px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 10 }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 24 }}>
      <div style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: C2.textPrimary }}>📄 {rtl ? 'שליחת הסכם רישיון' : 'Send License Agreement'}</div>
          <div style={{ fontSize: 13, color: C2.textMuted, marginTop: 4 }}>
            {rtl ? 'בחר חברה ושלח קישור לחתימה על הסכם הרישיון' : 'Select a company and send a signing link'}
          </div>
        </div>

        {loading && <div style={{ color: C2.textMuted, fontSize: 14 }}>טוען…</div>}

        {companies.map(co => (
          <div key={co.id} style={card}>
            {/* Company row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C2.textPrimary }}>{co.name}</div>
                <div style={{ fontSize: 11, color: C2.textMuted, fontFamily: 'monospace', letterSpacing: '0.1em' }}>{co.invite_code}</div>
              </div>
              <button
                onClick={() => openPanel(co)}
                style={{
                  background: activeCompany === co.id ? C2.primary : C2.primary,
                  color: '#fff', border: 'none', borderRadius: 7,
                  padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  opacity: activeCompany === co.id ? 0.85 : 1,
                }}
              >
                {activeCompany === co.id ? (rtl ? '✕ סגור' : '✕ Close') : (rtl ? '📤 שלח הסכם' : '📤 Send Agreement')}
              </button>
            </div>

            {/* Inline panel */}
            {activeCompany === co.id && (
              <div style={{ background: C2.bg, borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {linkBusy ? (
                  <div style={{ fontSize: 12, color: C2.textSecondary }}>…{rtl ? 'יוצר קישור' : 'Generating link'}</div>
                ) : licenseLink ? (
                  <>
                    <div style={{ fontSize: 12, color: C2.textSecondary }}>
                      {rtl ? 'שלח ללקוח לחתימה על הסכם הרישיון:' : 'Send to client to sign the agreement:'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        readOnly
                        value={`${window.location.origin}/form/${licenseLink.token}`}
                        onClick={e => e.target.select()}
                        style={{ flex: 1, minWidth: 0, padding: '7px 10px', border: `1px solid ${C2.border}`, borderRadius: 6, fontSize: 12, background: C2.surface, color: C2.textPrimary, outline: 'none', direction: 'ltr' }}
                      />
                      <button
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/form/${licenseLink.token}`); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                        style={{ background: copied ? C2.success : C2.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {copied ? (rtl ? '✓ הועתק' : '✓ Copied') : (rtl ? 'העתק' : 'Copy')}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`שלום,\nמצורף קישור לחתימה על הסכם רישיון שימוש במערכת Celox AI Fleet Manager:\n${window.location.origin}/form/${licenseLink.token}`)}`, '_blank')}
                        style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                      >📲 WhatsApp</button>
                      <button
                        onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent('הסכם רישיון — Celox AI Fleet Manager')}&body=${encodeURIComponent(`שלום,\nקישור לחתימה:\n${window.location.origin}/form/${licenseLink.token}`)}` }}
                        style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                      >📧 {rtl ? 'אימייל' : 'Email'}</button>
                      <button
                        onClick={() => newLink(co)}
                        style={{ background: 'transparent', border: `1px solid ${C2.border}`, color: C2.textSecondary, borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}
                      >{rtl ? '+ קישור חדש' : '+ New link'}</button>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: C2.danger }}>{rtl ? 'שגיאה ביצירת הקישור.' : 'Failed to create link.'}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function FleetManager({ session, profile, isMaster, companyId, onSignOut, initialLang, onOpenCRM }) {
  const [branches, setBranches]   = useState([])
  const [drivers, setDrivers]     = useState([])
  const [cars, setCars]           = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [search, setSearch]       = useState('')
  const [lang, setLang]           = useState(() => localStorage.getItem('fleet_lang') || initialLang || 'en')
  const isMobile                  = useIsMobile()
  const [filesFor, setFilesFor]   = useState(null)
  const [companyLimits, setCompanyLimits] = useState({ max_cars: null, max_users: null })
  const [customLists, setCustomLists]     = useState({})
  const [viewCompanyId, setViewCompanyId]   = useState(isMaster ? null : companyId)
  const [viewCompanyName, setViewCompanyName] = useState(null)
  // New feature state
  const [selectedIds, setSelectedIds] = useState([])
  const [dashFilter, setDashFilter]   = useState('all')
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  const [costsReloadKey, setCostsReloadKey] = useState(0)
  const [showEntityCsvImport, setShowEntityCsvImport] = useState(null) // 'cars' | 'drivers' | null
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms]   = useState(false)
  const [detailCar, setDetailCar]       = useState(null)
  const [detailDriver, setDetailDriver] = useState(null)
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
    setBranches([]); setDrivers([]); setCars([])
    if (!activeCompanyId) { setLoading(false); return }
    const [{ data: b }, { data: d }, { data: c }, { data: co }, { data: cl }] = await Promise.all([
      supabase.from('branches').select('*').eq('company_id', activeCompanyId).order('created_at'),
      supabase.from('drivers').select('*').eq('company_id', activeCompanyId).order('created_at'),
      supabase.from('cars').select('*').eq('company_id', activeCompanyId).order('created_at'),
      supabase.from('companies').select('max_cars, max_users').eq('id', activeCompanyId).maybeSingle(),
      supabase.from('custom_lists').select('*').eq('company_id', activeCompanyId).order('sort_order'),
    ])
    if (b) setBranches(b)
    if (d) setDrivers(d)
    if (c) setCars(c)
    if (co) setCompanyLimits(co)
    if (cl) {
      const grouped = {}
      cl.forEach(item => {
        if (!grouped[item.list_type]) grouped[item.list_type] = []
        grouped[item.list_type].push(item.value)
      })
      setCustomLists(grouped)
    }
    setLoading(false)
  }

  // ── Activity logging ──────────────────────────────────────────────────────
  async function logActivity(action, entityType, entityName, details = null) {
    if (!activeCompanyId) return
    await supabase.from('activity_log').insert([{
      company_id: activeCompanyId,
      user_email: session.user.email,
      action, entity_type: entityType, entity_name: entityName,
      details: details || undefined,
    }])
  }

  function diffObjects(prev, next, fields) {
    const changes = {}
    for (const f of fields) {
      if (String(prev[f] ?? '') !== String(next[f] ?? '')) {
        changes[f] = { from: prev[f] ?? null, to: next[f] ?? null }
      }
    }
    return Object.keys(changes).length ? changes : null
  }

  // ── Export to Excel ───────────────────────────────────────────────────────
  async function exportExcel(tab) {
    const wb = new ExcelJS.Workbook()
    const date = new Date().toISOString().slice(0, 10)
    if (!tab || tab === 'cars') {
      xlsxAddSheet(wb, t.cars || 'Vehicles', cars.map(c => ({
        [t.plate]:   c.plate,
        [t.make]:    c.make,
        [t.model]:   c.model,
        [t.year]:    c.year,
        [t.status]:  c.status,
        [t.fuel]:    c.fuel,
        [t.branch]:  getBranchName(c.branch_id),
        [t.driver]:  drivers.find(d => d.id === c.driver_id)?.name || '',
      })))
    }
    if (!tab || tab === 'drivers') {
      xlsxAddSheet(wb, t.drivers || 'Drivers', drivers.map(d => ({
        [t.name]:         d.name,
        [t.license]:      d.license,
        [t.phone]:        d.phone,
        [t.driverStatus]: d.status,
        [t.branch]:       getBranchName(d.branch_id),
      })))
    }
    if (!tab || tab === 'branches') {
      xlsxAddSheet(wb, t.branches || 'Branches', branches.map(b => ({
        [t.branchName]: b.name,
        [t.city]:       b.city,
        [t.address]:    b.address,
        [t.manager]:    b.manager,
        [t.phone]:      b.phone,
      })))
    }
    const suffix = tab ? `-${tab}` : '-all'
    await xlsxDownload(wb, `fleet-export${suffix}-${date}.xlsx`)
  }

  // ── Export to PDF ─────────────────────────────────────────────────────────
  async function exportPDF(tab) {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'), import('jspdf-autotable'),
    ])
    const doc = new jsPDF({ orientation: 'landscape' })
    const date = new Date().toLocaleDateString()
    const title = tab === 'cars' ? t.cars : tab === 'drivers' ? t.drivers : tab === 'branches' ? t.branches : 'Fleet'
    doc.setFontSize(16)
    doc.text(`Celox AI — ${title}`, 14, 16)
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text(date, doc.internal.pageSize.width - 14, 16, { align: 'right' })

    if (!tab || tab === 'cars') {
      autoTable(doc, {
        startY: 24,
        head: [[t.plate, t.make, t.model, t.year, t.mileage, t.status, t.fuel, t.branch, t.driver]],
        body: cars.map(c => [
          c.plate, c.make, c.model, c.year || '',
          c.mileage ? c.mileage.toLocaleString() : '',
          c.status, c.fuel,
          getBranchName(c.branch_id),
          drivers.find(d => d.id === c.driver_id)?.name || '',
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      })
    }
    if (!tab || tab === 'drivers') {
      const startY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 12 : 24
      autoTable(doc, {
        startY,
        head: [[t.name, t.license, t.phone, t.driverStatus, t.branch]],
        body: drivers.map(d => [d.name, d.license, d.phone || '', d.status, getBranchName(d.branch_id)]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 102, 241] },
      })
    }
    if (!tab || tab === 'branches') {
      const startY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 12 : 24
      autoTable(doc, {
        startY,
        head: [[t.branchName, t.city, t.address, t.manager, t.phone]],
        body: branches.map(b => [b.name, b.city, b.address || '', b.manager || '', b.phone || '']),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [16, 185, 129] },
      })
    }
    const suffix = tab ? `-${tab}` : '-all'
    doc.save(`fleet-export${suffix}-${new Date().toISOString().slice(0,10)}.pdf`)
  }

  // ── Vehicle photo upload ──────────────────────────────────────────────────
  async function updateMileage(carId, mileage) {
    await supabase.from('cars').update({ mileage }).eq('id', carId).eq('company_id', activeCompanyId)
    setCars(p => p.map(c => c.id === carId ? { ...c, mileage } : c))
  }

  async function uploadCarPhoto(carId, file) {
    if (file.size > 5 * 1024 * 1024) { setCrudError(t.photoTooLarge); return }
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) { setCrudError(t.photoTypeNotAllowed); return }
    const safeName = file.name.replace(/[^\w.\-]/g, '_').replace(/^\.+/, '').replace(/\s+/g, '_')
    const path = `${activeCompanyId}/car-photos/${carId}/${Date.now()}_${safeName}`
    const { error: uploadErr } = await supabase.storage.from('fleet-documents').upload(path, file, { upsert: true })
    if (uploadErr) { setCrudError(friendlyDbError(uploadErr, rtl)); return }
    const { error: dbErr } = await supabase.from('cars').update({ photo_url: path }).eq('id', carId).eq('company_id', activeCompanyId)
    if (dbErr) { setCrudError(friendlyDbError(dbErr, rtl)); return }
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
    const { error } = await supabase.from(table).delete().in('id', selectedIds).eq('company_id', activeCompanyId)
    if (error) { setCrudError(friendlyDbError(error, rtl)); return }
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

  function cleanCar(f)    { return { plate: f.plate, make: f.make, model: f.model, year: f.year ? parseInt(f.year, 10) : null, status: f.status || 'Available', fuel: f.fuel || 'Petrol', branch_id: f.branch_id || null, driver_id: f.driver_id || null, mileage: f.mileage ? parseInt(f.mileage, 10) : 0, company_id: activeCompanyId } }
  function cleanDriver(f) { return { name: f.name, license: f.license, license_expiry: f.license_expiry || null, license_levels: f.license_levels || [], phone: f.phone || null, status: f.status || 'Active', branch_id: f.branch_id || null, company_id: activeCompanyId } }
  function cleanBranch(f) { return { name: f.name, city: f.city, address: f.address || null, manager: f.manager || null, phone: f.phone || null, company_id: activeCompanyId } }

  const [crudError, setCrudError] = useState('')

  async function addCar(form) {
    if (companyLimits.max_cars != null && cars.length >= companyLimits.max_cars) {
      setCrudError(t.limitReachedCars); return
    }
    if (isEmpty(form.plate)) { setCrudError(rtl ? 'לוחית רישוי היא שדה חובה' : 'License plate is required'); return }
    if (!isIsraeliPlate(form.plate)) { setCrudError(rtl ? 'לוחית רישוי לא תקינה (7–8 ספרות)' : 'Invalid license plate (7–8 digits)'); return }
    if (form.year && !isYear(form.year)) { setCrudError(rtl ? 'שנה לא תקינה (1900–2099)' : 'Invalid year (1900–2099)'); return }
    if (form.mileage && !isPositive(form.mileage)) { setCrudError(rtl ? 'קילומטראז׳ חייב להיות מספר חיובי' : 'Mileage must be a positive number'); return }
    const { data, error } = await supabase.from('cars').insert([cleanCar(form)]).select()
    if (error || !data?.[0]) { setCrudError(error ? friendlyDbError(error, rtl) : (rtl ? 'שגיאה בשמירה. נסה שוב.' : 'Save failed.')); return }
    setCars(p => [...p, data[0]]); setShowAdd(false); setCrudError('')
    if (form.driver_id) await supabase.from('drivers').update({ car_id: String(data[0].id) }).eq('id', form.driver_id).eq('company_id', activeCompanyId)
    logActivity('add', 'car', `${form.plate} ${form.make}`)
  }
  async function updateCar(form) {
    if (isEmpty(form.plate)) { setCrudError(rtl ? 'לוחית רישוי היא שדה חובה' : 'License plate is required'); return }
    if (!isIsraeliPlate(form.plate)) { setCrudError(rtl ? 'לוחית רישוי לא תקינה (7–8 ספרות)' : 'Invalid license plate (7–8 digits)'); return }
    if (!form.make?.trim() || !form.model?.trim()) { setCrudError(t.requiredFields || 'Make and model are required'); return }
    if (form.year && !isYear(form.year)) { setCrudError(rtl ? 'שנה לא תקינה (1900–2099)' : 'Invalid year (1900–2099)'); return }
    if (form.mileage && !isPositive(form.mileage)) { setCrudError(rtl ? 'קילומטראז׳ חייב להיות מספר חיובי' : 'Mileage must be a positive number'); return }
    const { id: carId, ...carData } = { ...cleanCar(form), id: form.id }
    const { error } = await supabase.from('cars').update(carData).eq('id', carId).eq('company_id', activeCompanyId)
    const c = { ...carData, id: carId }
    if (error) { setCrudError(friendlyDbError(error, rtl)); return }
    // Log driver assignment change for history
    const prev = cars.find(x => x.id === form.id)
    if (prev && prev.driver_id !== form.driver_id) {
      const { error: histErr } = await supabase.from('driver_car_history').insert([{
        company_id: activeCompanyId, car_id: form.id,
        driver_id: form.driver_id || null,
        driver_name: drivers.find(d => d.id === form.driver_id)?.name || null,
        assigned_at: new Date().toISOString(),
      }])
      if (histErr) console.error('driver_car_history insert failed:', histErr.message)
      // Sync drivers.car_id — clear old driver's car_id, set new driver's car_id
      if (prev.driver_id) await supabase.from('drivers').update({ car_id: null }).eq('id', prev.driver_id).eq('company_id', activeCompanyId)
      if (form.driver_id) await supabase.from('drivers').update({ car_id: String(form.id) }).eq('id', form.driver_id).eq('company_id', activeCompanyId)
    }
    // Notify admins if status changed
    if (prev && prev.status !== form.status) {
      supabase.functions.invoke('send-notification', {
        body: { type: 'status_changed', payload: {
          plate: form.plate, make: form.make, model: form.model,
          old_status: prev.status, new_status: form.status,
          company_id: activeCompanyId, changed_by_email: session.user.email,
        }},
      }).catch(() => {})
    }
    setCars(p => p.map(x => x.id === c.id ? { ...x, ...c } : x)); setEditingId(null); setCrudError('')
    const carDiff = prev ? diffObjects(prev, form, ['plate','make','model','year','status','fuel','mileage','branch_id','driver_id']) : null
    logActivity('update', 'car', `${form.plate} ${form.make}`, carDiff)
  }
  async function deleteCar(id) {
    if (!window.confirm(t.confirmDelete)) return
    const car = cars.find(c => c.id === id)
    const { error } = await supabase.from('cars').delete().eq('id', id).eq('company_id', activeCompanyId)
    if (error) { setCrudError(friendlyDbError(error, rtl)); return }
    setCars(p => p.filter(c => c.id !== id)); setEditingId(null); setCrudError('')
    logActivity('delete', 'car', `${car?.plate} ${car?.make}`)
  }
  async function addDriver(form) {
    if (companyLimits.max_users != null && drivers.length >= companyLimits.max_users) {
      setCrudError(t.limitReachedUsers); return
    }
    if (!isMinLen(form.name, 2)) { setCrudError(rtl ? 'שם הנהג חייב להכיל לפחות 2 תווים' : 'Driver name must be at least 2 characters'); return }
    if (form.phone && !isIsraeliPhone(form.phone)) { setCrudError(rtl ? 'מספר טלפון לא תקין (לדוגמה: 050-1234567)' : 'Invalid phone number (e.g. 050-1234567)'); return }
    const { data, error } = await supabase.from('drivers').insert([cleanDriver(form)]).select()
    if (error) { setCrudError(friendlyDbError(error, rtl)); return }
    setDrivers(p => [...p, data[0]]); setShowAdd(false); setCrudError('')
    logActivity('add', 'driver', form.name)
  }
  async function updateDriver(form) {
    if (!isMinLen(form.name, 2)) { setCrudError(rtl ? 'שם הנהג חייב להכיל לפחות 2 תווים' : 'Driver name must be at least 2 characters'); return }
    if (form.phone && !isIsraeliPhone(form.phone)) { setCrudError(rtl ? 'מספר טלפון לא תקין (לדוגמה: 050-1234567)' : 'Invalid phone number (e.g. 050-1234567)'); return }
    const prevDrv = drivers.find(x => x.id === form.id)
    const { id: driverId, ...driverData } = { ...cleanDriver(form), id: form.id }
    const { error } = await supabase.from('drivers').update(driverData).eq('id', driverId)
    if (error) { setCrudError(friendlyDbError(error, rtl)); return }
    setDrivers(p => p.map(x => x.id === driverId ? { ...x, ...driverData, id: driverId } : x)); setEditingId(null); setCrudError('')
    const drvDiff = prevDrv ? diffObjects(prevDrv, form, ['name','license','phone','status','branch_id','license_levels']) : null
    logActivity('update', 'driver', form.name, drvDiff)
  }
  async function deleteDriver(id) {
    if (!window.confirm(t.confirmDelete)) return
    const drv = drivers.find(d => d.id === id)
    const { error } = await supabase.from('drivers').delete().eq('id', id)
    if (error) { setCrudError(friendlyDbError(error, rtl)); return }
    setDrivers(p => p.filter(d => d.id !== id))
    logActivity('delete', 'driver', drv?.name)
  }
  async function addBranch(form) {
    if (!isMinLen(form.name, 2)) { setCrudError(rtl ? 'שם הסניף חייב להכיל לפחות 2 תווים' : 'Branch name must be at least 2 characters'); return }
    if (form.phone && !isIsraeliPhone(form.phone)) { setCrudError(rtl ? 'מספר טלפון לא תקין (לדוגמה: 050-1234567)' : 'Invalid phone number (e.g. 050-1234567)'); return }
    const { data, error } = await supabase.from('branches').insert([cleanBranch(form)]).select()
    if (error) { setCrudError(friendlyDbError(error, rtl)); return }
    setBranches(p => [...p, data[0]]); setShowAdd(false); setCrudError('')
    logActivity('add', 'branch', form.name)
  }
  async function updateBranch(form) {
    if (!isMinLen(form.name, 2)) { setCrudError(rtl ? 'שם הסניף חייב להכיל לפחות 2 תווים' : 'Branch name must be at least 2 characters'); return }
    if (form.phone && !isIsraeliPhone(form.phone)) { setCrudError(rtl ? 'מספר טלפון לא תקין (לדוגמה: 050-1234567)' : 'Invalid phone number (e.g. 050-1234567)'); return }
    const prevBrn = branches.find(x => x.id === form.id)
    const { id: branchId, ...branchData } = { ...cleanBranch(form), id: form.id }
    const { error } = await supabase.from('branches').update(branchData).eq('id', branchId)
    if (error) { setCrudError(friendlyDbError(error, rtl)); return }
    setBranches(p => p.map(x => x.id === branchId ? { ...x, ...branchData, id: branchId } : x)); setEditingId(null); setCrudError('')
    const brnDiff = prevBrn ? diffObjects(prevBrn, form, ['name','city','address','manager','phone']) : null
    logActivity('update', 'branch', form.name, brnDiff)
  }
  async function deleteBranch(id) {
    if (!window.confirm(t.confirmDelete)) return
    const brn = branches.find(b => b.id === id)
    const { error } = await supabase.from('branches').delete().eq('id', id)
    if (error) { setCrudError(friendlyDbError(error, rtl)); return }
    setBranches(p => p.filter(b => b.id !== id))
    logActivity('delete', 'branch', brn?.name)
  }

  function getBranchName(id) { return branches.find(b => b.id === id)?.name || '—' }
  function getBranchIdx(id)  { return branches.findIndex(b => b.id === id) }
  function switchTab(tab)    { setActiveTab(tab); setEditingId(null); setShowAdd(false); setSearch(''); setSelectedIds([]); setCrudError('') }

  const q = search.toLowerCase()
  const filteredCars     = cars.filter(c     => c.plate?.toLowerCase().includes(q) || c.make?.toLowerCase().includes(q) || c.model?.toLowerCase().includes(q) || getBranchName(c.branch_id).toLowerCase().includes(q) || drivers.find(d => String(d.id) === String(c.driver_id))?.name?.toLowerCase().includes(q))
  const filteredDrivers  = drivers.filter(d  => d.name?.toLowerCase().includes(q)  || d.license?.toLowerCase().includes(q) || d.phone?.toLowerCase().includes(q) || getBranchName(d.branch_id).toLowerCase().includes(q))
  const filteredBranches = branches.filter(b => b.name?.toLowerCase().includes(q)  || b.city?.toLowerCase().includes(q) || b.manager?.toLowerCase().includes(q))

  const tabs = [
    { id: 'dashboard',   label: t.dashboard,      icon: '📊', count: null },
    { id: 'cars',        label: t.fleet,          icon: '🚗', count: cars.length },
    { id: 'drivers',     label: t.drivers,        icon: '👤', count: drivers.length },
    { id: 'branches',    label: t.branches,       icon: '🏢', count: branches.length },
    { id: 'maintenance', label: t.maintenanceTab, icon: '🔧', count: null },
    { id: 'costs',       label: t.costsTab,       icon: '💰', count: null },
    { id: 'forms',       label: rtl ? 'טפסים'    : 'Forms',      icon: '📋', count: null },
    { id: 'violations',  label: rtl ? 'קנסות'     : 'Violations', icon: '🚦', count: null },
    { id: 'reports',     label: rtl ? 'דוחות'     : 'Reports',    icon: '📄', count: null },
    { id: 'settings',    label: t.settings,        icon: '⚙️', count: null },
  ]

  const activeTabData  = tabs.find(tab => tab.id === activeTab)
  const boardLabel     = activeTab === 'cars' ? t.allVehicles : activeTab === 'drivers' ? t.allDrivers : t.allBranches
  const currentCount   = activeTab === 'cars' ? filteredCars.length : activeTab === 'drivers' ? filteredDrivers.length : filteredBranches.length

  if (loading && activeCompanyId) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: C.bg, width: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${C.primary}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: C.textSecondary, margin: 0, fontSize: 14 }}>{t.loading}</p>
      </div>
    </div>
  )

  return (
    // Outer wrapper: always LTR so the nav never flips
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', fontFamily: "'Plus Jakarta Sans','Inter',system-ui,sans-serif", background: C.bg }}>

      {/* ── TOP NAVIGATION BAR ────────────────────────────────────────────── */}
      <nav style={{
        background: C.navBg,
        borderBottom: `1px solid ${C.navBorder}`,
        height: isMobile ? 44 : 56,
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '0 10px' : '0 16px',
        gap: 0,
        flexShrink: 0,
        direction: 'ltr',
      }}>


        {/* Brand logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginRight: isMobile ? 4 : 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #0891b2, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(8,145,178,0.4)', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9h10M4.5 7l1.2-2.5h4.6L11.5 7" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
              <rect x="1.5" y="8.5" width="13" height="4" rx="2" stroke="white" strokeWidth="1.3"/>
              <circle cx="4.5" cy="13" r="1" fill="white" fillOpacity="0.8"/>
              <circle cx="11.5" cy="13" r="1" fill="white" fillOpacity="0.8"/>
            </svg>
          </div>
          {!isMobile && <span style={{ color: '#f8fafc', fontWeight: 800, fontSize: 13, letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>Celox AI</span>}
        </div>

        {/* Nav tabs — desktop only; flex:1 so they take available space, overflow hidden so they never push right controls off screen */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0, overflow: 'hidden', direction: rtl ? 'rtl' : 'ltr' }}>
            {tabs.map(item => {
              const isActive = activeTab === item.id
              return (
                <button key={item.id} onClick={() => switchTab(item.id)} title={item.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: isActive ? C.navActive : C.navText,
                  fontWeight: isActive ? 700 : 400,
                  fontSize: 13,
                  outline: isActive ? '1px solid rgba(255,255,255,0.15)' : 'none',
                  outlineOffset: -1,
                  transition: 'color 0.15s, background 0.15s, transform 0.1s',
                  whiteSpace: 'nowrap',
                }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#e2e8f0' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = C.navText }}
                >
                  <TabIcon id={item.id} size={14} />
                  {item.label}
                  {item.count !== null && (
                    <span style={{
                      background: isActive ? 'rgba(8,145,178,0.5)' : 'rgba(255,255,255,0.15)', color: '#fff',
                      borderRadius: 10, padding: '1px 5px', fontSize: 10, fontWeight: 700,
                    }}>{item.count}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Right side — notifications + sign-out + lang toggle. flexShrink:0 so they are NEVER cut off */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 'auto' }}>
          {activeCompanyId && <NotificationBell companyId={activeCompanyId} userId={session?.user?.id} rtl={rtl} />}
          {installPrompt && (
            <button onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null) }} title={rtl ? 'הוסף לדף הבית' : 'Install app'} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 7, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 15 }}>
              📲
            </button>
          )}
          {isMaster && viewCompanyName && !isMobile && (
            <span style={{
              background: C.primary + '40', color: C.navActive,
              borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              🏢 {viewCompanyName}
            </span>
          )}
          {session && !isMobile && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'rgba(255,255,255,0.85)',
              whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: C.primary,
                color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>
                {session.user.email?.[0]?.toUpperCase()}
              </span>
              {session.user.email?.split('@')[0]}
            </span>
          )}
          {isMaster && onOpenCRM && (
            <button onClick={onOpenCRM} style={{
              background: 'linear-gradient(135deg,#6366f1,#0891b2)', border: 'none',
              color: '#fff', borderRadius: 5,
              padding: isMobile ? '3px 7px' : '4px 9px',
              fontSize: isMobile ? 11 : 12, fontWeight: 700, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>
              {isMobile ? '📊' : '📊 CRM'}
            </button>
          )}
          {session && (
            <button onClick={onSignOut} style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: C.navText, borderRadius: 5,
              padding: isMobile ? '3px 7px' : '4px 9px',
              fontSize: isMobile ? 11 : 12, fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>
              {isMobile ? '↩' : t.signOut}
            </button>
          )}
          <div style={{ display: 'flex', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', overflow: 'hidden' }}>
            {['en', 'he'].map(l => (
              <button key={l} onClick={() => { setLang(l); localStorage.setItem('fleet_lang', l) }} style={{
                padding: isMobile ? '3px 6px' : '4px 10px',
                border: 'none', cursor: 'pointer',
                fontSize: isMobile ? 10 : 11, fontWeight: 700, letterSpacing: '0.04em',
                background: lang === l ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: lang === l ? '#fff' : 'rgba(255,255,255,0.45)',
                transition: 'background 0.15s, color 0.15s, transform 0.1s',
              }}>
                {l === 'en' ? 'EN' : 'HE'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── MOBILE BOTTOM TAB BAR ─────────────────────────────────────────── */}
      {isMobile && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: C.navBg, borderTop: `1px solid ${C.navBorder}`,
          display: 'flex', direction: rtl ? 'rtl' : 'ltr',
          overflowX: 'auto', scrollbarWidth: 'none',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {tabs.map(item => {
            const isActive = activeTab === item.id
            return (
              <button key={item.id} onClick={() => switchTab(item.id)} style={{
                flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 2, padding: '6px 2px',
                border: 'none', cursor: 'pointer', background: 'transparent',
                color: isActive ? '#fff' : C.navText,
                borderTop: isActive ? `2px solid ${C.primary}` : '2px solid transparent',
                transition: 'color 0.15s, transform 0.1s',
              }}>
                <span style={{ display: 'flex', transition: 'transform 0.15s ease-out', transform: isActive ? 'translateY(-1px)' : 'translateY(0)' }}>
                  <TabIcon id={item.id} size={17} />
                </span>
                {isActive && (
                  <span style={{ fontSize: 8, fontWeight: 700, whiteSpace: 'nowrap', padding: '0 2px' }}>{item.label}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      <div dir={rtl ? 'rtl' : 'ltr'} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: isMobile ? 48 : 0 }}>

        {/* Sub-header */}
        <div style={{
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: isMobile ? '0 10px' : '0 24px',
          height: isMobile && activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'violations' && activeTab !== 'reports' ? 'auto' : (isMobile ? 44 : 56),
          minHeight: isMobile ? 44 : 56,
          display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 14, flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          paddingTop: isMobile && activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'violations' && activeTab !== 'reports' ? 8 : 0,
          paddingBottom: isMobile && activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'violations' && activeTab !== 'reports' ? 8 : 0,
        }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? 13 : 17, fontWeight: 700, color: C.textPrimary, flex: 1 }}>
            {activeTabData?.icon} {activeTabData?.label}
          </h2>

          {/* Search + New item — hidden on dashboard, settings, violations, reports */}
          {activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'violations' && activeTab !== 'reports' && <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: isMobile ? '5px 8px' : '6px 12px', width: isMobile ? '100%' : 220, order: isMobile ? 3 : 0 }}>
              <span style={{ fontSize: 12, color: C.textMuted, order: rtl ? 1 : 0 }}>🔍</span>
              <input placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: isMobile ? 12 : 13, color: C.textPrimary, width: '100%', direction: rtl ? 'rtl' : 'ltr' }} />
            </div>
            <button onClick={() => { setShowAdd(true); setEditingId(null) }} className="btn-cta" style={{
              background: `linear-gradient(135deg, ${C.primary}, ${C.indigo})`, color: '#fff', border: 'none',
              borderRadius: 7, padding: isMobile ? '6px 10px' : '8px 18px',
              fontSize: isMobile ? 16 : 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 2px 10px rgba(59,130,246,0.35)', transition: 'opacity 0.15s, transform 0.1s',
              whiteSpace: 'nowrap', minWidth: isMobile ? 34 : 'auto', letterSpacing: '0.01em',
            }}>
              {isMobile ? '+' : t.newItem}
            </button>
            {(activeTab === 'costs' || activeTab === 'cars' || activeTab === 'drivers') && activeCompanyId && (
              <button onClick={() => {
                if (activeTab === 'costs') setShowCsvImport(true)
                else setShowEntityCsvImport(activeTab)
              }} style={{
                background: 'transparent', color: C.primary, border: `1px solid ${C.primary}`,
                borderRadius: 7, padding: isMobile ? '6px 10px' : '7px 14px',
                fontSize: isMobile ? 12 : 13, fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>
                📥 {t.importCsv}
              </button>
            )}
          </>}
        </div>

        {/* Cars / Drivers entity CSV import modal */}
        {showEntityCsvImport && (
          <CsvEntityImportModal
            open={!!showEntityCsvImport}
            onClose={() => setShowEntityCsvImport(null)}
            type={showEntityCsvImport}
            branches={branches}
            cars={cars}
            drivers={drivers}
            companyId={activeCompanyId}
            t={t}
            rtl={rtl}
            onImported={() => { setShowEntityCsvImport(null); loadAll() }}
          />
        )}

        {/* Fuel CSV Import Modal — rendered at top level so it's never clipped */}
        {showCsvImport && (
          <CsvImportModal
            open={showCsvImport}
            onClose={() => setShowCsvImport(false)}
            cars={cars}
            drivers={drivers}
            companyId={activeCompanyId}
            t={t}
            rtl={rtl}
            onImported={() => { setShowCsvImport(false); setCostsReloadKey(k => k + 1) }}
          />
        )}

        {/* ── Animated tab content area ──────────────────────────────────── */}
        <div key={activeTab} className="tab-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Dashboard view */}
        {activeTab === 'dashboard' && (
          <Dashboard cars={cars} drivers={drivers} branches={branches} companyId={activeCompanyId} t={t} rtl={rtl} dashFilter={dashFilter} setDashFilter={setDashFilter} onExport={exportExcel} onNavigate={switchTab} />
        )}

        {/* Settings view */}
        {activeTab === 'settings' && (
          <SettingsTab profile={profile} companyId={activeCompanyId} session={session} isMaster={isMaster} onSelectCompany={switchToCompany} t={t} rtl={rtl} onCustomListsChange={loadAll} onPrivacy={() => setShowPrivacy(true)} onTerms={() => setShowTerms(true)} />
        )}

        {/* Maintenance tab */}
        {activeTab === 'maintenance' && activeCompanyId && (
          <MaintenanceTab cars={cars} companyId={activeCompanyId} t={t} rtl={rtl} customLists={customLists} />
        )}

        {/* Costs tab */}
        {activeTab === 'costs' && activeCompanyId && (
          <CostsTab key={costsReloadKey} cars={cars} drivers={drivers} companyId={activeCompanyId} t={t} rtl={rtl} />
        )}

        {/* Forms tab */}
        {activeTab === 'forms' && activeCompanyId && (
          <FormsTab companyId={activeCompanyId} cars={cars} drivers={drivers} session={session} t={t} rtl={rtl} />
        )}
        {activeTab === 'forms' && isMaster && !activeCompanyId && (
          <MasterLicenseSender session={session} t={t} rtl={rtl} isMobile={isMobile} />
        )}

        {/* Violations tab */}
        {activeTab === 'violations' && activeCompanyId && (
          <ViolationsTab cars={cars} drivers={drivers} companyId={activeCompanyId} rtl={rtl} session={session} />
        )}

        {/* Reports tab */}
        {activeTab === 'reports' && activeCompanyId && (
          <ReportsTab cars={cars} drivers={drivers} companyId={activeCompanyId} t={t} rtl={rtl} />
        )}

        {/* Board */}
        {activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'violations' && activeTab !== 'reports' && activeTab !== 'forms' && isMaster && !activeCompanyId && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: C.textSecondary }}>
            <span style={{ fontSize: 40 }}>🏢</span>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{t.selectCompanyPrompt}</p>
            <p style={{ margin: 0, fontSize: 13 }}>{t.selectCompanyHint}</p>
          </div>
        )}
        {activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'maintenance' && activeTab !== 'costs' && activeTab !== 'forms' && activeTab !== 'violations' && activeTab !== 'reports' && (!isMaster || activeCompanyId) && (
          isMobile ? (
            /* ── MOBILE: card list ─────────────────────────────────────── */
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 70px' }}>
              {/* Group header */}
              <div style={{ background: `linear-gradient(90deg, ${C.primary}, ${C.indigo})`, borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={selectedIds.length > 0 && (activeTab === 'cars' ? filteredCars : activeTab === 'drivers' ? filteredDrivers : filteredBranches).every(x => selectedIds.includes(x.id))}
                    onChange={() => toggleSelectAll(activeTab === 'cars' ? filteredCars : activeTab === 'drivers' ? filteredDrivers : filteredBranches)}
                    style={{ cursor: 'pointer', width: 15, height: 15 }} />
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 600 }}>{t.selectAll}</span>
                </label>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{boardLabel}</span>
                <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{currentCount}</span>
                <div style={{ flex: 1 }} />
                {selectedIds.length > 0 && (
                  <>
                    {(activeTab === 'cars' || activeTab === 'drivers') && branches.length > 0 && (
                      <select onChange={async e => {
                        const branchId = e.target.value; if (!branchId) return
                        const table = activeTab === 'cars' ? 'cars' : 'drivers'
                        await supabase.from(table).update({ branch_id: branchId }).in('id', selectedIds)
                        if (activeTab === 'cars') setCars(p => p.map(x => selectedIds.includes(x.id) ? { ...x, branch_id: branchId } : x))
                        else setDrivers(p => p.map(x => selectedIds.includes(x.id) ? { ...x, branch_id: branchId } : x))
                        setSelectedIds([])
                        e.target.value = ''
                      }} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', fontSize: 11, cursor: 'pointer', background: 'rgba(255,255,255,0.9)', color: C.textPrimary }}>
                        <option value="">🏢 {t.bulkAssign}</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    )}
                    <button onClick={() => bulkDelete(activeTab)} style={{ ...btnDanger, padding: '4px 10px', fontSize: 11 }}>🗑 {selectedIds.length}</button>
                  </>
                )}
              </div>

              {/* Error banner */}
              {crudError && (
                <div style={{ background: C.danger+'10', border: `1px solid ${C.danger}30`, borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: C.danger, fontWeight: 600 }}>⚠ {crudError}</span>
                  <button onClick={() => setCrudError('')} style={{ ...closeBtn, fontSize: 16 }}>×</button>
                </div>
              )}

              {/* Cards */}
              {activeTab === 'cars' && (filteredCars.length === 0
                ? <div style={{ textAlign: 'center', padding: '48px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 40, opacity: 0.2 }}>🚗</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{search ? 'No matches' : 'No vehicles yet'}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{search ? 'Try a different search' : 'Tap + to add your first vehicle'}</div>
                  </div>
                : filteredCars.map(car => (
                    <MobileCarCard key={car.id} car={car} getBranchName={getBranchName} getBranchIdx={getBranchIdx} drivers={drivers}
                      selected={selectedIds.includes(car.id)} onSelect={() => toggleSelect(car.id)}
                      onEdit={() => setEditingId(car.id)} onDelete={() => deleteCar(car.id)}
                      onPhotoChange={file => uploadCarPhoto(car.id, file)} onViewDetail={() => setDetailCar(car)} t={t} rtl={rtl} />
                  ))
              )}
              {activeTab === 'drivers' && (filteredDrivers.length === 0
                ? <div style={{ textAlign: 'center', padding: '48px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 40, opacity: 0.2 }}>👤</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{search ? 'No matches' : 'No drivers yet'}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{search ? 'Try a different search' : 'Tap + to add your first driver'}</div>
                  </div>
                : filteredDrivers.map(driver => (
                    <MobileDriverCard key={driver.id} driver={driver} getBranchName={getBranchName} getBranchIdx={getBranchIdx}
                      selected={selectedIds.includes(driver.id)} onSelect={() => toggleSelect(driver.id)}
                      onEdit={() => setEditingId(driver.id)} onDelete={() => deleteDriver(driver.id)}
                      onViewDetail={() => setDetailDriver(driver)} t={t} rtl={rtl} />
                  ))
              )}
              {activeTab === 'branches' && (filteredBranches.length === 0
                ? <div style={{ textAlign: 'center', padding: '48px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 40, opacity: 0.2 }}>🏢</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{search ? 'No matches' : 'No branches yet'}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{search ? 'Try a different search' : 'Tap + to add your first branch'}</div>
                  </div>
                : filteredBranches.map((branch, i) => (
                    <MobileBranchCard key={branch.id} branch={branch} index={i}
                      selected={selectedIds.includes(branch.id)} onSelect={() => toggleSelect(branch.id)}
                      onEdit={() => setEditingId(branch.id)} onDelete={() => deleteBranch(branch.id)} t={t} rtl={rtl} />
                  ))
              )}

              {/* Mobile form modal (add or edit) */}
              {(showAdd || editingId) && (
                <MobileFormModal
                  mode={showAdd ? 'add' : 'edit'}
                  tab={activeTab}
                  item={editingId ? (activeTab === 'cars' ? cars.find(c => c.id === editingId) : activeTab === 'drivers' ? drivers.find(d => d.id === editingId) : branches.find(b => b.id === editingId)) : null}
                  branches={branches} drivers={drivers} customLists={customLists}
                  onSave={showAdd ? (activeTab === 'cars' ? addCar : activeTab === 'drivers' ? addDriver : addBranch)
                                  : (activeTab === 'cars' ? updateCar : activeTab === 'drivers' ? updateDriver : updateBranch)}
                  onCancel={() => { setShowAdd(false); setEditingId(null) }}
                  t={t} rtl={rtl}
                />
              )}
            </div>
          ) : (
            /* ── DESKTOP: table ────────────────────────────────────────── */
            <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
              <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', animation: 'fadeIn 0.2s ease' }}>

                {/* Group header */}
                <div style={{ background: `linear-gradient(90deg, ${C.primary}, ${C.indigo})`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: '0.01em' }}>{boardLabel}</span>
                  <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{currentCount}</span>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => exportExcel(activeTab)} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    📥 {t.exportExcel}
                  </button>
                  <button onClick={() => exportPDF(activeTab)} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    📄 {t.exportPDF}
                  </button>
                </div>

                {/* Bulk actions bar */}
                {selectedIds.length > 0 && (
                  <div style={{ background: C.primary + '10', borderBottom: `1px solid ${C.primary}30`, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: C.primary, fontWeight: 600 }}>{selectedIds.length} {t.itemsSelected}</span>
                    <button onClick={() => bulkDelete(activeTab)} style={{ ...btnDanger, padding: '5px 14px', fontSize: 11 }}>🗑 {t.bulkDelete}</button>
                    <button onClick={() => setSelectedIds([])} style={{ ...btnGhost, padding: '5px 10px', fontSize: 11 }}>✕</button>
                  </div>
                )}

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...mkTh(rtl, false), width: 50, padding: '11px 12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }} title={t.selectAll}>
                          <input type="checkbox"
                            checked={selectedIds.length > 0 && (activeTab === 'cars' ? filteredCars : activeTab === 'drivers' ? filteredDrivers : filteredBranches).every(x => selectedIds.includes(x.id))}
                            onChange={() => toggleSelectAll(activeTab === 'cars' ? filteredCars : activeTab === 'drivers' ? filteredDrivers : filteredBranches)}
                            style={{ cursor: 'pointer' }} />
                        </label>
                      </th>
                      {activeTab === 'cars' && <>
                        <th style={mkTh(rtl, false)}>{t.plate}</th>
                        <th style={mkTh(rtl, false)}>{t.make} / {t.model}</th>
                        <th style={mkTh(rtl, false)}>{t.year}</th>
                        <th style={mkTh(rtl, false)}>{t.mileage}</th>
                        <th style={mkTh(rtl, false)}>{t.status}</th>
                        <th style={mkTh(rtl, false)}>{t.fuel}</th>
                        <th style={mkTh(rtl, false)}>{t.branch}</th>
                        <th style={mkTh(rtl, false)}>{t.driver}</th>
                        <th style={{ ...mkTh(rtl, false), width: 140 }}>{t.actions}</th>
                      </>}
                      {activeTab === 'drivers' && <>
                        <th style={mkTh(rtl, false)}>{t.name}</th>
                        <th style={mkTh(rtl, false)}>{t.license}</th>
                        <th style={mkTh(rtl, false)}>{t.licenseLevel}</th>
                        <th style={mkTh(rtl, false)}>{t.phone}</th>
                        <th style={mkTh(rtl, false)}>{t.driverStatus}</th>
                        <th style={mkTh(rtl, false)}>{t.branch}</th>
                        <th style={{ ...mkTh(rtl, false), width: 140 }}>{t.actions}</th>
                      </>}
                      {activeTab === 'branches' && <>
                        <th style={mkTh(rtl, false)}>{t.branchName}</th>
                        <th style={mkTh(rtl, false)}>{t.city}</th>
                        <th style={mkTh(rtl, false)}>{t.address}</th>
                        <th style={mkTh(rtl, false)}>{t.manager}</th>
                        <th style={mkTh(rtl, false)}>{t.phone}</th>
                        <th style={{ ...mkTh(rtl, false), width: 140 }}>{t.actions}</th>
                      </>}
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === 'cars' && filteredCars.map(car =>
                      editingId === car.id
                        ? <EditableCarRow key={car.id} car={car} branches={branches} drivers={drivers} onSave={updateCar} onCancel={() => { setEditingId(null); setCrudError('') }} t={t} rtl={rtl} mobile={false} customLists={customLists} />
                        : <CarRow key={car.id} car={car} getBranchName={getBranchName} getBranchIdx={getBranchIdx} drivers={drivers}
                            selected={selectedIds.includes(car.id)} onSelect={() => toggleSelect(car.id)}
                            onEdit={() => setEditingId(car.id)} onDelete={() => deleteCar(car.id)}
                            onPhotoChange={file => uploadCarPhoto(car.id, file)} onMileageUpdate={updateMileage} onViewDetail={() => setDetailCar(car)} t={t} rtl={rtl} mobile={false} />
                    )}
                    {activeTab === 'cars' && filteredCars.length === 0 && !showAdd && (
                      <tr><td colSpan={9} style={{ padding: '52px 24px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 44, opacity: 0.18 }}>🚗</span>
                          <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>{search ? t.noMatches : t.noVehiclesYet}</div>
                          <div style={{ fontSize: 13, color: C.textMuted }}>{search ? t.tryDifferentSearch : t.noCars}</div>
                        </div>
                      </td></tr>
                    )}
                    {activeTab === 'cars' && showAdd && <AddCarRow branches={branches} drivers={drivers} onAdd={addCar} onCancel={() => { setShowAdd(false); setEditingId(null); setCrudError('') }} t={t} rtl={rtl} mobile={false} customLists={customLists} />}

                    {activeTab === 'drivers' && filteredDrivers.map(driver =>
                      editingId === driver.id
                        ? <EditableDriverRow key={driver.id} driver={driver} branches={branches} onSave={updateDriver} onCancel={() => setEditingId(null)} t={t} rtl={rtl} mobile={false} customLists={customLists} />
                        : <DriverRow key={driver.id} driver={driver} getBranchName={getBranchName} getBranchIdx={getBranchIdx}
                            selected={selectedIds.includes(driver.id)} onSelect={() => toggleSelect(driver.id)}
                            onEdit={() => setEditingId(driver.id)} onDelete={() => deleteDriver(driver.id)} onViewDetail={() => setDetailDriver(driver)} t={t} rtl={rtl} mobile={false} />
                    )}
                    {activeTab === 'drivers' && filteredDrivers.length === 0 && !showAdd && (
                      <tr><td colSpan={7} style={{ padding: '52px 24px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 44, opacity: 0.18 }}>👤</span>
                          <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>{search ? t.noMatches : t.noDriversYet}</div>
                          <div style={{ fontSize: 13, color: C.textMuted }}>{search ? t.tryDifferentSearch : t.noDrivers}</div>
                        </div>
                      </td></tr>
                    )}
                    {activeTab === 'drivers' && showAdd && <AddDriverRow branches={branches} onAdd={addDriver} onCancel={() => { setShowAdd(false); setEditingId(null) }} t={t} rtl={rtl} mobile={false} customLists={customLists} />}

                    {activeTab === 'branches' && filteredBranches.map((branch, i) =>
                      editingId === branch.id
                        ? <EditableBranchRow key={branch.id} branch={branch} onSave={updateBranch} onCancel={() => setEditingId(null)} t={t} rtl={rtl} mobile={false} />
                        : <BranchRow key={branch.id} branch={branch} index={i}
                            selected={selectedIds.includes(branch.id)} onSelect={() => toggleSelect(branch.id)}
                            onEdit={() => setEditingId(branch.id)} onDelete={() => deleteBranch(branch.id)} t={t} rtl={rtl} mobile={false} />
                    )}
                    {activeTab === 'branches' && filteredBranches.length === 0 && !showAdd && (
                      <tr><td colSpan={7} style={{ padding: '52px 24px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 44, opacity: 0.18 }}>🏢</span>
                          <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>{search ? t.noMatches : t.noBranchesYet}</div>
                          <div style={{ fontSize: 13, color: C.textMuted }}>{search ? t.tryDifferentSearch : t.noBranches}</div>
                        </div>
                      </td></tr>
                    )}
                    {activeTab === 'branches' && showAdd && <AddBranchRow onAdd={addBranch} onCancel={() => { setShowAdd(false); setEditingId(null) }} t={t} rtl={rtl} mobile={false} />}
                  </tbody>
                </table>
                </div>

                {/* Inline error banner */}
                {crudError && (
                  <div style={{ padding: '10px 18px', background: C.danger + '10', borderTop: `1px solid ${C.danger}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: C.danger, fontWeight: 600 }}>⚠ {crudError}</span>
                    <button onClick={() => setCrudError('')} style={{ ...closeBtn, fontSize: 16 }}>×</button>
                  </div>
                )}

                {/* Footer add link */}
                <div style={{ padding: '8px 18px', borderTop: `1px solid ${C.border}`, background: C.footerBg }}>
                  <button onClick={() => { setShowAdd(true); setEditingId(null); setCrudError('') }} style={{ background: 'transparent', border: 'none', color: C.textSecondary, cursor: 'pointer', fontSize: 13, padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16, color: C.primary, fontWeight: 700 }}>+</span>
                    {t.addItem}
                  </button>
                </div>
              </div>
            </div>
          )
        )}
        </div> {/* end animated tab-content */}
      </div>

      {/* Car Detail modal */}
      {detailCar && (
        <CarDetailModal
          car={detailCar}
          getBranchName={getBranchName}
          drivers={drivers}
          companyId={activeCompanyId}
          t={t}
          rtl={rtl}
          onClose={() => setDetailCar(null)}
        />
      )}

      {/* Driver Detail modal */}
      {detailDriver && (
        <DriverDetailModal
          driver={detailDriver}
          getBranchName={getBranchName}
          cars={cars}
          companyId={activeCompanyId}
          t={t}
          rtl={rtl}
          onClose={() => setDetailDriver(null)}
        />
      )}

      {/* Files modal */}
      {filesFor && (
        <FilesModal
          entity={filesFor.entity}
          entityType={filesFor.entityType}
          companyId={activeCompanyId}
          onClose={() => setFilesFor(null)}
          t={t}
          isMobile={isMobile}
        />
      )}

      {/* Privacy Policy modal */}
      {showPrivacy && (
        <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} t={t} rtl={rtl} />
      )}
      {/* Terms of Service modal */}
      {showTerms && (
        <TermsOfServiceModal onClose={() => setShowTerms(false)} t={t} rtl={rtl} />
      )}
    </div>
  )
}

export default FleetManager
