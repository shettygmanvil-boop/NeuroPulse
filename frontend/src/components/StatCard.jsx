import React from 'react'

/**
 * StatCard
 * Reusable UI card for displaying a metric or score.
 * Props:
 * - `title` string
 * - `value` string|number
 * - `delta` string (optional change indicator)
 */
export default function StatCard({ title, value, delta }) {
  return (
    <div className="np-statcard" role="region" aria-label={title}>
      <div className="np-statcard-body">
        <div className="np-statcard-title">{title}</div>
        <div className="np-statcard-value">{value}</div>
        {delta && <div className="np-statcard-delta">{delta}</div>}
      </div>
    </div>
  )
}
