import { useState, useEffect, useCallback } from 'react'
import { findTarget, pointAt, releasePointer } from './avatarPointer'

// TCEL-074 (rev 2) — the tour now shows instead of tells.
//
// It used to be a flat grey screen with a card on it: highlightTarget() was
// called each step but the registry it read was always empty, so nothing was
// ever pointed at and the five steps were indistinguishable apart from their
// text. Now the avatar walks to each tab, the tab is cut out of the dimming,
// and the card gets out of the way.
//
// The dimming is a single box-shadow spread from the target's rect rather than
// a full-screen panel with a hole in it — that keeps the cut-out exactly on the
// target with no z-index fight against the nav bar's stacking context, and it
// leaves the tab itself clickable because the spotlight ignores pointer events.
//
// TCEL-047 — skip is always visible; replay comes from AvatarContext.
// Five steps, deliberately: this is a fleet-ops tool and long tours get skipped.

const STEPS = [
  { id: 'dashboard',  tab: 'dashboard',  text: 'כאן תוכלו לראות תמונת מצב מהירה של כל הצי — רכבים, נהגים וסטטוסים.' },
  { id: 'cars',       tab: 'cars',       text: 'רשימת הרכבים המלאה: מסמכים, ביטוחים, טסטים ותחזוקה לכל רכב.' },
  { id: 'costs',      tab: 'costs',      text: 'מעקב עלויות — דלק, אגרות, תיקונים וכל הוצאה אחרת לפי רכב או סניף.' },
  { id: 'violations', tab: 'violations', text: 'ניהול דוחות וקנסות, כולל הסבה לנהג הרלוונטי.' },
  { id: 'settings',   tab: 'settings',   text: 'הגדרות החברה, משתמשים והרשאות.' },
]

const PAD = 6

export default function OnboardingOverlay({ rtl, setActiveTab, onDone }) {
  const steps = STEPS
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)
  const step = steps[i]

  const measure = useCallback(() => {
    const el = findTarget(step.tab)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [step.tab])

  // Switch tab, walk the avatar over, and keep him there for the step. `stay`
  // means he moves straight on to the next tab instead of trudging home
  // between every step.
  useEffect(() => {
    setActiveTab(step.tab)
    let cancelled = false
    const t = setTimeout(() => {
      if (cancelled) return
      measure()
      pointAt(step.tab, { hold: 0, stay: true })
    }, 220)
    return () => { cancelled = true; clearTimeout(t) }
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps

  // The nav reflows on resize and the tab strip scrolls horizontally, so the
  // cut-out has to follow rather than be measured once.
  useEffect(() => {
    const on = () => measure()
    window.addEventListener('resize', on)
    window.addEventListener('scroll', on, true)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('scroll', on, true)
    }
  }, [measure])

  useEffect(() => () => releasePointer(), [])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onDone() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  const next = () => (i < steps.length - 1 ? setI(i + 1) : onDone())
  const prev = () => i > 0 && setI(i - 1)

  // Keep the card away from whatever is being pointed at, and from the avatar
  // standing just under it.
  const targetInTopHalf = rect ? rect.top < window.innerHeight / 2 : true
  const cardAnchor = targetInTopHalf
    ? { bottom: 24, top: 'auto' }
    : { top: 24, bottom: 'auto' }

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          zIndex: 'calc(var(--avatar-z) + 50)',
          pointerEvents: 'none',
          transition: 'all 320ms var(--avatar-ease)',
          borderRadius: 10,
          boxShadow: '0 0 0 9999px var(--avatar-overlay)',
          ...(rect
            ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
            // No target resolved (a tab that is not rendered at this width) —
            // fall back to dimming everything rather than flashing the UI.
            : { top: '50%', left: '50%', width: 0, height: 0 }),
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="סיור היכרות עם CELOX"
        dir={rtl ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          ...cardAnchor,
          zIndex: 'calc(var(--avatar-z) + 70)',
          background: 'var(--avatar-surface)',
          borderRadius: 'var(--avatar-radius-xl)',
          boxShadow: 'var(--avatar-shadow-float)',
          maxWidth: 380, width: 'calc(100% - 32px)', padding: 20,
        }}
      >
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
    </>
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
