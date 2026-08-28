import AvatarMascot from './AvatarMascot'

// TCEL-073 (rev 3) — the wrapper still owns motion only; expression and colour
// live in AvatarMascot. Props and aria labels are unchanged from the previous
// revision, so AvatarPanel, AvatarWidget and OnboardingOverlay need no edits.
//
// `size` is now the character's HEIGHT — the figure is taller than it is wide.
// Width follows the artwork. Below 72px the mascot swaps itself to the head
// crop; pass frame="head" to force it at any size.

const STATE_ANIM = {
  idle:       'avatar-float 5.2s ease-in-out infinite',
  onboarding: 'avatar-perk 3s ease-in-out infinite',
  qa:         'avatar-perk 3s ease-in-out infinite',
  navigating: 'avatar-lean 1.5s ease-in-out infinite',
  escalating: 'avatar-shake 0.5s ease-in-out infinite',
  success:    'avatar-hop 1.1s ease-in-out',
  confused:   'avatar-tilt 2.2s ease-in-out infinite',
}

export default function AvatarBadge({ state = 'idle', typing = false, size = 96, frame = 'auto' }) {
  return (
    <div
      className="avatar-badge"
      role="img"
      aria-label={ariaLabel(state, typing)}
      style={{
        height: size,
        display: 'inline-flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        flexShrink: 0,
        transformOrigin: '50% 88%',
        animation: STATE_ANIM[state] || STATE_ANIM.idle,
        filter: 'drop-shadow(0 6px 14px rgba(16,27,46,0.22))',
      }}
    >
      <AvatarMascot state={state} typing={typing} size={size} frame={frame} />
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
