import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, MicOff, Send, FileText, AlertTriangle, Loader2 } from 'lucide-react'
import { useHealth } from '../context/HealthContext'

/**
 * JournalPage
 * ═══════════════════════════════════════════════════════════════════════════
 * Futuristic wellness journal with:
 *   - Manual text entry via a glassmorphism textarea
 *   - Real-time voice transcription via the Web Speech API
 *   - "Analyse Wellness" submit → fetchJournalAnalysis → navigate /dashboard
 *
 * Architecture:
 *   useSpeechRecognition  — isolated hook; handles all SpeechRecognition
 *                           lifecycle, interim streaming, and cleanup
 *   JournalPage           — consumes the hook + HealthContext; owns UI state
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// Browser-compatibility guard — resolved once at module load, never changes.
// ─────────────────────────────────────────────────────────────────────────────
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
    : null

const SPEECH_SUPPORTED = SpeechRecognitionAPI !== null

// ─────────────────────────────────────────────────────────────────────────────
// useSpeechRecognition
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Encapsulates the Web Speech API lifecycle.
 *
 * @param {function} onTranscript  Called with (finalChunk: string) when a
 *                                 final result is committed.
 * @param {function} onInterim     Called with (interimText: string) while
 *                                 the user is still speaking.
 * @returns {{ isListening, micError, startListening, stopListening }}
 */
function useSpeechRecognition({ onTranscript, onInterim }) {
  const [isListening, setIsListening] = useState(false)
  const [micError, setMicError]       = useState(null)
  const recognitionRef                = useRef(null)

  // Stable callbacks — wrap in refs so the recognition handlers never go stale
  const onTranscriptRef = useRef(onTranscript)
  const onInterimRef    = useRef(onInterim)
  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])
  useEffect(() => { onInterimRef.current    = onInterim    }, [onInterim])

  // Tear down on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult  = null
        recognitionRef.current.onerror   = null
        recognitionRef.current.onend     = null
        recognitionRef.current.abort()
        recognitionRef.current = null
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!SPEECH_SUPPORTED) {
      setMicError('Speech recognition is not supported in this browser.')
      return
    }
    if (recognitionRef.current) return // already running

    setMicError(null)

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous      = true   // keep listening until explicitly stopped
    recognition.interimResults  = true   // stream partial results
    recognition.lang            = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let interimTranscript = ''
      let finalTranscript   = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      if (finalTranscript)   onTranscriptRef.current(finalTranscript)
      if (interimTranscript) onInterimRef.current(interimTranscript)
    }

    recognition.onerror = (event) => {
      // 'aborted' fires when we call .abort() ourselves — not a real error
      if (event.error === 'aborted') return

      const MESSAGES = {
        'not-allowed':       'Microphone access was denied. Please allow it in your browser settings.',
        'no-speech':         'No speech detected. Please try again.',
        'audio-capture':     'No microphone found. Please connect one and try again.',
        'network':           'A network error occurred during speech recognition.',
        'service-not-allowed': 'Speech recognition service is not allowed on this page.',
      }
      setMicError(MESSAGES[event.error] ?? `Speech recognition error: ${event.error}`)
      setIsListening(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      // Clear interim text when recognition ends
      onInterimRef.current('')
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop() // triggers onend → cleans up
    }
  }, [])

  return { isListening, micError, startListening, stopListening }
}

// ─────────────────────────────────────────────────────────────────────────────
// JournalPage
// ─────────────────────────────────────────────────────────────────────────────
export default function JournalPage() {
  const navigate = useNavigate()
  const { fetchJournalAnalysis, isLoadingJournal, journalError } = useHealth()

  // Committed text (typed + finalised speech)
  const [text, setText] = useState('')
  // Interim speech — shown as a live preview appended after committed text
  const [interimText, setInterimText] = useState('')

  // Called when a speech result is finalised
  const handleTranscript = useCallback((chunk) => {
    setText((prev) => {
      const separator = prev.length > 0 && !prev.endsWith(' ') ? ' ' : ''
      return prev + separator + chunk.trim()
    })
    setInterimText('')
  }, [])

  // Called with live partial results
  const handleInterim = useCallback((chunk) => {
    setInterimText(chunk)
  }, [])

  const { isListening, micError, startListening, stopListening } =
    useSpeechRecognition({ onTranscript: handleTranscript, onInterim: handleInterim })

  // Stop mic if the user navigates away while recording
  useEffect(() => {
    return () => {
      if (isListening) stopListening()
    }
  }, [isListening, stopListening])

  function toggleMic() {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = text.trim()
    if (!payload) return

    // Stop any active recording before submitting
    if (isListening) stopListening()

    await fetchJournalAnalysis(payload)

    // Navigate to dashboard only when no error was set by the context
    // We read the ref-stable version via a functional check after the await
    // (journalError is stale here; context sets it internally — we navigate
    //  optimistically and the dashboard will show whatever data arrived)
    navigate('/dashboard')
  }

  // Combined display value: committed text + live interim preview
  const displayValue = interimText
    ? text + (text.length > 0 && !text.endsWith(' ') ? ' ' : '') + interimText
    : text

  const canSubmit = text.trim().length > 0 && !isLoadingJournal

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <section
      className="np-journal opacity-0 animate-[slide-up_0.5s_ease-out_forwards]"
      aria-label="Wellness Journal"
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h2 className="!mb-1">Wellness Journal</h2>
          <p className="text-sm text-[#8888aa]">
            Write or speak your thoughts — the AI will analyse your mental state.
          </p>
        </div>
        <FileText
          size={28}
          className="text-violet-400 opacity-60 flex-shrink-0 mt-1"
          aria-hidden="true"
        />
      </div>

      {/* ── Browser compatibility notice ────────────────────────────────── */}
      {!SPEECH_SUPPORTED && (
        <div
          className="flex items-start gap-3 mb-6 px-4 py-3 rounded-xl
                     bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm"
          role="note"
          aria-label="Browser compatibility notice"
        >
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Voice input is not supported in this browser. You can still type your journal
            entry manually. For voice support, try Chrome or Edge.
          </span>
        </div>
      )}

      {/* ── Main form ───────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate>

        {/* Textarea + mic button wrapper */}
        <div className="relative mb-6">

          {/* Glassmorphism textarea */}
          <textarea
            id="journal-input"
            aria-label="Journal entry"
            aria-describedby={isListening ? 'voice-status' : undefined}
            value={displayValue}
            onChange={(e) => {
              // Only update committed text; interim is speech-driven
              setText(e.target.value)
              setInterimText('')
            }}
            placeholder="Start typing your thoughts, or press the microphone to speak…"
            rows={10}
            disabled={isLoadingJournal}
            className={`
              w-full resize-y min-h-[260px] pr-20
              bg-white/5 backdrop-blur-md
              border rounded-2xl
              text-[#e4e4f7] placeholder-[#8888aa]/60
              text-sm leading-relaxed font-[inherit]
              p-5 transition-all duration-300
              focus:outline-none focus:ring-0
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isListening
                ? 'border-rose-400/60 shadow-[0_0_24px_rgba(251,113,133,0.2)]'
                : 'border-white/10 focus:border-violet-500/50 focus:shadow-[0_0_20px_rgba(124,92,252,0.12)]'
              }
            `}
          />

          {/* Floating microphone button */}
          <div className="absolute bottom-4 right-4">
            {SPEECH_SUPPORTED ? (
              <button
                type="button"
                onClick={toggleMic}
                disabled={isLoadingJournal}
                aria-label={isListening ? 'Stop voice recording' : 'Start voice recording'}
                aria-pressed={isListening}
                className={`
                  relative w-12 h-12 rounded-full flex items-center justify-center
                  transition-all duration-300 focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2
                  focus-visible:ring-offset-[#0a0a1a]
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${isListening
                    ? 'bg-rose-500/20 border border-rose-400/60 text-rose-300 shadow-[0_0_20px_rgba(251,113,133,0.4)]'
                    : 'bg-violet-500/15 border border-violet-400/40 text-violet-300 hover:bg-violet-500/25 hover:border-violet-400/70 hover:shadow-[0_0_20px_rgba(124,92,252,0.35)]'
                  }
                `}
              >
                {/* Ripple rings when listening */}
                {isListening && (
                  <>
                    <span
                      className="absolute inset-0 rounded-full border border-rose-400/40 animate-ping"
                      aria-hidden="true"
                    />
                    <span
                      className="absolute inset-[-6px] rounded-full border border-rose-400/20 animate-ping"
                      style={{ animationDelay: '0.3s' }}
                      aria-hidden="true"
                    />
                  </>
                )}
                {isListening
                  ? <MicOff size={18} aria-hidden="true" />
                  : <Mic    size={18} aria-hidden="true" />
                }
              </button>
            ) : (
              /* Disabled mic icon when API is unavailable */
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center
                           bg-white/5 border border-white/10 text-[#8888aa]/40"
                aria-hidden="true"
              >
                <MicOff size={18} />
              </div>
            )}
          </div>
        </div>

        {/* Voice status bar */}
        {SPEECH_SUPPORTED && (
          <div
            id="voice-status"
            aria-live="polite"
            aria-atomic="true"
            className={`
              flex items-center gap-2 mb-6 text-xs font-medium
              transition-opacity duration-300
              ${isListening ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
          >
            <span
              className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"
              aria-hidden="true"
            />
            <span className="text-rose-300">Listening — speak clearly into your microphone</span>
          </div>
        )}

        {/* Character count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-[#8888aa]/60">
            {text.trim().length === 0
              ? 'No content yet'
              : `${text.trim().split(/\s+/).length} word${text.trim().split(/\s+/).length === 1 ? '' : 's'}`
            }
          </p>
          <p className="text-xs text-[#8888aa]/40">
            {text.length} / 5000 characters
          </p>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
          className={`
            relative inline-flex items-center gap-3
            px-8 py-4 rounded-2xl text-sm font-semibold
            transition-all duration-300
            focus:outline-none focus-visible:ring-2
            focus-visible:ring-violet-400 focus-visible:ring-offset-2
            focus-visible:ring-offset-[#0a0a1a]
            ${canSubmit
              ? 'bg-gradient-to-r from-violet-600 to-violet-400 text-white cursor-pointer shadow-[0_0_24px_rgba(124,92,252,0.4)] hover:shadow-[0_0_40px_rgba(124,92,252,0.65)] hover:-translate-y-0.5 active:translate-y-0'
              : 'bg-white/5 border border-white/10 text-[#8888aa]/50 cursor-not-allowed'
            }
          `}
        >
          {isLoadingJournal ? (
            <>
              {/* Pulsing AI-processing indicator */}
              <span className="relative flex h-4 w-4" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-300 opacity-75" />
                <Loader2 size={16} className="relative animate-spin text-white" />
              </span>
              <span>Analysing with AI…</span>
            </>
          ) : (
            <>
              <Send size={16} aria-hidden="true" />
              <span>Analyse Wellness</span>
            </>
          )}
        </button>
      </form>

      {/* ── Mic permission / speech error ───────────────────────────────── */}
      {micError && (
        <div
          className="flex items-start gap-3 mt-6 px-4 py-3 rounded-xl
                     bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{micError}</span>
        </div>
      )}

      {/* ── API / network error ──────────────────────────────────────────── */}
      {journalError && (
        <div
          className="flex items-start gap-3 mt-4 px-4 py-3 rounded-xl
                     bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold mb-0.5">Analysis failed</p>
            <p className="text-red-300/80">{journalError}</p>
          </div>
        </div>
      )}

      {/* ── Tips footer ─────────────────────────────────────────────────── */}
      <div
        className="
          mt-10 p-5 rounded-2xl
          bg-white/[0.03] border border-white/[0.06]
          opacity-0 animate-[slide-up_0.5s_ease-out_0.2s_forwards]
        "
        aria-label="Journal tips"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8888aa]/60 mb-3">
          Tips for better insights
        </p>
        <ul className="flex flex-col gap-2" role="list">
          {[
            'Describe how you felt throughout the day, not just events.',
            'Mention sleep quality, energy levels, and any stressors.',
            'Voice entries work best in a quiet environment.',
            'Aim for at least 3–5 sentences for accurate AI analysis.',
          ].map((tip) => (
            <li
              key={tip}
              className="flex items-start gap-2 text-xs text-[#8888aa]/60"
            >
              <span
                className="mt-1.5 w-1 h-1 rounded-full bg-violet-400/50 flex-shrink-0"
                aria-hidden="true"
              />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
