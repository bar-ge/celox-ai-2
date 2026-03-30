import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import FleetManager from './fleet-manager'
import './App.css'

const C = {
  navBg:     '#1f3a5f',
  primary:   '#0073ea',
  primaryHover: '#0060c0',
  bg:        '#f6f7fb',
  surface:   '#ffffff',
  border:    '#e6e9ef',
  text:      '#323338',
  textSub:   '#676879',
  danger:    '#e2445c',
  success:   '#00c875',
}

// ── Shared styles ──────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', marginTop: 6, padding: '10px 14px',
  border: `1px solid ${C.border}`, borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
  color: C.text, background: C.bg,
}
const labelStyle = {
  fontSize: 11, fontWeight: 700, color: C.textSub,
  textTransform: 'uppercase', letterSpacing: '0.07em',
}
const primaryBtn = (loading) => ({
  background: C.primary, color: '#fff', border: 'none',
  borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 700,
  cursor: loading ? 'not-allowed' : 'pointer',
  opacity: loading ? 0.7 : 1, width: '100%',
  transition: 'opacity 0.15s',
})

// ── Logo ───────────────────────────────────────────────────────────────────
function Logo({ subtitle }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, margin: '0 auto 12px',
        background: 'linear-gradient(135deg, #0073ea, #a25ddc)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,115,234,0.35)',
      }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 24 }}>F</span>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: C.navBg, margin: 0 }}>Fleet Manager</h1>
      {subtitle && <p style={{ color: C.textSub, fontSize: 14, marginTop: 4 }}>{subtitle}</p>}
    </div>
  )
}

// ── Card wrapper ───────────────────────────────────────────────────────────
function Card({ children, width = 380 }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 16, padding: '36px 32px',
      width, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      border: `1px solid ${C.border}`,
    }}>
      {children}
    </div>
  )
}

// ── Page shell ─────────────────────────────────────────────────────────────
function Page({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </div>
  )
}

// ── Login / Signup screen ──────────────────────────────────────────────────
function LoginScreen() {
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
        setSuccess('Account created! Please sign in.')
      }
    }
    setLoading(false)
  }

  function switchMode(m) { setMode(m); setError(''); setSuccess('') }

  return (
    <Page>
      <Logo subtitle={mode === 'login' ? 'Sign in to your workspace' : 'Create your account'} />
      <Card>
        {/* Mode tabs */}
        <div style={{ display: 'flex', background: C.bg, borderRadius: 10, padding: 4, marginBottom: 28 }}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => switchMode(m)} style={{
              flex: 1, padding: '8px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: mode === m ? C.surface : 'transparent',
              color: mode === m ? C.navBg : C.textSub,
              boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}>
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} required autoFocus
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} required
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" style={inputStyle} />
          </div>

          {error   && <div style={{ color: C.danger,  fontSize: 13, background: '#fff0f2', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.danger}40`   }}>{error}</div>}
          {success && <div style={{ color: C.success, fontSize: 13, background: '#f0fff8', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.success}40` }}>{success}</div>}

          <button type="submit" disabled={loading} style={primaryBtn(loading)}>
            {loading ? '…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </Card>
      <p style={{ marginTop: 20, fontSize: 12, color: C.textSub }}>Secured by Supabase Auth</p>
    </Page>
  )
}

// ── Onboarding: create or join a company ──────────────────────────────────
function OnboardingScreen({ session, onDone }) {
  const [tab, setTab]               = useState('create')
  const [companyName, setCompanyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  async function createCompany(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    // 1. Create company
    const { data: company, error: ce } = await supabase
      .from('companies').insert([{ name: companyName.trim() }]).select().single()
    if (ce) { setError(ce.message); setLoading(false); return }
    // 2. Create profile as admin
    const { error: pe } = await supabase.from('profiles').insert([{
      id: session.user.id,
      company_id: company.id,
      role: 'admin',
      email: session.user.email,
    }])
    if (pe) { setError(pe.message); setLoading(false); return }
    onDone()
  }

  async function joinCompany(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    // Find company by invite code
    const { data: company, error: ce } = await supabase
      .from('companies').select('id').eq('invite_code', inviteCode.trim().toUpperCase()).single()
    if (ce || !company) { setError('Invite code not found.'); setLoading(false); return }
    // Create profile as member
    const { error: pe } = await supabase.from('profiles').insert([{
      id: session.user.id,
      company_id: company.id,
      role: 'member',
      email: session.user.email,
    }])
    if (pe) { setError(pe.message); setLoading(false); return }
    onDone()
  }

  return (
    <Page>
      <Logo subtitle="Set up your workspace" />
      <Card>
        {/* Tabs */}
        <div style={{ display: 'flex', background: C.bg, borderRadius: 10, padding: 4, marginBottom: 28 }}>
          {[['create', '🏢 Create Company'], ['join', '🔑 Join Company']].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setError('') }} style={{
              flex: 1, padding: '8px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: tab === key ? C.surface : 'transparent',
              color: tab === key ? C.navBg : C.textSub,
              boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}>{label}</button>
          ))}
        </div>

        {tab === 'create' ? (
          <form onSubmit={createCompany} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Company Name</label>
              <input value={companyName} required autoFocus
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Acme Logistics" style={inputStyle} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: C.textSub }}>
              You'll be the admin and get a unique invite code to share with your team.
            </p>
            {error && <div style={{ color: C.danger, fontSize: 13, background: '#fff0f2', padding: '10px 14px', borderRadius: 8 }}>{error}</div>}
            <button type="submit" disabled={loading} style={primaryBtn(loading)}>
              {loading ? '…' : 'Create Company'}
            </button>
          </form>
        ) : (
          <form onSubmit={joinCompany} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Invite Code</label>
              <input value={inviteCode} required autoFocus
                onChange={e => setInviteCode(e.target.value)}
                placeholder="e.g. AB12CD34"
                style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: C.textSub }}>
              Ask your company admin for the invite code.
            </p>
            {error && <div style={{ color: C.danger, fontSize: 13, background: '#fff0f2', padding: '10px 14px', borderRadius: 8 }}>{error}</div>}
            <button type="submit" disabled={loading} style={primaryBtn(loading)}>
              {loading ? '…' : 'Join Company'}
            </button>
          </form>
        )}
      </Card>
    </Page>
  )
}

// ── Root App ───────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession]   = useState(undefined) // undefined = loading
  const [profile, setProfile]   = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); return }
    supabase.from('profiles').select('*, companies(*)').eq('id', session.user.id).single()
      .then(({ data }) => setProfile(data ?? null))
  }, [session])

  // Still loading
  if (session === undefined || (session && profile === undefined)) return null

  // Not logged in
  if (!session) return <LoginScreen />

  // Logged in but no company yet
  if (!profile?.company_id) return (
    <OnboardingScreen
      session={session}
      onDone={() => {
        // Reload profile
        supabase.from('profiles').select('*, companies(*)').eq('id', session.user.id).single()
          .then(({ data }) => setProfile(data))
      }}
    />
  )

  return (
    <FleetManager
      session={session}
      profile={profile}
      companyId={profile.company_id}
      onSignOut={() => supabase.auth.signOut()}
    />
  )
}
