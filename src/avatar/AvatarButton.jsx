import AvatarBadge from './AvatarBadge'

// TCEL-076 — placement: fixed bottom-right (bottom-left in RTL would still
// read "far corner" to a Hebrew user, but the app's other fixed elements —
// CRM's bottom bar, fleet-manager's overflow menu — don't mirror by
// language, so this doesn't either, for consistency).
// TCEL-078 — shrinks on mobile.
export default function AvatarButton({ state, open, onClick, isMobile }) {
  const size = isMobile ? 48 : 56
  return (
    <button
      onClick={onClick}
      aria-label={open ? 'סגור את עוזר CELOX' : 'פתח את עוזר CELOX'}
      aria-expanded={open}
      style={{
        position: 'fixed',
        insetInlineEnd: isMobile ? 16 : 24,
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
