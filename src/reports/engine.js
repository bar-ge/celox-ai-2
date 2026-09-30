// Report engine: pure functions, no DOM / React / Supabase, so it can be unit-tested in Node
// and reused by a server-side scheduler.
//
// buildReport(id, D, F, opts) -> { id, title, subtitle, kpis, columns, rows, chart, note }
//   D = { cars, drivers, costs, fuel, maint, accidents, violations, leasing, insurance, branches, alerts }
//   F = { from, to, branch, car, driver, category, horizon }     (all optional, '' = any)
//   opts = { he, today: 'YYYY-MM-DD', currency, plate: fn }

const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }
const sum = (arr, f) => arr.reduce((s, x) => s + num(f(x)), 0)
const isoDay = d => d.toISOString().slice(0, 10)

export function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null
  const a = Date.parse(fromIso.slice(0, 10) + 'T00:00:00Z'), b = Date.parse(toIso.slice(0, 10) + 'T00:00:00Z')
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / 86400000)
}

export function datePreset(id, todayIso) {
  const t = new Date(todayIso + 'T00:00:00Z')
  const y = t.getUTCFullYear(), m = t.getUTCMonth()
  const d = (yy, mm, dd) => isoDay(new Date(Date.UTC(yy, mm, dd)))
  switch (id) {
    case 'last30':    return { from: isoDay(new Date(t.getTime() - 29 * 86400000)), to: todayIso }
    case 'thisMonth': return { from: d(y, m, 1), to: d(y, m + 1, 0) }
    case 'lastMonth': return { from: d(y, m - 1, 1), to: d(y, m, 0) }
    case 'thisQuarter': { const q = Math.floor(m / 3) * 3; return { from: d(y, q, 1), to: d(y, q + 3, 0) } }
    case 'thisYear':  return { from: d(y, 0, 1), to: d(y, 11, 31) }
    case 'lastYear':  return { from: d(y - 1, 0, 1), to: d(y - 1, 11, 31) }
    case 'last12':    return { from: isoDay(new Date(Date.UTC(y, m - 11, 1))), to: d(y, m + 1, 0) }
    default:          return null
  }
}

const inRange = (date, F) => !!date && (!F.from || date.slice(0, 10) >= F.from) && (!F.to || date.slice(0, 10) <= F.to)

function ctxOf(D, F, opts) {
  const he = !!opts.he
  const L = (h, e) => he ? h : e
  const cars = D.cars || [], drivers = D.drivers || []
  const carById = new Map(cars.map(c => [String(c.id), c]))
  const drvById = new Map(drivers.map(d => [String(d.id), d]))
  const brById  = new Map((D.branches || []).map(b => [String(b.id), b]))
  const plate = opts.plate || (p => p || '')
  const carLabel = id => { const c = carById.get(String(id)); return c ? `${plate(c.plate)} ${[c.make, c.model].filter(Boolean).join(' ')}`.trim() : '—' }
  const drvName = id => drvById.get(String(id))?.name || '—'
  const branchName = id => brById.get(String(id))?.name || '—'
  const carOk = id => {
    if (F.car && String(id) !== String(F.car)) return false
    if (F.branch) { const c = carById.get(String(id)); if (!c || String(c.branch_id) !== String(F.branch)) return false }
    return true
  }
  // row with both car + driver (costs, fuel, violations)
  const rowOk = (carId, drvId) => {
    if (F.driver && String(drvId) !== String(F.driver)) return false
    if ((F.car || F.branch) && !carOk(carId)) return false
    return true
  }
  const carRowOk = c => carOk(c.id)
  const drvRowOk = d => {
    if (F.driver && String(d.id) !== String(F.driver)) return false
    if (F.branch && String(d.branch_id) !== String(F.branch)) return false
    if (F.car && String(d.car_id) !== String(F.car)) return false
    return true
  }
  const cur = opts.currency || '₪'
  return { D, F, he, L, today: opts.today, cur, plate, carById, drvById, carLabel, drvName, branchName, carOk, rowOk, carRowOk, drvRowOk }
}

const statusHe = { 'In Use': 'בשימוש', Available: 'זמין', Maintenance: 'בתחזוקה', Sold: 'נמכר', Inactive: 'לא פעיל', Active: 'פעיל' }
const statusLabel = (x, s) => x.he ? (statusHe[s] || s || '—') : (s || '—')
const catHe = { Fuel: 'דלק', Insurance: 'ביטוח', Repair: 'תיקון', Maintenance: 'תחזוקה', Tires: 'צמיגים', Tolls: 'כבישי אגרה', Parking: 'חניה', License: 'רישוי', Other: 'אחר' }
const catLabel = (x, c) => x.he ? (catHe[c] || c || '—') : (c || '—')

const monthKey = date => (date || '').slice(0, 7)
export const categoryLabel = (he, c) => he ? (catHe[c] || c || '—') : (c || '—')
const shareCol = x => ({ key: 'share', label: x.L('אחוז מהסך', 'Share'), type: 'pct' })

function monthsBetween(from, to) {
  if (!from || !to) return []
  const out = []
  let y = +from.slice(0, 4), m = +from.slice(5, 7)
  const ey = +to.slice(0, 4), em = +to.slice(5, 7)
  while (y < ey || (y === ey && m <= em)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++ } if (out.length > 120) break }
  return out
}

// ── Cost helpers ────────────────────────────────────────────────────────────
function costRows(x) {
  const { D, F } = x
  return (D.costs || []).filter(c => inRange(c.date, F) && x.rowOk(c.car_id, c.driver_id) && (!F.category || c.category === F.category))
}
const costAmt = c => num(c.amount)

function kmDriven(rows) {
  // km from odometer readings in the period (max - min), only with >= 2 readings
  const odo = rows.map(r => num(r.odometer)).filter(v => v > 0)
  if (odo.length < 2) return null
  const km = Math.max(...odo) - Math.min(...odo)
  return km > 0 ? km : null
}

// ── Reports ─────────────────────────────────────────────────────────────────
const R = {}

R.fleet_status = x => {
  const cars = x.D.cars.filter(x.carRowOk)
  const rows = cars.map(c => ({
    plate: x.plate(c.plate), vehicle: [c.make, c.model].filter(Boolean).join(' '), year: c.year || '',
    status: statusLabel(x, c.status), branch: c.branch_id ? x.branchName(c.branch_id) : '—',
    driver: c.driver_id ? x.drvName(c.driver_id) : '—', mileage: num(c.mileage) || null, fuel: c.fuel || '',
    regExpiry: c.registration_expiry || '',
  }))
  const by = s => cars.filter(c => c.status === s).length
  const statuses = [...new Set(cars.map(c => c.status || '—'))]
  return {
    kpis: [
      { label: x.L('סה"כ רכבים', 'Total vehicles'), value: cars.length },
      { label: x.L('בשימוש', 'In use'), value: by('In Use'), tone: 'ok' },
      { label: x.L('זמינים', 'Available'), value: by('Available') },
      { label: x.L('בתחזוקה', 'In maintenance'), value: by('Maintenance'), tone: by('Maintenance') ? 'warn' : undefined },
      { label: x.L('ללא נהג', 'No driver'), value: cars.filter(c => !c.driver_id).length },
    ],
    columns: [
      { key: 'plate', label: x.L('לוחית', 'Plate') }, { key: 'vehicle', label: x.L('רכב', 'Vehicle') }, { key: 'year', label: x.L('שנה', 'Year') },
      { key: 'status', label: x.L('סטטוס', 'Status') }, { key: 'branch', label: x.L('סניף', 'Branch') }, { key: 'driver', label: x.L('נהג', 'Driver') },
      { key: 'mileage', label: x.L('ק"מ', 'Mileage'), type: 'num' }, { key: 'fuel', label: x.L('דלק', 'Fuel') }, { key: 'regExpiry', label: x.L('תוקף רישוי', 'Registration expiry'), type: 'date' },
    ],
    rows,
    chart: { title: x.L('רכבים לפי סטטוס', 'Vehicles by status'), items: statuses.map(s => ({ label: statusLabel(x, s), value: cars.filter(c => (c.status || '—') === s).length })) },
  }
}

R.fleet_by_branch = x => {
  const cars = x.D.cars.filter(x.carRowOk)
  const drivers = x.D.drivers.filter(d => !x.F.branch || String(d.branch_id) === String(x.F.branch))
  const ids = [...new Set([...cars.map(c => c.branch_id || ''), ...drivers.map(d => d.branch_id || '')])]
  const rows = ids.map(b => {
    const cs = cars.filter(c => (c.branch_id || '') === b)
    const odo = cs.map(c => num(c.mileage))
    return {
      branch: b ? x.branchName(b) : x.L('ללא סניף', 'No branch'), cars: cs.length,
      inUse: cs.filter(c => c.status === 'In Use').length, maint: cs.filter(c => c.status === 'Maintenance').length,
      drivers: drivers.filter(d => (d.branch_id || '') === b).length,
      avgMileage: cs.length ? Math.round(sum(cs, c => c.mileage) / cs.length) : null, maxMileage: odo.length ? Math.max(...odo) : null,
    }
  }).sort((a, b) => b.cars - a.cars)
  return {
    kpis: [{ label: x.L('סניפים', 'Branches'), value: ids.filter(Boolean).length }, { label: x.L('רכבים', 'Vehicles'), value: cars.length }, { label: x.L('נהגים', 'Drivers'), value: drivers.length }],
    columns: [
      { key: 'branch', label: x.L('סניף', 'Branch') }, { key: 'cars', label: x.L('רכבים', 'Vehicles'), type: 'num', total: true },
      { key: 'inUse', label: x.L('בשימוש', 'In use'), type: 'num', total: true }, { key: 'maint', label: x.L('בתחזוקה', 'Maintenance'), type: 'num', total: true },
      { key: 'drivers', label: x.L('נהגים', 'Drivers'), type: 'num', total: true }, { key: 'avgMileage', label: x.L('ק"מ ממוצע', 'Avg mileage'), type: 'num' },
    ],
    rows,
    chart: { title: x.L('רכבים לפי סניף', 'Vehicles per branch'), items: rows.map(r => ({ label: r.branch, value: r.cars })) },
  }
}

R.cost_summary = x => {
  const rows0 = costRows(x)
  const total = sum(rows0, costAmt)
  const by = {}
  rows0.forEach(c => { const k = c.category || '—'; by[k] = by[k] || { n: 0, v: 0 }; by[k].n++; by[k].v += costAmt(c) })
  const rows = Object.entries(by).sort((a, b) => b[1].v - a[1].v).map(([k, o]) => ({ category: catLabel(x, k), count: o.n, amount: o.v, avg: o.n ? o.v / o.n : 0, share: total ? o.v / total : 0 }))
  const vehicles = new Set(rows0.map(c => c.car_id).filter(Boolean)).size
  return {
    kpis: [
      { label: x.L('סה"כ הוצאות', 'Total spend'), value: total, type: 'money' }, { label: x.L('מספר רשומות', 'Records'), value: rows0.length },
      { label: x.L('ממוצע לרכב', 'Avg per vehicle'), value: vehicles ? total / vehicles : 0, type: 'money' }, { label: x.L('קטגוריה מובילה', 'Top category'), value: rows[0]?.category || '—' },
    ],
    columns: [
      { key: 'category', label: x.L('קטגוריה', 'Category') }, { key: 'count', label: x.L('רשומות', 'Records'), type: 'num', total: true },
      { key: 'amount', label: x.L('סכום', 'Amount'), type: 'money', total: true }, { key: 'avg', label: x.L('ממוצע', 'Average'), type: 'money' }, shareCol(x),
    ],
    rows, chart: { title: x.L('הוצאות לפי קטגוריה', 'Spend by category'), items: rows.map(r => ({ label: r.category, value: r.amount })), money: true },
  }
}

R.cost_by_vehicle = x => {
  const rows0 = costRows(x)
  const ids = [...new Set(rows0.map(c => String(c.car_id || '')))]
  const total = sum(rows0, costAmt)
  const rows = ids.map(id => {
    const rs = rows0.filter(c => String(c.car_id || '') === id)
    const amount = sum(rs, costAmt), fuel = sum(rs.filter(c => c.category === 'Fuel'), costAmt)
    const km = kmDriven(rs)
    return { vehicle: id ? x.carLabel(id) : x.L('ללא רכב', 'No vehicle'), branch: id && x.carById.get(id)?.branch_id ? x.branchName(x.carById.get(id).branch_id) : '—', count: rs.length, fuel, other: amount - fuel, amount, km, perKm: km ? amount / km : null, share: total ? amount / total : 0 }
  }).sort((a, b) => b.amount - a.amount)
  return {
    kpis: [{ label: x.L('סה"כ הוצאות', 'Total spend'), value: total, type: 'money' }, { label: x.L('רכבים עם הוצאות', 'Vehicles with spend'), value: rows.length }, { label: x.L('הרכב היקר ביותר', 'Most expensive'), value: rows[0]?.vehicle || '—' }],
    columns: [
      { key: 'vehicle', label: x.L('רכב', 'Vehicle') }, { key: 'branch', label: x.L('סניף', 'Branch') }, { key: 'count', label: x.L('רשומות', 'Records'), type: 'num', total: true },
      { key: 'fuel', label: x.L('דלק', 'Fuel'), type: 'money', total: true }, { key: 'other', label: x.L('אחר', 'Other'), type: 'money', total: true }, { key: 'amount', label: x.L('סה"כ', 'Total'), type: 'money', total: true },
      { key: 'km', label: x.L('ק"מ בתקופה', 'Km in period'), type: 'num' }, { key: 'perKm', label: x.L('עלות לק"מ', 'Cost per km'), type: 'money2' }, shareCol(x),
    ],
    rows, chart: { title: x.L('10 הרכבים היקרים', 'Top 10 vehicles by spend'), items: rows.slice(0, 10).map(r => ({ label: r.vehicle, value: r.amount })), money: true },
    note: x.L('ק"מ בתקופה מחושב מקריאות מונה (הגבוהה פחות הנמוכה) ומוצג רק כשיש שתי קריאות לפחות.', 'Km in period is computed from odometer readings (highest minus lowest) and shown only with at least two readings.'),
  }
}

R.cost_by_driver = x => {
  const rows0 = costRows(x)
  const ids = [...new Set(rows0.map(c => String(c.driver_id || '')))]
  const total = sum(rows0, costAmt)
  const rows = ids.map(id => {
    const rs = rows0.filter(c => String(c.driver_id || '') === id), amount = sum(rs, costAmt)
    return { driver: id ? x.drvName(id) : x.L('לא משויך לנהג', 'No driver'), count: rs.length, amount, avg: rs.length ? amount / rs.length : 0, share: total ? amount / total : 0 }
  }).sort((a, b) => b.amount - a.amount)
  return {
    kpis: [{ label: x.L('סה"כ הוצאות', 'Total spend'), value: total, type: 'money' }, { label: x.L('נהגים', 'Drivers'), value: rows.filter(r => r.driver !== x.L('לא משויך לנהג', 'No driver')).length }],
    columns: [{ key: 'driver', label: x.L('נהג', 'Driver') }, { key: 'count', label: x.L('רשומות', 'Records'), type: 'num', total: true }, { key: 'amount', label: x.L('סכום', 'Amount'), type: 'money', total: true }, { key: 'avg', label: x.L('ממוצע', 'Average'), type: 'money' }, shareCol(x)],
    rows, chart: { title: x.L('10 הנהגים המובילים', 'Top 10 drivers by spend'), items: rows.slice(0, 10).map(r => ({ label: r.driver, value: r.amount })), money: true },
  }
}

R.cost_monthly = x => {
  const rows0 = costRows(x)
  const keys = monthsBetween(x.F.from || rows0.map(c => c.date).sort()[0], x.F.to || x.today)
  const cats = [...new Set(rows0.map(c => c.category || '—'))]
  let prev = null
  const rows = keys.map(k => {
    const rs = rows0.filter(c => monthKey(c.date) === k), amount = sum(rs, costAmt)
    const row = { month: k, count: rs.length, fuel: sum(rs.filter(c => c.category === 'Fuel'), costAmt), other: 0, amount, change: prev != null && prev > 0 ? (amount - prev) / prev : null }
    row.other = amount - row.fuel; prev = amount; return row
  })
  const nonEmpty = rows.filter(r => r.count)
  return {
    kpis: [
      { label: x.L('סה"כ הוצאות', 'Total spend'), value: sum(rows, r => r.amount), type: 'money' },
      { label: x.L('ממוצע חודשי', 'Monthly average'), value: nonEmpty.length ? sum(nonEmpty, r => r.amount) / nonEmpty.length : 0, type: 'money' },
      { label: x.L('החודש היקר ביותר', 'Highest month'), value: nonEmpty.length ? [...nonEmpty].sort((a, b) => b.amount - a.amount)[0].month : '—' },
      { label: x.L('קטגוריות', 'Categories'), value: cats.length },
    ],
    columns: [
      { key: 'month', label: x.L('חודש', 'Month') }, { key: 'count', label: x.L('רשומות', 'Records'), type: 'num', total: true }, { key: 'fuel', label: x.L('דלק', 'Fuel'), type: 'money', total: true },
      { key: 'other', label: x.L('אחר', 'Other'), type: 'money', total: true }, { key: 'amount', label: x.L('סה"כ', 'Total'), type: 'money', total: true }, { key: 'change', label: x.L('שינוי מחודש קודם', 'Change vs prior month'), type: 'pct' },
    ],
    rows, chart: { title: x.L('הוצאות לפי חודש', 'Spend by month'), items: rows.map(r => ({ label: r.month, value: r.amount })), money: true },
  }
}

R.fuel = x => {
  const { D, F } = x
  const fr = (D.fuel || []).filter(r => inRange(r.fuel_date, F) && x.rowOk(r.car_id, r.driver_id))
  const useRecords = fr.length > 0
  const src = useRecords ? fr.map(r => ({ car_id: r.car_id, date: r.fuel_date, amount: num(r.total_amount), liters: num(r.liters), odometer: r.odometer })) : costRows(x).filter(c => c.category === 'Fuel').map(c => ({ car_id: c.car_id, date: c.date, amount: costAmt(c), liters: 0, odometer: c.odometer }))
  const ids = [...new Set(src.map(r => String(r.car_id || '')))]
  const total = sum(src, r => r.amount), liters = sum(src, r => r.liters)
  const rows = ids.map(id => {
    const rs = src.filter(r => String(r.car_id || '') === id), amount = sum(rs, r => r.amount), l = sum(rs, r => r.liters), km = kmDriven(rs)
    return { vehicle: id ? x.carLabel(id) : x.L('ללא רכב', 'No vehicle'), fills: rs.length, liters: l || null, amount, perLiter: l ? amount / l : null, km, kmPerL: l && km ? km / l : null, perKm: km ? amount / km : null }
  }).sort((a, b) => b.amount - a.amount)
  return {
    kpis: [
      { label: x.L('הוצאות דלק', 'Fuel spend'), value: total, type: 'money' }, { label: x.L('תדלוקים', 'Fill-ups'), value: src.length },
      { label: x.L('ליטרים', 'Litres'), value: liters ? Math.round(liters) : '—' }, { label: x.L('מחיר ממוצע לליטר', 'Avg price per litre'), value: liters ? total / liters : '—', type: liters ? 'money2' : undefined },
    ],
    columns: [
      { key: 'vehicle', label: x.L('רכב', 'Vehicle') }, { key: 'fills', label: x.L('תדלוקים', 'Fill-ups'), type: 'num', total: true }, { key: 'liters', label: x.L('ליטרים', 'Litres'), type: 'num', total: true },
      { key: 'amount', label: x.L('סכום', 'Amount'), type: 'money', total: true }, { key: 'perLiter', label: x.L('מחיר לליטר', 'Price / litre'), type: 'money2' },
      { key: 'km', label: x.L('ק"מ', 'Km'), type: 'num' }, { key: 'kmPerL', label: x.L('ק"מ לליטר', 'Km / litre'), type: 'dec' }, { key: 'perKm', label: x.L('עלות לק"מ', 'Cost / km'), type: 'money2' },
    ],
    rows, chart: { title: x.L('דלק לפי רכב (10 מובילים)', 'Fuel spend by vehicle (top 10)'), items: rows.slice(0, 10).map(r => ({ label: r.vehicle, value: r.amount })), money: true },
    note: useRecords ? undefined : x.L('אין רשומות תדלוק מפורטות, לכן הדוח מבוסס על קטגוריית "דלק" בהוצאות (ללא ליטרים).', 'There are no detailed fuel records, so this report uses the "Fuel" cost category (no litres).'),
  }
}

R.maintenance = x => {
  const { D, F, today } = x
  const ms = (D.maint || []).filter(m => x.carOk(m.car_id))
  const done = ms.filter(m => inRange(m.date, F))
  const due = ms.filter(m => m.next_due)
  const rows = done.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(m => ({ date: m.date, vehicle: x.carLabel(m.car_id), type: m.type || '', description: m.description || '', mileage: num(m.mileage) || null, cost: num(m.cost), nextDue: m.next_due || '', status: m.status || '' }))
  const overdue = due.filter(m => m.status !== 'Completed' && daysBetween(today, m.next_due) < 0).length
  return {
    kpis: [{ label: x.L('טיפולים בתקופה', 'Services in period'), value: done.length }, { label: x.L('עלות כוללת', 'Total cost'), value: sum(done, m => m.cost), type: 'money' }, { label: x.L('טיפולים באיחור', 'Overdue services'), value: overdue, tone: overdue ? 'bad' : 'ok' }],
    columns: [
      { key: 'date', label: x.L('תאריך', 'Date'), type: 'date' }, { key: 'vehicle', label: x.L('רכב', 'Vehicle') }, { key: 'type', label: x.L('סוג', 'Type') }, { key: 'description', label: x.L('תיאור', 'Description') },
      { key: 'mileage', label: x.L('ק"מ', 'Mileage'), type: 'num' }, { key: 'cost', label: x.L('עלות', 'Cost'), type: 'money', total: true }, { key: 'nextDue', label: x.L('טיפול הבא', 'Next due'), type: 'date' }, { key: 'status', label: x.L('סטטוס', 'Status') },
    ],
    rows,
  }
}

const ALERT_TYPE_HE = { maintenance: 'טיפול', document: 'מסמך', license: 'רישיון נהג', custom: 'תזכורת', insurance: 'ביטוח', test: 'טסט', registration: 'רישוי', leasing: 'ליסינג', certification: 'הסמכה' }
R.expiry = x => {
  const { D, F, today } = x
  const horizon = F.horizon === '' || F.horizon == null ? 90 : +F.horizon
  const rows = (D.alerts || []).map(a => ({ type: x.he ? (ALERT_TYPE_HE[a.type] || a.type) : (a.type || ''), item: a.label || '', entity: a.entity_name || '', date: a.date, days: daysBetween(today, a.date) }))
    .filter(r => r.days != null && (horizon === 0 || r.days <= horizon)).sort((a, b) => a.days - b.days)
  const overdue = rows.filter(r => r.days < 0).length
  const types = [...new Set(rows.map(r => r.type))]
  return {
    kpis: [{ label: x.L('פג תוקף / באיחור', 'Expired / overdue'), value: overdue, tone: overdue ? 'bad' : 'ok' }, { label: x.L('ב-30 ימים הקרובים', 'Next 30 days'), value: rows.filter(r => r.days >= 0 && r.days <= 30).length, tone: 'warn' }, { label: x.L('סה"כ', 'Total'), value: rows.length }],
    columns: [{ key: 'type', label: x.L('סוג', 'Type') }, { key: 'item', label: x.L('תיאור', 'Description') }, { key: 'entity', label: x.L('רכב / נהג', 'Vehicle / driver') }, { key: 'date', label: x.L('תאריך', 'Date'), type: 'date' }, { key: 'days', label: x.L('ימים', 'Days'), type: 'days' }],
    rows, chart: { title: x.L('לפי סוג', 'By type'), items: types.map(t => ({ label: t, value: rows.filter(r => r.type === t).length })) },
    note: x.L('מקור הנתונים זהה ללשונית ההתראות והמייל היומי: רישיונות, מסמכים, טיפולים ותזכורות.', 'Same source as the Alerts tab and the daily email: licences, documents, services and reminders.'),
  }
}

R.drivers = x => {
  const drivers = x.D.drivers.filter(x.drvRowOk)
  const rows = drivers.map(d => ({ name: d.name, phone: d.phone || '', branch: d.branch_id ? x.branchName(d.branch_id) : '—', vehicle: d.car_id ? x.carLabel(d.car_id) : '—', status: statusLabel(x, d.status), levels: Array.isArray(d.license_levels) ? d.license_levels.join(', ') : (d.license_levels || ''), expiry: d.license_expiry || '', days: daysBetween(x.today, d.license_expiry) }))
    .sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999))
  const expired = rows.filter(r => r.days != null && r.days < 0).length
  return {
    kpis: [{ label: x.L('נהגים', 'Drivers'), value: rows.length }, { label: x.L('רישיון פג תוקף', 'Licence expired'), value: expired, tone: expired ? 'bad' : 'ok' }, { label: x.L('פג תוקף ב-60 יום', 'Expiring in 60 days'), value: rows.filter(r => r.days != null && r.days >= 0 && r.days <= 60).length, tone: 'warn' }, { label: x.L('ללא רכב', 'No vehicle'), value: rows.filter(r => r.vehicle === '—').length }, { label: x.L('ללא תאריך תוקף', 'No expiry on file'), value: rows.filter(r => r.days == null).length }],
    columns: [{ key: 'name', label: x.L('שם', 'Name') }, { key: 'phone', label: x.L('טלפון', 'Phone') }, { key: 'branch', label: x.L('סניף', 'Branch') }, { key: 'vehicle', label: x.L('רכב', 'Vehicle') }, { key: 'status', label: x.L('סטטוס', 'Status') }, { key: 'levels', label: x.L('דרגות', 'Levels') }, { key: 'expiry', label: x.L('תוקף רישיון', 'Licence expiry'), type: 'date' }, { key: 'days', label: x.L('ימים', 'Days'), type: 'days' }],
    rows,
  }
}

R.violations = x => {
  const { D, F } = x
  const vs = (D.violations || []).filter(v => inRange(v.violation_date, F) && x.rowOk(v.car_id, v.driver_id))
  const unpaid = vs.filter(v => (v.payment_status || '').toLowerCase() !== 'paid')
  const rows = vs.sort((a, b) => (b.violation_date || '').localeCompare(a.violation_date || '')).map(v => ({ date: v.violation_date, vehicle: v.car_id ? x.carLabel(v.car_id) : v.plate || '—', driver: v.driver_id ? x.drvName(v.driver_id) : '—', type: v.violation_type || '', location: v.location || '', amount: num(v.amount), status: v.payment_status || v.status || '' }))
  const byDrv = {}; vs.forEach(v => { const k = v.driver_id ? x.drvName(v.driver_id) : '—'; byDrv[k] = (byDrv[k] || 0) + 1 })
  return {
    kpis: [{ label: x.L('דוחות', 'Fines'), value: vs.length }, { label: x.L('סכום כולל', 'Total amount'), value: sum(vs, v => v.amount), type: 'money' }, { label: x.L('לא שולמו', 'Unpaid'), value: unpaid.length, tone: unpaid.length ? 'warn' : 'ok' }, { label: x.L('סכום שלא שולם', 'Unpaid amount'), value: sum(unpaid, v => v.amount), type: 'money' }],
    columns: [{ key: 'date', label: x.L('תאריך', 'Date'), type: 'date' }, { key: 'vehicle', label: x.L('רכב', 'Vehicle') }, { key: 'driver', label: x.L('נהג', 'Driver') }, { key: 'type', label: x.L('סוג', 'Type') }, { key: 'location', label: x.L('מיקום', 'Location') }, { key: 'amount', label: x.L('סכום', 'Amount'), type: 'money', total: true }, { key: 'status', label: x.L('תשלום', 'Payment') }],
    rows, chart: { title: x.L('דוחות לפי נהג (10 מובילים)', 'Fines by driver (top 10)'), items: Object.entries(byDrv).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, value]) => ({ label, value })) },
  }
}

R.accidents = x => {
  const as = (x.D.accidents || []).filter(a => inRange(a.incident_date, x.F) && x.carOk(a.my_car_id))
  const rows = as.sort((a, b) => (b.incident_date || '').localeCompare(a.incident_date || '')).map(a => ({ date: a.incident_date, vehicle: x.carLabel(a.my_car_id), other: [a.other_plate, a.other_driver_name].filter(Boolean).join(' · '), insurer: a.insurance_company || '', claim: a.claim_file_number || '', claimStatus: a.claim_status || '', police: a.police_report ? x.L('כן', 'Yes') : x.L('לא', 'No'), status: a.status || '' }))
  return {
    kpis: [{ label: x.L('תאונות', 'Accidents'), value: as.length }, { label: x.L('עם דוח משטרה', 'With police report'), value: as.filter(a => a.police_report).length }, { label: x.L('תביעות פתוחות', 'Open claims'), value: as.filter(a => a.claim_file_number && !/closed|סגור|paid|שולם/i.test(a.claim_status || '')).length }],
    columns: [{ key: 'date', label: x.L('תאריך', 'Date'), type: 'date' }, { key: 'vehicle', label: x.L('רכב', 'Vehicle') }, { key: 'other', label: x.L('צד שני', 'Other party') }, { key: 'insurer', label: x.L('מבטח', 'Insurer') }, { key: 'claim', label: x.L('תיק תביעה', 'Claim no.') }, { key: 'claimStatus', label: x.L('סטטוס תביעה', 'Claim status') }, { key: 'police', label: x.L('משטרה', 'Police') }],
    rows,
  }
}

R.leasing = x => {
  const ls = (x.D.leasing || []).filter(l => x.carOk(l.car_id))
  const rows = ls.map(l => { const end = l.extension_end_date || l.end_date; return { vehicle: x.carLabel(l.car_id), company: l.leasing_company || '', contract: l.contract_number || '', type: l.ownership_type || '', monthly: num(l.monthly_payment), start: l.start_date || '', end: end || '', days: daysBetween(x.today, end), remaining: l.total_payments ? Math.max(0, num(l.total_payments) - num(l.payments_made)) : null } }).sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999))
  const active = rows.filter(r => r.days == null || r.days >= 0)
  return {
    kpis: [{ label: x.L('חוזים', 'Contracts'), value: rows.length }, { label: x.L('תשלום חודשי כולל (פעילים)', 'Monthly total (active)'), value: sum(active, r => r.monthly), type: 'money' }, { label: x.L('מסתיימים ב-90 יום', 'Ending in 90 days'), value: rows.filter(r => r.days != null && r.days >= 0 && r.days <= 90).length, tone: 'warn' }],
    columns: [{ key: 'vehicle', label: x.L('רכב', 'Vehicle') }, { key: 'company', label: x.L('חברת ליסינג', 'Leasing company') }, { key: 'contract', label: x.L('חוזה', 'Contract') }, { key: 'type', label: x.L('סוג', 'Type') }, { key: 'monthly', label: x.L('תשלום חודשי', 'Monthly'), type: 'money', total: true }, { key: 'end', label: x.L('סיום', 'End'), type: 'date' }, { key: 'days', label: x.L('ימים', 'Days'), type: 'days' }, { key: 'remaining', label: x.L('תשלומים שנותרו', 'Payments left'), type: 'num' }],
    rows,
  }
}

R.insurance = x => {
  const is = (x.D.insurance || []).filter(p => x.carOk(p.car_id))
  const rows = is.map(p => ({ vehicle: x.carLabel(p.car_id), insurer: p.insurer || '', type: p.policy_type || '', policy: p.policy_number || '', premium: num(p.premium), deductible: num(p.deductible) || null, start: p.start_date || '', expiry: p.expiry_date || '', days: daysBetween(x.today, p.expiry_date) })).sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999))
  return {
    kpis: [{ label: x.L('פוליסות', 'Policies'), value: rows.length }, { label: x.L('פרמיה כוללת', 'Total premium'), value: sum(rows, r => r.premium), type: 'money' }, { label: x.L('פגו תוקף', 'Expired'), value: rows.filter(r => r.days != null && r.days < 0).length, tone: 'bad' }, { label: x.L('יפוגו ב-60 יום', 'Expiring in 60 days'), value: rows.filter(r => r.days != null && r.days >= 0 && r.days <= 60).length, tone: 'warn' }],
    columns: [{ key: 'vehicle', label: x.L('רכב', 'Vehicle') }, { key: 'insurer', label: x.L('מבטח', 'Insurer') }, { key: 'type', label: x.L('סוג', 'Type') }, { key: 'policy', label: x.L('פוליסה', 'Policy') }, { key: 'premium', label: x.L('פרמיה', 'Premium'), type: 'money', total: true }, { key: 'expiry', label: x.L('תוקף', 'Expiry'), type: 'date' }, { key: 'days', label: x.L('ימים', 'Days'), type: 'days' }],
    rows,
  }
}

R.tco = x => {
  // total cost of ownership per vehicle: lease/purchase + running costs in the period
  const cars = x.D.cars.filter(x.carRowOk)
  const costs = costRows(x)
  const months = Math.max(1, monthsBetween(x.F.from || x.today.slice(0, 4) + '-01-01', x.F.to || x.today).length)
  const rows = cars.map(c => {
    const run = sum(costs.filter(k => String(k.car_id) === String(c.id)), costAmt)
    const lease = (x.D.leasing || []).find(l => String(l.car_id) === String(c.id))
    const leaseCost = lease ? num(lease.monthly_payment) * months : 0
    const total = run + leaseCost
    return { vehicle: x.carLabel(c.id), running: run, lease: leaseCost, total, perMonth: total / months, purchase: num(c.purchase_price) || null }
  }).filter(r => r.total > 0).sort((a, b) => b.total - a.total)
  return {
    kpis: [{ label: x.L('עלות כוללת', 'Total cost'), value: sum(rows, r => r.total), type: 'money' }, { label: x.L('חודשים בתקופה', 'Months in period'), value: months }, { label: x.L('ממוצע לרכב לחודש', 'Avg per vehicle / month'), value: rows.length ? sum(rows, r => r.perMonth) / rows.length : 0, type: 'money' }],
    columns: [{ key: 'vehicle', label: x.L('רכב', 'Vehicle') }, { key: 'running', label: x.L('הוצאות שוטפות', 'Running costs'), type: 'money', total: true }, { key: 'lease', label: x.L('ליסינג בתקופה', 'Leasing in period'), type: 'money', total: true }, { key: 'total', label: x.L('סה"כ', 'Total'), type: 'money', total: true }, { key: 'perMonth', label: x.L('לחודש', 'Per month'), type: 'money' }, { key: 'purchase', label: x.L('מחיר רכישה', 'Purchase price'), type: 'money' }],
    rows, chart: { title: x.L('10 הרכבים היקרים', 'Top 10 by total cost'), items: rows.slice(0, 10).map(r => ({ label: r.vehicle, value: r.total })), money: true },
  }
}

// ── Catalog ─────────────────────────────────────────────────────────────────
// uses: which filters apply ('date','branch','car','driver','category','horizon')
export const REPORT_CATALOG = [
  { id: 'fleet_status',   group: 'fleet',    he: 'סטטוס הצי',            en: 'Fleet status',           uses: ['branch', 'car'],                                  data: ['cars'] },
  { id: 'fleet_by_branch', group: 'fleet',   he: 'צי לפי סניף',          en: 'Fleet by branch',        uses: ['branch'],                                         data: ['cars', 'drivers'] },
  { id: 'drivers',        group: 'fleet',    he: 'נהגים ורישיונות',       en: 'Drivers & licences',     uses: ['branch', 'car', 'driver'],                        data: ['drivers'] },
  { id: 'cost_summary',   group: 'costs',    he: 'סיכום הוצאות',         en: 'Cost summary',           uses: ['date', 'branch', 'car', 'driver', 'category'],    data: ['costs'] },
  { id: 'cost_by_vehicle', group: 'costs',   he: 'הוצאות לפי רכב',       en: 'Cost by vehicle',        uses: ['date', 'branch', 'car', 'driver', 'category'],    data: ['costs'] },
  { id: 'cost_by_driver', group: 'costs',    he: 'הוצאות לפי נהג',       en: 'Cost by driver',         uses: ['date', 'branch', 'car', 'driver', 'category'],    data: ['costs'] },
  { id: 'cost_monthly',   group: 'costs',    he: 'מגמה חודשית',          en: 'Monthly trend',          uses: ['date', 'branch', 'car', 'driver', 'category'],    data: ['costs'] },
  { id: 'tco',            group: 'costs',    he: 'עלות כוללת לרכב (TCO)', en: 'Total cost per vehicle', uses: ['date', 'branch', 'car', 'category'],              data: ['costs', 'leasing'] },
  { id: 'fuel',           group: 'costs',    he: 'דלק וצריכה',           en: 'Fuel & consumption',     uses: ['date', 'branch', 'car', 'driver'],                data: ['fuel', 'costs'] },
  { id: 'maintenance',    group: 'service',  he: 'תחזוקה וטיפולים',      en: 'Maintenance',            uses: ['date', 'branch', 'car'],                          data: ['maint'] },
  { id: 'expiry',         group: 'service',  he: 'תוקפים והתראות',       en: 'Expiries & alerts',      uses: ['horizon'],                                        data: ['alerts'] },
  { id: 'violations',     group: 'risk',     he: 'דוחות תנועה',          en: 'Traffic fines',          uses: ['date', 'branch', 'car', 'driver'],                data: ['violations'] },
  { id: 'accidents',      group: 'risk',     he: 'תאונות ותביעות',       en: 'Accidents & claims',     uses: ['date', 'branch', 'car'],                          data: ['accidents'] },
  { id: 'insurance',      group: 'risk',     he: 'ביטוח',                en: 'Insurance',              uses: ['branch', 'car'],                                  data: ['insurance'] },
  { id: 'leasing',        group: 'risk',     he: 'ליסינג וחוזים',        en: 'Leasing & contracts',    uses: ['branch', 'car'],                                  data: ['leasing'] },
]
export const REPORT_GROUPS = { fleet: ['צי ונהגים', 'Fleet & drivers'], costs: ['עלויות', 'Costs'], service: ['שירות ותוקפים', 'Service & expiries'], risk: ['סיכון וחוזים', 'Risk & contracts'] }

export function buildReport(id, D, F = {}, opts = {}) {
  const meta = REPORT_CATALOG.find(r => r.id === id)
  if (!meta || !R[id]) throw new Error(`unknown report: ${id}`)
  const today = opts.today || isoDay(new Date())
  const x = ctxOf({ cars: [], drivers: [], costs: [], fuel: [], maint: [], accidents: [], violations: [], leasing: [], insurance: [], branches: [], alerts: [], ...D }, F, { ...opts, today })
  const out = R[id](x)
  const usesDate = meta.uses.includes('date')
  const subtitle = usesDate && (F.from || F.to) ? `${F.from || '…'} – ${F.to || '…'}` : x.he ? `נכון ל-${today}` : `As of ${today}`
  return { id, title: x.he ? meta.he : meta.en, subtitle, he: x.he, cur: x.cur, today, ...out, rows: out.rows || [], kpis: out.kpis || [] }
}

// ── Formatting shared by UI, exports and email ──────────────────────────────
const fmtN = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
export function fmtValue(v, type, cur = '₪', he = false) {
  if (v == null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return '—'
  switch (type) {
    case 'money': return `${cur}${fmtN(v, 0)}`
    case 'money2': return `${cur}${fmtN(v, 2)}`
    case 'num': return fmtN(v, 0)
    case 'dec': return fmtN(v, 1)
    case 'pct': return `${fmtN(v * 100, 1)}%`
    case 'date': { const s = String(v).slice(0, 10).split('-'); return s.length === 3 ? `${s[2]}/${s[1]}/${s[0].slice(-2)}` : String(v) }
    case 'days': return v < 0 ? (he ? `פג (${-v} ימים)` : `Expired (${-v}d)`) : (he ? `${v} ימים` : `${v}d`)
    default: return String(v)
  }
}
export const daysTone = v => v == null ? '' : v < 0 ? 'bad' : v <= 30 ? 'warn' : 'ok'

export function totalsRow(rep) {
  const cols = rep.columns.filter(c => c.total)
  if (!cols.length || !rep.rows.length) return null
  const row = {}; rep.columns.forEach((c, i) => { row[c.key] = c.total ? sum(rep.rows, r => r[c.key]) : (i === 0 ? (rep.he ? 'סה"כ' : 'Total') : '') })
  return row
}

export function reportToTable(rep) {
  const head = rep.columns.map(c => c.label)
  const body = rep.rows.map(r => rep.columns.map(c => fmtValue(r[c.key], c.type, rep.cur, rep.he)))
  const t = totalsRow(rep)
  if (t) body.push(rep.columns.map(c => t[c.key] === '' ? '' : fmtValue(t[c.key], c.type, rep.cur, rep.he)))
  return { head, body }
}

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function csvOf(rep) {
  const { head, body } = reportToTable(rep)
  const q = v => { const s = String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  return '﻿' + [head, ...body].map(r => r.map(q).join(',')).join('\r\n')
}

export function reportToHtml(rep, { company = '', maxRows = 500 } = {}) {
  const dir = rep.he ? 'rtl' : 'ltr', al = rep.he ? 'right' : 'left'
  const tone = { bad: '#dc2626', warn: '#d97706', ok: '#16a34a' }
  const { head, body } = reportToTable({ ...rep, rows: rep.rows.slice(0, maxRows) })
  const cut = rep.rows.length > maxRows
  const maxV = Math.max(1, ...(rep.chart?.items || []).map(i => i.value))
  const chart = rep.chart?.items?.length ? `<div style="margin:0 0 20px"><div style="font-size:13px;font-weight:700;color:#2B2630;margin-bottom:8px">${esc(rep.chart.title)}</div>${rep.chart.items.map(i => `<div style="display:flex;align-items:center;gap:8px;margin:3px 0;font-size:12px"><div style="width:140px;color:#5A5460;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(i.label)}</div><div style="flex:1;background:#F4F3EF;border-radius:4px"><div style="width:${Math.max(1, Math.round(i.value / maxV * 100))}%;height:12px;background:#2563eb;border-radius:4px"></div></div><div style="width:90px;color:#2B2630;font-weight:700">${esc(fmtValue(i.value, rep.chart.money ? 'money' : 'num', rep.cur))}</div></div>`).join('')}</div>` : ''
  const kpis = rep.kpis.map(k => `<td style="padding:6px"><div style="background:#F8F7F4;border-radius:8px;padding:12px 14px"><div style="font-size:20px;font-weight:800;color:${tone[k.tone] || '#2B2630'}">${esc(fmtValue(k.value, k.type, rep.cur, rep.he))}</div><div style="font-size:11px;color:#5A5460">${esc(k.label)}</div></div></td>`).join('')
  const th = head.map(h => `<th style="padding:8px 10px;text-align:${al};font-size:11px;color:#5A5460;background:#F8F7F4;border-bottom:1px solid #E5E1D8">${esc(h)}</th>`).join('')
  const hasTotal = totalsRow(rep)
  const tr = body.map((r, i) => `<tr>${r.map((c, j) => { const col = rep.columns[j]; const raw = rep.rows[i]?.[col.key]; const tn = col.type === 'days' ? tone[daysTone(raw)] : ''; const last = hasTotal && i === body.length - 1; return `<td style="padding:7px 10px;border-bottom:1px solid #F4F3EF;font-size:12px;${tn ? `color:${tn};font-weight:700;` : ''}${last ? 'font-weight:800;background:#F8F7F4;' : ''}">${esc(c)}</td>` }).join('')}</tr>`).join('')
  return `<div dir="${dir}" style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:24px;color:#2B2630">
<div style="font-size:12px;color:#5A5460">${esc(company)}</div>
<h1 style="margin:2px 0 2px;font-size:22px">${esc(rep.title)}</h1><div style="color:#5A5460;font-size:13px;margin-bottom:16px">${esc(rep.subtitle)}</div>
<table style="border-collapse:collapse;margin:0 -6px 14px"><tr>${kpis}</tr></table>${chart}
${rep.rows.length ? `<table style="width:100%;border-collapse:collapse;border:1px solid #E5E1D8"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>` : `<div style="padding:24px;text-align:center;color:#5A5460">${rep.he ? 'אין נתונים בטווח שנבחר' : 'No data for the selected filters'}</div>`}
${cut ? `<div style="font-size:12px;color:#5A5460;margin-top:8px">${rep.he ? `מוצגות ${maxRows} שורות ראשונות מתוך ${rep.rows.length}. הורד Excel לדוח המלא.` : `Showing the first ${maxRows} of ${rep.rows.length} rows. Download Excel for the full report.`}</div>` : ''}
${rep.note ? `<div style="font-size:11px;color:#8a8490;margin-top:10px">${esc(rep.note)}</div>` : ''}
</div>`
}

export function reportToText(rep, company = '') {
  const lines = [`*${rep.title}*${company ? ` – ${company}` : ''}`, rep.subtitle, '']
  rep.kpis.forEach(k => lines.push(`${k.label}: ${fmtValue(k.value, k.type, rep.cur, rep.he)}`))
  const top = rep.rows.slice(0, 5)
  if (top.length && rep.columns.length >= 2) {
    lines.push('')
    top.forEach(r => lines.push('• ' + rep.columns.slice(0, 3).map(c => fmtValue(r[c.key], c.type, rep.cur, rep.he)).filter(v => v !== '—').join(' | ')))
    if (rep.rows.length > 5) lines.push(rep.he ? `… ועוד ${rep.rows.length - 5}` : `… and ${rep.rows.length - 5} more`)
  }
  return lines.join('\n')
}
