import { INTENTS, intentColor, intentLabelHe } from '../../api/_lib/intents.js'
import { T, FONT_SANS } from './theme'

/** Small soft-filled pill — coloured text on a light tint of the same colour. */
export default function IntentTag({ intent }) {
  const color = intentColor(intent)
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: FONT_SANS,
      fontSize: T.fs11,
      fontWeight: 600,
      lineHeight: 1.4,
      padding: '3px 10px',
      borderRadius: T.radiusPill,
      color,
      background: `${color}1A`, // ~10% alpha tint of the intent colour
      whiteSpace: 'nowrap',
    }}>
      {intentLabelHe(intent)}
    </span>
  )
}

/** The 8px dot on a conversation row. */
export function IntentDot({ intent }) {
  return (
    <span
      title={intent ? intentLabelHe(intent) : 'עדיין לא זוהתה כוונה'}
      style={{
        // An inline span ignores width/height — this has to be a block.
        display: 'block',
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: intent ? intentColor(intent) : T.border,
      }}
    />
  )
}

export { INTENTS }
