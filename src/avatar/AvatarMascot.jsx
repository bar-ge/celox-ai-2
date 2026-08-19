// TCEL-069 (revised again) — Bar picked option A from three SVG concepts
// shown in chat: a rounded 3D robot head with an antenna and a "screen"
// face. Same constraints as before: no image-generation tool available, so
// this is pure SVG (gradient body + blurred highlight + contact shadow for
// the 3D read), same brand palette, no new dependencies.

const TINT = {
  idle:       { a: '#eef2ff', b: '#c7d2fe', c: '#818cf8', screen: '#4c4a63' },
  onboarding: { a: '#60a5fa', b: '#2563eb', c: '#1d4ed8', screen: '#173a7a' },
  qa:         { a: '#60a5fa', b: '#2563eb', c: '#1d4ed8', screen: '#173a7a' },
  navigating: { a: '#60a5fa', b: '#2563eb', c: '#1d4ed8', screen: '#173a7a' },
  escalating: { a: '#f87171', b: '#ef4444', c: '#b91c1c', screen: '#7f1d1d' },
  success:    { a: '#6ee7b7', b: '#10b981', c: '#047857', screen: '#065f46' },
  confused:   { a: '#fcd34d', b: '#f59e0b', c: '#b45309', screen: '#7c4a03' },
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
        <linearGradient id={gid} x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor={t.a} />
          <stop offset="55%" stopColor={t.b} />
          <stop offset="100%" stopColor={t.c} />
        </linearGradient>
        <radialGradient id={hid} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* contact shadow */}
      <ellipse cx="32" cy="58" rx="17" ry="3.5" fill="#000" opacity="0.14" />

      {/* antenna */}
      <line x1="32" y1="6" x2="32" y2="15" stroke={t.c} strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="6" r="4" fill={t.b} className={typing || state === 'navigating' ? 'avatar-antenna-blink' : undefined} />

      {/* head — rounded square with gradient shading for a 3D read */}
      <rect x="9" y="14" width="46" height="42" rx="18" fill={`url(#${gid})`} />

      {/* specular highlight, blurred */}
      <ellipse cx="22" cy="24" rx="11" ry="7" fill={`url(#${hid})`} />

      {/* screen */}
      <rect x="18" y="30" width="28" height="16" rx="6" fill={t.screen} />

      <Face state={state} typing={typing} />
    </svg>
  )
}

function Face({ state, typing }) {
  if (typing) {
    return (
      <g fill="#fff">
        {[0, 1, 2].map(i => (
          <circle key={i} cx={26 + i * 6} cy={38} r={1.8}>
            <animate attributeName="cy" values="38;34;38" dur="1s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </g>
    )
  }

  switch (state) {
    case 'success':
      return (
        <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <path d="M23 37 Q26 34 29 37" />
          <path d="M35 37 Q38 34 41 37" />
          <path d="M25 42 Q32 46 39 42" />
        </g>
      )
    case 'confused':
      return (
        <g>
          <line x1="22" y1="35" x2="27" y2="37" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="42" y1="35" x2="37" y2="37" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="24" y1="43" x2="40" y2="43" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )
    case 'escalating':
      return (
        <g fill="#fff">
          <circle cx="26" cy="38" r="2.6" />
          <circle cx="38" cy="38" r="2.6" />
          <rect x="30" y="41" width="4" height="3" rx="1" />
        </g>
      )
    case 'navigating':
      return (
        <g fill="#fff">
          <circle cx="27" cy="38" r="2.2" />
          <circle cx="39" cy="38" r="2.2" />
          <path d="M30 43 L34 43" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </g>
      )
    case 'onboarding':
    case 'qa':
      return (
        <g fill="#fff">
          <circle cx="26" cy="38" r="2.4" />
          <circle cx="38" cy="38" r="2.4" />
          <path d="M25 43 Q32 46 39 43" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      )
    case 'idle':
    default:
      return (
        <g fill="#c7c5d8">
          <circle cx="26" cy="38" r="2" />
          <circle cx="38" cy="38" r="2" />
        </g>
      )
  }
}
