import React, { useMemo } from 'react'
import {
  Brain,
  Activity,
  Flame,
  Zap,
  Watch,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import { useHealth } from '../context/HealthContext'

/**
 * Dashboard
 * ─────────────────────────────────────────────────────────────────────────
 * Central health metrics view.
 *
 * Sections:
 *   1. Header — welcome line + active-mode neon badge
 *   2. Metric grid — Mental Wellness, Physical Wellness,
 *                    Burnout Risk Level, Active Stress Score
 *   3. Explainable AI Insights panel
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Derive a 0-100 burnout risk from available journal signals. */
function deriveBurnoutRisk(journalData) {
  const { burnoutPrediction, stressScore } = journalData

  if (typeof burnoutPrediction === 'number') return burnoutPrediction

  // Map common string labels to numeric approximations
  if (typeof burnoutPrediction === 'string') {
    const label = burnoutPrediction.toLowerCase()
    if (label.includes('high'))     return 75
    if (label.includes('moderate')) return 45
    if (label.includes('low'))      return 20
  }

  // Fall back to stress score as a proxy
  if (typeof stressScore === 'number') return stressScore

  return null
}

/** Map a 0-100 score to a StatCard status key. */
function scoreToStatus(score, invert = false) {
  if (score === null || score === undefined) return 'neutral'
  const n = Number(score)
  if (Number.isNaN(n)) return 'neutral'
  // For "higher is better" metrics (mental, physical): good ≥ 70, warn ≥ 40
  // For "lower is better" metrics (stress, burnout): invert = true
  const effective = invert ? 100 - n : n
  if (effective >= 70) return 'good'
  if (effective >= 40) return 'warn'
  return 'danger'
}

/** Build the four AI insight lines from available context data. */
function buildInsights(mentalScore, physicalScore, journalData) {
  const { sentiment, detectedEmotions, burnoutPrediction, stressScore, explanation } = journalData
  const hasData =
    mentalScore > 0 ||
    physicalScore > 0 ||
    sentiment !== null ||
    stressScore !== null

  if (!hasData) {
    return [
      'AI Summary: Scores are optimised based on your latest inputs.',
      'Mental & physical baselines will update after your first journal entry.',
      'Stress and burnout signals are derived from language pattern analysis.',
      'Submit a journal entry or run a simulation to see personalised insights.',
    ]
  }

  const lines = []

  if (explanation) {
    lines.push(`AI Summary: ${explanation}`)
  } else {
    const mentalLabel  = mentalScore  >= 70 ? 'strong' : mentalScore  >= 40 ? 'moderate' : 'low'
    const physicalLabel = physicalScore >= 70 ? 'strong' : physicalScore >= 40 ? 'moderate' : 'low'
    lines.push(
      `AI Summary: Mental wellness is ${mentalLabel} (${mentalScore}) and physical wellness is ${physicalLabel} (${physicalScore}).`
    )
  }

  if (sentiment) {
    lines.push(`Sentiment analysis detected a ${sentiment.toLowerCase()} emotional tone in your latest entry.`)
  }

  if (detectedEmotions && detectedEmotions.length > 0) {
    lines.push(`Dominant emotions identified: ${detectedEmotions.slice(0, 4).join(', ')}.`)
  }

  if (burnoutPrediction !== null) {
    const label = typeof burnoutPrediction === 'string'
      ? burnoutPrediction
      : burnoutPrediction >= 70 ? 'High' : burnoutPrediction >= 40 ? 'Moderate' : 'Low'
    lines.push(`Burnout risk is currently ${label}. Consider reviewing workload and rest patterns.`)
  } else if (stressScore !== null) {
    lines.push(`Active stress score is ${stressScore}. ${stressScore >= 60 ? 'Elevated — consider a mindfulness break.' : 'Within a manageable range.'}`)
  }

  // Always return at least 2 lines
  if (lines.length < 2) {
    lines.push('Continue journaling to improve the accuracy of AI-generated insights.')
  }

  return lines
}

export default function Dashboard() {
  const {
    mentalScore,
    physicalScore,
    journalData,
    isSmartwatchMode,
  } = useHealth()

  const burnoutRisk = useMemo(() => deriveBurnoutRisk(journalData), [journalData])
  const insights    = useMemo(
    () => buildInsights(mentalScore, physicalScore, journalData),
    [mentalScore, physicalScore, journalData]
  )

  const metrics = [
    {
      title:  'Mental Wellness',
      value:  mentalScore || '—',
      status: scoreToStatus(mentalScore),
      icon:   <Brain size={20} />,
      delta:  mentalScore > 0 ? null : 'No data yet',
    },
    {
      title:  'Physical Wellness',
      value:  physicalScore || '—',
      status: scoreToStatus(physicalScore),
      icon:   <Activity size={20} />,
      delta:  physicalScore > 0 ? null : 'No data yet',
    },
    {
      title:  'Burnout Risk Level',
      value:  burnoutRisk !== null
        ? (typeof journalData.burnoutPrediction === 'string'
            ? journalData.burnoutPrediction
            : burnoutRisk)
        : '—',
      status: scoreToStatus(burnoutRisk, true),
      icon:   <Flame size={20} />,
      delta:  burnoutRisk !== null ? null : 'No data yet',
    },
    {
      title:  'Active Stress Score',
      value:  journalData.stressScore ?? '—',
      status: scoreToStatus(journalData.stressScore, true),
      icon:   <Zap size={20} />,
      delta:  journalData.stressScore !== null ? null : 'No data yet',
    },
  ]

  return (
    <section className="np-dashboard" aria-label="Health Dashboard">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 mb-8
                   opacity-0 animate-[slide-up_0.5s_ease-out_forwards]"
      >
        <div>
          <h2 className="!mb-1">Health Dashboard</h2>
          <p className="text-sm text-[#8888aa]">
            Your real-time wellness overview
          </p>
        </div>

        {/* Active mode badge */}
        <div
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold
            border transition-all duration-300
            ${isSmartwatchMode
              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.25)]'
              : 'bg-violet-500/10 border-violet-500/40 text-violet-300 shadow-[0_0_16px_rgba(124,92,252,0.25)]'
            }
          `}
          aria-label={`Active mode: ${isSmartwatchMode ? 'Smartwatch' : 'Manual'}`}
        >
          {isSmartwatchMode
            ? <Watch size={14} aria-hidden="true" />
            : <SlidersHorizontal size={14} aria-hidden="true" />
          }
          {isSmartwatchMode ? 'Smartwatch Mode' : 'Manual Mode'}

          {/* Pulsing dot */}
          <span
            className={`w-1.5 h-1.5 rounded-full animate-pulse
              ${isSmartwatchMode ? 'bg-cyan-400' : 'bg-violet-400'}`}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* ── Metric Grid ─────────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-10"
        role="list"
        aria-label="Health metrics"
      >
        {metrics.map((m, i) => (
          <div key={m.title} role="listitem">
            <StatCard
              title={m.title}
              value={m.value}
              status={m.status}
              icon={m.icon}
              delta={m.delta}
              animDelay={`${i * 0.08}s`}
            />
          </div>
        ))}
      </div>

      {/* ── Explainable AI Insights ──────────────────────────────────────── */}
      <div
        className="
          relative overflow-hidden rounded-2xl p-6
          bg-white/5 backdrop-blur-md border border-white/10
          opacity-0 animate-[slide-up_0.5s_ease-out_0.35s_forwards]
        "
        aria-label="AI Insights"
      >
        {/* Decorative gradient blob */}
        <div
          className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full
                     bg-violet-600/10 blur-3xl"
          aria-hidden="true"
        />

        {/* Section header */}
        <div className="flex items-center gap-2 mb-5">
          <Sparkles size={18} className="text-violet-400" aria-hidden="true" />
          <h3 className="!mb-0 text-base font-semibold text-[#e4e4f7]">
            Explainable AI Insights
          </h3>
        </div>

        {/* Insight lines */}
        <ul className="flex flex-col gap-3" aria-label="AI generated insights">
          {insights.map((line, i) => (
            <li
              key={i}
              className="
                flex items-start gap-3 text-sm text-[#8888aa] leading-relaxed
                opacity-0 animate-[slide-right_0.4s_ease-out_forwards]
              "
              style={{ animationDelay: `${0.4 + i * 0.07}s` }}
            >
              {/* Accent bullet */}
              <span
                className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0"
                aria-hidden="true"
              />
              {line}
            </li>
          ))}
        </ul>

        {/* Footer note */}
        <p className="mt-5 text-xs text-[#8888aa]/50 border-t border-white/5 pt-4">
          Insights are generated from your journal entries and simulation inputs.
          They are informational only and not a substitute for medical advice.
        </p>
      </div>

    </section>
  )
}
