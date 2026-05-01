import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LandingPage from './LandingPage.jsx'
import { SpeedInsights } from '@vercel/speed-insights/react'

const path = window.location.pathname
const Root = (path === '/' || path === '') ? LandingPage : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
    <SpeedInsights />
  </StrictMode>,
)
