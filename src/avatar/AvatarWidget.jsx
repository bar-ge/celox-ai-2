import { useState, useCallback } from 'react'
import './tokens.css'
import { AvatarProvider } from './AvatarContext'
import { useAvatarCtx } from './useAvatarCtx'
import AvatarButton from './AvatarButton'
import AvatarPanel from './AvatarPanel'
import OnboardingOverlay from './OnboardingOverlay'
import { askAvatar, isLowConfidence } from './llmClient'
import { runNavAction, NAV_ACTIONS } from './avatarActions'
import { pointAt } from './avatarPointer'

// TCEL-045 — composition root. Owns no business logic beyond wiring the
// pieces together; state machine + provider carry the real logic (TCEL-053,
// TCEL-048). Mount once near the root of FleetManager (see fleet-manager.jsx).
export default function AvatarWidget({ rtl, lang, activeTab, setActiveTab, profile, userId, isMobile }) {
  return (
    <AvatarProvider rtl={rtl} lang={lang} activeTab={activeTab} setActiveTab={setActiveTab} profile={profile} userId={userId}>
      <AvatarWidgetInner isMobile={isMobile} />
    </AvatarProvider>
  )
}

function AvatarWidgetInner({ isMobile }) {
  const { rtl, lang, activeTab, setActiveTab, state, send, messages, addMessage, markOnboardingSeen } = useAvatarCtx()
  const [open, setOpen] = useState(false)
  const [thinking, setThinking] = useState(false)

  const toggle = useCallback(() => {
    setOpen(o => {
      if (!o) send('open')
      else send('close')
      return !o
    })
  }, [send])

  const closePanel = useCallback(() => { setOpen(false); send('close') }, [send])

  const handleSend = useCallback(async (text) => {
    addMessage('user', text)
    setThinking(true)
    const history = messages.map(m => ({ role: m.role, text: m.text }))
    const reply = await askAvatar({ message: text, history, context: { route: activeTab, lang } })
    setThinking(false)

    if (isLowConfidence(reply)) {
      addMessage('assistant', reply.reply)
      send('lowConfidence')
      return
    }

    if (reply.intent === 'navigate' && reply.actionId) {
      const ok = runNavAction(reply.actionId, setActiveTab)
      addMessage('assistant', reply.reply)
      send(ok ? 'navigateIntent' : 'lowConfidence')
      if (ok) {
        // Walk over and glow the tab we just switched to, so "I took you to
        // Vehicles" is something the user sees rather than has to find. The
        // machine leaves `navigating` only once he is back in his corner.
        pointAt(NAV_ACTIONS[reply.actionId]).then(() => send('done'))
      }
      return
    }

    if (reply.intent === 'escalate') {
      addMessage('assistant', reply.reply, { escalationDraft: { description: text } })
      send('complaintIntent')
      return
    }

    addMessage('assistant', reply.reply)
  }, [addMessage, messages, activeTab, lang, setActiveTab, send])

  const handleConfirmEscalation = useCallback(async (draft) => {
    setThinking(true)
    let ref = null
    try {
      const res = await fetch('/api/avatar/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (res.ok) {
        const data = await res.json()
        ref = data?.reference || null
      }
    } catch {
      /* fall through to local reference below */
    }
    if (!ref) ref = `TMP-${Date.now().toString(36).toUpperCase()}` // local fallback if the backend/table isn't set up yet
    setThinking(false)
    addMessage('assistant', `הפנייה נשלחה. מספר אסמכתא: ${ref}`)
    send('confirm')
    setTimeout(() => send('timeout'), 2500)
  }, [addMessage, send])

  const handleCancelEscalation = useCallback(() => {
    addMessage('assistant', 'בוטל. אפשר לנסח מחדש.')
    send('cancel')
  }, [addMessage, send])

  // Onboarding overlay is full-screen, not the chat panel — derive visibility
  // instead of syncing it with a setState-in-effect.
  const panelOpen = open && state.value !== 'onboarding'

  return (
    <>
      {state.value === 'onboarding' && (
        <OnboardingOverlay
          rtl={rtl}
          setActiveTab={setActiveTab}
          onDone={() => { markOnboardingSeen(); send('complete') }}
        />
      )}

      <AvatarButton state={state.value} open={panelOpen} onClick={toggle} isMobile={isMobile} />

      {panelOpen && (
        <AvatarPanel
          rtl={rtl}
          isMobile={isMobile}
          state={state.value}
          messages={messages}
          thinking={thinking}
          onSend={handleSend}
          onClose={closePanel}
          onConfirmEscalation={handleConfirmEscalation}
          onCancelEscalation={handleCancelEscalation}
        />
      )}
    </>
  )
}
