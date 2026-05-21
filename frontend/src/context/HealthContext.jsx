import React, { createContext, useContext, useState, useCallback } from 'react'

/**
 * HealthContext
 * ═══════════════════════════════════════════════════════════════════════════
 * Global state management for NeuroPulse health metrics and analysis.
 *
 * API base URL is read from VITE_API_URL env variable so it works in both
 * local dev (proxied to localhost:3000) and production deployments.
 * Falls back to '/api' to use the Vite dev proxy when not set.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

const HealthContext = createContext(null)

export function HealthProvider({ children }) {
  // ─────────────────────────────────────────────────────────────────────────
  // Input Mode State
  // ─────────────────────────────────────────────────────────────────────────
  const [isSmartwatchMode, setIsSmartwatchMode] = useState(false)

  // ─────────────────────────────────────────────────────────────────────────
  // Wellness Scores
  // ─────────────────────────────────────────────────────────────────────────
  const [mentalScore, setMentalScore] = useState(0)
  const [physicalScore, setPhysicalScore] = useState(0)

  // ─────────────────────────────────────────────────────────────────────────
  // Journal Analysis Results
  // ─────────────────────────────────────────────────────────────────────────
  const [journalData, setJournalData] = useState({
    sentiment: null,
    stressScore: null,
    detectedEmotions: [],
    burnoutPrediction: null,
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Simulation Results
  // ─────────────────────────────────────────────────────────────────────────
  const [simulationResults, setSimulationResults] = useState({
    mentalWellnessScore: null,
    physicalWellnessScore: null,
    prognosis: null,
    prognosisError: null,
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Loading & Error States
  // ─────────────────────────────────────────────────────────────────────────
  const [isLoadingJournal, setIsLoadingJournal] = useState(false)
  const [journalError, setJournalError] = useState(null)

  const [isLoadingSimulation, setIsLoadingSimulation] = useState(false)
  const [simulationError, setSimulationError] = useState(null)

  // ─────────────────────────────────────────────────────────────────────────
  // Async Function: fetchJournalAnalysis
  // ─────────────────────────────────────────────────────────────────────────
  const fetchJournalAnalysis = useCallback(async (textInput) => {
    if (!textInput || typeof textInput !== 'string' || textInput.trim().length === 0) {
      setJournalError('Journal input cannot be empty.')
      return
    }

    setIsLoadingJournal(true)
    setJournalError(null)

    try {
      const response = await fetch(`${API_BASE}/v1/analyze-journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput.trim() }),
      })

      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`)
      }

      const data = await response.json()

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response format')
      }

      if (typeof data.mentalScore === 'number') setMentalScore(data.mentalScore)
      if (typeof data.physicalScore === 'number') setPhysicalScore(data.physicalScore)

      setJournalData({
        sentiment: data.sentiment ?? null,
        stressScore: data.stressScore ?? null,
        detectedEmotions: Array.isArray(data.detectedEmotions) ? data.detectedEmotions : [],
        burnoutPrediction: data.burnoutPrediction ?? null,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setJournalError(errorMessage)
      console.error('Journal analysis error:', errorMessage)
    } finally {
      setIsLoadingJournal(false)
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Async Function: fetchSimulation
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Sends lifestyle parameters to the backend simulation endpoint.
   * Updates simulationResults with predicted wellness scores and prognosis.
   *
   * @param {Object} params
   * @param {number}  params.sleepDuration       — hours per night (4–10)
   * @param {number}  params.stepsWalked         — daily step count (0–15000)
   * @param {boolean} params.smokingStatus       — true = active smoker
   * @param {string}  params.alcoholConsumption  — "None" | "Occasional" | "Heavy"
   * @param {number}  params.dailyCalorieIntake  — kcal per day (positive)
   */
  const fetchSimulation = useCallback(async (params) => {
    if (!params || typeof params !== 'object') {
      setSimulationError('Simulation parameters must be an object.')
      return
    }

    const { sleepDuration, stepsWalked, smokingStatus, alcoholConsumption, dailyCalorieIntake } = params

    // Client-side validation mirrors the backend rules
    const validAlcohol = ['None', 'Occasional', 'Heavy']
    if (
      typeof sleepDuration !== 'number' ||
      typeof stepsWalked !== 'number' ||
      typeof smokingStatus !== 'boolean' ||
      !validAlcohol.includes(alcoholConsumption) ||
      typeof dailyCalorieIntake !== 'number'
    ) {
      setSimulationError('Invalid simulation parameters.')
      return
    }

    setIsLoadingSimulation(true)
    setSimulationError(null)

    try {
      const response = await fetch(`${API_BASE}/v1/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sleepDuration, stepsWalked, smokingStatus, alcoholConsumption, dailyCalorieIntake }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body?.message ?? `Backend returned status ${response.status}`)
      }

      const json = await response.json()
      const data = json?.data ?? json

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response format')
      }

      setSimulationResults({
        mentalWellnessScore:   data.mentalWellnessScore   ?? null,
        physicalWellnessScore: data.physicalWellnessScore ?? null,
        prognosis:             data.prognosis             ?? null,
        prognosisError:        data.prognosisError        ?? null,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setSimulationError(errorMessage)
      console.error('Simulation error:', errorMessage)
    } finally {
      setIsLoadingSimulation(false)
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Context Value
  // ─────────────────────────────────────────────────────────────────────────
  const value = {
    isSmartwatchMode,
    setIsSmartwatchMode,
    mentalScore,
    setMentalScore,
    physicalScore,
    setPhysicalScore,
    journalData,
    setJournalData,
    simulationResults,
    setSimulationResults,
    isLoadingJournal,
    isLoadingSimulation,
    journalError,
    simulationError,
    fetchJournalAnalysis,
    fetchSimulation,
  }

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>
}

export function useHealth() {
  const ctx = useContext(HealthContext)
  if (!ctx) {
    throw new Error('useHealth() must be used within <HealthProvider>')
  }
  return ctx
}
