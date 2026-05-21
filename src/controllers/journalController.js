/**
 * journalController.js — Voice / Text Journal & Sentiment Handlers
 *
 * Responsibility:
 *   Manages journal entries submitted as free-form text or transcribed
 *   voice input.  The core AI logic lives in `analyzeJournalInput`, which
 *   calls Gemini via the @google/genai SDK with a strict JSON response
 *   schema so the output is deterministic and machine-parseable.
 *
 * Environment:
 *   GEMINI_API_KEY — Google AI API key (required).
 *
 * Convention:
 *   Every Express handler follows the (req, res, next) signature.
 *   Business logic is extracted into pure async functions that can be
 *   unit-tested independently of Express.
 */

import { GoogleGenAI } from "@google/genai";

// ---------------------------------------------------------------------------
// Gemini client — singleton, initialised once at module load.
// ---------------------------------------------------------------------------
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn(
    "[NeuroPulse] WARNING: GEMINI_API_KEY is not set. " +
      "Journal sentiment analysis will fail at runtime."
  );
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Model identifier used for all journal analysis calls. */
const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * System instruction that primes the model as a clinical NLP analyst.
 * Kept separate so it can be versioned / A-B tested independently.
 */
const SYSTEM_INSTRUCTION = `
You are a clinical-grade mental health NLP analyst embedded in the NeuroPulse
healthcare platform. Your sole responsibility is to analyze a patient's
free-form journal entry — which may originate from typed text or a speech-to-
text transcription — and produce a structured psychological assessment.

Guidelines:
- Evaluate sentiment holistically: consider word choice, emotional tone,
  cognitive distortions, and narrative framing.
- Assign a stressScore from 0 (no stress) to 100 (extreme stress) that
  reflects both explicit stress indicators and implicit cues.
- Detect all distinct emotions present (e.g. "anxiety", "gratitude", "anger").
- Predict burnout risk using the three-tier scale: Low Risk, Moderate Risk,
  High Risk. Base this on cumulative stress signals, emotional exhaustion
  language, and depersonalisation markers.
- Provide a concise clinical explanation justifying the scores.
- NEVER fabricate data.  If the input is too short or ambiguous to assess
  reliably, still return the JSON but note the limitation in the explanation.
`.trim();

/**
 * JSON Schema enforced at the API level via `responseSchema`.
 * Gemini will structurally guarantee the response conforms to this shape,
 * eliminating the need for fragile regex or heuristic parsing.
 */
const ANALYSIS_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    sentiment: {
      type: "string",
      description: "Overall sentiment classification.",
      enum: ["Positive", "Negative", "Neutral"],
    },
    stressScore: {
      type: "number",
      description:
        "Numeric stress level from 0 (no stress) to 100 (extreme stress).",
    },
    detectedEmotions: {
      type: "array",
      description:
        "List of distinct emotions detected in the journal entry.",
      items: {
        type: "string",
      },
    },
    burnoutPrediction: {
      type: "string",
      description: "Burnout risk assessment.",
      enum: ["Low Risk", "Moderate Risk", "High Risk"],
    },
    explanation: {
      type: "string",
      description:
        "Clinical rationale explaining why these scores were assigned.",
    },
  },
  required: [
    "sentiment",
    "stressScore",
    "detectedEmotions",
    "burnoutPrediction",
    "explanation",
  ],
};

// ---------------------------------------------------------------------------
// Core AI Function
// ---------------------------------------------------------------------------

/**
 * Analyzes a journal entry using Gemini and returns a structured assessment.
 *
 * @param {string} text — The raw journal text (typed or transcribed).
 * @returns {Promise<Object>} Parsed analysis conforming to ANALYSIS_RESPONSE_SCHEMA.
 * @throws {Error} If the Gemini call fails or returns un-parseable output.
 */
export async function analyzeJournalInput(text) {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("analyzeJournalInput requires a non-empty string.");
  }

  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not configured. " +
        "Cannot perform journal analysis."
    );
  }

  // --- Call Gemini with structured output enforcement ----------------------
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `Analyze the following journal entry:\n\n"""${text.trim()}"""`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: ANALYSIS_RESPONSE_SCHEMA,
      // Deterministic output — low temperature reduces creative variance.
      temperature: 0.2,
    },
  });

  // --- Extract and validate the response text ------------------------------
  const rawText = response.text;

  if (!rawText) {
    throw new Error(
      "Gemini returned an empty response. The model may have been " +
        "blocked by safety filters or encountered an internal error."
    );
  }

  // Even with schema enforcement, defensive parsing protects against edge
  // cases such as network-level response corruption.
  let analysis;
  try {
    analysis = JSON.parse(rawText);
  } catch (parseError) {
    throw new Error(
      `Failed to parse Gemini response as JSON: ${parseError.message}. ` +
        `Raw output: ${rawText.substring(0, 500)}`
    );
  }

  // --- Runtime shape validation (belt-and-suspenders) ----------------------
  const requiredFields = [
    "sentiment",
    "stressScore",
    "detectedEmotions",
    "burnoutPrediction",
    "explanation",
  ];

  for (const field of requiredFields) {
    if (!(field in analysis)) {
      throw new Error(
        `Gemini response missing required field: "${field}". ` +
          `Received keys: [${Object.keys(analysis).join(", ")}]`
      );
    }
  }

  // Clamp stressScore to [0, 100] as an extra safety net.
  analysis.stressScore = Math.max(0, Math.min(100, Number(analysis.stressScore)));

  return analysis;
}

// ---------------------------------------------------------------------------
// Express Handlers (Middleware)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// POST /journal/entries
// Creates a new journal entry and runs real-time sentiment analysis.
// ---------------------------------------------------------------------------
export const createEntry = async (req, res, next) => {
  try {
    const { text, source } = req.body;

    // --- Input validation ---------------------------------------------------
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "'text' field is required and must be a non-empty string.",
      });
    }

    const validSources = ["text", "voice"];
    const normalizedSource = validSources.includes(source) ? source : "text";

    // --- AI analysis --------------------------------------------------------
    let analysis = null;
    let analysisError = null;

    try {
      analysis = await analyzeJournalInput(text);
    } catch (aiError) {
      // Log but do not block entry creation — the entry is still valuable
      // even if the AI analysis temporarily fails.
      console.error(
        `[NeuroPulse] AI analysis failed for journal entry: ${aiError.message}`
      );
      analysisError = aiError.message;
    }

    // --- Assemble response --------------------------------------------------
    const entry = {
      id: crypto.randomUUID(),
      text: text.trim(),
      source: normalizedSource,
      analysis,
      analysisError,
      createdAt: new Date().toISOString(),
    };

    // 201 Created — the entry was persisted (stub); analysis is best-effort.
    return res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /journal/entries
// Returns a paginated list of journal entries for the authenticated user.
// ---------------------------------------------------------------------------
export const getEntries = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    // TODO: Replace with a paginated Firestore query.
    const result = {
      entries: [],
      pagination: { page, limit, total: 0 },
    };

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /journal/entries/:entryId/sentiment
// Retrieves the sentiment-analysis result for a specific journal entry.
// ---------------------------------------------------------------------------
export const getEntrySentiment = async (req, res, next) => {
  try {
    const { entryId } = req.params;

    if (!entryId || typeof entryId !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid 'entryId' path parameter is required.",
      });
    }

    // TODO: Fetch the stored analysis from Firestore by entryId.
    const sentiment = {
      entryId,
      label: null,
      confidence: null,
      analyzedAt: null,
    };

    return res.status(200).json({
      success: true,
      data: sentiment,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /journal/entries/analyze   (standalone analysis endpoint)
// Accepts raw text and returns only the AI analysis — no persistence.
// Useful for real-time previews in the client before the user saves.
// ---------------------------------------------------------------------------
export const analyzeEntry = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "'text' field is required and must be a non-empty string.",
      });
    }

    const analysis = await analyzeJournalInput(text);

    return res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    // Distinguish AI-specific errors from unexpected server errors.
    if (error.message.includes("GEMINI_API_KEY") ||
        error.message.includes("Gemini")) {
      return res.status(502).json({
        success: false,
        message: "AI analysis service is temporarily unavailable.",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      });
    }
    next(error);
  }
};
