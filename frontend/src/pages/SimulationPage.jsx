import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Brain,
  Activity,
  Moon,
  Footprints,
  Cigarette,
  Wine,
  Cpu,
  AlertTriangle,
  Loader2,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { useHealth } from '../context/HealthContext'

/**
 * SimulationPage — AI Health Twin
 * ═══════════════════════════════════════════════════════════════════════════
 * Two-column layout:
 *   Left  — lifestyle controls (sliders + toggles)
 *   Right — glassmorphism prediction panel + Futuristic Prognosis box
 *
 * Reactivity:
 *   Every control change is debounced (350 ms) before calling
 *   fetchSimulation(), giving a real-time digital-twin feel without
 *   hammering the backend on every pixel of slider movement.
 *
 * Context consumed:
 *   fetchSimulation, isLoadingSimulation, simulationError, simulationResults
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// useDebounce — delays a value update by `delay` ms
// ─────────────────────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreGauge — large score display with animated neon progress bar
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {string}      label     — metric name
 * @param {number|null} score     — 0-100 or null (no data yet)
 * @param {string}      barColor  — Tailwind gradient class for the fill
 * @param {React.ReactNode} icon
 */
function ScoreGauge({ label, score, barColor, icon }) {
  const pct = score !== null ? Math.max(0, Math.min(100, score)) : 0
  const hasScore = score !== null

  // Colour the numeric value based on score tier
  const valueColor =
    !hasScore       ? 'text-[#8888aa]'
    : pct >= 70     ? 'text-emerald-300'
    : pct >= 40     ? 'text-amber-300'
    :                 'text-rose-300'

  return (
    <div
      className="
        relative overflow-hidden rounded-2xl p-6
        bg-white/5 backdrop-blur-md border border-white/10
        transition-all duration-300
        hover:border-white/20 hover:shadow-[0_0_30px_rgba(124,92,252,0.12)]
      "
      role="meter"
      aria-label={label}
      aria-valuenow={hasScore ? pct : undefined}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Decorative glow blob */}
      <div
        className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-30 bg-violet-600"
        aria-hidden="true"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-violet-400" aria-hidden="true">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8888aa]">
          {label}
        </p>
      </div>

      {/* Score value */}
      <p className={`text-5xl font-bold leading-none mb-5 transition-all duration-500 ${valueColor}`}>
        {hasScore ? pct : '—'}
        {hasScore && <span className="text-xl font-normal text-[#8888aa] ml-1">/100</span>}
      </p>

      {/* Progress bar track */}
      <div
        className="h-2 w-full rounded-full bg-white/5 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Tier label */}
      {hasScore && (
        <p className={`mt-2 text-xs font-medium ${valueColor}`}>
          {pct >= 70 ? 'Optimal' : pct >= 40 ? 'Moderate' : 'Needs Attention'}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SliderControl — labelled range input with live value badge
// ─────────────────────────────────────────────────────────────────────────────
function SliderControl({ id, label, icon, min, max, step = 1, value, unit, onChange, disabled, formatValue }) {
  const display = formatValue ? formatValue(value) : `${value}${unit ? ` ${unit}` : ''}`
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="flex items-center gap-2 text-sm font-medium text-[#8888aa]"
        >
          <span className="text-violet-400" aria-hidden="true">{icon}</span>
          {label}
        </label>
        <span
          className="
            px-2.5 py-0.5 rounded-full text-xs font-semibold
            bg-violet-500/15 border border-violet-500/30 text-violet-300
          "
          aria-live="polite"
          aria-atomic="true"
        >
          {display}
        </span>
      </div>

      {/* Custom-styled range input */}
      <div className="relative">
        {/* Filled track overlay */}
        <div
          className="pointer-events-none absolute top-1/2 left-0 h-1.5 rounded-full -translate-y-1/2
                     bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-150"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="
            relative w-full h-1.5 rounded-full appearance-none cursor-pointer
            bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed
            focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
            focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a1a]
          "
          aria-valuetext={display}
        />
      </div>

      {/* Min / max labels */}
      <div className="flex justify-between text-[10px] text-[#8888aa]/50 font-medium">
        <span>{formatValue ? formatValue(min) : `${min}${unit ? ` ${unit}` : ''}`}</span>
        <span>{formatValue ? formatValue(max) : `${max}${unit ? ` ${unit}` : ''}`}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ToggleSwitch — accessible boolean toggle
// ─────────────────────────────────────────────────────────────────────────────
function ToggleSwitch({ id, label, icon, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-2">
        <span className="text-violet-400 mt-0.5" aria-hidden="true">{icon}</span>
        <div>
          <label
            htmlFor={id}
            className="text-sm font-medium text-[#e4e4f7] cursor-pointer"
          >
            {label}
          </label>
          {description && (
            <p className="text-xs text-[#8888aa]/70 mt-0.5">{description}</p>
          )}
        </div>
      </div>

      {/* Toggle pill */}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative flex-shrink-0 w-11 h-6 rounded-full border transition-all duration-300
          focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
          focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a1a]
          disabled:opacity-40 disabled:cursor-not-allowed
          ${checked
            ? 'bg-violet-600/40 border-violet-500/60 shadow-[0_0_12px_rgba(124,92,252,0.4)]'
            : 'bg-white/5 border-white/15'
          }
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all duration-300
            ${checked
              ? 'translate-x-5 bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]'
              : 'translate-x-0 bg-[#8888aa]/60'
            }
          `}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AlcoholSelector — 3-option segmented control
// ─────────────────────────────────────────────────────────────────────────────
const ALCOHOL_OPTIONS = ['None', 'Occasional', 'Heavy']

function AlcoholSelector({ value, onChange, disabled }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm font-medium text-[#8888aa]">
        <Wine size={15} className="text-violet-400" aria-hidden="true" />
        Alcohol Intake
      </label>
      <div
        className="flex rounded-xl overflow-hidden border border-white/10 bg-white/5"
        role="radiogroup"
        aria-label="Alcohol intake level"
      >
        {ALCOHOL_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={value === opt}
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={`
              flex-1 py-2 text-xs font-semibold transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-inset
              focus-visible:ring-violet-400 disabled:opacity-40 disabled:cursor-not-allowed
              ${value === opt
                ? 'bg-violet-600/30 text-violet-300 shadow-[inset_0_0_12px_rgba(124,92,252,0.2)]'
                : 'text-[#8888aa] hover:text-[#e4e4f7] hover:bg-white/5'
              }
            `}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SimulationPage
// ─────────────────────────────────────────────────────────────────────────────
export default function SimulationPage() {
  const { fetchSimulation, isLoadingSimulation, simulationError, simulationResults } =
    useHealth()

  // ── Control state ──────────────────────────────────────────────────────
  const [sleepDuration,      setSleepDuration]      = useState(7)      // hours (4–10)
  const [stepsWalked,        setStepsWalked]        = useState(7500)   // steps (0–15000)
  const [dailyCalorieIntake, setDailyCalorieIntake] = useState(2100)   // kcal
  const [smokingStatus,      setSmokingStatus]      = useState(false)
  const [alcoholConsumption, setAlcoholConsumption] = useState('None')

  // ── Debounced payload — fires fetchSimulation 350 ms after last change ──
  const params = { sleepDuration, stepsWalked, smokingStatus, alcoholConsumption, dailyCalorieIntake }
  const debouncedParams = useDebounce(params, 350)

  // Track whether we've ever triggered a simulation (to show placeholder vs results)
  const hasTriggered = useRef(false)

  const runSimulation = useCallback((p) => {
    hasTriggered.current = true
    fetchSimulation(p)
  }, [fetchSimulation])

  useEffect(() => {
    runSimulation(debouncedParams)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedParams.sleepDuration,
    debouncedParams.stepsWalked,
    debouncedParams.smokingStatus,
    debouncedParams.alcoholConsumption,
    debouncedParams.dailyCalorieIntake,
  ])

  // ── Derived display values ─────────────────────────────────────────────
  const mentalScore   = simulationResults?.mentalWellnessScore   ?? null
  const physicalScore = simulationResults?.physicalWellnessScore ?? null
  const prognosis     = simulationResults?.prognosis             ?? null
  const hasResults    = mentalScore !== null || physicalScore !== null

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <section
      className="opacity-0 animate-[slide-up_0.5s_ease-out_forwards]"
      aria-label="AI Health Twin Simulation"
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h2 className="!mb-1">AI Health Twin</h2>
          <p className="text-sm text-[#8888aa]">
            Adjust your lifestyle parameters — predictions update in real time.
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
                     bg-cyan-500/10 border border-cyan-500/30 text-cyan-300
                     shadow-[0_0_12px_rgba(34,211,238,0.15)]"
        >
          <Cpu size={13} aria-hidden="true" />
          Digital Twin
          {isLoadingSimulation && (
            <Loader2 size={12} className="animate-spin ml-0.5" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* ── Two-column grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* ── LEFT: Controls ──────────────────────────────────────────── */}
        <div
          className="
            flex flex-col gap-6 rounded-2xl p-6
            bg-white/5 backdrop-blur-md border border-white/10
            opacity-0 animate-[slide-up_0.5s_ease-out_0.08s_forwards]
          "
          aria-label="Lifestyle controls"
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-violet-400" aria-hidden="true" />
            <h3 className="!mb-0 text-sm font-semibold uppercase tracking-widest text-[#8888aa]">
              Lifestyle Parameters
            </h3>
          </div>

          {/* Sleep Duration */}
          <SliderControl
            id="sleep-slider"
            label="Sleep Duration"
            icon={<Moon size={15} />}
            min={4}
            max={10}
            step={0.5}
            value={sleepDuration}
            unit="hrs"
            onChange={setSleepDuration}
            disabled={isLoadingSimulation}
            formatValue={(v) => `${v} hrs`}
          />

          {/* Daily Steps */}
          <SliderControl
            id="steps-slider"
            label="Daily Steps"
            icon={<Footprints size={15} />}
            min={0}
            max={15000}
            step={250}
            value={stepsWalked}
            onChange={setStepsWalked}
            disabled={isLoadingSimulation}
            formatValue={(v) => v.toLocaleString()}
          />

          {/* Daily Calorie Intake */}
          <SliderControl
            id="calories-slider"
            label="Daily Calories"
            icon={<Activity size={15} />}
            min={1200}
            max={3500}
            step={50}
            value={dailyCalorieIntake}
            unit="kcal"
            onChange={setDailyCalorieIntake}
            disabled={isLoadingSimulation}
            formatValue={(v) => `${v.toLocaleString()} kcal`}
          />

          {/* Divider */}
          <div className="border-t border-white/5" aria-hidden="true" />

          {/* Smoking toggle */}
          <ToggleSwitch
            id="smoking-toggle"
            label="Smoking Status"
            icon={<Cigarette size={15} />}
            description="Active tobacco use"
            checked={smokingStatus}
            onChange={setSmokingStatus}
            disabled={isLoadingSimulation}
          />

          {/* Alcohol segmented control */}
          <AlcoholSelector
            value={alcoholConsumption}
            onChange={setAlcoholConsumption}
            disabled={isLoadingSimulation}
          />
        </div>

        {/* ── RIGHT: Predictions ──────────────────────────────────────── */}
        <div
          className="
            flex flex-col gap-5
            opacity-0 animate-[slide-up_0.5s_ease-out_0.16s_forwards]
          "
          aria-label="Predicted wellness scores"
          aria-live="polite"
          aria-busy={isLoadingSimulation}
        >
          {/* Loading overlay shimmer */}
          {isLoadingSimulation && !hasResults && (
            <div className="flex flex-col gap-5">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl p-6 bg-white/5 border border-white/10 animate-pulse"
                  aria-hidden="true"
                >
                  <div className="h-3 w-24 rounded bg-white/10 mb-4" />
                  <div className="h-12 w-20 rounded bg-white/10 mb-5" />
                  <div className="h-1.5 w-full rounded-full bg-white/10" />
                </div>
              ))}
            </div>
          )}

          {/* Score gauges */}
          {(!isLoadingSimulation || hasResults) && (
            <>
              <ScoreGauge
                label="Mental Wellness Score"
                score={mentalScore}
                barColor="bg-gradient-to-r from-violet-600 to-violet-400"
                icon={<Brain size={16} />}
              />
              <ScoreGauge
                label="Physical Wellness Score"
                score={physicalScore}
                barColor="bg-gradient-to-r from-cyan-600 to-cyan-400"
                icon={<Activity size={16} />}
              />
            </>
          )}

          {/* Placeholder when no simulation has run yet */}
          {!hasTriggered.current && !isLoadingSimulation && !hasResults && (
            <div
              className="rounded-2xl p-6 bg-white/[0.03] border border-white/[0.06] text-center"
              aria-label="Awaiting first simulation"
            >
              <Cpu size={32} className="text-violet-400/40 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-[#8888aa]/60">
                Adjust any parameter to run your first simulation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {simulationError && (
        <div
          className="flex items-start gap-3 mb-6 px-4 py-3 rounded-xl
                     bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold mb-0.5">Simulation failed</p>
            <p className="text-red-300/80">{simulationError}</p>
          </div>
        </div>
      )}

      {/* ── Futuristic Prognosis box ─────────────────────────────────────── */}
      <div
        className="
          relative overflow-hidden rounded-2xl p-6
          bg-white/5 backdrop-blur-md border border-white/10
          opacity-0 animate-[slide-up_0.5s_ease-out_0.24s_forwards]
          transition-all duration-500
        "
        aria-label="Futuristic Prognosis"
        aria-live="polite"
        aria-atomic="true"
      >
        {/* Decorative gradient blob */}
        <div
          className="pointer-events-none absolute -bottom-8 -left-8 w-40 h-40 rounded-full
                     bg-cyan-600/10 blur-3xl"
          aria-hidden="true"
        />

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-cyan-400" aria-hidden="true" />
          <h3 className="!mb-0 text-sm font-semibold uppercase tracking-widest text-[#8888aa]">
            Futuristic Prognosis
          </h3>
          {isLoadingSimulation && (
            <Loader2
              size={13}
              className="animate-spin text-cyan-400 ml-auto"
              aria-label="Generating prognosis"
            />
          )}
        </div>

        {/* Prognosis text */}
        {prognosis ? (
          <p
            className="text-sm leading-relaxed text-[#e4e4f7]/80
                       opacity-0 animate-[fade-in_0.6s_ease-out_forwards]"
          >
            {prognosis}
          </p>
        ) : isLoadingSimulation ? (
          /* Skeleton lines while loading */
          <div className="flex flex-col gap-2" aria-hidden="true">
            <div className="h-3 w-full rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-5/6 rounded bg-white/10 animate-pulse" style={{ animationDelay: '0.1s' }} />
            <div className="h-3 w-4/6 rounded bg-white/10 animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
        ) : (
          <p className="text-sm text-[#8888aa]/60 italic">
            {hasResults
              ? 'Prognosis unavailable — the AI model did not return a summary for this configuration.'
              : 'Your personalised AI prognosis will appear here once the simulation runs.'}
          </p>
        )}

        {/* Footer note */}
        <p className="mt-5 text-xs text-[#8888aa]/40 border-t border-white/5 pt-4">
          Prognosis is AI-generated from your lifestyle inputs and computed wellness scores.
          It is informational only and not a substitute for medical advice.
        </p>
      </div>
    </section>
  )
}
