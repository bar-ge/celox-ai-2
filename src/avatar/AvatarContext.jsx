import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAvatarStateMachine } from './useAvatarStateMachine'
import { AvatarCtx } from './avatarCtx'

// TCEL-048 — context provider. Reads session/route/lang from whatever the
// host component (FleetManager) already owns rather than introducing a
// second router/session source of truth — this app has no router, tab
// navigation is plain React state in fleet-manager.jsx.
//
// TCEL-050 — first-time detection. Flag is localStorage-only for now
// (per-device, not per-account). Recommended upgrade: move to a field on the
// user/profile row server-side so it survives across devices — flagged to
// Bar in the Monday update, not decided here.

const SEEN_KEY = 'celox_avatar_onboarding_seen_v1'

export function AvatarProvider({ children, rtl, lang, activeTab, setActiveTab, profile, userId }) {
  const [state, send] = useAvatarStateMachine('idle')
  const [messages, setMessages] = useState([])
  const [pendingEscalation, setPendingEscalation] = useState(null)

  const seenKey = userId ? `${SEEN_KEY}_${userId}` : SEEN_KEY

  useEffect(() => {
    try {
      const seen = localStorage.getItem(seenKey)
      if (!seen) send('firstTimeUser')
    } catch {
      /* localStorage unavailable (private mode etc.) — skip onboarding auto-trigger */
    }
  }, [seenKey, send])

  const markOnboardingSeen = useCallback(() => {
    try { localStorage.setItem(seenKey, '1') } catch { /* ignore */ }
  }, [seenKey])

  const replayOnboarding = useCallback(() => {
    // Does not reset the seen-flag — replay is explicit, shouldn't re-trigger
    // automatically on next login. TCEL-047.
    send('firstTimeUser')
  }, [send])

  const addMessage = useCallback((role, text, extra = {}) => {
    setMessages(p => [...p, { role, text, ts: Date.now(), ...extra }])
  }, [])

  const value = useMemo(() => ({
    rtl, lang, activeTab, setActiveTab, profile,
    state, send,
    messages, addMessage, setMessages,
    pendingEscalation, setPendingEscalation,
    markOnboardingSeen, replayOnboarding,
  }), [rtl, lang, activeTab, setActiveTab, profile, state, send, messages, addMessage, pendingEscalation, markOnboardingSeen, replayOnboarding])

  return <AvatarCtx.Provider value={value}>{children}</AvatarCtx.Provider>
}
