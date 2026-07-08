import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY') ?? ''
const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY') ?? ''
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL       = 'Celox AI <noreply@celoxai.com>'
const TO_EMAIL         = 'support@celoxai.com'

const ALLOWED_ORIGINS = ['https://celoxai.com', 'https://www.celoxai.com', 'http://localhost:5173', 'http://localhost:4173']

const ESC_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC_MAP[c])

// Verify a Cloudflare Turnstile token server-side against Cloudflare siteverify.
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  // Soft until the secret is configured: skip verification (no worse than the prior
  // state, where the contact CAPTCHA was never checked server-side). Setting
  // TURNSTILE_SECRET_KEY in Supabase automatically switches this to enforced.
  if (!TURNSTILE_SECRET) { console.warn('TURNSTILE_SECRET_KEY not set — skipping CAPTCHA verification'); return true }
  if (!token) return false
  try {
    const form = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token })
    if (ip && ip !== 'unknown') form.append('remoteip', ip)
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form,
    })
    const data = await res.json()
    return data?.success === true
  } catch (e) { console.error('Turnstile verify failed', e); return false }
}

function corsHeaders(origin: string) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

// In-memory rate limit: max 5 submissions per IP per cold-start window (~1h typical)
const ipCounts = new Map<string, { n: number; reset: number }>()
const WINDOW_MS  = 60 * 60 * 1000 // 1 hour
const MAX_PER_IP = 5

function isRateLimited(ip: string): boolean {
  const now  = Date.now()
  const rec  = ipCounts.get(ip)
  if (!rec || now > rec.reset) {
    ipCounts.set(ip, { n: 1, reset: now + WINDOW_MS })
    return false
  }
  if (rec.n >= MAX_PER_IP) return true
  rec.n++
  return false
}

serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''
  const cors   = corsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST')    return new Response('Method not allowed', { status: 405, headers: cors })

  // IP rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
           ?? req.headers.get('cf-connecting-ip')
           ?? 'unknown'
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'rate_limited' }),
      { status: 429, headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': '3600' } }
    )
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ ok: false }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ ok: false }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }

  const { name, company, phone, email, message, fleet_size, cfToken } = body

  // Verify the CAPTCHA before doing anything else (fails closed).
  const ok = await verifyTurnstile(cfToken ?? '', ip)
  if (!ok) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'captcha' }),
      { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }

  // Basic server-side validation: require a name plus at least one contact method.
  if (!name?.trim() || (!phone?.trim() && !email?.trim())) {
    return new Response(
      JSON.stringify({ ok: false }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
  if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return new Response(
      JSON.stringify({ ok: false }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }

  // Capture the lead in the CRM (service role — the anon insert policy is removed).
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    await sb.from('crm_leads').insert({
      name: name.trim(),
      company_name: company?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      fleet_size: fleet_size || null,
      message: message?.trim() || null,
      source: 'contact_form',
      status: 'new',
    })
  } catch (e) { console.error('crm_leads insert failed', e) }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
      <h2 style="color:#0f172a;margin:0 0 24px">פנייה חדשה — Celox AI</h2>
      <table style="width:100%;border-collapse:collapse">
        ${[['שם', name], ['חברה', company || '—'], ['טלפון', phone], ['אימייל', email]].map(([l, v]) =>
          `<tr><td style="padding:10px 0;color:#64748b;font-size:13px;width:100px">${l}</td><td style="padding:10px 0;color:#0f172a;font-size:14px;font-weight:600">${esc(v)}</td></tr>`
        ).join('')}
      </table>
      ${message ? `<div style="margin-top:20px;padding:16px;background:#fff;border-radius:8px;border:1px solid #e2e8f0"><p style="margin:0;color:#334155;font-size:14px;line-height:1.7">${esc(message)}</p></div>` : ''}
    </div>`

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL, to: TO_EMAIL, ...(email?.trim() ? { reply_to: email.trim() } : {}),
      subject: `📬 פנייה חדשה מ־${name}${company ? ` (${company})` : ''}`,
      html,
    }),
  })

  if (!r.ok) {
    console.error('Resend error', r.status, await r.text())
    return new Response(
      JSON.stringify({ ok: false }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
  return new Response(
    JSON.stringify({ ok: true }),
    { headers: { ...cors, 'Content-Type': 'application/json' } }
  )
})
