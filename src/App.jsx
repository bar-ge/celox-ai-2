import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import FleetManager from './fleet-manager'
import './App.css'

const MASTER_EMAIL = import.meta.env.VITE_MASTER_EMAIL || 'bar.gershenzon@gmail.com'

const C = {
  navBg:    '#0f172a',
  primary:  '#3b82f6',
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
    signIn: 'Sign In', signUp: 'Sign Up',
    signInSub: 'Sign in to your workspace',
    signUpSub: 'Create your account',
    email: 'Email', password: 'Password',
    emailPlaceholder: 'you@example.com', passwordPlaceholder: '••••••••',
    submitSignIn: 'Sign In', submitSignUp: 'Create Account',
    accountCreated: 'Account created! Please sign in.',
    securedBy: 'Secured by Supabase Auth',
    joinSub: 'Join your company workspace',
    joinWithCode: '🔑  Join with Code', pendingInvites: '📨  Pending Invites',
    inviteCodeLabel: 'Company Invite Code',
    inviteCodePlaceholder: 'e.g. AB12CD34',
    inviteCodeHint: 'Ask your company admin for the 8-character invite code.',
    joinBtn: 'Join Company',
    noInvites: 'No pending invites for',
    inviteFrom: 'Invited',
    accept: 'Accept',
    contactAdmin: 'Contact your company admin if you need access.',
    codeNotFound: 'Code not found or company is inactive.',
  },
  he: {
    signIn: 'כניסה', signUp: 'הרשמה',
    signInSub: 'התחבר לסביבת העבודה שלך',
    signUpSub: 'צור את החשבון שלך',
    email: 'אימייל', password: 'סיסמה',
    emailPlaceholder: 'you@example.com', passwordPlaceholder: '••••••••',
    submitSignIn: 'כניסה', submitSignUp: 'צור חשבון',
    accountCreated: 'החשבון נוצר! אנא התחבר.',
    securedBy: 'מאובטח על ידי Supabase Auth',
    joinSub: 'הצטרף לסביבת העבודה של החברה',
    joinWithCode: '🔑  הצטרף עם קוד', pendingInvites: '📨  הזמנות ממתינות',
    inviteCodeLabel: 'קוד הזמנה לחברה',
    inviteCodePlaceholder: 'לדוגמה AB12CD34',
    inviteCodeHint: 'בקש מהמנהל שלך את קוד ההזמנה בן 8 תווים.',
    joinBtn: 'הצטרף לחברה',
    noInvites: 'אין הזמנות ממתינות עבור',
    inviteFrom: 'הוזמנת',
    accept: 'אשר',
    contactAdmin: 'צור קשר עם מנהל החברה אם אתה זקוק לגישה.',
    codeNotFound: 'הקוד לא נמצא או החברה אינה פעילה.',
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
  background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', border: 'none',
  borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 700,
  cursor: loading ? 'not-allowed' : 'pointer',
  opacity: loading ? 0.7 : 1, width: '100%',
  transition: 'opacity 0.15s', letterSpacing: '0.01em',
  boxShadow: '0 2px 10px rgba(59,130,246,0.35)',
})

// ── Language toggle ────────────────────────────────────────────────────────
function LangToggle({ lang, setLang }) {
  return (
    <div style={{ display: 'flex', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
      {['en', 'he'].map(l => (
        <button key={l} onClick={() => { setLang(l); localStorage.setItem('fleet_lang', l) }} style={{
          flex: 1, padding: '7px 0', border: 'none', cursor: 'pointer',
          fontWeight: 700, fontSize: 13,
          background: lang === l ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'transparent',
          color: lang === l ? '#fff' : C.textSub,
          transition: 'all 0.15s',
        }}>
          {l === 'en' ? 'EN' : 'עב'}
        </button>
      ))}
    </div>
  )
}

// ── Logo ───────────────────────────────────────────────────────────────────
function Logo({ subtitle }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, margin: '0 auto 12px',
        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
      }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: '-0.5px' }}>FL</span>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc', margin: 0, letterSpacing: '-0.3px' }}>Fleet Manager</h1>
      {subtitle && <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 4 }}>{subtitle}</p>}
    </div>
  )
}

// ── Shared card ────────────────────────────────────────────────────────────
function Card({ children, width = 380 }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 16, padding: '36px 32px',
      width, maxWidth: '90vw',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.15)',
      border: `1px solid rgba(255,255,255,0.1)`,
    }}>
      {children}
    </div>
  )
}

// ── Full-page centered shell ───────────────────────────────────────────────
function Page({ children }) {
  return (
    <div style={{
      width: '100%', minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', boxSizing: 'border-box',
    }}>
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

// ── Login / Sign-up screen ─────────────────────────────────────────────────
function LoginScreen({ lang, setLang }) {
  const t = L[lang]
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else {
        setEmail(''); setPassword('')
        setMode('login')
        setSuccess(t.accountCreated)
      }
    }
    setLoading(false)
  }

  function switchMode(m) { setMode(m); setError(''); setSuccess('') }

  return (
    <Page>
      <Logo subtitle={mode === 'login' ? t.signInSub : t.signUpSub} />
      <Card>
        <LangToggle lang={lang} setLang={setLang} />
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
          </div>
          <Err  msg={error} />
          <Succ msg={success} />
          <button type="submit" disabled={loading} style={primaryBtn(loading)}>
            {loading ? '…' : mode === 'login' ? t.submitSignIn : t.submitSignUp}
          </button>
        </form>
      </Card>
      <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{t.securedBy}</p>
    </Page>
  )
}

// ── Join-company screen (regular users without a company) ──────────────────
function JoinCompanyScreen({ session, onDone, lang, setLang }) {
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
    const { data: company, error: ce } = await supabase
      .from('companies')
      .select('id')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle()
    if (!company) { setError(ce?.message || t.codeNotFound); setLoading(false); return }
    await assignToCompany(company.id, 'member')
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
    if (pe) { setError(pe.message); setLoading(false); return }
    // Notify company admins that a new member joined
    supabase.functions.invoke('send-notification', {
      body: { type: 'member_joined', payload: { new_member_email: session.user.email, company_id: companyId } },
    }).catch(() => {})
    onDone(session)
  }

  return (
    <Page>
      <Logo subtitle={t.joinSub} />
      <Card>
        <LangToggle lang={lang} setLang={setLang} />
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
    </Page>
  )
}

// ── Root App ───────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(undefined) // undefined = still loading
  const [profile, setProfile] = useState(undefined)
  const [lang, setLang]       = useState(() => localStorage.getItem('fleet_lang') || 'en')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null)
      if (session) fetchProfile(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session ?? null)
      if (session) fetchProfile(session)
      else setProfile(null)
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
      // First login — create profile
      await supabase.from('profiles').insert({
        id: s.user.id, email: s.user.email, role: 'member',
      })
      setProfile({ id: s.user.id, email: s.user.email, company_id: null, role: 'member', companies: null })
    } else {
      setProfile(data)
    }
  }

  // Still loading
  if (session === undefined || (session && profile === undefined)) return null

  if (!session) return <LoginScreen lang={lang} setLang={setLang} />

  const isMaster = session.user.email === MASTER_EMAIL

  // Regular users with no company → join screen
  if (!isMaster && !profile?.company_id) {
    return <JoinCompanyScreen session={session} onDone={fetchProfile} lang={lang} setLang={setLang} />
  }

  return (
    <FleetManager
      session={session}
      profile={profile}
      isMaster={isMaster}
      companyId={profile?.company_id ?? null}
      onSignOut={() => supabase.auth.signOut()}
      initialLang={lang}
    />
  )
}
