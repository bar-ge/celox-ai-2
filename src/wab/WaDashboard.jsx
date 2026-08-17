import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { fetchLeads, fetchMessages, patchLead, sendBookingLink } from './api'
import { T, FONT_SANS, useDashboardFonts } from './theme'
import useLayout from './useLayout'
import ConversationList from './ConversationList'
import ThreadView from './ThreadView'
import LeadDetail from './LeadDetail'
import NewConversation from './NewConversation'

const POLL_MS = 5000

export default function WaDashboard({ onBack }) {
  useDashboardFonts()

  const layout = useLayout()
  const [leads, setLeads] = useState([])
  const [messages, setMessages] = useState([])
  const [selected, setSelected] = useState(null)
  const [pane, setPane] = useState('list')       // narrow only: list | thread | detail
  const [detailOpen, setDetailOpen] = useState(false) // medium only: overlay panel
  const [composing, setComposing] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [error, setError] = useState(null)

  const selectedRef = useRef(null)
  selectedRef.current = selected

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

  const handleSelect = useCallback((phone) => {
    setSelected(phone)
    setPane('thread')
  }, [])

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

  // A conversation started from here is one the lead has not opened, so jump
  // straight to it — the point of starting it was to watch for the reply.
  const handleStarted = useCallback(async (phone) => {
    setComposing(false)
    await loadLeads()
    setSelected(phone)
    setPane('thread')
  }, [loadLeads])

  const handleSendBooking = useCallback(async (phone) => {
    await sendBookingLink(phone)
    await loadLeads()
    if (phone === selectedRef.current) await loadThread(phone)
  }, [loadLeads, loadThread])

  const narrow = layout === 'narrow'
  const showList   = layout === 'wide' || layout === 'medium' || pane === 'list'
  const showThread = layout === 'wide' || layout === 'medium' || pane === 'thread'
  const showDetail = layout === 'wide' || (narrow && pane === 'detail')

  const detail = (
    <LeadDetail
      lead={selectedLead}
      messages={messages}
      layout={layout}
      onPatch={handlePatch}
      onSendBooking={handleSendBooking}
      onClose={narrow ? () => setPane('thread') : () => setDetailOpen(false)}
      showClose={narrow || layout === 'medium'}
    />
  )

  return (
    <div dir="ltr" style={{
      height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: T.white, color: T.text, fontFamily: FONT_SANS,
    }}>
      <style>{`
        .wab-skeleton { background: ${T.border}; animation: wabPulse 1.4s ease-in-out infinite; }
        @keyframes wabPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }
        .wab-root ::-webkit-scrollbar { width: 10px; height: 10px }
        .wab-root ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px }
        @media (prefers-reduced-motion: reduce) {
          .wab-skeleton { animation: none }
        }
      `}</style>

      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: T.padTight, padding: narrow ? `10px ${T.padTight}px` : `10px ${T.pad}px`,
        borderBottom: `1px solid ${T.border}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: narrow ? T.fs16 : T.fs20, fontWeight: 700, whiteSpace: 'nowrap' }}>
          {narrow ? 'WhatsApp Leads' : 'CELOX AI — WhatsApp Leads'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: T.padTight, minWidth: 0 }}>
          {error && !narrow && (
            <span style={{ fontSize: T.fs12, color: T.textMid }}>Sync issue: {error}</span>
          )}
          {onBack && <HeaderButton onClick={onBack} narrow={narrow}>Back to app</HeaderButton>}
        </div>
      </header>

      <div className="wab-root" style={{ flex: 1, minHeight: 0, display: 'flex', position: 'relative' }}>
        {showList && (
          <ConversationList
            leads={leads}
            selected={selected}
            onSelect={handleSelect}
            onNew={() => setComposing(true)}
            loading={loadingLeads}
            layout={layout}
          />
        )}

        {showThread && (
          <ThreadView
            lead={selectedLead}
            messages={messages}
            loading={loadingThread}
            layout={layout}
            onResumeBot={() => selectedLead && handlePatch(selectedLead.phone, { bot_paused: false })}
            onBack={narrow ? () => setPane('list') : undefined}
            onOpenDetail={
              narrow ? () => setPane('detail')
              : layout === 'medium' ? () => setDetailOpen(true)
              : undefined
            }
          />
        )}

        {showDetail && detail}

        {layout === 'medium' && detailOpen && (
          <>
            <div
              onClick={() => setDetailOpen(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(17,24,39,0.25)', zIndex: 1 }}
            />
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 2, display: 'flex' }}>
              {detail}
            </div>
          </>
        )}
      </div>

      {composing && (
        <NewConversation
          narrow={narrow}
          onClose={() => setComposing(false)}
          onStarted={handleStarted}
        />
      )}
    </div>
  )
}

function HeaderButton({ onClick, narrow, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: FONT_SANS, fontSize: T.fs12, cursor: 'pointer',
        padding: narrow ? '9px 12px' : '5px 10px', minHeight: narrow ? 40 : 0,
        borderRadius: T.radius, border: `1px solid ${T.border}`,
        background: T.white, color: T.text, whiteSpace: 'nowrap',
        transition: 'background-color 150ms ease',
      }}
    >
      {children}
    </button>
  )
}
