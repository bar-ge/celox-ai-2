import { supabase } from '../supabaseClient'

// Calls /api/ocr/document with the caller's own session. The server reads the
// file from storage itself (see api/ocr/document.js), so only a path travels.
//
// Always resolves — never throws — with { ok, fields?, warnings?, reason? } so
// the upload flow can treat "the reader was unavailable" as a normal outcome:
// the file is already saved, and the user can fill the fields in by hand.

export async function readDocument({ path, kind }) {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (!token) return { ok: false, reason: 'no_session' }

    const res = await fetch('/api/ocr/document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ path, kind }),
    })
    let body = null
    try { body = await res.json() } catch { /* non-JSON error page */ }

    if (res.ok && body?.ok) return { ok: true, fields: body.fields || {}, warnings: body.warnings || [] }
    return { ok: false, reason: body?.reason || (res.status === 401 ? 'invalid_token' : 'upstream_failed') }
  } catch {
    return { ok: false, reason: 'network' }
  }
}
