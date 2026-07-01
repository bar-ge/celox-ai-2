import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { supabase } from './supabaseClient'
import { Turnstile } from '@marsidev/react-turnstile'
import { friendlyDbError } from './validators'
import './App.css'

const FleetManager = lazy(() => import('./fleet-manager'))
const PublicForm   = lazy(() => import('./PublicForm'))
const CRM          = lazy(() => import('./CRM'))
const ContactForm  = lazy(() => import('./ContactForm'))

const AppLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f1f5f9' }}>
    <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
)

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'

const MASTER_EMAIL = import.meta.env.VITE_MASTER_EMAIL ?? ''

const C = {
  navBg:    '#0f172a',
  primary:  '#2563eb',
  bg:       '#f1f5f9',
  surface:  '#ffffff',
  border:   '#e2e8f0',
  text:     '#0f172a',
  textSub:  '#475569',
  danger:   '#ef4444',
  success:  '#10b981',
}

// ── Translations ───────────────────────────────────────────────────────────
const L = {
  en: {
    orContinueWith: 'or continue with',
    signInGoogle: 'Continue with Google',
    signInMicrosoft: 'Continue with Microsoft',
    signIn: 'Sign In', signUp: 'Sign Up',
    signInSub: 'Sign in to your workspace',
    signUpSub: 'Create your account',
    email: 'Email', password: 'Password',
    emailPlaceholder: 'you@example.com', passwordPlaceholder: '••••••••',
    submitSignIn: 'Sign In', submitSignUp: 'Create Account',
    accountCreated: 'Account created! Please sign in.',
    securedBy: 'Secured by Supabase Auth',
    joinSub: 'Join your company workspace',
    joinWithCode: 'Join with Code', pendingInvites: 'Pending Invites',
    inviteCodeLabel: 'Company Invite Code',
    inviteCodePlaceholder: 'e.g. AB12CD34',
    inviteCodeHint: 'Ask your company admin for the 8-character invite code.',
    joinBtn: 'Join Company',
    noInvites: 'No pending invites for',
    inviteFrom: 'Invited',
    accept: 'Accept',
    contactAdmin: 'Contact your company admin if you need access.',
    codeNotFound: 'Code not found or company is inactive.',
    pwWeak: 'Weak', pwFair: 'Fair', pwGood: 'Good', pwStrong: 'Strong',
    pwMinLength: 'At least 8 characters',
    pwUppercase: 'Uppercase letter (A-Z)',
    pwLowercase: 'Lowercase letter (a-z)',
    pwNumber: 'Number (0-9)',
    pwSymbol: 'Symbol (!@#$...)',
    pwTooWeak: 'Password is too weak. Please meet all requirements.',
    captchaRequired: 'Please complete the CAPTCHA verification.',
    consentRequired: 'You must agree to the Privacy Policy to create an account.',
    consentLabel: 'I have read and agree to the',
    consentLink: 'Privacy Policy',
    forgotPassword: 'Forgot password?',
    forgotPasswordSub: 'Enter your email and we\'ll send a reset link.',
    sendResetLink: 'Send Reset Link',
    resetLinkSent: 'Reset link sent! Check your inbox.',
    backToSignIn: '← Back to Sign In',
    resetPassword: 'Set New Password',
    resetPasswordSub: 'Enter your new password below.',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    passwordsNoMatch: 'Passwords do not match.',
    passwordUpdated: 'Password updated! Please sign in.',
    verifyEmail: 'Verify Your Email',
    verifyEmailSub: 'We sent a confirmation link to',
    verifyEmailHint: 'Click the link in the email to activate your account.',
    resendEmail: 'Resend Email',
    emailResent: 'Email resent!',
    sessionTimedOut: 'Session expired due to inactivity.',
  },
  he: {
    orContinueWith: 'או המשך עם',
    signInGoogle: 'המשך עם Google',
    signInMicrosoft: 'המשך עם Microsoft',
    signIn: 'כניסה', signUp: 'הרשמה',
    signInSub: 'התחבר לסביבת העבודה שלך',
    signUpSub: 'צור את החשבון שלך',
    email: 'אימייל', password: 'סיסמה',
    emailPlaceholder: 'you@example.com', passwordPlaceholder: '••••••••',
    submitSignIn: 'כניסה', submitSignUp: 'צור חשבון',
    accountCreated: 'החשבון נוצר! אנא התחבר.',
    securedBy: 'מאובטח על ידי Supabase Auth',
    joinSub: 'הצטרף לסביבת העבודה של החברה',
    joinWithCode: 'הצטרף עם קוד', pendingInvites: 'הזמנות ממתינות',
    inviteCodeLabel: 'קוד הזמנה לחברה',
    inviteCodePlaceholder: 'לדוגמה AB12CD34',
    inviteCodeHint: 'בקש מהמנהל שלך את קוד ההזמנה בן 8 תווים.',
    joinBtn: 'הצטרף לחברה',
    noInvites: 'אין הזמנות ממתינות עבור',
    inviteFrom: 'הוזמנת',
    accept: 'אשר',
    contactAdmin: 'צור קשר עם מנהל החברה אם אתה זקוק לגישה.',
    codeNotFound: 'הקוד לא נמצא או החברה אינה פעילה.',
    pwWeak: 'חלש', pwFair: 'בינוני', pwGood: 'טוב', pwStrong: 'חזק',
    pwMinLength: 'לפחות 8 תווים',
    pwUppercase: 'אות גדולה (A-Z)',
    pwLowercase: 'אות קטנה (a-z)',
    pwNumber: 'ספרה (0-9)',
    pwSymbol: 'תו מיוחד (!@#$...)',
    pwTooWeak: 'הסיסמה חלשה מדי. אנא עמוד בכל הדרישות.',
    captchaRequired: 'אנא השלם את אימות ה-CAPTCHA.',
    consentRequired: 'עליך להסכים למדיניות הפרטיות כדי ליצור חשבון.',
    consentLabel: 'קראתי ואני מסכים/ה ל',
    consentLink: 'מדיניות הפרטיות',
    forgotPassword: 'שכחת סיסמה?',
    forgotPasswordSub: 'הזן את האימייל שלך ונשלח קישור לאיפוס.',
    sendResetLink: 'שלח קישור איפוס',
    resetLinkSent: 'קישור נשלח! בדוק את תיבת הדואר.',
    backToSignIn: '→ חזרה לכניסה',
    resetPassword: 'הגדר סיסמה חדשה',
    resetPasswordSub: 'הזן את הסיסמה החדשה שלך.',
    newPassword: 'סיסמה חדשה',
    confirmPassword: 'אימות סיסמה',
    passwordsNoMatch: 'הסיסמאות אינן תואמות.',
    passwordUpdated: 'הסיסמה עודכנה! אנא התחבר.',
    verifyEmail: 'אמת את האימייל שלך',
    verifyEmailSub: 'שלחנו קישור אימות ל',
    verifyEmailHint: 'לחץ על הקישור שבאימייל להפעלת החשבון.',
    resendEmail: 'שלח שנית',
    emailResent: 'אימייל נשלח שוב!',
    sessionTimedOut: 'הסשן פג עקב חוסר פעילות.',
  },
}

// ── Shared styles ──────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', marginTop: 6, padding: '10px 14px',
  border: `1px solid ${C.border}`, borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
  color: C.text, background: '#f8fafc',
}
const labelStyle = {
  fontSize: 11, fontWeight: 700, color: C.textSub,
  textTransform: 'uppercase', letterSpacing: '0.07em',
}
const primaryBtn = (loading) => ({
  background: 'linear-gradient(135deg, #2563eb, #6366f1)', color: '#fff', border: 'none',
  borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 700,
  cursor: loading ? 'not-allowed' : 'pointer',
  opacity: loading ? 0.7 : 1, width: '100%',
  transition: 'opacity 0.15s', letterSpacing: '0.01em',
  boxShadow: '0 2px 10px rgba(8,145,178,0.35)',
})

// ── Idle timeout hook ─────────────────────────────────────────────────────
function useIdleTimeout(onTimeout, minutes = 480) {
  const timer = useRef(null)
  const reset = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(onTimeout, minutes * 60 * 1000)
  }, [onTimeout, minutes])
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      clearTimeout(timer.current)
    }
  }, [reset])
}

// ── Language toggle (floating pill) ───────────────────────────────────────
function LangToggle({ lang, setLang }) {
  return (
    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, overflow: 'hidden' }}>
      {['en', 'he'].map(l => (
        <button key={l} onClick={() => { setLang(l); localStorage.setItem('fleet_lang', l) }} style={{
          padding: '5px 14px', border: 'none', cursor: 'pointer',
          fontWeight: 700, fontSize: 12, letterSpacing: '0.04em',
          background: lang === l ? 'rgba(255,255,255,0.18)' : 'transparent',
          color: lang === l ? '#fff' : 'rgba(255,255,255,0.45)',
          transition: 'all 0.15s',
        }}>
          {l === 'en' ? 'EN' : 'HE'}
        </button>
      ))}
    </div>
  )
}

// ── Logo ───────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <div style={{
        width: 60, height: 60, borderRadius: 16, margin: '0 auto 16px',
        background: 'linear-gradient(135deg, #2563eb, #6366f1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 24px rgba(37,99,235,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
      }}>
        <svg width="30" height="30" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="15" width="22" height="7" rx="3.5" fill="white" fillOpacity="0.9"/>
          <rect x="6" y="10" width="14" height="7" rx="2" fill="white"/>
          <circle cx="7.5" cy="22" r="2.5" fill="white" fillOpacity="0.6"/>
          <circle cx="18.5" cy="22" r="2.5" fill="white" fillOpacity="0.6"/>
          <rect x="10" y="6" width="6" height="5" rx="1" fill="white" fillOpacity="0.7"/>
        </svg>
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: '#f8fafc', margin: '0 0 6px', letterSpacing: '-0.6px' }}>Celox AI</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0, letterSpacing: '0.02em' }}>
        Fleet management, simplified.
      </p>
    </div>
  )
}

// ── Shared card ────────────────────────────────────────────────────────────
function Card({ children, width = 400 }) {
  return (
    <div className="modal-content" style={{
      background: C.surface, borderRadius: 18, padding: '32px 32px',
      width, maxWidth: '92vw',
      boxShadow: '0 24px 64px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.2)',
      border: `1px solid rgba(255,255,255,0.08)`,
    }}>
      {children}
    </div>
  )
}

// ── Full-page centered shell ───────────────────────────────────────────────
function Page({ children, lang, setLang }) {
  return (
    <div style={{
      width: '100%', minHeight: '100vh', position: 'relative',
      background: `
        radial-gradient(circle, rgba(8,145,178,0.06) 1px, transparent 1px) 0 0 / 28px 28px,
        linear-gradient(135deg, #080f1e 0%, #0d1a30 50%, #080f1e 100%)
      `,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', boxSizing: 'border-box',
    }}>
      {/* Floating lang toggle — top right */}
      {lang !== undefined && (
        <div style={{ position: 'absolute', top: 16, right: 20, direction: 'ltr' }}>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
      )}
      {children}
    </div>
  )
}

// ── Error / Success banners ────────────────────────────────────────────────
const Err  = ({ msg }) => msg ? <div style={{ color: C.danger,  fontSize: 13, background: '#fff0f2', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.danger}40`  }}>{msg}</div> : null
const Succ = ({ msg }) => msg ? <div style={{ color: C.success, fontSize: 13, background: '#f0fff8', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.success}40` }}>{msg}</div> : null

// ── Segmented tabs ─────────────────────────────────────────────────────────
function Tabs({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', background: C.bg, borderRadius: 10, padding: 4, marginBottom: 28 }}>
      {options.map(([key, label]) => (
        <button key={key} onClick={() => onChange(key)} style={{
          flex: 1, padding: '8px', borderRadius: 7, border: 'none', cursor: 'pointer',
          fontWeight: 700, fontSize: 13,
          background: value === key ? C.surface : 'transparent',
          color: value === key ? C.navBg : C.textSub,
          boxShadow: value === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}>{label}</button>
      ))}
    </div>
  )
}

// ── Password strength helpers ──────────────────────────────────────────────
function getPasswordStrength(pw) {
  const checks = {
    length:    pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number:    /[0-9]/.test(pw),
    symbol:    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw),
  }
  const score = Object.values(checks).filter(Boolean).length
  return { checks, score }
}

function PasswordStrengthMeter({ password, t, rtl }) {
  if (!password) return null
  const { checks, score } = getPasswordStrength(password)
  const levels = [
    { min: 0, label: t.pwWeak,   color: '#ef4444' },
    { min: 2, label: t.pwFair,   color: '#f59e0b' },
    { min: 3, label: t.pwGood,   color: '#2563eb' },
    { min: 5, label: t.pwStrong, color: '#10b981' },
  ]
  const level = [...levels].reverse().find(l => score >= l.min) || levels[0]

  const CheckIcon = ({ ok }) => ok ? (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="6.5" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="1.2"/>
      <path d="M4.5 7l2 2 3-3" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="6.5" stroke="#cbd5e1" strokeWidth="1.2"/>
    </svg>
  )

  return (
    <div style={{ marginTop: 8 }}>
      {/* Strength bar */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? level.color : '#e2e8f0',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: rtl ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: level.color }}>{level.label}</span>
      </div>
      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[
          [checks.length,    t.pwMinLength],
          [checks.uppercase, t.pwUppercase],
          [checks.lowercase, t.pwLowercase],
          [checks.number,    t.pwNumber],
          [checks.symbol,    t.pwSymbol],
        ].map(([ok, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, flexDirection: rtl ? 'row-reverse' : 'row' }}>
            <CheckIcon ok={ok} />
            <span style={{ fontSize: 12, color: ok ? '#10b981' : '#94a3b8' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Unverified email screen ────────────────────────────────────────────────
function UnverifiedScreen({ email, lang, setLang, onResend, onSignOut }) {
  const t = L[lang]
  const rtl = lang === 'he'
  const [resent, setResent] = useState(false)
  async function handleResend() {
    await onResend()
    setResent(true)
    setTimeout(() => setResent(false), 4000)
  }
  return (
    <Page lang={lang} setLang={setLang}>
      <Logo />
      <Card>
        <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: C.text }}>{t.verifyEmail}</h2>
          <p style={{ margin: '0 0 4px', fontSize: 14, color: C.textSub }}>{t.verifyEmailSub}</p>
          <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: C.text }}>{email}</p>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: C.textSub }}>{t.verifyEmailHint}</p>
          {resent && <Succ msg={t.emailResent} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            <button onClick={handleResend} style={{ ...primaryBtn(false), background: C.primary }}>
              {t.resendEmail}
            </button>
            <button onClick={onSignOut} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, color: C.textSub, cursor: 'pointer' }}>
              {rtl ? 'התנתק' : 'Sign Out'}
            </button>
          </div>
        </div>
      </Card>
    </Page>
  )
}

// ── Password reset screen (after clicking reset email link) ────────────────
function PasswordResetScreen({ lang, setLang, onDone }) {
  const t = L[lang]
  const rtl = lang === 'he'
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { score } = getPasswordStrength(password)
  const isStrong = score >= 4

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError(t.passwordsNoMatch); return }
    if (!isStrong) { setError(t.pwTooWeak); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    onDone()
  }

  return (
    <Page lang={lang} setLang={setLang}>
      <Logo />
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: C.text }}>{t.resetPassword}</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.textSub }}>{t.resetPasswordSub}</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>{t.newPassword}</label>
            <input type="password" value={password} required autoFocus
              onChange={e => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder} style={inputStyle} />
            <PasswordStrengthMeter password={password} t={t} rtl={rtl} />
          </div>
          <div>
            <label style={labelStyle}>{t.confirmPassword}</label>
            <input type="password" value={confirm} required
              onChange={e => setConfirm(e.target.value)}
              placeholder={t.passwordPlaceholder} style={inputStyle} />
          </div>
          <Err msg={error} />
          <button type="submit" disabled={loading || !isStrong} style={primaryBtn(loading || !isStrong)}>
            {loading ? '…' : t.resetPassword}
          </button>
        </form>
      </Card>
    </Page>
  )
}

// ── Login / Sign-up screen ─────────────────────────────────────────────────
function LoginScreen({ lang, setLang, notice }) {
  const t = L[lang]
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [consentChecked, setConsentChecked] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const captchaRef = useRef(null)

  const rtl = lang === 'he'
  const { score } = getPasswordStrength(password)
  const isStrongEnough = score >= 4

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!captchaToken) { setError(t.captchaRequired); return }
    if (mode === 'signup' && !consentChecked) { setError(t.consentRequired); return }
    if (mode === 'signup' && !isStrongEnough) { setError(t.pwTooWeak); return }
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { captchaToken } })
      if (error) setError(error.message)
      else { setEmail(''); setPassword(''); setMode('login'); setSuccess(t.accountCreated) }
    }
    captchaRef.current?.reset()
    setCaptchaToken('')
    setLoading(false)
  }

  async function handleForgot(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/?reset=1',
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSuccess(t.resetLinkSent)
  }

  function switchMode(m) { setMode(m); setForgotMode(false); setError(''); setSuccess(''); setCaptchaToken(''); setConsentChecked(false); captchaRef.current?.reset() }

  async function handleOAuth(provider) {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  return (
    <Page lang={lang} setLang={setLang}>
      <Logo />
      <Card>
        {forgotMode ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <button onClick={() => { setForgotMode(false); setError(''); setSuccess('') }}
                style={{ background: 'none', border: 'none', color: C.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>
                {t.backToSignIn}
              </button>
              <h2 style={{ margin: '12px 0 4px', fontSize: 18, fontWeight: 800, color: C.text }}>{t.forgotPassword}</h2>
              <p style={{ margin: 0, fontSize: 13, color: C.textSub }}>{t.forgotPasswordSub}</p>
            </div>
            <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>{t.email}</label>
                <input type="email" value={email} required autoFocus
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder} style={inputStyle} />
              </div>
              <Err msg={error} />
              <Succ msg={success} />
              <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                {loading ? '…' : t.sendResetLink}
              </button>
            </form>
          </>
        ) : (
          <>
            <Tabs
              options={[['login', t.signIn], ['signup', t.signUp]]}
              value={mode}
              onChange={switchMode}
            />
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>{t.email}</label>
                <input type="email" value={email} required autoFocus
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t.password}</label>
                <input type="password" value={password} required
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder} style={inputStyle} />
                {mode === 'signup' && <PasswordStrengthMeter password={password} t={t} rtl={rtl} />}
              </div>
              {mode === 'login' && (
                <div style={{ textAlign: rtl ? 'left' : 'right', marginTop: -8 }}>
                  <button type="button" onClick={() => { setForgotMode(true); setError(''); setSuccess('') }}
                    style={{ background: 'none', border: 'none', color: C.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    {t.forgotPassword}
                  </button>
                </div>
              )}
              {mode === 'signup' && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', direction: rtl ? 'rtl' : 'ltr' }}>
                  <input type="checkbox" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)}
                    style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer', accentColor: C.primary, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
                    {t.consentLabel}{' '}
                    <button type="button" onClick={() => setShowPrivacyModal(true)} style={{
                      background: 'none', border: 'none', color: C.primary, fontWeight: 700,
                      fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline',
                    }}>{t.consentLink}</button>
                  </span>
                </label>
              )}
              <Err  msg={error} />
              <Succ msg={success} />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={token => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken('')}
                  onError={() => setCaptchaToken('')}
                  ref={captchaRef}
                  options={{ theme: 'light' }}
                />
              </div>
              <button type="submit"
                disabled={loading || !captchaToken || (mode === 'signup' && (!consentChecked || (password.length > 0 && !isStrongEnough)))}
                style={primaryBtn(loading || !captchaToken || (mode === 'signup' && (!consentChecked || (password.length > 0 && !isStrongEnough))))}>
                {loading ? '…' : mode === 'login' ? t.submitSignIn : t.submitSignUp}
              </button>
            </form>

            {/* ── OAuth divider ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 12, color: C.textSub, whiteSpace: 'nowrap' }}>{t.orContinueWith}</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            {/* ── OAuth buttons ── */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleOAuth('azure')} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '10px 12px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                color: C.text, transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none' }}
              >
                <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
                  <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
                  <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
                Microsoft
              </button>

              <button onClick={() => handleOAuth('google')} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '10px 12px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                color: C.text, transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none' }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Google
              </button>
            </div>
          </>
        )}
      </Card>
      {notice && <div style={{ marginTop: 16, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#fca5a5', maxWidth: 400, textAlign: 'center' }}>{notice}</div>}
      <p style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{t.securedBy}</p>

      {/* Privacy Policy Modal (inline, no fleet-manager dep) */}
      {showPrivacyModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowPrivacyModal(false) }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column', direction: rtl ? 'rtl' : 'ltr' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{rtl ? 'מדיניות פרטיות — Celox AI' : 'Privacy Policy — Celox AI'}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>{rtl ? 'עדכון אחרון: 12 באפריל 2026' : 'Last updated: April 12, 2026'}</p>
              </div>
              <button onClick={() => setShowPrivacyModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, fontSize: 14, color: '#334155', lineHeight: 1.7 }}>
              {rtl ? (
                <>
                  <p><strong>1. מבוא</strong> — Celox AI בע"מ מפעילה פלטפורמת SaaS לניהול צי רכבים. מדיניות זו מסבירה אילו נתונים אישיים אנו אוספים וכיצד אנו משתמשים בהם לפי חוק הגנת הפרטיות (תשמ"א-1981).</p>
                  <p><strong>2. מידע שנאסף</strong> — שם, אימייל, טלפון, לוחיות רישוי, היסטוריית תחזוקה, לוגים של פעילות.</p>
                  <p><strong>3. מטרות</strong> — ניהול צי, תזמון תחזוקה, אבטחה ותמיכה.</p>
                  <p><strong>4. אחסון</strong> — המידע מאוחסן ב-Supabase (טוקיו, יפן) עם הסכם DPA. הצפנה בתעבורה ובאחסון.</p>
                  <p><strong>5. הזכויות שלך</strong> — זכות עיון, תיקון ומחיקה. פנה אלינו: <strong>privacy@celoxai.com</strong></p>
                  <p><strong>6. יצירת קשר</strong> — privacy@celoxai.com | Celox AI בע"מ, ישראל.</p>
                </>
              ) : (
                <>
                  <p><strong>1. Introduction</strong> — Celox AI Ltd. operates a SaaS fleet management platform. This policy explains what personal data we collect and how we use it under the Israeli Privacy Protection Law (1981).</p>
                  <p><strong>2. Data Collected</strong> — Name, email, phone, license plates, maintenance history, activity logs.</p>
                  <p><strong>3. Purpose</strong> — Fleet management, maintenance scheduling, security, and support.</p>
                  <p><strong>4. Storage</strong> — Data stored on Supabase (Tokyo, Japan) with DPA agreement. Encrypted in transit and at rest.</p>
                  <p><strong>5. Your Rights</strong> — Right to access, correct, and delete your data. Contact: <strong>privacy@celoxai.com</strong></p>
                  <p><strong>6. Contact</strong> — privacy@celoxai.com | Celox AI Ltd., Israel.</p>
                </>
              )}
            </div>
            <div style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setConsentChecked(true); setShowPrivacyModal(false) }} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {rtl ? 'מסכים/ה וסוגר' : 'Agree & Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}

// ── Join-company screen (regular users without a company) ──────────────────
function JoinCompanyScreen({ session, onDone, onSignOut, lang, setLang }) {
  const t = L[lang]
  const [tab, setTab]             = useState('code')
  const [inviteCode, setInviteCode] = useState('')
  const [invites, setInvites]     = useState([])
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [loadingInvites, setLoadingInvites] = useState(false)

  useEffect(() => {
    if (tab === 'invites') loadInvites()
  }, [tab])

  async function loadInvites() {
    setLoadingInvites(true)
    const { data } = await supabase
      .from('invites')
      .select('*, companies(name)')
      .ilike('email', session.user.email)
    setInvites(data || [])
    setLoadingInvites(false)
  }

  async function joinByCode(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { data: companyId, error: ce } = await supabase.rpc('verify_invite_code', { p_code: inviteCode.trim() })
    if (ce || !companyId) { setError(ce?.message || t.codeNotFound); setLoading(false); return }
    await assignToCompany(companyId, 'member')
  }

  async function acceptInvite(inv) {
    setLoading(true)
    await supabase.from('invites').delete().eq('id', inv.id)
    await assignToCompany(inv.company_id, 'member')
  }

  async function assignToCompany(companyId, role) {
    const { error: pe } = await supabase.from('profiles').upsert({
      id: session.user.id,
      email: session.user.email,
      company_id: companyId,
      role,
    })
    if (pe) { setError(friendlyDbError(pe, lang === 'he')); setLoading(false); return }
    // Notify company admins that a new member joined
    supabase.functions.invoke('send-notification', {
      body: { type: 'member_joined', payload: { new_member_email: session.user.email, company_id: companyId } },
    }).catch(() => {})
    // Refresh profile before advancing so downstream code sees the new company_id
    await onDone(session)
  }

  return (
    <Page lang={lang} setLang={setLang}>
      <Logo />
      <Card>
        <Tabs
          options={[['code', t.joinWithCode], ['invites', t.pendingInvites]]}
          value={tab}
          onChange={t2 => { setTab(t2); setError('') }}
        />

        {tab === 'code' ? (
          <form onSubmit={joinByCode} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>{t.inviteCodeLabel}</label>
              <input value={inviteCode} required autoFocus
                onChange={e => setInviteCode(e.target.value)}
                placeholder={t.inviteCodePlaceholder}
                style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: C.textSub }}>
              {t.inviteCodeHint}
            </p>
            <Err msg={error} />
            <button type="submit" disabled={loading} style={primaryBtn(loading)}>
              {loading ? '…' : t.joinBtn}
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loadingInvites ? (
              <p style={{ textAlign: 'center', color: C.textSub, fontSize: 14, padding: '20px 0' }}>Loading…</p>
            ) : invites.length === 0 ? (
              <p style={{ textAlign: 'center', color: C.textSub, fontSize: 14, padding: '20px 0' }}>
                {t.noInvites} <strong>{session.user.email}</strong>
              </p>
            ) : invites.map(inv => (
              <div key={inv.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{inv.companies?.name}</div>
                  <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                    {t.inviteFrom} {new Date(inv.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button onClick={() => acceptInvite(inv)} disabled={loading} style={{
                  background: C.primary, color: '#fff', border: 'none',
                  borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>{t.accept}</button>
              </div>
            ))}
          </div>
        )}
      </Card>
      <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
        {t.contactAdmin}
      </p>
      <button onClick={onSignOut} style={{
        marginTop: 8, background: 'transparent', border: 'none',
        color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer',
        textDecoration: 'underline',
      }}>
        {lang === 'he' ? 'התנתק' : 'Sign out'}
      </button>
    </Page>
  )
}

// ── Root App ───────────────────────────────────────────────────────────────
export default function App() {
  // Public routes — no auth needed
  if (window.location.pathname === '/contact') return <Suspense fallback={null}><ContactForm /></Suspense>
  const formToken = window.location.pathname.match(/^\/form\/([0-9a-f-]{36})$/i)?.[1]
  if (formToken) return <Suspense fallback={null}><PublicForm token={formToken} /></Suspense>

  const [session, setSession]         = useState(undefined)
  const [profile, setProfile]         = useState(undefined)
  const [lang, setLang]               = useState(() => localStorage.getItem('fleet_lang') || 'en')
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [timedOut, setTimedOut]       = useState(false)
  const [crmMode, setCrmMode]         = useState(false)
  const t = L[lang]

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null)
      if (session) fetchProfile(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
        setSession(session)
        return
      }
      setSession(session ?? null)
      if (session) {
        fetchProfile(session)
        // Log sign-in event (fire and forget)
        if (event === 'SIGNED_IN') {
          supabase.rpc('log_auth_event', { p_event: 'sign_in', p_email: session.user.email }).catch(() => {})
        }
      } else {
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(s) {
    const { data } = await supabase
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', s.user.id)
      .maybeSingle()

    if (!data) {
      const { error: insertErr } = await supabase
        .from('profiles')
        .insert({ id: s.user.id, email: s.user.email, role: 'member' })
      if (insertErr) {
        console.error('Failed to create profile:', insertErr.message)
      }
      setProfile({ id: s.user.id, email: s.user.email, company_id: null, role: 'member', companies: null })
    } else {
      setProfile(data)
    }
  }

  async function handleSignOut() {
    try {
      if (session) {
        supabase.rpc('log_auth_event', { p_event: 'sign_out', p_email: session.user.email }).catch(() => {})
      }
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    // Wipe Supabase session from localStorage regardless of whether signOut succeeded
    Object.keys(localStorage).forEach(k => { if (k.startsWith('sb-')) localStorage.removeItem(k) })
    window.location.href = '/'
  }

  // Idle timeout — 8 hours, only when logged in
  useIdleTimeout(useCallback(async () => {
    if (!session) return
    setTimedOut(true)
    await supabase.auth.signOut()
  }, [session]), 480)

  // Still loading
  if (session === undefined || (session && !passwordRecovery && profile === undefined)) return null

  // Password recovery flow
  if (passwordRecovery) {
    return <PasswordResetScreen lang={lang} setLang={setLang} onDone={async () => {
      setPasswordRecovery(false)
      await supabase.auth.signOut()
    }} />
  }

  if (!session) {
    return <LoginScreen lang={lang} setLang={setLang} notice={timedOut ? t.sessionTimedOut : null} />
  }

  // Email not verified
  if (!session.user.email_confirmed_at) {
    return (
      <UnverifiedScreen
        email={session.user.email}
        lang={lang}
        setLang={setLang}
        onResend={() => supabase.auth.resend({ type: 'signup', email: session.user.email })}
        onSignOut={handleSignOut}
      />
    )
  }

  const isMaster = session.user.email === MASTER_EMAIL

  if (!isMaster && !profile?.company_id) {
    return <JoinCompanyScreen session={session} onDone={fetchProfile} onSignOut={handleSignOut} lang={lang} setLang={setLang} />
  }

  // Block access if company subscription expired
  if (!isMaster && profile?.companies?.access_until) {
    const expired = new Date(profile.companies.access_until) < new Date()
    if (expired) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', fontFamily: 'sans-serif' }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 40, maxWidth: 420, textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h2 style={{ color: '#f8fafc', margin: '0 0 12px', fontSize: 22 }}>
              {lang === 'he' ? 'המנוי פג תוקף' : 'Subscription Expired'}
            </h2>
            <p style={{ color: '#94a3b8', margin: '0 0 24px', fontSize: 15, lineHeight: 1.6 }}>
              {lang === 'he'
                ? `הגישה לחברה "${profile.companies.name}" פגה בתאריך ${profile.companies.access_until}. צור קשר עם Celox AI לחידוש המנוי.`
                : `Access to "${profile.companies.name}" expired on ${profile.companies.access_until}. Contact Celox AI to renew.`}
            </p>
            <a href="mailto:bar.gershenzon@gmail.com" style={{
              display: 'inline-block', background: '#2563eb', color: '#fff',
              borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700,
              textDecoration: 'none', marginBottom: 12,
            }}>
              {lang === 'he' ? 'צור קשר לחידוש' : 'Contact to Renew'}
            </a>
            <br />
            <button onClick={handleSignOut} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, marginTop: 8 }}>
              {lang === 'he' ? 'התנתק' : 'Sign out'}
            </button>
          </div>
        </div>
      )
    }
  }

  if (isMaster && crmMode) {
    return <Suspense fallback={<AppLoader />}><CRM session={session} onBack={() => setCrmMode(false)} /></Suspense>
  }

  return (
    <Suspense fallback={<AppLoader />}>
      <FleetManager
        session={session}
        profile={profile}
        isMaster={isMaster}
        companyId={profile?.company_id ?? null}
        onSignOut={handleSignOut}
        initialLang={lang}
        onOpenCRM={isMaster ? () => setCrmMode(true) : undefined}
      />
    </Suspense>
  )
}
