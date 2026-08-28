import AvatarBadge from './AvatarBadge'

// TCEL-076 (rev 2) — the launcher is no longer a white circle with an icon in
// it: the character stands directly on the page, bottom-left. Placement is
// unchanged (literal `left`, not a logical property — this is a screen-side
// call that must not flip with RTL).
//
// Height, not width: 96px desktop / 80px mobile is the smallest the full
// figure stays readable at. Hit area is padded out to meet the 44px minimum
// on its narrow axis.
export default function AvatarButton({ state, open, onClick, isMobile }) {
  const size = isMobile ? 80 : 96
  return (
    <button
      onClick={onClick}
      aria-label={open ? 'סגור את עוזר CELOX' : 'פתח את עוזר CELOX'}
      aria-expanded={open}
      style={{
        position: 'fixed',
        left: isMobile ? 12 : 20,
        bottom: isMobile ? 12 : 20,
        zIndex: 'var(--avatar-z)',
        minWidth: 48,
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        lineHeight: 0,
        transition: 'transform var(--avatar-duration-base) var(--avatar-ease)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)' }}
    >
      <AvatarBadge state={open ? 'idle' : state} size={size} />
    </button>
  )
}
