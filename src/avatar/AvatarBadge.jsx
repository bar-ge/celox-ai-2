import AvatarMascot from './AvatarMascot'

// TCEL-073 — visual states, revised per Bar's request for a "cool 3D" look
// (see AvatarMascot.jsx for why this is SVG shading rather than generated
// artwork). The wrapper here only controls motion (breathe/spin/pulse/bounce/
// shake) — all the shape+color 3D work lives in the mascot SVG itself.

const STATE_ANIM = {
  idle:       'avatar-breathe 4s ease-in-out infinite',
  onboarding: 'none',
  qa:         'none',
  navigating: 'avatar-spin-slow 2.4s linear infinite',
  escalating: 'avatar-ring-pulse 1.6s infinite',
  success:    'avatar-bounce 0.3s ease-in-out',
  confused:   'avatar-shake 0.24s ease-in-out',
}

export default function AvatarBadge({ state = 'idle', typing = false, size = 32 }) {
  const anim = STATE_ANIM[state] || STATE_ANIM.idle
  return (
    <div
      className="avatar-badge"
      role="img"
      aria-label={ariaLabel(state, typing)}
      style={{
        width: size, height: size,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: anim,
        flexShrink: 0,
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))',
      }}
    >
      <AvatarMascot state={state} typing={typing} size={size} />
    </div>
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
