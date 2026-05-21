import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Cpu,
  Watch,
  SlidersHorizontal,
} from 'lucide-react'
import { useHealth } from '../context/HealthContext'

/**
 * Sidebar
 * ═══════════════════════════════════════════════════════════════════════════
 * Vertical navigation panel rendered on all non-landing pages.
 *
 * Sections:
 *   1. Brand mark (top)
 *   2. Primary nav links — Dashboard, Journal, AI Twin
 *   3. Smartwatch / Manual mode toggle (bottom, pinned)
 *
 * The outer <aside> keeps the existing .np-sidebar CSS class so the
 * App.jsx layout (flex row, fixed 240 px width, border-right) is
 * preserved exactly. All inner elements use Tailwind utilities.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Nav item descriptor */
const NAV_ITEMS = [
  {
    to:    '/dashboard',
    label: 'Dashboard',
    icon:  <LayoutDashboard size={16} aria-hidden="true" />,
  },
  {
    to:    '/journal',
    label: 'Journal',
    icon:  <BookOpen size={16} aria-hidden="true" />,
  },
  {
    to:    '/simulation',
    label: 'AI Twin',
    icon:  <Cpu size={16} aria-hidden="true" />,
  },
]

export default function Sidebar() {
  const { isSmartwatchMode, setIsSmartwatchMode } = useHealth()

  function handleModeToggle() {
    setIsSmartwatchMode((prev) => !prev)
  }

  return (
    <aside
      className="np-sidebar flex flex-col"
      aria-label="Dashboard navigation"
    >

      {/* ── Brand mark ────────────────────────────────────────────────── */}
      <div className="px-2 mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8888aa]/50 select-none">
          NeuroPulse
        </p>
      </div>

      {/* ── Primary navigation ────────────────────────────────────────── */}
      <nav aria-label="Primary navigation" className="flex-1">
        <ul className="flex flex-col gap-1" role="list">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <li key={to} role="listitem">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  [
                    // Base styles
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl',
                    'text-sm font-medium transition-all duration-200',
                    'focus:outline-none focus-visible:ring-2',
                    'focus-visible:ring-violet-400 focus-visible:ring-offset-1',
                    'focus-visible:ring-offset-[#12122a]',
                    // Active vs idle
                    isActive
                      ? 'bg-violet-500/20 text-violet-300 shadow-[inset_0_0_16px_rgba(124,92,252,0.12)]'
                      : 'text-[#8888aa] hover:bg-white/5 hover:text-[#e4e4f7]',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Icon wrapper — glows when active */}
                    <span
                      className={`
                        flex-shrink-0 transition-all duration-200
                        ${isActive
                          ? 'text-violet-400 drop-shadow-[0_0_6px_rgba(167,139,250,0.8)]'
                          : 'text-[#8888aa] group-hover:text-violet-400'
                        }
                      `}
                    >
                      {icon}
                    </span>

                    {/* Label */}
                    <span className="truncate">{label}</span>

                    {/* Active indicator dot */}
                    {isActive && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400
                                   shadow-[0_0_6px_rgba(167,139,250,0.9)]"
                        aria-hidden="true"
                      />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="my-4 border-t border-white/[0.06]" aria-hidden="true" />

      {/* ── Input mode toggle ─────────────────────────────────────────── */}
      <div
        className="
          px-3 py-4 rounded-2xl
          bg-white/[0.03] border border-white/[0.07]
        "
        aria-label="Input mode selector"
      >
        {/* Label row */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8888aa]/60">
            Input Mode
          </p>
          {/* Live mode badge */}
          <span
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full
              text-[10px] font-semibold transition-all duration-300
              ${isSmartwatchMode
                ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
                : 'bg-violet-500/15 border border-violet-500/30 text-violet-300'
              }
            `}
            aria-live="polite"
            aria-atomic="true"
          >
            <span
              className={`w-1 h-1 rounded-full animate-pulse ${isSmartwatchMode ? 'bg-cyan-400' : 'bg-violet-400'}`}
              aria-hidden="true"
            />
            {isSmartwatchMode ? 'Watch' : 'Manual'}
          </span>
        </div>

        {/* Toggle row */}
        <button
          type="button"
          role="switch"
          aria-checked={isSmartwatchMode}
          aria-label={`Switch to ${isSmartwatchMode ? 'Manual Input' : 'Smartwatch'} mode`}
          onClick={handleModeToggle}
          className="
            w-full flex items-center justify-between gap-3
            focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
            focus-visible:ring-offset-1 focus-visible:ring-offset-[#12122a]
            rounded-lg
          "
        >
          {/* Mode icons + labels */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`
                flex-shrink-0 transition-colors duration-300
                ${isSmartwatchMode ? 'text-cyan-400' : 'text-[#8888aa]'}
              `}
              aria-hidden="true"
            >
              {isSmartwatchMode
                ? <Watch size={15} />
                : <SlidersHorizontal size={15} />
              }
            </span>
            <span className="text-xs font-medium text-[#e4e4f7] truncate">
              {isSmartwatchMode ? 'Smartwatch' : 'Manual Input'}
            </span>
          </div>

          {/* Toggle pill */}
          <div
            className={`
              relative flex-shrink-0 w-10 h-5 rounded-full border
              transition-all duration-300
              ${isSmartwatchMode
                ? 'bg-cyan-500/25 border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                : 'bg-white/5 border-white/15'
              }
            `}
            aria-hidden="true"
          >
            <span
              className={`
                absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300
                ${isSmartwatchMode
                  ? 'left-[calc(100%-18px)] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                  : 'left-0.5 bg-[#8888aa]/60'
                }
              `}
            />
          </div>
        </button>

        {/* Mode description */}
        <p className="mt-3 text-[10px] text-[#8888aa]/50 leading-relaxed">
          {isSmartwatchMode
            ? 'Scores update from wearable sensor data.'
            : 'Scores update from your journal and simulation inputs.'
          }
        </p>
      </div>

    </aside>
  )
}
