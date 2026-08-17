import { supabase } from '../supabaseClient'

/** Dashboard API routes run with the service role, so every call is authenticated. */
async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, options = {}) {
  const headers = { ...(await authHeaders()), ...(options.headers ?? {}) }
  if (options.body) headers['Content-Type'] = 'application/json'

  const res = await fetch(path, { ...options, headers })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok || payload.ok === false) {
    throw new Error(payload.reason || `request_failed_${res.status}`)
  }
  return payload
}

export const fetchLeads = () => request('/api/wa/leads').then((p) => p.leads ?? [])

// Phone goes in the query string, not the path: Vercel's `api/` directory
// convention on this project does not deploy `[param]` files as functions.
export const fetchMessages = (phone) =>
  request(`/api/wa/messages?phone=${encodeURIComponent(phone)}`).then((p) => p.messages ?? [])

export const patchLead = (phone, patch) =>
  request(`/api/wa/leads?phone=${encodeURIComponent(phone)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then((p) => p.lead)

export const sendBookingLink = (phone) =>
  request('/api/wa/send-booking', { method: 'POST', body: JSON.stringify({ phone }) })

/** Open a thread with a number that has never written to us. */
export const startConversation = ({ phone, firstName }) =>
  request('/api/wa/start', { method: 'POST', body: JSON.stringify({ phone, firstName }) })

/** Send the opening again and clear what the agent collected. */
export const restartConversation = (phone) =>
  request('/api/wa/start', { method: 'POST', body: JSON.stringify({ phone, restart: true }) })
