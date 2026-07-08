import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { SpeedInsights } from '@vercel/speed-insights/react'

const App         = lazy(() => import('./App.jsx'))
const LandingPage = lazy(() => import('./LandingPage.jsx'))
const PrivacyPage = lazy(() => import('./PrivacyPage.jsx'))

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

const path = window.location.pathname
// If an OAuth / password-recovery callback lands on "/" (e.g. Supabase falls back to
// the Site URL), still mount the app so the session in the URL is processed, instead
// of showing the marketing landing page.
const isAuthCallback = /[?&](code|error|error_description)=/.test(window.location.search)
  || /access_token=|refresh_token=|type=recovery/.test(window.location.hash)
const isHome = path === '/' || path === ''
const Root = path === '/privacy' ? PrivacyPage : (isHome && !isAuthCallback) ? LandingPage : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
    <SpeedInsights />
  </StrictMode>,
)
