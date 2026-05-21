import React, { createContext, useContext, useState, useCallback } from 'react'

/**
 * HealthContext
 * ═══════════════════════════════════════════════════════════════════════════
 * Global state management for NeuroPulse health metrics and analysis.
 *
 * Manages:
 * - Input mode selection (smartwatch vs manual entry)
 * - Wellness scores (mental & physical)
 * - Journal analysis results (sentiment, emotions, burnout prediction)
 * - AI simulation results from slider inputs
 * - Async API communication with loading/error states
 *
 * Architecture:
 * - Centralized context provider wrapping the app
 * - useHealth() hook for component consumption
 * - Async functions with robust error handling and validation
 * ═══════════════════════════════════════════════════════════════════════════
 */

const HealthContext = createContext(null)

/**
 * HealthProvider Component
 * Initializes global state and provides async API methods.
 */
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
    predictedMentalScore: null,
    predictedPhysicalScore: null,
    recommendations: [],
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
  /**
   * Sends journal text to backend for analysis.
   * Updates mentalScore, physicalScore, and journalData with API response.
   *
   * @param {string} textInput - User journal text to analyze
   * @returns {Promise<void>}
   * @throws Sets journalError state if request fails
   */
  const fetchJournalAnalysis = useCallback(async (textInput) => {
    // Validation
    if (!textInput || typeof textInput !== 'string' || textInput.trim().length === 0) {
      setJournalError('Journal input cannot be empty.')
      return
    }

    setIsLoadingJournal(true)
    setJournalError(null)

    try {
      const response = await fetch('http://localhost:3000/api/v1/analyze-journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textInput.trim() }),
      })

      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`)
      }

      const data = await response.json()

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response format')
      }

      // Update state with API response
      if (typeof data.mentalScore === 'number') {
        setMentalScore(data.mentalScore)
      }
      if (typeof data.physicalScore === 'number') {
        setPhysicalScore(data.physicalScore)
      }

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
   * Sends slider values to backend for AI simulation.
   * Updates simulationResults with predicted health outcomes.
   *
   * @param {Object} sliderValues - Object with cognitive, sleep, stress properties (0-100)
   * @returns {Promise<void>}
   * @throws Sets simulationError state if request fails
   */
  const fetchSimulation = useCallback(async (sliderValues) => {
    // Validation
    if (!sliderValues || typeof sliderValues !== 'object') {
      setSimulationError('Slider values must be an object.')
      return
    }

    const { cognitive, sleep, stress } = sliderValues
    if (
      typeof cognitive !== 'number' ||
      typeof sleep !== 'number' ||
      typeof stress !== 'number'
    ) {
      setSimulationError('All slider values must be numbers.')
      return
    }

    // Range validation (0-100)
    if (cognitive < 0 || cognitive > 100 || sleep < 0 || sleep > 100 || stress < 0 || stress > 100) {
      setSimulationError('Slider values must be between 0 and 100.')
      return
    }

    setIsLoadingSimulation(true)
    setSimulationError(null)

    try {
      const response = await fetch('http://localhost:3000/api/v1/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cognitive, sleep, stress }),
      })

      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`)
      }

      const data = await response.json()

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response format')
      }

      setSimulationResults({
        predictedMentalScore: data.predictedMentalScore ?? null,
        predictedPhysicalScore: data.predictedPhysicalScore ?? null,
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
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
    // Input mode
    isSmartwatchMode,
    setIsSmartwatchMode,

    // Wellness scores
    mentalScore,
    setMentalScore,
    physicalScore,
    setPhysicalScore,

    // Journal data
    journalData,
    setJournalData,

    // Simulation results
    simulationResults,
    setSimulationResults,

    // Loading states
    isLoadingJournal,
    isLoadingSimulation,

    // Error states
    journalError,
    simulationError,

    // Async functions
    fetchJournalAnalysis,
    fetchSimulation,
  }

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>
}

/**
 * useHealth Hook
 * Accesses HealthContext from any component.
 * Throws if used outside HealthProvider.
 *
 * @returns {Object} Health context object with state and methods
 * @throws Error if not within HealthProvider
 */
export function useHealth() {
  const ctx = useContext(HealthContext)
  if (!ctx) {
    throw new Error('useHealth() must be used within <HealthProvider>')
  }
  return ctx
}
