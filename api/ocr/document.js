import { requireUser } from '../_lib/auth.js'
import { serviceClient } from '../_lib/supabase.js'
import { extractFromImage, sniffMime, KINDS } from '../_lib/ocr.js'

// POST /api/ocr/document  { path, kind }
//
// Reads a driver's license or vehicle license that the client has ALREADY
// uploaded to the fleet-documents bucket, and returns the fields it found. It
// does not write to any table: the browser shows the result for confirmation
// and saves it through the same update calls the edit forms use, so a misread
// digit never lands in a record unreviewed.
//
// Why it takes a storage path rather than the image: the app allows 10 MB
// uploads but a serverless request body tops out at 4.5 MB, and referring to a
// stored object lets the server check the file belongs to the caller's company
// before spending a vendor call on it.
//
// This route spends money and forwards personal documents to a third party, so
// unlike the avatar routes it is authenticated, tenancy-checked and capped.

export const config = { maxDuration: 60 }

const BUCKET = 'fleet-documents'
const MAX_BYTES = 8 * 1024 * 1024
const ENTITY_FOR_KIND = { driver_license: 'driver', vehicle_license: 'car' }
// <companyUuid>/<driver|car>/<entityId>/<timestamp>_<name>  — matches confirmUpload()
const PATH_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(driver|car)\/([^/]{1,64})\/([^/]{1,200})$/i

// Per-user cap. In-memory, so it is per warm instance rather than global — a
// deliberate best effort that stops a runaway loop or a stuck retry button
// without adding a table. Authentication is the real gate.
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 30
const hits = new Map()
function rateLimited(userId, now = Date.now()) {
  const list = (hits.get(userId) || []).filter(t => now - t < WINDOW_MS)
  if (list.length >= MAX_PER_WINDOW) { hits.set(userId, list); return true }
  list.push(now); hits.set(userId, list)
  if (hits.size > 500) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > WINDOW_MS) hits.delete(k)
  return false
}
export const _resetRateLimit = () => hits.clear()

const realDeps = () => ({
  requireUser,
  db: serviceClient(),
  extract: extractFromImage,
  apiKey: process.env.GEMINI_API_KEY,
})

export async function handleOcr(req, res, deps) {
  res.setHeader('Cache-Control', 'no-store')
  const fail = (status, reason) => res.status(status).json({ ok: false, reason })

  if (req.method !== 'POST') return res.status(405).end()

  const auth = await deps.requireUser(req)
  if (!auth.ok) return fail(auth.status, auth.reason)

  if (!deps.apiKey) {
    console.error('ocr: GEMINI_API_KEY is not set')
    return fail(503, 'not_configured')
  }

  const { path, kind } = req.body ?? {}
  if (!KINDS.includes(kind) || typeof path !== 'string' || path.length > 400) return fail(400, 'bad_request')
  const m = PATH_RE.exec(path)
  if (!m || path.includes('..')) return fail(400, 'bad_path')
  const [, pathCompany, pathEntity] = m
  if (pathEntity !== ENTITY_FOR_KIND[kind]) return fail(400, 'kind_mismatch')

  // Tenancy. The service-role client below bypasses RLS, so this comparison is
  // the only thing stopping one client reading another client's documents.
  if (!auth.isMaster && pathCompany !== auth.companyId) return fail(403, 'forbidden')

  if (rateLimited(auth.userId)) return fail(429, 'rate_limited')

  // The file must be one the app recorded, in the same company — not an
  // arbitrary object that happens to sit in the bucket.
  const { data: row } = await deps.db.from('documents')
    .select('id, company_id, entity_type').eq('storage_path', path).maybeSingle()
  if (!row || row.company_id !== pathCompany || row.entity_type !== pathEntity) return fail(404, 'document_not_found')

  const { data: blob, error: dlErr } = await deps.db.storage.from(BUCKET).download(path)
  if (dlErr || !blob) return fail(404, 'file_not_found')

  const buf = Buffer.from(await blob.arrayBuffer())
  if (buf.length > MAX_BYTES) return fail(413, 'too_large')
  const mime = sniffMime(buf)
  if (!mime) return fail(415, 'unsupported_type')

  const result = await deps.extract({ apiKey: deps.apiKey, kind, mime, base64: buf.toString('base64') })
  if (!result.ok) {
    // Reason, status and the first 160 chars of the vendor's error — enough to
    // tell a retired model from a dead key, which is what made the earlier
    // avatar and WhatsApp outages diagnosable. Never the extracted values.
    console.error('ocr: extraction failed', result.reason, result.detail || '')
    return fail(result.reason === 'unparsable' ? 502 : 503, result.reason === 'unparsable' ? 'unparsable' : 'upstream_failed')
  }

  const warnings = []
  if (result.documentKind !== kind) warnings.push('wrong_document')
  else if (!result.legible) warnings.push('unreadable')
  else if (Object.keys(result.fields).length === 0) warnings.push('nothing_found')

  return res.status(200).json({
    ok: true,
    kind,
    documentKind: result.documentKind,
    fields: result.fields,
    warnings,
  })
}

export default function handler(req, res) {
  return handleOcr(req, res, realDeps())
}
