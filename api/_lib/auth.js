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
 * Any signed-in user (not master-only) — used by routes that need to know
 * WHO is asking so they can scope a query to that person's own company,
 * never by anything the browser claims. The browser sends its Supabase
 * session access token; we verify it server-side with the service role key
 * and resolve the caller's company_id from `profiles` ourselves. A route
 * using this must never accept a company_id/user_id from the request body —
 * that would let a tampered client read another company's data.
 *
 * 🚨 2026-09-28: the one deliberate exception is `requestedCompanyId`, and it
 * exists because of a real bug this caused — the avatar's live-data tools
 * (see avatar-tools.js) answered from Bar's own `profiles.company_id`
 * (a small personal/test company) while he was viewing a completely
 * different company's 111-car fleet through the dashboard's master "view as
 * company" switcher (`viewCompanyId` in fleet-manager.jsx, client-side
 * only — it never changes which company his session/profile actually
 * belongs to). The fix isn't to trust any client-claimed company id; it's
 * to trust one ONLY from a caller who re-proves master status server-side
 * on every call (email compared against MASTER_EMAIL here, the exact check
 * requireMaster() above already uses) — the same trust level the master
 * account already has everywhere else in this app (its service-role queries
 * bypass RLS entirely). A non-master caller's `requestedCompanyId` is
 * ignored outright; they always get their own company_id from `profiles`.
 *
 * @param {import('http').IncomingMessage & { headers: Record<string, string|string[]|undefined> }} req
 * @param {{ requestedCompanyId?: string|null }} [opts]
 * @returns {Promise<{ ok: true, userId: string, email: string, companyId: string } | { ok: false, status: number, reason: string }>}
 */
export async function requireUser(req, { requestedCompanyId } = {}) {
  const header = req.headers?.authorization
  const token = typeof header === 'string' && header.startsWith('Bearer ')
    ? header.slice(7).trim()
    : null

  if (!token) return { ok: false, status: 401, reason: 'missing_token' }

  const { data, error } = await serviceClient().auth.getUser(token)
  if (error || !data?.user?.id) return { ok: false, status: 401, reason: 'invalid_token' }

  const master = process.env.MASTER_EMAIL || process.env.VITE_MASTER_EMAIL
  const isMaster = Boolean(master && data.user.email && data.user.email.toLowerCase() === master.toLowerCase())

  if (isMaster && typeof requestedCompanyId === 'string' && requestedCompanyId) {
    return { ok: true, userId: data.user.id, email: data.user.email, companyId: requestedCompanyId }
  }

  const { data: profile, error: profileErr } = await serviceClient()
    .from('profiles').select('company_id').eq('id', data.user.id).maybeSingle()
  if (profileErr) return { ok: false, status: 500, reason: 'profile_lookup_failed' }
  if (!profile?.company_id) return { ok: false, status: 403, reason: 'no_company' }

  return { ok: true, userId: data.user.id, email: data.user.email, companyId: profile.company_id }
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
