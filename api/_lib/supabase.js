import { createClient } from '@supabase/supabase-js'

// Server-side client. Uses the service role key, so it bypasses RLS — this module
// must never be imported from anything that ships to the browser.

let client = null

/** @returns {import('@supabase/supabase-js').SupabaseClient} */
export function serviceClient() {
  if (client) return client

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('SUPABASE_URL is not set')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'celox-wab-agent' } },
  })
  return client
}

export const LEADS = 'wab_leads'
export const MESSAGES = 'wab_messages'
