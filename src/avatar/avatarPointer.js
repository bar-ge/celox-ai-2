// TCEL-049 / TCEL-075 (rev 2) — "show me where to click".
//
// The original machinery (HighlightTarget.useHighlightRef) asked every target
// to register a React ref, and nothing ever did: the registry was always
// empty, so highlightTarget() retried ten times and gave up silently. The glow
// has never fired in production, which is why the onboarding tour has always
// been a card on a grey screen.
//
// This replaces the ref registry with a DOM query. Both nav bars already render
// data-ntab="<tabId>" on their buttons, so a target can be found without any
// component opting in, and the link cannot rot when a nav is refactored.
//
// The avatar itself is moved by publishing a translation offset that
// AvatarButton subscribes to — the figure keeps its fixed corner anchor and
// simply transforms away from it, so nothing about layout changes.

const listeners = new Set()
let pointer = { dx: 0, dy: 0, pointing: false }

export function subscribePointer(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export function getPointer() { return pointer }

function publish(next) {
  pointer = next
  listeners.forEach(fn => fn(pointer))
}

const reduceMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

// A tab id can appear in both nav bars (top on desktop, bottom on mobile);
// only one is ever displayed, so pick the one that is actually laid out.
export function findTarget(tabId) {
  const sel = `[data-ntab="${CSS.escape(tabId)}"]`
  const els = Array.from(document.querySelectorAll(sel))
  return els.find(el => el.offsetParent !== null && el.getClientRects().length) || null
}

async function waitForTarget(tabId, timeoutMs = 1500) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const el = findTarget(tabId)
    if (el) return el
    if (Date.now() > deadline) return null
    await new Promise(r => setTimeout(r, 80))
  }
}

const AVATAR_SELECTOR = '[data-avatar-launcher]'
const GAP = 14

// Where the avatar should stand so he reads as pointing AT the target rather
// than sitting on top of it: directly under it, or above it when the target is
// near the bottom of the screen (the mobile tab bar).
function offsetToward(target) {
  const av = document.querySelector(AVATAR_SELECTOR)
  if (!av) return null
  const a = av.getBoundingClientRect()
  const t = target.getBoundingClientRect()
  if (!a.width || !t.width) return null

  const vw = window.innerWidth
  const vh = window.innerHeight
  const aCx = a.left + a.width / 2
  const aCy = a.top + a.height / 2

  let wantY = t.bottom + GAP + a.height / 2
  if (wantY + a.height / 2 > vh - 8) wantY = t.top - GAP - a.height / 2
  const wantX = t.left + t.width / 2

  // Keep him fully on screen even when the target hugs an edge.
  const clampedX = Math.min(Math.max(wantX, a.width / 2 + 8), vw - a.width / 2 - 8)
  const clampedY = Math.min(Math.max(wantY, a.height / 2 + 8), vh - a.height / 2 - 8)

  // getBoundingClientRect already includes the offset he is currently carrying,
  // so the delta it yields is relative to where he is standing now — but what
  // we publish is absolute, measured from his fixed corner. Without adding the
  // current offset back in, every move after the first lands somewhere wrong
  // (the onboarding tour walked him off the bottom-left of the screen).
  return {
    dx: Math.round(clampedX - aCx) + pointer.dx,
    dy: Math.round(clampedY - aCy) + pointer.dy,
  }
}

/**
 * Walk the avatar to a tab, glow the tab, then walk him home.
 * Resolves when he is back, so callers can await a full round trip.
 *
 * @param {string} tabId          a tab id from fleet-manager's `tabs`
 * @param {{hold?: number, stay?: boolean}} [opts]
 *   hold — ms to linger once he arrives
 *   stay — leave him there (onboarding drives him step to step; the caller
 *          calls releasePointer() at the end instead)
 * @returns {Promise<boolean>} whether the target was found
 */
export async function pointAt(tabId, opts = {}) {
  const { hold = 2000, stay = false } = opts
  const target = await waitForTarget(tabId)
  if (!target) return false

  document.querySelectorAll('.avatar-highlight')
    .forEach(el => el !== target && el.classList.remove('avatar-highlight'))
  target.classList.add('avatar-highlight')

  const off = offsetToward(target)
  if (off && !reduceMotion()) {
    publish({ ...off, pointing: true })
    await new Promise(r => setTimeout(r, 620))   // travel
  }

  await new Promise(r => setTimeout(r, hold))
  if (!stay) {
    // `stay` callers keep the glow until they move him on or release him;
    // dropping it here would leave the tour pointing at nothing.
    target.classList.remove('avatar-highlight')
    publish({ dx: 0, dy: 0, pointing: false })
    await new Promise(r => setTimeout(r, 520))   // walk home
  }
  return true
}

/** Send him back to his corner and clear any glow left behind. */
export function releasePointer() {
  document.querySelectorAll('.avatar-highlight')
    .forEach(el => el.classList.remove('avatar-highlight'))
  publish({ dx: 0, dy: 0, pointing: false })
}
