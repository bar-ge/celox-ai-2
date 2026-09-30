import { serviceClient } from './supabase.js'

/**
 * Dashboard routes run with the service role key, so they must authenticate the
 * caller themselves. The browser sends the Supabase session access token; we
 * verify it and check it belongs to the master account — the same rule the
 * is_master() RLS policy applies.
 *
 * @param {import('http').IncomingMessage & { headers: Record<string, string|string[]|undefined> }} req
 * @returns {Promise<{ ok: true, email: string } | { ok: false, status: number, reason: string }>}
 */
export async function requireMaster(req) {
  const header = req.headers?.authorization
  const token = typeof header === 'string' && header.startsWith('Bearer ')
    ? header.slice(7).trim()
    : null

  if (!token) return { ok: false, status: 401, reason: 'missing_token' }

  const master = process.env.MASTER_EMAIL || process.env.VITE_MASTER_EMAIL
  if (!master) {
    console.error('MASTER_EMAIL is not set — refusing dashboard API access')
    return { ok: false, status: 500, reason: 'not_configured' }
  }

  const { data, error } = await serviceClient().auth.getUser(token)
  if (error || !data?.user?.email) return { ok: false, status: 401, reason: 'invalid_token' }
  if (data.user.email.toLowerCase() !== master.toLowerCase()) {
    return { ok: false, status: 403, reason: 'forbidden' }
  }

  return { ok: true, email: data.user.email }
}

/**
 * Vercel Cron requests carry a bearer token equal to CRON_SECRET.
 * @param {{ headers: Record<string, string|string[]|undefined> }} req
 */
export function isCronRequest(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers?.authorization
  return typeof header === 'string' && header === `Bearer ${secret}`
}

/**
 * Any signed-in user, plus the company they belong to. requireMaster() is too
 * narrow for routes that ordinary client staff use (document OCR), and the
 * avatar routes skipped auth altogether — this is the guard those needed.
 *
 * The service-role client bypasses RLS, so the CALLER must do the tenancy
 * check: compare the returned companyId against whatever resource is being
 * touched. Returning it here (rather than trusting a companyId from the request
 * body) is what makes that check meaningful.
 *
 * @returns {Promise<{ ok: true, userId: string, email: string, isMaster: boolean, companyId: string|null }
 *   | { ok: false, status: number, reason: string }>}
 */
export async function requireUser(req) {
  const header = req.headers?.authorization
  const token = typeof header === 'string' && header.startsWith('Bearer ')
    ? header.slice(7).trim()
    : null
  if (!token) return { ok: false, status: 401, reason: 'missing_token' }

  const sb = serviceClient()
  const { data, error } = await sb.auth.getUser(token)
  if (error || !data?.user) return { ok: false, status: 401, reason: 'invalid_token' }

  const email = data.user.email || ''
  const master = process.env.MASTER_EMAIL || process.env.VITE_MASTER_EMAIL
  const isMaster = !!master && email.toLowerCase() === master.toLowerCase()

  const { data: prof } = await sb.from('profiles')
    .select('company_id').eq('id', data.user.id).maybeSingle()

  const companyId = prof?.company_id ?? null
  if (!companyId && !isMaster) return { ok: false, status: 403, reason: 'no_company' }

  return { ok: true, userId: data.user.id, email, isMaster, companyId }
}
