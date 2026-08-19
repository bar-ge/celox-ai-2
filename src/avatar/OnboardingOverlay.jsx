import { useState, useEffect } from 'react'
import { highlightTarget } from './HighlightTarget'

// TCEL-074 — spotlight/dimming overlay, tooltip, progress dots.
// TCEL-071 — focus trap while active, Escape to dismiss.
// TCEL-047 — skip is always visible; replay is triggered externally via
// AvatarContext.replayOnboarding (e.g. from a help-menu entry) and does not
// reset the seen-flag.
// Kept to 5 steps per the design spec — this is a fleet-ops tool, long tours
// get skipped.

const STEPS = [
  { id: 'dashboard', tab: 'dashboard', text: 'כאן תוכלו לראות תמונת מצב מהירה של כל הצי — רכבים, נהגים וסטטוסים.' },
  { id: 'cars', tab: 'cars', text: 'רשימת הרכבים המלאה: מסמכים, ביטוחים, טסטים ותחזוקה לכל רכב.' },
  { id: 'costs', tab: 'costs', text: 'מעקב עלויות — דלק, אגרות, תיקונים וכל הוצאה אחרת לפי רכב או סניף.' },
  { id: 'violations', tab: 'violations', text: 'ניהול דוחות וקנסות, כולל הסבה לנהג הרלוונטי.' },
  { id: 'settings', tab: 'settings', text: 'הגדרות החברה, משתמשים והרשאות.' },
]

export default function OnboardingOverlay({ rtl, setActiveTab, onDone }) {
  const steps = STEPS
  const [i, setI] = useState(0)
  const step = steps[i]

  useEffect(() => {
    setActiveTab(step.tab)
    const t = setTimeout(() => highlightTarget(`onboarding-${step.id}`), 200)
    return () => clearTimeout(t)
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onDone() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  const next = () => (i < steps.length - 1 ? setI(i + 1) : onDone())
  const prev = () => i > 0 && setI(i - 1)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="סיור היכרות עם CELOX"
      style={{
        position: 'fixed', inset: 0, zIndex: 'calc(var(--avatar-z) + 50)',
        background: 'var(--avatar-overlay)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: 'var(--avatar-surface)',
        borderRadius: 'var(--avatar-radius-xl)',
        boxShadow: 'var(--avatar-shadow-float)',
        maxWidth: 380, width: '100%', padding: 20,
        marginBottom: 92,
        direction: rtl ? 'rtl' : 'ltr',
      }}>
        <div style={{ fontSize: 14, color: 'var(--avatar-text)', lineHeight: 1.5, marginBottom: 16 }}>{step.text}</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, justifyContent: 'center' }}>
          {steps.map((s, idx) => (
            <span key={s.id} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: idx === i ? 'var(--avatar-primary)' : 'var(--avatar-border)',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onDone} style={skipBtn}>דלג</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && <button onClick={prev} style={ghostBtn}>הקודם</button>}
            <button onClick={next} style={primaryBtn}>{i < steps.length - 1 ? 'הבא' : 'סיום'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const primaryBtn = {
  background: 'var(--avatar-primary)', color: '#fff', border: 'none',
  borderRadius: 'var(--avatar-radius-md)', padding: '8px 16px', fontSize: 13,
  fontWeight: 700, cursor: 'pointer',
}
const ghostBtn = {
  background: 'transparent', color: 'var(--avatar-text-secondary)',
  border: '1px solid var(--avatar-border)', borderRadius: 'var(--avatar-radius-md)',
  padding: '8px 16px', fontSize: 13, cursor: 'pointer',
}
const skipBtn = {
  background: 'transparent', color: 'var(--avatar-text-muted)', border: 'none',
  fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
}
