import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/global.css'
import { HomePage } from './pages/HomePage'

const DemoPage = lazy(() => import('./pages/DemoPage'))
const MonitorPage = lazy(() => import('./pages/MonitorPage'))
const pathname = window.location.pathname.replace(/\/$/, '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {pathname === '/demo' ? <Suspense fallback={<p role="status">Loading challenge…</p>}><DemoPage /></Suspense>
      : pathname === '/monitor' ? <Suspense fallback={<p role="status">Loading monitoring station…</p>}><MonitorPage /></Suspense>
      : <HomePage />}
  </StrictMode>,
)
