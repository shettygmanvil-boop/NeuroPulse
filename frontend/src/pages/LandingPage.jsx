import React from 'react'
import { Link } from 'react-router-dom'

/**
 * LandingPage
 * Futuristic intro and CTA for NeuroPulse.
 */
export default function LandingPage() {
  return (
    <section className="np-landing">
      <div className="np-landing-hero">
        <h1>NeuroPulse — Your AI Health Companion</h1>
        <p>
          Real-time mental and cognitive health insights, journaling, and an
          AI-powered health twin to simulate outcomes.
        </p>
        <div className="np-landing-ctas">
          <Link className="btn primary" to="/dashboard">
            View Dashboard
          </Link>
          <Link className="btn" to="/journal">
            Start Journal
          </Link>
        </div>
      </div>
      <div className="np-landing-features">
        <h2>What we do</h2>
        <ul>
          <li>Aggregate wearable & behavioral data</li>
          <li>Provide actionable cognitive scores</li>
          <li>AI twin simulations for treatment planning</li>
        </ul>
      </div>
    </section>
  )
}
