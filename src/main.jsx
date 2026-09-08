import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { regionFromPath, detectRegion, defaultLang } from './regions.js'

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

// Country-specific marketing sites: "/", "/il", "/us", "/ca" all render the landing.
// A bare "/" is redirected to the visitor's detected region so the URL is shareable.
let region = regionFromPath(path)                       // 'il' | 'us' | 'ca' | null
const afterRegion = region ? path.replace(/^\/(il|us|ca)/i, '') : path
const isHome = afterRegion === '' || afterRegion === '/'
if (!region && isHome && !isAuthCallback) {
  region = detectRegion()
  window.history.replaceState(null, '', '/' + region)   // "/" -> "/il" (or detected)
}

if (region && isHome && !isAuthCallback) {
  localStorage.setItem('celox_region', region)
}

// Language is seeded from the URL, not from the detected region, and on every
// entry rather than only on the landing — otherwise a visitor who goes straight
// to /app keeps whatever fleet_lang was written months ago. `path` is read
// before the redirect above, so an auto-detected "/us" does not count as asking
// for English; only typing /us or /ca does. An explicit in-app pick still wins.
if (!isAuthCallback && !localStorage.getItem('fleet_lang_manual')) {
  localStorage.setItem('fleet_lang', defaultLang(path))
}

const Root = path === '/privacy' ? PrivacyPage : (isHome && !isAuthCallback) ? LandingPage : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Root region={region} />
    </Suspense>
    <SpeedInsights />
  </StrictMode>,
)
