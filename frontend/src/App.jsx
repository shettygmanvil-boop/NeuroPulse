import React from 'react'
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { HealthProvider } from './context/HealthContext'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import JournalPage from './pages/JournalPage'
import SimulationPage from './pages/SimulationPage'
import './App.css'

/**
 * App.jsx
 * ═══════════════════════════════════════════════════════════════════════════
 * Main application router and layout orchestration.
 *
 * Uses HashRouter so GitHub Pages serves all routes correctly without
 * needing server-side rewrites (BrowserRouter deep links 404 on GH Pages).
 *
 * Routes:
 * - '/' → LandingPage (hero, CTAs)
 * - '/dashboard' → Dashboard (health metrics, stats)
 * - '/journal' → JournalPage (text/voice input)
 * - '/simulation' → SimulationPage (slider-based AI simulation)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * LayoutWrapper
 * Conditionally renders sidebar based on current route.
 * Landing page uses full-width layout; other pages use sidebar + main layout.
 */
function LayoutWrapper() {
  const location = useLocation()
  const isLandingPage = location.pathname === '/'

  return (
    <div className="np-app-layout">
      <Navbar />
      <div className="np-layout-body">
        {!isLandingPage && <Sidebar />}
        <main className={isLandingPage ? 'np-main-full' : 'np-main-with-sidebar'}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

/**
 * App
 * Root component providing HealthProvider and Router context.
 */
function App() {
  return (
    <HealthProvider>
      <Router>
        <LayoutWrapper />
      </Router>
    </HealthProvider>
  )
}

export default App
