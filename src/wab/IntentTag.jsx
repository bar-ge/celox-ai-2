import { INTENTS, intentColor, intentLabel } from '../../api/_lib/intents.js'
import { T, FONT_SANS } from './theme'

/** Small outlined tag — coloured border and text, never filled. */
export default function IntentTag({ intent }) {
  const color = intentColor(intent)
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: FONT_SANS,
      fontSize: T.fs11,
      lineHeight: 1.4,
      padding: '2px 8px',
      border: `1px solid ${color}`,
      borderRadius: T.radius,
      color,
      background: 'transparent',
      whiteSpace: 'nowrap',
    }}>
      {intentLabel(intent)}
    </span>
  )
}

/** The 8px dot on a conversation row. */
export function IntentDot({ intent }) {
  return (
    <span
      title={intent ? intentLabel(intent) : 'No intent yet'}
      style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: intent ? intentColor(intent) : T.border,
      }}
    />
  )
}

export { INTENTS }
