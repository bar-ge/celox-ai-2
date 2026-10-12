import { T, FONT_SANS } from './theme'

// Hebrew display labels for the internal stage codes (api/_lib/conversation-state.js
// STAGES). Display-only — the stored value stays the English code so nothing in
// the agent/backend has to change for this redesign.
const STAGE_LABEL_HE = {
  OPENING: 'פתיחה',
  ROLE: 'תפקיד',
  FLEET_SIZE: 'גודל צי',
  CURRENT_MANAGEMENT: 'ניהול נוכחי',
  EXISTING_SYSTEM: 'מערכת קיימת',
  MAIN_PAIN: 'כאב מרכזי',
  WHY_NOW: 'למה עכשיו',
  PROCESS_EXPLANATION: 'הסבר תהליך',
  CALENDAR_OPTIONS: 'אפשרויות יומן',
  MEETING_CONFIRMATION: 'אישור פגישה',
  MEETING_BOOKED: 'נקבעה פגישה',
  HUMAN_HANDOFF: 'הועבר לנציג',
  NOT_RELEVANT: 'לא רלוונטי',
  OPT_OUT: 'ביקש הסרה',
}

/** The one pill on the screen, alongside intent tags. */
export default function StageBadge({ stage }) {
  if (!stage) return null
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: FONT_SANS,
      fontSize: T.fs11,
      fontWeight: 600,
      lineHeight: 1.4,
      padding: '3px 10px',
      borderRadius: T.radiusPill,
      color: T.textMid,
      background: T.subtle,
      border: `1px solid ${T.border}`,
      whiteSpace: 'nowrap',
    }}>
      {STAGE_LABEL_HE[stage] ?? stage}
    </span>
  )
}
