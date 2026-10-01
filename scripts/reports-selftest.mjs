// Run: node scripts/reports-selftest.mjs
import fs from 'node:fs'
import { REPORT_CATALOG, buildReport, datePreset, daysBetween, fmtValue, csvOf, reportToHtml, reportToText, totalsRow, israelNow, isDue, scheduleFilters } from '../src/reports/engine.js'

let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m) } }
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} want ${JSON.stringify(b)}`)

const today = '2026-09-30'
const D = {
  branches: [{ id: 'b1', name: 'Tel Aviv' }, { id: 'b2', name: 'Haifa' }],
  cars: [
    { id: 1, plate: '1111111', make: 'Toyota', model: 'Corolla', status: 'In Use', branch_id: 'b1', driver_id: 'd1', mileage: 50000, purchase_price: 100000 },
    { id: 2, plate: '2222222', make: 'Kia', model: 'Niro', status: 'Maintenance', branch_id: 'b2', driver_id: null, mileage: 20000 },
    { id: 3, plate: '3333333', make: 'Ford', model: 'Focus', status: 'Available', branch_id: 'b1', mileage: 0 },
  ],
  drivers: [
    { id: 'd1', name: 'Dana', branch_id: 'b1', car_id: 1, status: 'Active', license_expiry: '2026-09-01' },
    { id: 'd2', name: 'Eli', branch_id: 'b2', status: 'Active', license_expiry: '2026-12-01' },
    { id: 'd3', name: 'Noa', branch_id: 'b2', status: 'Active' },
  ],
  costs: [
    { id: 1, car_id: 1, driver_id: 'd1', category: 'Fuel', amount: '200', date: '2026-08-05', odometer: 50000 },
    { id: 2, car_id: 1, driver_id: 'd1', category: 'Fuel', amount: '300', date: '2026-09-05', odometer: 50500 },
    { id: 3, car_id: 2, driver_id: null, category: 'Repair', amount: '700', date: '2026-09-10' },
    { id: 4, car_id: 2, driver_id: null, category: 'Fuel', amount: '100', date: '2025-01-10' },
    { id: 5, car_id: 3, driver_id: 'd2', category: 'Insurance', amount: '1000', date: '2026-09-15' },
  ],
  fuel: [], maint: [{ id: 1, car_id: 1, type: 'Service', cost: 400, date: '2026-09-02', next_due: '2026-09-20', status: 'Scheduled' }],
  accidents: [{ id: 'a', my_car_id: 1, incident_date: '2026-09-03', police_report: true, claim_file_number: 'C1', claim_status: 'Open' }],
  violations: [{ id: 'v', car_id: 1, driver_id: 'd1', violation_date: '2026-09-04', amount: 500, payment_status: 'unpaid' }, { id: 'v2', car_id: 2, violation_date: '2026-09-05', amount: 250, payment_status: 'paid' }],
  leasing: [{ id: 'l', car_id: 2, monthly_payment: 2000, end_date: '2026-11-01', total_payments: 36, payments_made: 30 }],
  insurance: [{ id: 'i', car_id: 1, insurer: 'Harel', premium: 3000, expiry_date: '2026-10-10' }],
  alerts: [{ type: 'document', label: 'Licence', entity_name: 'Toyota', date: '2026-09-20', severity: 'overdue' }, { type: 'custom', label: 'Call', entity_name: '', date: '2026-12-30' }, { type: 'maintenance', label: 'Service', entity_name: 'Kia', date: '2026-10-15' }],
}
const F0 = { from: '2026-09-01', to: '2026-09-30' }
const o = (he = false) => ({ he, today, currency: '₪', plate: p => p })

// every report builds in both languages, with every filter combination not throwing
for (const r of REPORT_CATALOG) for (const he of [false, true]) {
  for (const F of [{}, F0, { ...F0, branch: 'b1' }, { ...F0, car: '1' }, { ...F0, driver: 'd1', category: 'Fuel' }, { from: '2030-01-01', to: '2030-02-01' }]) {
    try {
      const rep = buildReport(r.id, D, F, o(he))
      ok(Array.isArray(rep.rows) && Array.isArray(rep.columns) && Array.isArray(rep.kpis), `${r.id} shape`)
      rep.rows.forEach(row => rep.columns.forEach(c => ok(c.key in row, `${r.id} row has ${c.key}`)))
      ok(typeof reportToHtml(rep) === 'string' && typeof csvOf(rep) === 'string' && typeof reportToText(rep) === 'string', `${r.id} renders`)
    } catch (e) { ok(false, `${r.id} threw: ${e.message}`) }
  }
}
// also with completely empty data
for (const r of REPORT_CATALOG) { try { buildReport(r.id, {}, {}, o()) ; pass++ } catch (e) { ok(false, `${r.id} empty: ${e.message}`) } }

// cost summary numbers
let rep = buildReport('cost_summary', D, F0, o())
eq(rep.kpis[0].value, 2000, 'cost total in September')
eq(rep.rows.map(r => r.category), ['Insurance', 'Repair', 'Fuel'], 'categories sorted by amount')
ok(Math.abs(rep.rows.reduce((s, r) => s + r.share, 0) - 1) < 1e-9, 'shares sum to 1')
eq(totalsRow(rep).amount, 2000, 'totals row')
eq(buildReport('cost_summary', D, { from: '', to: '' }, o()).kpis[0].value, 2300, 'all time total')
eq(buildReport('cost_summary', D, { ...F0, category: 'Fuel' }, o()).kpis[0].value, 300, 'category filter')
eq(buildReport('cost_summary', D, { ...F0, branch: 'b1' }, o()).kpis[0].value, 1300, 'branch filter via car')
eq(buildReport('cost_summary', D, { ...F0, driver: 'd2' }, o()).kpis[0].value, 1000, 'driver filter')
eq(buildReport('cost_summary', D, { from: '2026-09-05', to: '2026-09-05' }, o()).kpis[0].value, 300, 'date bounds are inclusive')

// cost per vehicle + per km
rep = buildReport('cost_by_vehicle', D, { from: '', to: '' }, o())
const v1 = rep.rows.find(r => r.vehicle.includes('1111111'))
eq([v1.amount, v1.km, v1.perKm], [500, 500, 1], 'cost per km from odometer')
ok(rep.rows.find(r => r.vehicle.includes('2222222')).perKm == null, 'no per km without two odometer readings')

// monthly trend includes empty months
rep = buildReport('cost_monthly', D, { from: '2026-07-01', to: '2026-09-30' }, o())
eq(rep.rows.map(r => r.month), ['2026-07', '2026-08', '2026-09'], 'months')
eq(rep.rows.map(r => r.amount), [0, 200, 2000], 'month amounts')
eq(rep.rows[2].change, 9, 'change vs prior month')

// fuel falls back to costs and says so; with real fuel records uses them
rep = buildReport('fuel', D, F0, o()); ok(!!rep.note, 'fuel fallback note'); eq(rep.kpis[0].value, 300, 'fuel spend from costs')
rep = buildReport('fuel', { ...D, fuel: [{ car_id: 1, fuel_date: '2026-09-02', liters: 50, total_amount: 400, odometer: 1000 }, { car_id: 1, fuel_date: '2026-09-09', liters: 40, total_amount: 320, odometer: 1600 }] }, F0, o())
ok(!rep.note, 'no note with records'); eq(rep.rows[0].kmPerL, 600 / 90, 'km per litre'); eq(rep.rows[0].perLiter, 720 / 90, 'price per litre')

// expiry report
rep = buildReport('expiry', D, { horizon: '30' }, o())
eq(rep.rows.map(r => r.days), [-10, 15], 'expiry horizon 30 includes overdue')
eq(buildReport('expiry', D, { horizon: '0' }, o()).rows.length, 3, 'horizon 0 = everything')
eq(rep.kpis[0].value, 1, 'overdue kpi')

// drivers: expired first, missing date last
rep = buildReport('drivers', D, {}, o()); eq(rep.rows.map(r => r.name), ['Dana', 'Eli', 'Noa'], 'driver order'); eq(rep.kpis[1].value, 1, 'expired drivers')
eq(buildReport('drivers', D, { branch: 'b2' }, o()).rows.length, 2, 'driver branch filter')

// violations / accidents / leasing / insurance / maintenance / tco
rep = buildReport('violations', D, F0, o()); eq([rep.kpis[0].value, rep.kpis[2].value, rep.kpis[3].value], [2, 1, 500], 'violations kpis')
eq(buildReport('accidents', D, F0, o()).kpis[2].value, 1, 'open claims')
rep = buildReport('leasing', D, {}, o()); eq(rep.rows[0].remaining, 6, 'payments left'); eq(rep.kpis[1].value, 2000, 'monthly total')
eq(buildReport('insurance', D, {}, o()).rows[0].days, 10, 'insurance days')
rep = buildReport('maintenance', D, F0, o()); eq(rep.kpis[2].value, 1, 'overdue service')
rep = buildReport('tco', D, F0, o()); eq(rep.rows.find(r => r.vehicle.includes('2222222')).total, 700 + 2000, 'tco = running + lease*months')
eq(buildReport('fleet_by_branch', D, {}, o()).rows[0].branch, 'Tel Aviv', 'fleet by branch')
eq(buildReport('fleet_status', D, { branch: 'b1' }, o()).rows.length, 2, 'fleet branch filter')

// helpers
eq(datePreset('thisMonth', '2026-09-30'), { from: '2026-09-01', to: '2026-09-30' }, 'preset thisMonth')
eq(datePreset('lastMonth', '2026-01-15'), { from: '2025-12-01', to: '2025-12-31' }, 'preset lastMonth across year')
eq(datePreset('thisQuarter', '2026-09-30'), { from: '2026-07-01', to: '2026-09-30' }, 'preset quarter')
eq(datePreset('last30', '2026-09-30'), { from: '2026-09-01', to: '2026-09-30' }, 'preset last30')
eq(datePreset('last12', '2026-09-30'), { from: '2025-10-01', to: '2026-09-30' }, 'preset last12')
eq(daysBetween('2026-09-30', '2026-10-10'), 10, 'daysBetween'); ok(daysBetween('', 'x') == null, 'daysBetween null')
eq(fmtValue(1234.5, 'money', '₪'), '₪1,235', 'money'); eq(fmtValue(0.256, 'pct'), '25.6%', 'pct'); eq(fmtValue(null, 'num'), '—', 'null'); eq(fmtValue('2026-09-05', 'date'), '05/09/26', 'date')

// html is escaped, csv is quoted, Hebrew labels used
const evil = buildReport('fleet_status', { ...D, cars: [{ id: 9, plate: '<script>x</script>', make: 'A"B', model: 'C,D', status: 'In Use' }] }, {}, o(true))
ok(!reportToHtml(evil).includes('<script>'), 'html escapes plate')
ok(csvOf(evil).includes('"A""B C,D"'), 'csv quoting'); ok(csvOf(evil).startsWith('﻿'), 'csv BOM')
ok(reportToHtml(evil).includes('dir="rtl"') && evil.title === 'סטטוס הצי', 'hebrew report is rtl')
ok(reportToHtml(buildReport('cost_summary', D, { from: '2030-01-01', to: '2030-02-01' }, o())).includes('No data'), 'empty state text')

// ── scheduling ──
// Israel time: 2026-09-30 21:30 UTC is already 2026-10-01 in Tel Aviv (IDT, UTC+3)
eq(israelNow(new Date('2026-09-30T21:30:00Z')).date, '2026-10-01', 'israel date rolls over')
eq(israelNow(new Date('2026-01-15T22:30:00Z')).date, '2026-01-16', 'israel winter time (UTC+2)')
const n = israelNow(new Date('2026-09-30T05:00:00Z')); eq([n.date, n.dow, n.dom, n.daysInMonth], ['2026-09-30', 3, 30, 30], 'israelNow fields (Wednesday)')
const S = (o) => ({ is_active: true, frequency: 'daily', last_sent_at: null, ...o })
ok(isDue(S({}), n), 'daily is due'); ok(!isDue(S({ is_active: false }), n), 'inactive not due')
ok(!isDue(S({ last_sent_at: '2026-09-30T02:00:00Z' }), n), 'already sent today')
ok(isDue(S({ last_sent_at: '2026-09-29T05:00:00Z' }), n), 'sent yesterday -> due')
ok(isDue(S({ frequency: 'weekly', day_of_week: 3 }), n) && !isDue(S({ frequency: 'weekly', day_of_week: 0 }), n), 'weekly matches weekday')
ok(isDue(S({ frequency: 'monthly', day_of_month: 30 }), n) && !isDue(S({ frequency: 'monthly', day_of_month: 1 }), n), 'monthly matches day')
ok(isDue(S({ frequency: 'monthly', day_of_month: 31 }), n), 'monthly day 31 clamps to last day of a 30-day month')
ok(isDue(S({ frequency: 'monthly', day_of_month: 31 }), israelNow(new Date('2026-02-28T05:00:00Z'))), 'monthly day 31 clamps in February')
ok(!isDue(S({ frequency: 'yearly' }), n) && !isDue(null, n), 'unknown frequency / null not due')
eq(scheduleFilters({ report_type: 'cost_summary', period: 'lastMonth', filters: { branch: 'b1' } }, '2026-09-30'), { from: '2026-08-01', to: '2026-08-31', branch: 'b1', car: '', driver: '', category: '', horizon: '90' }, 'schedule filters resolve period')
eq(scheduleFilters({ report_type: 'drivers', period: 'lastMonth', filters: { from: '2020-01-01' } }, '2026-09-30').from, '', 'non-dated report ignores dates')
eq(scheduleFilters({ report_type: 'cost_summary', period: 'bogus' }, '2026-09-30').from, '2026-09-01', 'bad period falls back to last30')
eq(scheduleFilters({ report_type: 'cost_summary', period: 'all' }, '2026-09-30').from, '', 'all time has no start')
// the edge function must run exactly the same engine as the app
ok(fs.readFileSync(new URL('../src/reports/engine.js', import.meta.url), 'utf8') === fs.readFileSync(new URL('../supabase/functions/scheduled-reports/engine.js', import.meta.url), 'utf8'), 'scheduled-reports/engine.js is identical to src/reports/engine.js')

console.log(`${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
