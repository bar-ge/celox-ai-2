import { StrictMode, lazy, Suspense } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { regionFromPath, defaultLang, DEFAULT_REGION } from './regions.js'

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

// Marketing sites: "/", "/il", "/us" all render the landing.
// A bare "/" always goes to the Hebrew site (/il) so the URL is shareable.
let region = regionFromPath(path)                       // 'il' | 'us' | null
const afterRegion = region ? path.replace(/^\/(il|us)/i, '') : path
const isHome = afterRegion === '' || afterRegion === '/'
if (!region && isHome && !isAuthCallback) {
  region = DEFAULT_REGION
  window.history.replaceState(null, '', '/' + region)   // "/" -> "/il"
}

if (region && isHome && !isAuthCallback) {
  localStorage.setItem('celox_region', region)
}

// Language is seeded from the URL on every entry rather than only on the
// landing — otherwise a visitor who goes straight to /app keeps whatever
// fleet_lang was written months ago. `path` is read before the redirect above,
// so a bare "/" is Hebrew; only /us asks for English. An explicit in-app pick
// still wins.
if (!isAuthCallback && !localStorage.getItem('fleet_lang_manual')) {
  localStorage.setItem('fleet_lang', defaultLang(path))
}

const Root = path === '/privacy' ? PrivacyPage : (isHome && !isAuthCallback) ? LandingPage : App

const rootEl = document.getElementById('root')
const wrap = (node) => (
  <StrictMode>
    {node}
    <SpeedInsights />
  </StrictMode>
)
// /il.html and /us.html ship the landing prerendered (scripts/vite-plugin-region-heads.mjs).
// Hydrate it with the real component already loaded — a lazy() + Suspense boundary here
// would not match the server markup. Anything else (app, auth callback) starts clean.
if (rootEl.hasChildNodes() && Root === LandingPage) {
  import('./LandingPage.jsx').then(({ default: Landing }) => {
    hydrateRoot(rootEl, wrap(<Landing region={region} />))
  })
} else {
  rootEl.replaceChildren()
  createRoot(rootEl).render(wrap(
    <Suspense fallback={null}>
      <Root region={region} />
    </Suspense>
  ))
}
