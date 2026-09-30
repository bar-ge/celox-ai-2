import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { readDocument } from './ocrClient'
import { buildProposal, buildPatch, TABLE_FOR, expiryKeyFor } from './ocrMapping'
import { friendlyDbError } from '../validators'

// One state machine for "read a just-uploaded license and offer to apply it",
// shared by both upload surfaces (the file modal and the profile documents pane).
//
//   idle → reading → ready → applying → applied
//                  ↘ failed          ↘ (error stays on the card, nothing lost)
//
// It writes through the same supabase calls the edit forms use and then tells
// the parent via onEntityUpdate(id, patch) — the same callback DriverDetailsPane
// and CarDetailsPane already use — so the record on screen updates immediately.

export function useDocumentOcr({ entity, onEntityUpdate, rtl = true }) {
  const [state, setState] = useState({ phase: 'idle' })
  const last = useRef(null)          // what to retry with
  const gen = useRef(0)              // ignore a slow result after dismiss / a newer upload

  // A read takes seconds, and the record on screen can change meanwhile (the
  // parent updates after a save elsewhere). Compare against the record as it is
  // WHEN THE RESULT ARRIVES, not as it was when the upload started.
  const entityRef = useRef(entity)
  useEffect(() => { entityRef.current = entity })

  const dismiss = useCallback(() => { gen.current++; setState({ phase: 'idle' }) }, [])

  const start = useCallback(async ({ kind, path, docId, docHasExpiry }) => {
    const my = ++gen.current
    last.current = { kind, path, docId, docHasExpiry }
    setState({ phase: 'reading', kind })

    const res = await readDocument({ path, kind })
    if (my !== gen.current) return   // dismissed or superseded while we waited

    if (!res.ok) { setState({ phase: 'failed', kind, reason: res.reason }); return }

    const warnings = res.warnings
    if (warnings.length) { setState({ phase: 'notice', kind, warnings }); return }

    const proposal = buildProposal(kind, res.fields, entityRef.current)
    if (proposal.rows.length === 0) { setState({ phase: 'notice', kind, warnings: proposal.unchanged ? ['already_current'] : ['nothing_found'] }); return }
    setState({ phase: 'ready', kind, docId, docHasExpiry, ...proposal })
  }, [])

  const retry = useCallback(() => { if (last.current) start(last.current) }, [start])

  const toggle = useCallback(key => {
    setState(s => s.phase !== 'ready' ? s : { ...s, rows: s.rows.map(r => r.key === key ? { ...r, checked: !r.checked } : r) })
  }, [])

  const apply = useCallback(async () => {
    const s = state
    if (s.phase !== 'ready') return
    const patch = buildPatch(s.rows)
    if (!Object.keys(patch).length) { dismiss(); return }
    const entity = entityRef.current

    setState({ ...s, phase: 'applying' })
    let q = supabase.from(TABLE_FOR[s.kind]).update(patch).eq('id', entity.id)
    if (entity.company_id) q = q.eq('company_id', entity.company_id)   // belt and braces alongside RLS
    const { error } = await q
    if (error) { setState({ ...s, phase: 'ready', error: friendlyDbError(error, rtl) }); return }

    // The stored file's own expiry badge follows the licence's validity date,
    // but only if the user did not already type one at upload time.
    const ek = expiryKeyFor(s.kind)
    if (patch[ek] && s.docId && !s.docHasExpiry) {
      await supabase.from('documents').update({ expires_at: patch[ek] }).eq('id', s.docId)
    }
    onEntityUpdate?.(entity.id, patch)
    setState({ phase: 'applied', kind: s.kind, count: Object.keys(patch).length, expiryUpdated: !!(patch[ek] && s.docId && !s.docHasExpiry) })
  }, [state, onEntityUpdate, dismiss, rtl])

  return { state, start, retry, toggle, apply, dismiss }
}
