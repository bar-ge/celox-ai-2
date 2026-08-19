// TCEL-073 — visual states. Pure function of `state`: no separate artwork per
// state, only fill + motion changes on one circular badge (TCEL-069 — minimal,
// geometric, not a cartoon/3D character).

const STATE_STYLE = {
  idle:       { bg: 'var(--avatar-surface-alt)', ring: 'var(--avatar-border)', anim: 'avatar-breathe 4s ease-in-out infinite' },
  onboarding: { bg: 'var(--avatar-primary)', ring: 'var(--avatar-primary)', anim: 'none' },
  qa:         { bg: 'var(--avatar-primary)', ring: 'var(--avatar-primary)', anim: 'none' },
  navigating: { bg: 'var(--avatar-primary)', ring: 'var(--avatar-primary)', anim: 'avatar-spin 1.6s linear infinite' },
  escalating: { bg: 'var(--avatar-error)', ring: 'var(--avatar-error)', anim: 'avatar-ring-pulse 1.6s infinite' },
  success:    { bg: 'var(--avatar-success)', ring: 'var(--avatar-success)', anim: 'avatar-bounce 0.2s ease-in-out' },
  confused:   { bg: 'var(--avatar-warning)', ring: 'var(--avatar-warning)', anim: 'avatar-shake 0.24s ease-in-out' },
}

export default function AvatarBadge({ state = 'idle', typing = false, size = 32 }) {
  const style = STATE_STYLE[state] || STATE_STYLE.idle
  return (
    <div
      className="avatar-badge"
      role="img"
      aria-label={ariaLabel(state, typing)}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: style.bg,
        border: `2px solid ${style.ring}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: style.anim,
        flexShrink: 0,
        transition: 'background var(--avatar-duration-base) var(--avatar-ease), border-color var(--avatar-duration-base) var(--avatar-ease)',
      }}
    >
      {typing ? <TypingDots /> : <CenterGlyph state={state} size={size} />}
    </div>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 4, height: 4, borderRadius: '50%', background: '#fff',
          animation: `avatar-pulse-dot var(--avatar-pulse-duration) ease-in-out ${i * 0.15}s infinite`,
        }} />
      ))}
    </div>
  )
}

function CenterGlyph({ state, size }) {
  const isLight = state === 'idle'
  const color = isLight ? 'var(--avatar-text-secondary)' : '#fff'
  return (
    <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 3 L14 10 L21 12 L14 14 L12 21 L10 14 L3 12 L10 10 Z" />
    </svg>
  )
}

function ariaLabel(state, typing) {
  const labels = {
    idle: 'עוזר CELOX — ממתין',
    onboarding: 'עוזר CELOX — סיור היכרות',
    qa: 'עוזר CELOX — פעיל',
    navigating: 'עוזר CELOX — מנווט',
    escalating: 'עוזר CELOX — פותח פנייה',
    success: 'עוזר CELOX — הושלם בהצלחה',
    confused: 'עוזר CELOX — לא הבנתי, נסו שוב',
  }
  return typing ? 'עוזר CELOX — מקליד תשובה' : (labels[state] || labels.idle)
}
