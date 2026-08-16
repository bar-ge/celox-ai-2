import { T, FONT_MONO } from './theme'

/** The one pill on the screen, alongside intent tags. */
export default function StageBadge({ stage }) {
  if (!stage) return null
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: FONT_MONO,
      fontSize: T.fs11,
      lineHeight: 1.4,
      letterSpacing: '0.04em',
      padding: '2px 10px',
      borderRadius: 999,
      border: `1px solid ${T.border}`,
      color: T.textMid,
      background: T.subtle,
      whiteSpace: 'nowrap',
    }}>
      {stage}
    </span>
  )
}
