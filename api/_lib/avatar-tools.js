import { serviceClient } from './supabase.js'

// TCEL-054 follow-up (2026-09-28) — gives the avatar read access to the
// asking company's OWN live fleet data (car/driver counts, upcoming test and
// insurance expiries, recent spend, open traffic fines), via OpenRouter's
// standard tool-calling — Bar's explicit choice over a fixed stats snapshot,
// so the assistant can answer whatever shape of question comes in rather
// than only the handful of numbers we thought to pre-compute.
//
// Every function below takes `companyId` as its OWN parameter, resolved
// server-side in api/avatar/chat.js from the caller's verified Supabase
// session (see requireUser() in auth.js) — never from a tool-call argument
// the model produced. The TOOL_DEFS schemas below deliberately have no
// company_id/user_id parameter at all, so there is nothing for a
// manipulated prompt to override: whatever the model asks for, it can only
// ever be scoped to the company the real signed-in user belongs to.
//
// Read-only by construction — every query below is a `.select()`, nothing
// here ever writes.

const TODAY = () => new Date().toISOString().slice(0, 10)
const daysFromNow = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'get_fleet_summary',
      description: 'Live counts of the company\'s cars (total and by status), drivers (total and by status), and branches. Use for any "how many cars/drivers/branches do I have" question.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_expiring_documents',
      description: 'Vehicle tests (טסט) and insurance policies expiring within a window, with the car plate. Use for "what\'s expiring soon", "which cars need a test", "insurance renewals" questions.',
      parameters: {
        type: 'object',
        properties: {
          within_days: { type: 'integer', description: 'Look-ahead window in days. Defaults to 30.' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_cost_summary',
      description: 'Total spend and spend by category (fuel, tolls, repairs, etc.). Use for "how much have we spent", "what are our costs", "how much on fuel" questions. Defaults to the last 30 days — pass a larger `days` value, or `all_time: true`, for a longer or unbounded period. Never refuse a "since the beginning" / "all time" question; call this with all_time instead.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'integer', description: 'Look-back window in days. Defaults to 30. Ignored when all_time is true.' },
          all_time: { type: 'boolean', description: 'Total spend across the company\'s entire history, no date cutoff. Use for "total period" / "all time" / "since we started" questions.' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_violations_summary',
      description: 'Count and total amount of traffic violations (fines), split into unpaid vs paid. Use for "how many open fines", "how much do we owe in tickets" questions.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
]

const TOOL_NAMES = new Set(TOOL_DEFS.map((t) => t.function.name))

/** @param {string} name @param {unknown} args @param {string} companyId */
export async function runTool(name, args, companyId) {
  if (!TOOL_NAMES.has(name)) return { error: 'unknown_tool' }
  const a = args && typeof args === 'object' ? args : {}
  try {
    switch (name) {
      case 'get_fleet_summary': return await getFleetSummary(companyId)
      case 'get_expiring_documents': return await getExpiringDocuments(companyId, a)
      case 'get_cost_summary': return await getCostSummary(companyId, a)
      case 'get_violations_summary': return await getViolationsSummary(companyId)
      default: return { error: 'unknown_tool' }
    }
  } catch (err) {
    console.error(`avatar tool ${name} failed`, err instanceof Error ? err.message : err)
    return { error: 'tool_failed' }
  }
}

async function getFleetSummary(companyId) {
  const [cars, drivers, branches] = await Promise.all([
    serviceClient().from('cars').select('status').eq('company_id', companyId),
    serviceClient().from('drivers').select('status').eq('company_id', companyId),
    serviceClient().from('branches').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
  ])
  const byStatus = (rows) => (rows || []).reduce((acc, r) => {
    const k = r.status || 'unknown'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})
  return {
    cars_total: cars.data?.length ?? 0,
    cars_by_status: byStatus(cars.data),
    drivers_total: drivers.data?.length ?? 0,
    drivers_by_status: byStatus(drivers.data),
    branches_total: branches.count ?? 0,
  }
}

async function getExpiringDocuments(companyId, { within_days }) {
  const windowDays = Number.isFinite(within_days) && within_days > 0 ? Math.min(within_days, 365) : 30
  const today = TODAY()
  const until = daysFromNow(windowDays)

  const [tests, insurance] = await Promise.all([
    serviceClient().from('vehicle_tests').select('next_test_date, car_id')
      .eq('company_id', companyId).gte('next_test_date', today).lte('next_test_date', until),
    serviceClient().from('vehicle_insurance').select('expiry_date, car_id')
      .eq('company_id', companyId).gte('expiry_date', today).lte('expiry_date', until),
  ])

  // Resolve plates in one extra query rather than relying on a PostgREST
  // embedded-relation join, which needs a declared FK this app's schema may
  // not have — a plain id lookup works regardless.
  const carIds = [...new Set([...(tests.data || []), ...(insurance.data || [])].map((r) => r.car_id).filter(Boolean))]
  const plateById = new Map()
  if (carIds.length) {
    const { data: cars } = await serviceClient().from('cars').select('id, plate').in('id', carIds)
    for (const c of cars || []) plateById.set(c.id, c.plate)
  }

  return {
    within_days: windowDays,
    tests_expiring: (tests.data || []).map((r) => ({ plate: plateById.get(r.car_id) ?? null, next_test_date: r.next_test_date })),
    insurance_expiring: (insurance.data || []).map((r) => ({ plate: plateById.get(r.car_id) ?? null, expiry_date: r.expiry_date })),
  }
}

async function getCostSummary(companyId, { days, all_time }) {
  // 2026-09-30: Bar asked for total fuel spend "for the whole period" and
  // the avatar said it could only see the last 30 days — the tool really
  // did cap out at 365, so there was no way for it to answer honestly.
  // all_time bypasses the date filter entirely instead of raising the cap
  // further, since "the whole period" has no fixed length to guess at.
  const windowDays = Number.isFinite(days) && days > 0 ? Math.min(days, 365) : 30
  let query = serviceClient().from('costs').select('category, amount').eq('company_id', companyId)
  if (!all_time) query = query.gte('date', daysFromNow(-windowDays))
  const { data } = await query

  const rows = data || []
  const total = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const byCategory = rows.reduce((acc, r) => {
    const k = r.category || 'other'
    acc[k] = (acc[k] || 0) + (parseFloat(r.amount) || 0)
    return acc
  }, {})
  return all_time
    ? { all_time: true, total, by_category: byCategory }
    : { days: windowDays, total, by_category: byCategory }
}

async function getViolationsSummary(companyId) {
  const { data } = await serviceClient()
    .from('traffic_violations').select('payment_status, amount').eq('company_id', companyId)

  const rows = data || []
  const unpaid = rows.filter((r) => (r.payment_status || 'unpaid') === 'unpaid')
  const paid = rows.filter((r) => r.payment_status === 'paid')
  const sum = (list) => list.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  return {
    total_count: rows.length,
    unpaid_count: unpaid.length,
    unpaid_amount: sum(unpaid),
    paid_count: paid.length,
    paid_amount: sum(paid),
  }
}
