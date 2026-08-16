import { T, FONT_SANS, FONT_MONO, bubbleTime } from './theme'

/**
 * One message. The row is laid out LTR like the rest of the chrome; only the
 * text inside the bubble gets dir="auto" so Hebrew reads right-to-left.
 */
export default function MessageBubble({ message, gapTop }) {
  const outbound = message.direction === 'outbound'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: outbound ? 'flex-end' : 'flex-start',
      marginTop: gapTop,
    }}>
      <div style={{
        maxWidth: '70%',
        background: outbound ? T.accent : T.bubbleIn,
        color: outbound ? T.white : T.text,
        borderRadius: T.radius,
        padding: '8px 12px',
        fontFamily: FONT_SANS,
        fontSize: T.fs14,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        <span dir="auto" style={{ display: 'block' }}>{message.body}</span>
      </div>

      <div style={{
        fontFamily: FONT_MONO,
        fontSize: T.fs11,
        color: T.textDim,
        marginTop: 3,
      }}>
        {bubbleTime(message.created_at)}
      </div>
    </div>
  )
}
