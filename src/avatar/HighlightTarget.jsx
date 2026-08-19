import { useEffect, useRef } from 'react'

// TCEL-075 / TCEL-049 — shared highlight machinery used by both the
// navigation-triggered glow and the onboarding tooltip system.
// Registers a DOM node against a stable id so it can be found and glowed
// after a tab switch, even if the node doesn't exist yet at call time
// (new tab content mounts asynchronously after setActiveTab).

const registry = new Map()

export function useHighlightRef(targetId) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) registry.set(targetId, ref.current)
    return () => registry.delete(targetId)
  })
  return ref
}

/**
 * Applies the glow class to a registered target, retrying briefly since the
 * target may not be mounted yet right after a tab switch.
 * @param {string} targetId
 * @param {{timeoutMs?: number, retries?: number}} [opts]
 */
export function highlightTarget(targetId, opts = {}) {
  const { timeoutMs = 8000, retries = 10 } = opts
  let attempt = 0
  const tryHighlight = () => {
    const el = registry.get(targetId)
    if (el) {
      el.classList.add('avatar-highlight')
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const clear = () => el.classList.remove('avatar-highlight')
      el.addEventListener('click', clear, { once: true })
      el.addEventListener('focus', clear, { once: true })
      setTimeout(clear, timeoutMs)
      return
    }
    attempt += 1
    if (attempt < retries) setTimeout(tryHighlight, 150)
  }
  tryHighlight()
}

// The .avatar-highlight CSS class itself lives in tokens.css, colocated
// with the other avatar tokens/keyframes rather than duplicated here.
