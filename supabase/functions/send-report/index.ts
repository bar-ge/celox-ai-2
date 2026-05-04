import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY') ?? ''
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

  let body: { to: string[]; subject: string; html: string; companyName: string }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { ...h, 'Content-Type': 'application/json' } })
  }

  const { to, subject, html, companyName } = body
  if (!to?.length || !subject || !html) {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { ...h, 'Content-Type': 'application/json' } })
  }

  // Validate emails
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const validTo = to.filter(e => emailRe.test(e?.trim() ?? ''))
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
