import { useId } from 'react'
import art from './assets/explorer.webp'
import {
  ART_W, ART_H, FRAME, HEAD_CROP_BELOW, EYE_L, EYE_R, VISOR, STATE_LOOK,
} from './avatarLook'

// TCEL-069 (rev 3) — Bar supplied the character as artwork: a chibi astronaut
// in a bubble helmet, green scarf and lime suit, standing on a rock beside a
// rose under glass (Little Prince). The painting ships as-is; the only edit is
// that the two glowing eyes were inpainted out of the visor so we can draw
// live ones here. Everything expressive — expression, glow colour, motion —
// is SVG on top, in the artwork's own coordinate space.
//
// No new dependencies. One 80 KB WebP, imported through Vite so it gets a
// hashed filename and long-cache headers for free.

export default function AvatarMascot({
  state = 'idle',
  typing = false,
  size = 96,
  // 'auto' picks the head crop below 72px, where the full figure stops reading.
  frame = 'auto',
}) {
  const uid = useId().replace(/:/g, '')
  const look = STATE_LOOK[state] || STATE_LOOK.idle
  const window_ = frame === 'auto' ? (size < HEAD_CROP_BELOW ? 'head' : 'full') : frame

  return (
    <svg
      viewBox={FRAME[window_] || FRAME.full}
      style={{ height: size, width: 'auto', display: 'block' }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id={`sc${uid}`} width="10" height="7.5" patternUnits="userSpaceOnUse">
          {/* the flat underlay keeps the eye readable once the scanlines
              average out below ~40px; the stripe carries it above that */}
          <rect width="10" height="7.5" fill={look.eye} opacity="0.46" />
          <rect width="10" height="4.2" fill={look.eye} />
        </pattern>
        <filter id={`gl${uid}`} x="-140%" y="-140%" width="380%" height="380%">
          <feGaussianBlur stdDeviation="11" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={`vs${uid}`}>
          <ellipse cx={VISOR.cx} cy={VISOR.cy} rx={VISOR.rx} ry={VISOR.ry} />
        </clipPath>
      </defs>

      <image href={art} x="0" y="0" width={ART_W} height={ART_H} />

      <g clipPath={`url(#vs${uid})`} filter={`url(#gl${uid})`} opacity={look.opacity}>
        <Eyes face={look.face} eye={look.eye} fill={`url(#sc${uid})`} />
        {typing && (
          <g className="avatar-scanband">
            <rect x="328" y="156" width="240" height="9" fill="#EAFBFF" opacity="0.55" />
          </g>
        )}
      </g>

      {look.sparkle && <Sparkles />}
      {look.query && (
        <text
          x="626" y="132" fontSize="86" fill={look.eye}
          fontFamily="system-ui, sans-serif" fontWeight="700"
          className="avatar-spark" style={{ transformOrigin: '626px 106px' }}
        >?</text>
      )}
    </svg>
  )
}

function Eyes({ face, eye, fill }) {
  const line = { stroke: eye, fill: 'none', strokeLinecap: 'round' }

  switch (face) {
    case 'open':
      return (
        <>
          <circle cx={EYE_L.x} cy={EYE_L.y} r={EYE_L.r} fill={fill} />
          <circle cx={EYE_R.x} cy={EYE_R.y} r={EYE_R.r} fill={fill} />
        </>
      )
    case 'wink':
      return (
        <>
          <circle cx={EYE_L.x} cy={EYE_L.y} r={EYE_L.r} fill={fill} />
          <path d="M490 219 Q518 178 547 208" {...line} strokeWidth="13" />
        </>
      )
    case 'happy':
      return (
        <>
          <path d="M380 216 Q416 170 452 216" {...line} strokeWidth="15" />
          <path d="M490 214 Q518 176 546 208" {...line} strokeWidth="13" />
        </>
      )
    case 'chevron':
      return (
        <>
          <path d="M438 172 L398 201 L438 230" {...line} strokeWidth="15" strokeLinejoin="round" />
          <path d="M537 176 L503 200 L537 224" {...line} strokeWidth="13" strokeLinejoin="round" />
        </>
      )
    case 'narrow':
      return (
        <>
          <path d="M381 184 L453 202 L453 220 L381 211 Z" fill={fill} />
          <path d="M549 186 L492 204 L492 220 L549 214 Z" fill={fill} />
        </>
      )
    case 'lost':
      return (
        <>
          <circle cx={EYE_L.x} cy={EYE_L.y + 4} r="31" fill={fill} />
          <circle cx={EYE_R.x + 4} cy={EYE_R.y - 2} r="16" fill={fill} />
        </>
      )
    default:
      return null
  }
}

function Sparkles() {
  return (
    <>
      <Star x={626} y={138} r={26} delay={0} />
      <Star x={212} y={242} r={19} delay={0.5} />
      <Star x={594} y={306} r={15} delay={0.9} />
    </>
  )
}

function Star({ x, y, r, delay }) {
  const d = `M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y}
             L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r}
             L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y}
             L${x - r * 0.3} ${y - r * 0.3} Z`
  return (
    <path
      className="avatar-spark" d={d} fill="#FFD86B"
      style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }}
    />
  )
}
