// TCEL-069 (revised) — Bar asked for a "cool 3D" look instead of the flat
// geometric badge. No image-generation tool is available in this session, so
// this is a pure-SVG pseudo-3D treatment: radial-gradient shading + a blurred
// specular highlight + a soft contact shadow simulate a glossy sphere,
// stacked with a simple expressive face that changes per state. No new
// libraries, no generated assets — same brand palette as everything else.

const TINT = {
  idle:       { a: '#eef2ff', b: '#c7d2fe', c: '#818cf8' }, // soft indigo, resting
  onboarding: { a: '#60a5fa', b: '#2563eb', c: '#1d4ed8' },
  qa:         { a: '#60a5fa', b: '#2563eb', c: '#1d4ed8' },
  navigating: { a: '#60a5fa', b: '#2563eb', c: '#1d4ed8' },
  escalating: { a: '#f87171', b: '#ef4444', c: '#b91c1c' },
  success:    { a: '#6ee7b7', b: '#10b981', c: '#047857' },
  confused:   { a: '#fcd34d', b: '#f59e0b', c: '#b45309' },
}

export default function AvatarMascot({ state = 'idle', typing = false, size = 32 }) {
  const t = TINT[state] || TINT.idle
  const gid = `avatar-grad-${state}`
  const hid = `avatar-hi-${state}`

  return (
    <svg
      width={size} height={size} viewBox="0 0 64 64"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={gid} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor={t.a} />
          <stop offset="55%" stopColor={t.b} />
          <stop offset="100%" stopColor={t.c} />
        </radialGradient>
        <radialGradient id={hid} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* contact shadow */}
      <ellipse cx="32" cy="58" rx="16" ry="3.5" fill="#000" opacity="0.14" />

      {/* body — sphere with radial-gradient shading for a 3D read */}
      <circle cx="32" cy="30" r="26" fill={`url(#${gid})`} />

      {/* specular highlight, blurred */}
      <ellipse cx="23" cy="18" rx="12" ry="8" fill={`url(#${hid})`} />

      {/* face */}
      <Face state={state} typing={typing} />
    </svg>
  )
}

function Face({ state, typing }) {
  const dark = 'rgba(0,0,0,0.55)'

  if (typing) {
    return (
      <g fill="#fff">
        {[0, 1, 2].map(i => (
          <circle key={i} cx={22 + i * 10} cy={32} r={2.6}>
            <animate attributeName="cy" values="32;27;32" dur="1s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </g>
    )
  }

  switch (state) {
    case 'success':
      // happy closed-eye arcs + smile
      return (
        <g stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M22 28 Q26 24 30 28" />
          <path d="M34 28 Q38 24 42 28" />
          <path d="M24 36 Q32 43 40 36" />
        </g>
      )
    case 'confused':
      // tilted brows + flat mouth
      return (
        <g stroke={dark} strokeWidth="3" strokeLinecap="round" fill="none">
          <line x1="20" y1="24" x2="27" y2="27" />
          <line x1="44" y1="24" x2="37" y2="27" />
          <circle cx="24" cy="33" r="2.6" fill={dark} stroke="none" />
          <circle cx="40" cy="33" r="2.6" fill={dark} stroke="none" />
          <path d="M25 41 Q32 38 39 41" />
        </g>
      )
    case 'escalating':
      // wide alert eyes
      return (
        <g>
          <circle cx="24" cy="31" r="4" fill="#fff" />
          <circle cx="40" cy="31" r="4" fill="#fff" />
          <circle cx="24" cy="31" r="2" fill="#7f1d1d" />
          <circle cx="40" cy="31" r="2" fill="#7f1d1d" />
          <path d="M25 42 Q32 39 39 42" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      )
    case 'navigating':
      return (
        <g fill="#fff">
          <circle cx="24" cy="31" r="3.2" />
          <circle cx="40" cy="31" r="3.2" />
          <path d="M26 40 Q32 44 38 40" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      )
    case 'onboarding':
    case 'qa':
      return (
        <g fill="#fff">
          <circle cx="24" cy="31" r="3.2" />
          <circle cx="40" cy="31" r="3.2" />
          <path d="M25 40 Q32 45 39 40" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      )
    case 'idle':
    default:
      return (
        <g fill="var(--avatar-text-secondary, #5A5460)">
          <circle cx="24" cy="31" r="3" />
          <circle cx="40" cy="31" r="3" />
          <path d="M26 39 Q32 42 38 39" stroke="var(--avatar-text-secondary, #5A5460)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </g>
      )
  }
}
