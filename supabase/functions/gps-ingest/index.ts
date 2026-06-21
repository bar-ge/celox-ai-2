import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const companyId = url.searchParams.get('company_id')
  const token     = url.searchParams.get('token')

  if (!companyId || !token) {
    return new Response(JSON.stringify({ error: 'Missing company_id or token' }), { status: 400 })
  }

  // Verify webhook token
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, webhook_token')
    .eq('id', companyId)
    .single()

  if (error || !company) {
    return new Response(JSON.stringify({ error: 'Company not found' }), { status: 404 })
  }

  if (company.webhook_token !== token) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
  }

  // Parse GPS payload
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const { plate, lat, lng, speed, timestamp } = body as Record<string, string | number>

  if (!plate) {
    return new Response(JSON.stringify({ error: 'Missing plate' }), { status: 400 })
  }

  // Upsert GPS position
  const { error: upsertErr } = await supabase
    .from('gps_positions')
    .upsert({
      company_id: companyId,
      plate: String(plate).replace(/[-\s]/g, ''),
      lat: lat ?? null,
      lng: lng ?? null,
      speed: speed ?? null,
      recorded_at: timestamp ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,plate' })

  if (upsertErr) {
    return new Response(JSON.stringify({ error: upsertErr.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
