import React, { useState } from 'react'

/**
 * SimulationPage
 * Sliders for the AI Health Twin simulation. This is a UI shell —
 * the simulation engine will plug into these inputs.
 */
export default function SimulationPage() {
  const [cognitive, setCognitive] = useState(50)
  const [sleep, setSleep] = useState(50)
  const [stress, setStress] = useState(50)

  return (
    <section className="np-simulation">
      <h2>AI Health Twin — Simulation</h2>
      <div className="np-sim-control">
        <label> Cognitive: {cognitive}</label>
        <input type="range" min={0} max={100} value={cognitive} onChange={(e) => setCognitive(Number(e.target.value))} />
      </div>
      <div className="np-sim-control">
        <label> Sleep: {sleep}</label>
        <input type="range" min={0} max={100} value={sleep} onChange={(e) => setSleep(Number(e.target.value))} />
      </div>
      <div className="np-sim-control">
        <label> Stress: {stress}</label>
        <input type="range" min={0} max={100} value={stress} onChange={(e) => setStress(Number(e.target.value))} />
      </div>
      <div className="np-sim-actions">
        <button className="btn primary">Run Simulation</button>
      </div>
    </section>
  )
}
