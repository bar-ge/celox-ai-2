import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LandingPage from './LandingPage.jsx'
import PrivacyPage from './PrivacyPage.jsx'
import { SpeedInsights } from '@vercel/speed-insights/react'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

const path = window.location.pathname
const Root = path === '/privacy' ? PrivacyPage : (path === '/' || path === '') ? LandingPage : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
    <SpeedInsights />
  </StrictMode>,
)
