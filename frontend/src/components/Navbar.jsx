import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Navbar
 * Clean top navigation used across the NeuroPulse app.
 * Minimal, accessible, and responsive-ready.
 */
export default function Navbar() {
  return (
    <header className="np-navbar">
      <div className="np-navbar-inner">
        <Link to="/" className="np-brand">
          NeuroPulse
        </Link>
        <nav className="np-nav-links" aria-label="Main navigation">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/journal">Journal</Link>
          <Link to="/simulation">Simulation</Link>
        </nav>
      </div>
    </header>
  )
}
