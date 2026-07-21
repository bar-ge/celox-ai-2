import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { regionFromPath, detectRegion, getRegion } from './regions.js'

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

// The landing is where the market gets picked, and language follows the market.
// Persist it so /app opens in the same language the visitor was just reading —
// without this, a stale fleet_lang would show the app in Hebrew to a /us visitor.
if (region && isHome && !isAuthCallback) {
  localStorage.setItem('celox_region', region)
  // An explicit in-app language pick wins — only seed the language when the
  // visitor has never chosen one themselves.
  if (!localStorage.getItem('fleet_lang_manual')) {
    localStorage.setItem('fleet_lang', getRegion(region).lang)
  }
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
