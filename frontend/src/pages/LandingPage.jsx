import React from 'react'
import { Link } from 'react-router-dom'
import {
  Brain,
  Activity,
  Cpu,
  ArrowRight,
  BookOpen,
  Zap,
  Shield,
  ChevronRight,
} from 'lucide-react'

/**
 * LandingPage
 * ═══════════════════════════════════════════════════════════════════════════
 * High-conversion hero section for NeuroPulse.
 *
 * Layout:
 *   - Full-bleed dark gradient background with layered mesh glows
 *   - Hero: eyebrow badge → headline → subheadline → dual CTAs
 *   - Feature strip: three capability cards
 *   - Social-proof / trust bar at the bottom
 *
 * The component renders inside .np-main-full which already provides
 * overflow-y: auto. We use negative margins to break out of the parent
 * padding and achieve a true full-bleed feel.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Individual feature card shown in the lower strip. */
function FeatureCard({ icon, title, description, delay }) {
  return (
    <article
      className="
        relative overflow-hidden flex flex-col gap-4 p-6 rounded-2xl
        bg-white/[0.04] backdrop-blur-md border border-white/[0.08]
        transition-all duration-300
        hover:bg-white/[0.07] hover:border-white/[0.14]
        hover:shadow-[0_0_40px_rgba(124,92,252,0.12)]
        hover:-translate-y-1
        opacity-0 animate-[slide-up_0.6s_ease-out_forwards]
      "
      style={{ animationDelay: delay }}
    >
      {/* Corner glow */}
      <div
        className="pointer-events-none absolute -top-8 -right-8 w-28 h-28
                   rounded-full bg-violet-600/10 blur-2xl"
        aria-hidden="true"
      />

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center
                   bg-violet-500/15 border border-violet-500/25 text-violet-400"
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Text */}
      <div>
        <h3 className="!mb-1 text-base font-semibold text-[#e4e4f7]">{title}</h3>
        <p className="text-sm text-[#8888aa]/80 leading-relaxed !text-sm">{description}</p>
      </div>

      {/* Subtle arrow */}
      <ChevronRight
        size={14}
        className="text-violet-400/40 mt-auto self-end"
        aria-hidden="true"
      />
    </article>
  )
}

const FEATURES = [
  {
    icon: <Brain size={18} />,
    title: 'Emotion-Aware Analysis',
    description:
      'Real-time sentiment and burnout detection from your journal entries, powered by Gemini AI.',
    delay: '0.3s',
  },
  {
    icon: <Cpu size={18} />,
    title: 'AI Health Twin',
    description:
      'Simulate future wellness outcomes by adjusting lifestyle parameters in a live digital twin.',
    delay: '0.4s',
  },
  {
    icon: <Activity size={18} />,
    title: 'Predictive Scoring',
    description:
      'Deterministic mental and physical wellness scores updated instantly as your data changes.',
    delay: '0.5s',
  },
]

export default function LandingPage() {
  return (
    /*
     * Break out of the .np-main-full padding with negative margins so the
     * gradient mesh fills edge-to-edge, then re-apply padding inside.
     */
    <div
      className="
        relative -mx-[60px] -mt-[40px] min-h-[calc(100vh-64px)]
        flex flex-col
        bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900
        overflow-hidden
        max-[1024px]:-mx-[32px] max-[1024px]:-mt-[24px]
        max-[768px]:-mx-[20px] max-[768px]:-mt-[16px]
      "
      aria-label="NeuroPulse landing page"
    >

      {/* ── Gradient mesh blobs ─────────────────────────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none select-none">
        {/* Top-left violet blob */}
        <div
          className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full
                     bg-violet-700/20 blur-[120px]"
        />
        {/* Top-right indigo blob */}
        <div
          className="absolute -top-20 right-0 w-[400px] h-[400px] rounded-full
                     bg-indigo-600/15 blur-[100px]"
        />
        {/* Centre cyan accent */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                     w-[600px] h-[300px] rounded-full
                     bg-cyan-700/8 blur-[140px]"
        />
        {/* Bottom-right violet */}
        <div
          className="absolute bottom-0 right-0 w-[360px] h-[360px] rounded-full
                     bg-violet-800/15 blur-[100px]"
        />
      </div>

      {/* ── Subtle grid overlay ─────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(167,139,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Hero section ────────────────────────────────────────────────── */}
      <section
        className="relative z-10 flex flex-col items-center text-center
                   px-6 pt-24 pb-20 flex-1"
        aria-labelledby="hero-headline"
      >

        {/* Eyebrow badge */}
        <div
          className="
            inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full
            bg-violet-500/10 border border-violet-500/30 text-violet-300
            text-xs font-semibold tracking-widest uppercase
            shadow-[0_0_20px_rgba(124,92,252,0.2)]
            opacity-0 animate-[slide-up_0.5s_ease-out_forwards]
          "
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"
            aria-hidden="true"
          />
          Emotion-Aware AI Healthcare
        </div>

        {/* Main headline */}
        <h1
          id="hero-headline"
          className="
            !text-[clamp(2.4rem,6vw,4.5rem)] !font-extrabold !leading-[1.1]
            !mb-6 max-w-4xl
            opacity-0 animate-[slide-up_0.55s_ease-out_0.08s_forwards]
          "
        >
          Meet{' '}
          <span
            className="
              bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400
              bg-clip-text text-transparent
            "
          >
            NeuroPulse
          </span>
          <br />
          Your AI Health Companion
        </h1>

        {/* Subheadline */}
        <p
          className="
            max-w-2xl text-[clamp(1rem,2vw,1.2rem)] text-[#8888aa] leading-relaxed
            !mb-10
            opacity-0 animate-[slide-up_0.55s_ease-out_0.16s_forwards]
          "
        >
          An emotion-aware AI healthcare companion that reads your mental state,
          predicts wellness outcomes, and simulates your future health — all in real time.
        </p>

        {/* CTA buttons */}
        <div
          className="
            flex flex-wrap items-center justify-center gap-4
            opacity-0 animate-[slide-up_0.55s_ease-out_0.24s_forwards]
          "
        >
          {/* Primary CTA */}
          <Link
            to="/dashboard"
            className="
              group inline-flex items-center gap-2.5
              px-8 py-4 rounded-2xl text-sm font-semibold text-white
              bg-gradient-to-r from-violet-600 to-violet-500
              shadow-[0_0_28px_rgba(124,92,252,0.45)]
              transition-all duration-300
              hover:shadow-[0_0_48px_rgba(124,92,252,0.7)]
              hover:-translate-y-0.5
              active:translate-y-0
              focus:outline-none focus-visible:ring-2
              focus-visible:ring-violet-400 focus-visible:ring-offset-2
              focus-visible:ring-offset-slate-900
            "
            aria-label="Enter the NeuroPulse dashboard"
          >
            Enter Dashboard
            <ArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>

          {/* Secondary CTA */}
          <Link
            to="/journal"
            className="
              inline-flex items-center gap-2.5
              px-8 py-4 rounded-2xl text-sm font-semibold
              text-violet-300 border border-violet-500/35
              bg-violet-500/8 backdrop-blur-sm
              transition-all duration-300
              hover:bg-violet-500/15 hover:border-violet-500/60
              hover:shadow-[0_0_24px_rgba(124,92,252,0.2)]
              hover:-translate-y-0.5
              active:translate-y-0
              focus:outline-none focus-visible:ring-2
              focus-visible:ring-violet-400 focus-visible:ring-offset-2
              focus-visible:ring-offset-slate-900
            "
            aria-label="Open the wellness journal"
          >
            <BookOpen size={16} aria-hidden="true" />
            Start Journaling
          </Link>
        </div>

        {/* Trust indicators */}
        <div
          className="
            flex flex-wrap items-center justify-center gap-6 mt-12
            opacity-0 animate-[fade-in_0.6s_ease-out_0.4s_forwards]
          "
          aria-label="Platform highlights"
        >
          {[
            { icon: <Zap size={13} />,    text: 'Real-time AI analysis' },
            { icon: <Shield size={13} />, text: 'Privacy-first design'  },
            { icon: <Brain size={13} />,  text: 'Gemini-powered insights' },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-1.5 text-xs text-[#8888aa]/70 font-medium"
            >
              <span className="text-violet-400/70" aria-hidden="true">{icon}</span>
              {text}
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature cards strip ─────────────────────────────────────────── */}
      <section
        className="relative z-10 px-6 pb-16 max-w-5xl mx-auto w-full"
        aria-label="Platform features"
      >
        {/* Section label */}
        <p
          className="
            text-center text-xs font-semibold uppercase tracking-widest
            text-[#8888aa]/50 mb-8
            opacity-0 animate-[fade-in_0.5s_ease-out_0.28s_forwards]
          "
        >
          What NeuroPulse does
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

    </div>
  )
}
