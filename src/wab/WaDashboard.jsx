import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { fetchLeads, fetchMessages, patchLead, sendBookingLink } from './api'
import { T, FONT_SANS, useDashboardFonts } from './theme'
import ConversationList from './ConversationList'
import ThreadView from './ThreadView'
import LeadDetail from './LeadDetail'

const POLL_MS = 5000

export default function WaDashboard({ onBack }) {
  useDashboardFonts()

  const [leads, setLeads] = useState([])
  const [messages, setMessages] = useState([])
  const [selected, setSelected] = useState(null)
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [error, setError] = useState(null)
  const [narrow, setNarrow] = useState(() => window.innerWidth < T.minWidth)

  const selectedRef = useRef(null)
  selectedRef.current = selected

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < T.minWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const loadLeads = useCallback(async () => {
    try {
      setLeads(await fetchLeads())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load_failed')
    } finally {
      setLoadingLeads(false)
    }
  }, [])

  const loadThread = useCallback(async (phone) => {
    if (!phone) { setMessages([]); return }
    setLoadingThread(true)
    try {
      setMessages(await fetchMessages(phone))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'thread_failed')
    } finally {
      setLoadingThread(false)
    }
  }, [])

  useEffect(() => { loadLeads() }, [loadLeads])
  useEffect(() => { loadThread(selected) }, [selected, loadThread])

  // Realtime first; the interval below is the fallback when replication is off.
  useEffect(() => {
    const channel = supabase
      .channel('wab-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wab_messages' }, (payload) => {
        loadLeads()
        const phone = payload.new?.phone ?? payload.old?.phone
        if (phone && phone === selectedRef.current) loadThread(phone)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wab_leads' }, () => {
        loadLeads()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadLeads, loadThread])

  useEffect(() => {
    const id = setInterval(() => {
      loadLeads()
      if (selectedRef.current) loadThread(selectedRef.current)
    }, POLL_MS)
    return () => clearInterval(id)
  }, [loadLeads, loadThread])

  const selectedLead = useMemo(
    () => leads.find((l) => l.phone === selected) ?? null,
    [leads, selected],
  )

  const handlePatch = useCallback(async (phone, patch) => {
    setLeads((prev) => prev.map((l) => (l.phone === phone ? { ...l, ...patch } : l)))
    try {
      await patchLead(phone, patch)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'update_failed')
    } finally {
      loadLeads()
    }
  }, [loadLeads])

  const handleSendBooking = useCallback(async (phone) => {
    await sendBookingLink(phone)
    await loadLeads()
    if (phone === selectedRef.current) await loadThread(phone)
  }, [loadLeads, loadThread])

  if (narrow) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: T.white, padding: 24, textAlign: 'center',
        fontFamily: FONT_SANS, fontSize: T.fs14, color: T.textMid,
      }}>
        Dashboard is optimised for desktop. Please use a screen wider than 1024px.
      </div>
    )
  }

  return (
    <div dir="ltr" style={{
      height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: T.white, color: T.text, fontFamily: FONT_SANS,
    }}>
      <style>{`
        .wab-skeleton { background: ${T.border}; animation: wabPulse 1.4s ease-in-out infinite; }
        @keyframes wabPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }
        .wab-root ::-webkit-scrollbar { width: 10px; height: 10px }
        .wab-root ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px }
      `}</style>

      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: T.padTight, padding: `10px ${T.pad}px`,
        borderBottom: `1px solid ${T.border}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: T.fs20, fontWeight: 700 }}>CELOX AI — WhatsApp Leads</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: T.padTight }}>
          {error && <span style={{ fontSize: T.fs12, color: T.textMid }}>Sync issue: {error}</span>}
          {onBack && (
            <button
              onClick={onBack}
              style={{
                fontFamily: FONT_SANS, fontSize: T.fs12, cursor: 'pointer',
                padding: '5px 10px', borderRadius: T.radius,
                border: `1px solid ${T.border}`, background: T.white, color: T.text,
                transition: 'background-color 150ms ease',
              }}
            >
              Back to app
            </button>
          )}
        </div>
      </header>

      <div className="wab-root" style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <ConversationList
          leads={leads}
          selected={selected}
          onSelect={setSelected}
          loading={loadingLeads}
        />
        <ThreadView
          lead={selectedLead}
          messages={messages}
          loading={loadingThread}
          onResumeBot={() => selectedLead && handlePatch(selectedLead.phone, { bot_paused: false })}
        />
        <LeadDetail
          lead={selectedLead}
          messages={messages}
          onPatch={handlePatch}
          onSendBooking={handleSendBooking}
        />
      </div>
    </div>
  )
}
