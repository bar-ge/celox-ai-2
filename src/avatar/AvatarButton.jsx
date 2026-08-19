import AvatarBadge from './AvatarBadge'

// TCEL-076 — placement: fixed bottom-left, per Bar's request (moved off the
// original bottom-right, and sized 50% larger: 56px -> 84px desktop,
// 48px -> 72px mobile). Uses literal `left`, not a logical property — this
// is a screen-side placement call, not something that should flip with RTL.
// TCEL-078 — still shrinks on mobile, just from a larger base.
export default function AvatarButton({ state, open, onClick, isMobile }) {
  const size = isMobile ? 72 : 84
  return (
    <button
      onClick={onClick}
      aria-label={open ? 'סגור את עוזר CELOX' : 'פתח את עוזר CELOX'}
      aria-expanded={open}
      style={{
        position: 'fixed',
        left: isMobile ? 16 : 24,
        bottom: isMobile ? 16 : 24,
        zIndex: 'var(--avatar-z)',
        width: size, height: size, borderRadius: '50%',
        border: 'none', cursor: 'pointer',
        background: 'var(--avatar-surface)',
        boxShadow: 'var(--avatar-shadow-float)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform var(--avatar-duration-fast) var(--avatar-ease)',
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.94)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <AvatarBadge state={open ? 'idle' : state} size={size - 16} />
    </button>
  )
}
