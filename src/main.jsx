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
const Root = path === '/privacy' ? PrivacyPage : (path === '/' || path === '') ? LandingPage : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
    <SpeedInsights />
  </StrictMode>,
)
