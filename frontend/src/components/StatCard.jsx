import React from 'react'

/**
 * StatCard
 * ─────────────────────────────────────────────────────────────────────────
 * Reusable glassmorphism metric card.
 *
 * Props:
 *   title       {string}           — metric label shown at the top
 *   value       {string|number}    — primary display value
 *   status      {'good'|'warn'|'danger'|'neutral'} — drives the colour dot
 *   icon        {React.ReactNode}  — optional lucide-react (or any) icon
 *   delta       {string}           — optional change indicator e.g. "+1.2%"
 *   animDelay   {string}           — optional CSS animation-delay e.g. "0.1s"
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Maps a status key to a Tailwind background colour class for the dot. */
const STATUS_DOT = {
  good:    'bg-emerald-400',
  warn:    'bg-amber-400',
  danger:  'bg-rose-400',
  neutral: 'bg-violet-400',
}

/** Maps a status key to a Tailwind text colour class for the value. */
const STATUS_VALUE = {
  good:    'text-emerald-300',
  warn:    'text-amber-300',
  danger:  'text-rose-300',
  neutral: 'text-violet-300',
}

export default function StatCard({
  title,
  value,
  status = 'neutral',
  icon = null,
  delta = null,
  animDelay = '0s',
}) {
  const dotClass   = STATUS_DOT[status]   ?? STATUS_DOT.neutral
  const valueClass = STATUS_VALUE[status] ?? STATUS_VALUE.neutral

  return (
    <article
      role="region"
      aria-label={title}
      className="
        group relative overflow-hidden
        bg-white/10 backdrop-blur-md border border-white/20
        p-6 rounded-2xl
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:border-white/30
        hover:shadow-[0_0_40px_rgba(124,92,252,0.18)]
        opacity-0 animate-[slide-up_0.5s_ease-out_forwards]
      "
      style={{ animationDelay: animDelay }}
    >
      {/* Subtle inner glow on hover */}
      <div
        className="
          pointer-events-none absolute inset-0 rounded-2xl opacity-0
          group-hover:opacity-100 transition-opacity duration-300
          bg-gradient-to-br from-violet-500/5 to-cyan-500/5
        "
        aria-hidden="true"
      />

      {/* Header row — icon + status dot */}
      <div className="flex items-center justify-between mb-4">
        {icon ? (
          <span className="text-violet-400 opacity-80" aria-hidden="true">
            {icon}
          </span>
        ) : (
          <span />
        )}
        <span
          className={`w-2.5 h-2.5 rounded-full ${dotClass} shadow-[0_0_8px_currentColor]`}
          aria-label={`Status: ${status}`}
        />
      </div>

      {/* Title */}
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8888aa] mb-2">
        {title}
      </p>

      {/* Value */}
      <p className={`text-4xl font-bold leading-none ${valueClass} mb-3`}>
        {value ?? '—'}
      </p>

      {/* Delta */}
      {delta && (
        <p
          className={`text-xs font-semibold ${
            String(delta).startsWith('-') ? 'text-rose-400' : 'text-emerald-400'
          }`}
        >
          {delta}
        </p>
      )}
    </article>
  )
}
