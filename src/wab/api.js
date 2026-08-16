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

export const fetchMessages = (phone) =>
  request(`/api/wa/messages/${encodeURIComponent(phone)}`).then((p) => p.messages ?? [])

export const patchLead = (phone, patch) =>
  request(`/api/wa/leads/${encodeURIComponent(phone)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then((p) => p.lead)

export const sendBookingLink = (phone) =>
  request('/api/wa/send-booking', { method: 'POST', body: JSON.stringify({ phone }) })
