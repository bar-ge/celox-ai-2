import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL      = 'Celox AI <noreply@celoxai.com>'
const ALLOWED_ORIGINS = ['https://celoxai.com', 'https://www.celoxai.com', 'http://localhost:5173', 'http://localhost:4173']

function cors(origin: string) {
  const o = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }
}

serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''
  const h = cors(origin)
  if (req.method === 'OPTIONS') return new Response(null, { headers: h })
  if (req.method !== 'POST')    return new Response('Method not allowed', { status: 405, headers: h })

  if (!RESEND_API_KEY) return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { ...h, 'Content-Type': 'application/json' } })

  // ── Require an authenticated user with a company (no open relay) ──
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return new Response(JSON.stringify({ ok: false, reason: 'unauthorized' }), { status: 401, headers: { ...h, 'Content-Type': 'application/json' } })
  const sb = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: { user }, error: authErr } = await sb.auth.getUser(jwt)
  if (authErr || !user) return new Response(JSON.stringify({ ok: false, reason: 'unauthorized' }), { status: 401, headers: { ...h, 'Content-Type': 'application/json' } })
  const { data: profile } = await sb.from('profiles').select('company_id').eq('id', user.id).maybeSingle()
  if (!profile?.company_id) return new Response(JSON.stringify({ ok: false, reason: 'forbidden' }), { status: 403, headers: { ...h, 'Content-Type': 'application/json' } })

  let body: { to: string[]; subject: string; html: string }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { ...h, 'Content-Type': 'application/json' } })
  }

  const { to, subject, html } = body
  if (!to?.length || !subject || !html) {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { ...h, 'Content-Type': 'application/json' } })
  }

  // Validate emails + cap recipient count (an authenticated account is still not a bulk mailer)
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const validTo = to.filter(e => emailRe.test(e?.trim() ?? '')).slice(0, 20)
  if (!validTo.length) return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { ...h, 'Content-Type': 'application/json' } })

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: validTo, subject, html }),
  })

  if (!r.ok) {
    console.error('Resend error', r.status, await r.text())
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { ...h, 'Content-Type': 'application/json' } })
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { ...h, 'Content-Type': 'application/json' } })
})
