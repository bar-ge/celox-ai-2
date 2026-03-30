import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import FleetManager from './fleet-manager'
import './App.css'

const C = {
  navBg:     '#1f3a5f',
  primary:   '#0073ea',
  bg:        '#f6f7fb',
  surface:   '#ffffff',
  border:    '#e6e9ef',
  text:      '#323338',
  textSub:   '#676879',
  danger:    '#e2445c',
  success:   '#00c875',
}

function LoginScreen() {
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSuccess('Account created! You can now sign in.')
    }

    setLoading(false)
  }

  function switchMode(m) {
    setMode(m)
    setError('')
    setSuccess('')
  }

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

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, margin: '0 auto 12px',
          background: `linear-gradient(135deg, ${C.primary}, #a25ddc)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,115,234,0.35)',
        }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 24 }}>F</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: C.navBg, margin: 0 }}>Fleet Manager</h1>
        <p style={{ color: C.textSub, fontSize: 14, marginTop: 4 }}>
          {mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: C.surface, borderRadius: 16, padding: '36px 32px',
        width: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: `1px solid ${C.border}`,
      }}>

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
            <input
              type="email" value={email} required autoFocus
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password" value={password} required
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ color: C.danger, fontSize: 13, background: '#fff0f2', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.danger}40` }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ color: C.success, fontSize: 13, background: '#f0fff8', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.success}40` }}>
              {success}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            background: C.primary, color: '#fff', border: 'none',
            borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.75 : 1, marginTop: 4,
            transition: 'opacity 0.15s',
          }}>
            {loading ? '…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: C.textSub }}>
        Your data is securely stored in Supabase
      </p>
    </div>
  )
}

export default function App() {
  const [session, setSession]   = useState(undefined) // undefined = still checking

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Still checking auth state — show nothing to avoid flash
  if (session === undefined) return null

  if (!session) return <LoginScreen />

  return <FleetManager session={session} onSignOut={() => supabase.auth.signOut()} />
}
