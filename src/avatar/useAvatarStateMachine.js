import { useReducer, useCallback } from 'react'

// TCEL-053 — explicit reducer, not a library. The state set is small and
// fixed; xstate/similar would be unjustified weight for 7 states.
export const AVATAR_STATES = [
  'idle', 'onboarding', 'qa', 'navigating', 'escalating', 'success', 'confused',
]

const transitions = {
  idle:       { open: 'qa', firstTimeUser: 'onboarding' },
  onboarding: { skip: 'idle', complete: 'idle' },
  qa:         { navigateIntent: 'navigating', complaintIntent: 'escalating', lowConfidence: 'confused', close: 'idle' },
  navigating: { done: 'qa', close: 'idle' },
  escalating: { confirm: 'success', cancel: 'qa', lowConfidence: 'confused' },
  success:    { timeout: 'idle', close: 'idle' },
  confused:   { retry: 'qa', close: 'idle' },
}

function reducer(state, action) {
  const next = transitions[state.value]?.[action.type]
  if (!next) return state // unknown transition for this state — no-op, don't crash
  return { value: next, payload: action.payload ?? null }
}

/**
 * @returns {[{value: string, payload: any}, (type: string, payload?: any) => void]}
 */
export function useAvatarStateMachine(initial = 'idle') {
  const [state, dispatch] = useReducer(reducer, { value: initial, payload: null })
  const send = useCallback((type, payload) => dispatch({ type, payload }), [])
  return [state, send]
}
