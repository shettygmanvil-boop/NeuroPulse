import React from 'react'
import StatCard from '../components/StatCard'
import { useHealth } from '../context/HealthContext'

/**
 * Dashboard
 * Central health metrics view. Uses `StatCard` and `HealthContext`.
 */
export default function Dashboard() {
  const { mentalScore, physicalScore, journalData } = useHealth()

  const defaultStats = [
    { title: 'Mental Score', value: mentalScore || '—', delta: '+1.2%' },
    { title: 'Physical Score', value: physicalScore || '—', delta: '+0.8%' },
    { title: 'Stress Index', value: journalData.stressScore ?? '—', delta: '-0.4%' },
  ]

  return (
    <section className="np-dashboard">
      <h2>Dashboard</h2>
      <div className="np-statgrid">
        {defaultStats.map((s) => (
          <StatCard key={s.title} title={s.title} value={s.value} delta={s.delta} />
        ))}
      </div>
      <div className="np-dashboard-body">
        <p>Additional visualizations and timelines will be added here.</p>
      </div>
    </section>
  )
}
