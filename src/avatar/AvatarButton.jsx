import { useEffect, useState } from 'react'
import AvatarBadge from './AvatarBadge'
import { subscribePointer, getPointer } from './avatarPointer'

// TCEL-076 (rev 3) — the launcher is the character standing on the page,
// bottom-left. Placement uses a literal `left`, not a logical property: this is
// a screen-side call that must not flip with RTL.
//
// It is also the thing that walks. avatarPointer publishes a translation and
// the figure transforms away from its fixed corner to stand under whatever it
// is pointing at, then comes back. Keeping the anchor fixed and only
// transforming means nothing about layout or hit-testing changes while he is
// away, and a reduced-motion visitor simply never sees him move.
export default function AvatarButton({ state, open, onClick, isMobile }) {
  const size = isMobile ? 80 : 96
  const [pointer, setPointer] = useState(getPointer)
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)

  useEffect(() => subscribePointer(setPointer), [])

  // One place decides the transform — otherwise a stray hover would strand him
  // mid-journey, which is exactly the kind of bug inline handlers cause.
  const travel = `translate(${pointer.dx}px, ${pointer.dy}px)`
  const idle = press ? 'scale(0.96)' : hover ? 'translateY(-4px) scale(1.03)' : 'none'
  const transform = pointer.pointing ? `${travel} scale(1.06)` : idle

  return (
    <button
      data-avatar-launcher=""
      onClick={onClick}
      aria-label={open ? 'סגור את עוזר CELOX' : 'פתח את עוזר CELOX'}
      aria-expanded={open}
      style={{
        position: 'fixed',
        left: isMobile ? 12 : 20,
        bottom: isMobile ? 12 : 20,
        // While pointing he has to clear the onboarding spotlight, which sits
        // at +50. At rest he stays below the app's own overlays.
        zIndex: pointer.pointing ? 'calc(var(--avatar-z) + 60)' : 'var(--avatar-z)',
        minWidth: 48,
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        lineHeight: 0,
        transform,
        transition: pointer.pointing || pointer.dx || pointer.dy
          ? 'transform 600ms cubic-bezier(.34,.8,.3,1)'
          : 'transform var(--avatar-duration-base) var(--avatar-ease)',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false) }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
    >
      <AvatarBadge state={open ? 'idle' : state} size={size} />
    </button>
  )
}
