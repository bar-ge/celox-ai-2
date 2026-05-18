import { useState, useRef } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { supabase } from './supabaseClient'

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY || '9b4aefb2-ea20-4dd6-ae22-ccc6360a2ede'

function checkRateLimit() {
  try {
    const now = Date.now()
    const stored = JSON.parse(localStorage.getItem('celox_contact_rl') || 'null')
    if (stored && now - stored.t < 3_600_000) {
      if (stored.n >= 3) return false
      localStorage.setItem('celox_contact_rl', JSON.stringify({ t: stored.t, n: stored.n + 1 }))
    } else {
      localStorage.setItem('celox_contact_rl', JSON.stringify({ t: now, n: 1 }))
    }
  } catch { /* */ }
  return true
}

const C = {
  navBg: '#0f172a', primary: '#0891b2', bg: '#f1f5f9', surface: '#ffffff',
  border: '#e2e8f0', text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  danger: '#ef4444', success: '#10b981',
}
const inp = {
  width: '100%', padding: '11px 14px', border: `1px solid ${C.border}`,
  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  color: C.text, background: '#f8fafc', fontFamily: 'inherit',
}
const lbl = { fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', company_name: '', phone: '', email: '', fleet_size: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef(null)

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('נא להזין שם מלא.'); return }
    if (!form.email.trim() && !form.phone.trim()) { setError('נא להזין אימייל או טלפון.'); return }
    if (!captchaToken) { setError('נא לאמת שאינך רובוט.'); return }
    if (!checkRateLimit()) { setError('שלחת יותר מדי בקשות. נסה שוב מאוחר יותר.'); return }
    setError(''); setSubmitting(true)
    const { error: dbErr } = await supabase.from('crm_leads').insert({
      name: form.name.trim(),
      company_name: form.company_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      fleet_size: form.fleet_size || null,
      message: form.message.trim() || null,
      source: 'contact_form',
      status: 'new',
    })
    captchaRef.current?.resetCaptcha()
    setCaptchaToken('')
    if (dbErr) { setError('שגיאה בשליחה. נסה שוב.'); setSubmitting(false); return }
    setDone(true); setSubmitting(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${C.navBg} 0%, #1e3a5f 100%)`, display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ background: C.navBg, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0891b2,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 26 26" fill="none"><rect x="2" y="15" width="22" height="7" rx="3.5" fill="white" fillOpacity="0.9"/><rect x="6" y="10" width="14" height="7" rx="2" fill="white"/><circle cx="7.5" cy="22" r="2.5" fill="white" fillOpacity="0.6"/><circle cx="18.5" cy="22" r="2.5" fill="white" fillOpacity="0.6"/><rect x="10" y="6" width="6" height="5" rx="1" fill="white" fillOpacity="0.7"/></svg>
        </div>
        <span style={{ color: '#f8fafc', fontWeight: 900, fontSize: 17 }}>Celox AI Fleet Manager</span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          {done ? (
            <div style={{ background: C.surface, borderRadius: 16, padding: '48px 32px', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.success, marginBottom: 10 }}>תודה על פנייתך!</div>
              <div style={{ fontSize: 15, color: C.textSub, lineHeight: 1.7 }}>
                קיבלנו את הפנייה שלך ונחזור אליך בהקדם.<br/>
                בינתיים, <a href="https://celoxai.com" style={{ color: C.primary, fontWeight: 700 }}>חזור לאתר</a>
              </div>
            </div>
          ) : (
            <div style={{ background: C.surface, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
              <div style={{ background: 'linear-gradient(135deg, #0891b2, #6366f1)', padding: '28px 32px' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 6 }}>צור קשר</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>מלא את הפרטים ונחזור אליך בהקדם</div>
              </div>
              <form onSubmit={handleSubmit} style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={lbl}>שם מלא *</label>
                    <input style={inp} value={form.name} onChange={set('name')} placeholder="שם פרטי ומשפחה" required />
                  </div>
                  <div>
                    <label style={lbl}>שם חברה / עסק</label>
                    <input style={inp} value={form.company_name} onChange={set('company_name')} placeholder="שם החברה" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={lbl}>טלפון</label>
                    <input style={inp} type="tel" value={form.phone} onChange={set('phone')} placeholder="05X-XXXXXXX" />
                  </div>
                  <div>
                    <label style={lbl}>אימייל</label>
                    <input style={inp} type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" />
                  </div>
                </div>
                <div>
                  <label style={lbl}>גודל הצי המשוער</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={form.fleet_size} onChange={set('fleet_size')}>
                    <option value="">בחר...</option>
                    <option value="1-10">עד 10 רכבים</option>
                    <option value="10-50">10–50 רכבים</option>
                    <option value="50-200">50–200 רכבים</option>
                    <option value="200+">מעל 200 רכבים</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>הודעה</label>
                  <textarea
                    style={{ ...inp, height: 100, resize: 'vertical' }}
                    value={form.message}
                    onChange={set('message')}
                    placeholder="ספר לנו על הצרכים שלך..."
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <HCaptcha
                    sitekey={HCAPTCHA_SITE_KEY}
                    onVerify={token => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken('')}
                    ref={captchaRef}
                    theme="light"
                  />
                </div>
                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
                    ⚠ {error}
                  </div>
                )}
                <button type="submit" disabled={submitting || !captchaToken} style={{ background: 'linear-gradient(135deg, #0891b2, #6366f1)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 800, cursor: submitting || !captchaToken ? 'not-allowed' : 'pointer', opacity: submitting || !captchaToken ? 0.7 : 1, marginTop: 4 }}>
                  {submitting ? '…שולח' : '📨 שלח פנייה'}
                </button>
                <div style={{ fontSize: 11, color: C.textMuted, textAlign: 'center' }}>
                  המידע שלך מוגן ולא יועבר לצד שלישי ·{' '}
                  <a href="/privacy.html" style={{ color: C.textMuted }}>מדיניות פרטיות</a>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
