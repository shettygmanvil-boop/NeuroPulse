/**
 * analyticsController.js — Health-Score Analytics Handlers
 *
 * Responsibility:
 *   Accepts raw biometric / self-reported health metrics, forwards them
 *   to Gemini for AI-driven scoring, and returns structured health
 *   assessments.  Uses the same `responseSchema` enforcement pattern
 *   as the journal controller to guarantee predictable JSON output.
 *
 * Environment:
 *   GEMINI_API_KEY — Google AI API key (required).
 *
 * Convention:
 *   Every Express handler follows the (req, res, next) signature.
 *   Core AI logic is extracted into a standalone async function
 *   (`computeHealthMetrics`) for independent unit testing.
 */

import { GoogleGenAI } from "@google/genai";

// ---------------------------------------------------------------------------
// Gemini client — singleton, initialised once at module load.
// ---------------------------------------------------------------------------
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn(
    "[NeuroPulse] WARNING: GEMINI_API_KEY is not set. " +
      "Health-score analytics will fail at runtime."
  );
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Model identifier used for all analytics calls. */
const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * System instruction that primes the model as a biomedical analytics engine.
 * Kept separate for versioning / A-B testing.
 */
const SYSTEM_INSTRUCTION = `
You are a biomedical health-analytics engine embedded in the NeuroPulse
healthcare platform. You receive structured biometric and self-reported
health metrics from wearable devices and patient intake forms.

Your responsibilities:
- Compute a composite cognitiveScore (0–100) reflecting mental acuity,
  focus, and processing speed inferred from the supplied data.
- Compute a stressIndex (0–100) estimating physiological and psychological
  stress load.
- Compute a sleepQuality score (0–100) reflecting restorative sleep
  quality inferred from reported or measured sleep data.
- Compute an overallWellness score (0–100) as a weighted holistic summary.
- Assign a riskLevel from the set: Healthy, Mild Concern, Moderate Risk,
  High Risk, Critical.
- List actionable recommendations (1–5 items) personalised to the data.
- Provide a concise clinical summary explaining your assessment.

If a metric category is missing from the input, infer reasonable defaults
but clearly note the assumption in the summary. NEVER fabricate raw data —
only produce derived scores and insights.
`.trim();

/**
 * JSON Schema enforced at the API level via `responseSchema`.
 * Guarantees a deterministic, machine-parseable output shape.
 */
const HEALTH_SCORE_SCHEMA = {
  type: "object",
  properties: {
    cognitiveScore: {
      type: "number",
      description: "Mental acuity score from 0 (severe impairment) to 100 (peak performance).",
    },
    stressIndex: {
      type: "number",
      description: "Physiological + psychological stress level from 0 (calm) to 100 (extreme).",
    },
    sleepQuality: {
      type: "number",
      description: "Restorative sleep quality from 0 (severely disrupted) to 100 (optimal).",
    },
    overallWellness: {
      type: "number",
      description: "Holistic wellness score from 0 (critical) to 100 (excellent).",
    },
    riskLevel: {
      type: "string",
      description: "Tiered risk classification.",
      enum: ["Healthy", "Mild Concern", "Moderate Risk", "High Risk", "Critical"],
    },
    recommendations: {
      type: "array",
      description: "Actionable, personalised health recommendations (1–5 items).",
      items: {
        type: "string",
      },
    },
    summary: {
      type: "string",
      description: "Concise clinical summary justifying the scores and risk level.",
    },
  },
  required: [
    "cognitiveScore",
    "stressIndex",
    "sleepQuality",
    "overallWellness",
    "riskLevel",
    "recommendations",
    "summary",
  ],
};

/**
 * Allowed top-level metric categories.
 * Used for input validation to reject obviously malformed payloads.
 */
const VALID_METRIC_CATEGORIES = new Set([
  "heartRate",
  "bloodPressure",
  "sleepHours",
  "sleepStages",
  "steps",
  "activeMinutes",
  "hrv",
  "bodyTemperature",
  "oxygenSaturation",
  "mood",
  "energyLevel",
  "painLevel",
  "hydration",
  "screenTime",
  "caffeineIntake",
  "medicationAdherence",
]);

// ---------------------------------------------------------------------------
// Core AI Function
// ---------------------------------------------------------------------------

/**
 * Sends biometric/self-reported metrics to Gemini and returns a structured
 * health assessment.
 *
 * @param {Object} metrics — Key-value map of health data points.
 * @returns {Promise<Object>} Parsed assessment conforming to HEALTH_SCORE_SCHEMA.
 * @throws {Error} If the Gemini call fails or returns un-parseable output.
 */
export async function computeHealthMetrics(metrics) {
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    throw new Error("computeHealthMetrics requires a non-null metrics object.");
  }

  if (Object.keys(metrics).length === 0) {
    throw new Error("metrics object must contain at least one data point.");
  }

  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not configured. " +
        "Cannot perform health-score computation."
    );
  }

  // --- Build a human-readable representation of the metrics ----------------
  const metricsDescription = Object.entries(metrics)
    .map(([key, value]) => `  • ${key}: ${JSON.stringify(value)}`)
    .join("\n");

  const prompt =
    `Analyze the following health metrics and produce a comprehensive ` +
    `health assessment:\n\n${metricsDescription}`;

  // --- Call Gemini with structured output enforcement ----------------------
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: HEALTH_SCORE_SCHEMA,
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

  let assessment;
  try {
    assessment = JSON.parse(rawText);
  } catch (parseError) {
    throw new Error(
      `Failed to parse Gemini response as JSON: ${parseError.message}. ` +
        `Raw output: ${rawText.substring(0, 500)}`
    );
  }

  // --- Runtime shape validation (belt-and-suspenders) ----------------------
  const requiredFields = [
    "cognitiveScore",
    "stressIndex",
    "sleepQuality",
    "overallWellness",
    "riskLevel",
    "recommendations",
    "summary",
  ];

  for (const field of requiredFields) {
    if (!(field in assessment)) {
      throw new Error(
        `Gemini response missing required field: "${field}". ` +
          `Received keys: [${Object.keys(assessment).join(", ")}]`
      );
    }
  }

  // Clamp all numeric scores to [0, 100].
  for (const numericField of ["cognitiveScore", "stressIndex", "sleepQuality", "overallWellness"]) {
    assessment[numericField] = Math.max(0, Math.min(100, Number(assessment[numericField])));
  }

  // Ensure recommendations is always an array.
  if (!Array.isArray(assessment.recommendations)) {
    assessment.recommendations = [String(assessment.recommendations)];
  }

  return assessment;
}

// ---------------------------------------------------------------------------
// Express Handlers (Middleware)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// GET /analytics/scores/:userId
// Retrieves the latest computed health scores for a given user.
// ---------------------------------------------------------------------------
export const getHealthScores = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid 'userId' path parameter is required.",
      });
    }

    // TODO: Replace with a Firestore lookup of the user's latest assessment.
    const placeholder = {
      userId,
      cognitiveScore: null,
      stressIndex: null,
      sleepQuality: null,
      overallWellness: null,
      riskLevel: null,
      recommendations: [],
      summary: null,
      computedAt: null,
    };

    return res.status(200).json({
      success: true,
      data: placeholder,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /analytics/scores
// Accepts raw biometric data and runs AI-driven health-score computation.
// ---------------------------------------------------------------------------
export const computeHealthScore = async (req, res, next) => {
  try {
    const { metrics, userId } = req.body;

    // --- Input validation ---------------------------------------------------
    if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
      return res.status(400).json({
        success: false,
        message: "Request body must include a 'metrics' object.",
      });
    }

    if (Object.keys(metrics).length === 0) {
      return res.status(400).json({
        success: false,
        message: "'metrics' object must contain at least one data point.",
      });
    }

    // Warn about unrecognised metric keys (non-blocking).
    const unknownKeys = Object.keys(metrics).filter(
      (key) => !VALID_METRIC_CATEGORIES.has(key)
    );

    // --- AI computation -----------------------------------------------------
    let assessment = null;
    let computeError = null;

    try {
      assessment = await computeHealthMetrics(metrics);
    } catch (aiError) {
      console.error(
        `[NeuroPulse] AI health-score computation failed: ${aiError.message}`
      );
      computeError = aiError.message;
    }

    // --- Assemble response --------------------------------------------------
    const result = {
      id: crypto.randomUUID(),
      userId: userId || "anonymous",
      inputMetrics: Object.keys(metrics),
      unknownKeys: unknownKeys.length > 0 ? unknownKeys : undefined,
      assessment,
      computeError,
      computedAt: new Date().toISOString(),
    };

    // 201 if the assessment succeeded; 207 (Multi-Status) if partial failure.
    const statusCode = assessment ? 201 : 207;

    return res.status(statusCode).json({
      success: !!assessment,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /analytics/trends
// Returns historical trend data for charting on the client.
// ---------------------------------------------------------------------------
export const getHealthTrends = async (req, res, next) => {
  try {
    const validPeriods = ["24h", "7d", "30d", "90d", "1y"];
    const requestedPeriod = req.query.period || "7d";
    const period = validPeriods.includes(requestedPeriod) ? requestedPeriod : "7d";

    const validMetrics = ["cognitiveScore", "stressIndex", "sleepQuality", "overallWellness"];
    const requestedMetric = req.query.metric || "overallWellness";
    const metric = validMetrics.includes(requestedMetric) ? requestedMetric : "overallWellness";

    // TODO: Query time-series store for historical data points.
    const trends = {
      period,
      metric,
      dataPoints: [],
      aggregation: {
        min: null,
        max: null,
        average: null,
        trend: null, // "improving" | "declining" | "stable"
      },
    };

    return res.status(200).json({
      success: true,
      data: trends,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /analytics/compare
// Accepts two sets of metrics and returns a comparative AI analysis.
// Useful for showing progress between check-ins.
// ---------------------------------------------------------------------------
export const compareHealthSnapshots = async (req, res, next) => {
  try {
    const { baseline, current } = req.body;

    if (!baseline || typeof baseline !== "object" || Array.isArray(baseline)) {
      return res.status(400).json({
        success: false,
        message: "'baseline' must be a valid metrics object.",
      });
    }

    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return res.status(400).json({
        success: false,
        message: "'current' must be a valid metrics object.",
      });
    }

    // Run both assessments concurrently for faster response.
    const [baselineResult, currentResult] = await Promise.allSettled([
      computeHealthMetrics(baseline),
      computeHealthMetrics(current),
    ]);

    const comparison = {
      baseline: baselineResult.status === "fulfilled" ? baselineResult.value : null,
      current: currentResult.status === "fulfilled" ? currentResult.value : null,
      errors: {
        baseline: baselineResult.status === "rejected" ? baselineResult.reason.message : null,
        current: currentResult.status === "rejected" ? currentResult.reason.message : null,
      },
      comparedAt: new Date().toISOString(),
    };

    // Compute deltas if both assessments succeeded.
    if (comparison.baseline && comparison.current) {
      comparison.deltas = {
        cognitiveScore: comparison.current.cognitiveScore - comparison.baseline.cognitiveScore,
        stressIndex: comparison.current.stressIndex - comparison.baseline.stressIndex,
        sleepQuality: comparison.current.sleepQuality - comparison.baseline.sleepQuality,
        overallWellness: comparison.current.overallWellness - comparison.baseline.overallWellness,
      };
    }

    const allSucceeded = comparison.baseline && comparison.current;

    return res.status(allSucceeded ? 200 : 207).json({
      success: allSucceeded,
      data: comparison,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================================================================
//  LIFESTYLE SIMULATION ENGINE
// ===========================================================================

// ---------------------------------------------------------------------------
// Simulation — Constants & Lookup Tables
// ---------------------------------------------------------------------------

/**
 * Ideal / boundary values used by the deterministic scoring algorithm.
 * Sourced from WHO, AHA, and CDC lifestyle guidelines. Centralised here
 * so they can be tuned or A/B-tested without touching scoring logic.
 */
const LIFESTYLE_BOUNDS = {
  sleep: { ideal: 8, min: 4, max: 12 },           // hours per night
  steps: { ideal: 10_000, sedentary: 2_000 },      // daily step count
  calories: { idealMin: 1_800, idealMax: 2_400 },   // kcal per day
};

/**
 * Alcohol consumption impact multiplier.
 * Higher values penalise the score more aggressively.
 */
const ALCOHOL_IMPACT = Object.freeze({
  None: 0,
  Occasional: 0.10,
  Heavy: 0.30,
});

/**
 * Smoking penalty — a flat deduction applied to both scores.
 * Reflects the well-documented systemic harm of active tobacco use.
 */
const SMOKING_PENALTY = 20;

/**
 * Gemini response schema for the 2-sentence prognosis.
 * Enforced at the API level so the output shape is guaranteed.
 */
const PROGNOSIS_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    prognosis: {
      type: "string",
      description:
        "A futuristic, exactly 2-sentence clinical breakdown of long-term " +
        "health risks and prognosis based on the supplied lifestyle data " +
        "and computed wellness scores.",
    },
  },
  required: ["prognosis"],
};

/**
 * System instruction for the prognosis generation call.
 */
const PROGNOSIS_SYSTEM_INSTRUCTION = `
You are a futuristic predictive-health AI embedded in the NeuroPulse platform.
You receive a patient's lifestyle parameters alongside their deterministically
computed Mental Wellness Score and Physical Wellness Score (both 0–100).

Your task:
- Produce EXACTLY 2 sentences.
- Sentence 1: A vivid, forward-looking summary of the most significant
  long-term health risks implied by the data.
- Sentence 2: A concise, actionable prognosis stating what will improve
  or deteriorate if the current lifestyle continues unchanged.
- Use clinical but accessible language — avoid jargon a patient would not
  understand.
- Be specific: reference the actual scores and lifestyle factors provided.
- Do NOT pad with filler or disclaimers.
`.trim();

// ---------------------------------------------------------------------------
// Simulation — Deterministic Scoring Functions
// ---------------------------------------------------------------------------

/**
 * Computes a deterministic Mental Wellness Score (0–100).
 *
 * The algorithm weights:
 *   - Sleep quality     (40%) — deviation from ideal sleep hours
 *   - Physical activity (25%) — step count relative to target
 *   - Substance use     (35%) — smoking + alcohol combined penalty
 *
 * @param {Object} params — Validated lifestyle parameters.
 * @returns {number} Integer score clamped to [0, 100].
 */
function calculateMentalScore({ sleepDuration, stepsWalked, smokingStatus, alcoholConsumption }) {
  // --- Sleep component (0–40 points) ----------------------------------------
  // Perfect score at ideal hours; linear decay toward boundaries.
  const { ideal: sleepIdeal, min: sleepMin, max: sleepMax } = LIFESTYLE_BOUNDS.sleep;
  const clampedSleep = Math.max(sleepMin, Math.min(sleepMax, sleepDuration));
  const sleepDeviation = Math.abs(clampedSleep - sleepIdeal) / (sleepIdeal - sleepMin);
  const sleepComponent = 40 * Math.max(0, 1 - sleepDeviation);

  // --- Activity component (0–25 points) ------------------------------------
  // Linear ramp from sedentary threshold to ideal; capped at 25.
  const { ideal: stepsIdeal, sedentary } = LIFESTYLE_BOUNDS.steps;
  const clampedSteps = Math.max(0, Math.min(stepsIdeal * 1.5, stepsWalked));
  const stepsRatio = Math.min(1, (clampedSteps - sedentary) / (stepsIdeal - sedentary));
  const activityComponent = 25 * Math.max(0, stepsRatio);

  // --- Substance component (0–35 points) -----------------------------------
  // Start at full marks, then deduct for smoking and alcohol.
  let substanceComponent = 35;
  if (smokingStatus) substanceComponent -= SMOKING_PENALTY;
  const alcoholPenalty = (ALCOHOL_IMPACT[alcoholConsumption] || 0) * 35;
  substanceComponent -= alcoholPenalty;
  substanceComponent = Math.max(0, substanceComponent);

  return Math.round(Math.max(0, Math.min(100, sleepComponent + activityComponent + substanceComponent)));
}

/**
 * Computes a deterministic Physical Wellness Score (0–100).
 *
 * The algorithm weights:
 *   - Physical activity (35%) — step count relative to target
 *   - Nutrition         (30%) — calorie intake proximity to ideal range
 *   - Sleep recovery    (15%) — sleep hours contribution to physical repair
 *   - Substance load    (20%) — smoking + alcohol damage to cardiovascular
 *                                and metabolic systems
 *
 * @param {Object} params — Validated lifestyle parameters.
 * @returns {number} Integer score clamped to [0, 100].
 */
function calculatePhysicalScore({ sleepDuration, stepsWalked, smokingStatus, alcoholConsumption, dailyCalorieIntake }) {
  // --- Activity component (0–35 points) ------------------------------------
  const { ideal: stepsIdeal, sedentary } = LIFESTYLE_BOUNDS.steps;
  const clampedSteps = Math.max(0, Math.min(stepsIdeal * 1.5, stepsWalked));
  const stepsRatio = Math.min(1, (clampedSteps - sedentary) / (stepsIdeal - sedentary));
  const activityComponent = 35 * Math.max(0, stepsRatio);

  // --- Nutrition component (0–30 points) -----------------------------------
  // Full marks if within the ideal calorie window; linear decay outside it.
  const { idealMin, idealMax } = LIFESTYLE_BOUNDS.calories;
  let nutritionRatio;
  if (dailyCalorieIntake >= idealMin && dailyCalorieIntake <= idealMax) {
    nutritionRatio = 1;
  } else if (dailyCalorieIntake < idealMin) {
    nutritionRatio = Math.max(0, dailyCalorieIntake / idealMin);
  } else {
    // Over-consumption: decay as calories exceed the upper bound.
    const excess = dailyCalorieIntake - idealMax;
    nutritionRatio = Math.max(0, 1 - excess / idealMax);
  }
  const nutritionComponent = 30 * nutritionRatio;

  // --- Sleep recovery component (0–15 points) ------------------------------
  const { ideal: sleepIdeal, min: sleepMin, max: sleepMax } = LIFESTYLE_BOUNDS.sleep;
  const clampedSleep = Math.max(sleepMin, Math.min(sleepMax, sleepDuration));
  const sleepRatio = Math.max(0, 1 - Math.abs(clampedSleep - sleepIdeal) / (sleepIdeal - sleepMin));
  const sleepComponent = 15 * sleepRatio;

  // --- Substance component (0–20 points) -----------------------------------
  let substanceComponent = 20;
  if (smokingStatus) substanceComponent -= (SMOKING_PENALTY / 35) * 20; // proportional deduction
  const alcoholPenalty = (ALCOHOL_IMPACT[alcoholConsumption] || 0) * 20;
  substanceComponent -= alcoholPenalty;
  substanceComponent = Math.max(0, substanceComponent);

  return Math.round(Math.max(0, Math.min(100, activityComponent + nutritionComponent + sleepComponent + substanceComponent)));
}

// ---------------------------------------------------------------------------
// Simulation — AI Prognosis
// ---------------------------------------------------------------------------

/**
 * Calls Gemini to generate a 2-sentence futuristic health prognosis based
 * on the lifestyle parameters and deterministically computed scores.
 *
 * @param {Object} lifestyleData — The validated lifestyle input.
 * @param {number} mentalScore   — Computed Mental Wellness Score.
 * @param {number} physicalScore — Computed Physical Wellness Score.
 * @returns {Promise<string>} The 2-sentence prognosis text.
 * @throws {Error} If the Gemini call fails or returns invalid output.
 */
async function generatePrognosis(lifestyleData, mentalScore, physicalScore) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not configured. " +
        "Cannot generate lifestyle prognosis."
    );
  }

  const prompt = [
    "Based on the following lifestyle snapshot and computed wellness scores,",
    "provide a futuristic 2-sentence health risk and prognosis breakdown.\n",
    "Lifestyle Parameters:",
    `  • Sleep Duration:        ${lifestyleData.sleepDuration} hours/night`,
    `  • Steps Walked:          ${lifestyleData.stepsWalked.toLocaleString()} steps/day`,
    `  • Smoking Status:        ${lifestyleData.smokingStatus ? "Active Smoker" : "Non-Smoker"}`,
    `  • Alcohol Consumption:   ${lifestyleData.alcoholConsumption}`,
    `  • Daily Calorie Intake:  ${lifestyleData.dailyCalorieIntake.toLocaleString()} kcal\n`,
    "Computed Scores:",
    `  • Mental Wellness Score:   ${mentalScore}/100`,
    `  • Physical Wellness Score: ${physicalScore}/100`,
  ].join("\n");

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: PROGNOSIS_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: PROGNOSIS_RESPONSE_SCHEMA,
      temperature: 0.4, // Slightly creative for engaging language.
    },
  });

  const rawText = response.text;

  if (!rawText) {
    throw new Error(
      "Gemini returned an empty prognosis response. The model may have " +
        "been blocked by safety filters or encountered an internal error."
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (parseError) {
    throw new Error(
      `Failed to parse Gemini prognosis as JSON: ${parseError.message}. ` +
        `Raw output: ${rawText.substring(0, 500)}`
    );
  }

  if (!parsed.prognosis || typeof parsed.prognosis !== "string") {
    throw new Error(
      "Gemini prognosis response missing required 'prognosis' string field."
    );
  }

  return parsed.prognosis;
}

// ---------------------------------------------------------------------------
// Simulation — Express Handler
// ---------------------------------------------------------------------------

/**
 * POST /simulate
 *
 * Accepts lifestyle parameters, computes deterministic wellness scores,
 * and enriches the response with a Gemini-generated health prognosis.
 *
 * Request body:
 *   {
 *     "sleepDuration":       number  (hours, 0–24),
 *     "stepsWalked":         number  (non-negative integer),
 *     "smokingStatus":       boolean,
 *     "alcoholConsumption":  string  ("None" | "Occasional" | "Heavy"),
 *     "dailyCalorieIntake":  number  (positive, kcal)
 *   }
 *
 * Response:
 *   {
 *     "success": true,
 *     "data": {
 *       "input": { ... },
 *       "mentalWellnessScore": number,
 *       "physicalWellnessScore": number,
 *       "prognosis": string | null,
 *       "prognosisError": string | null,
 *       "simulatedAt": string (ISO 8601)
 *     }
 *   }
 */
export const simulateLifestyleChanges = async (req, res, next) => {
  try {
    const {
      sleepDuration,
      stepsWalked,
      smokingStatus,
      alcoholConsumption,
      dailyCalorieIntake,
    } = req.body;

    // -----------------------------------------------------------------------
    // Input validation — fail fast with descriptive messages.
    // -----------------------------------------------------------------------
    const errors = [];

    // sleepDuration: required, number, 0–24
    if (sleepDuration === undefined || sleepDuration === null) {
      errors.push("'sleepDuration' (number, 0–24 hours) is required.");
    } else if (typeof sleepDuration !== "number" || !Number.isFinite(sleepDuration)) {
      errors.push("'sleepDuration' must be a finite number.");
    } else if (sleepDuration < 0 || sleepDuration > 24) {
      errors.push("'sleepDuration' must be between 0 and 24 hours.");
    }

    // stepsWalked: required, non-negative integer
    if (stepsWalked === undefined || stepsWalked === null) {
      errors.push("'stepsWalked' (non-negative integer) is required.");
    } else if (typeof stepsWalked !== "number" || !Number.isFinite(stepsWalked)) {
      errors.push("'stepsWalked' must be a finite number.");
    } else if (stepsWalked < 0) {
      errors.push("'stepsWalked' must be non-negative.");
    }

    // smokingStatus: required, boolean
    if (smokingStatus === undefined || smokingStatus === null) {
      errors.push("'smokingStatus' (boolean) is required.");
    } else if (typeof smokingStatus !== "boolean") {
      errors.push("'smokingStatus' must be a boolean (true/false).");
    }

    // alcoholConsumption: required, enum
    const validAlcoholLevels = ["None", "Occasional", "Heavy"];
    if (!alcoholConsumption) {
      errors.push(`'alcoholConsumption' is required. Must be one of: ${validAlcoholLevels.join(", ")}.`);
    } else if (!validAlcoholLevels.includes(alcoholConsumption)) {
      errors.push(
        `'alcoholConsumption' must be one of: ${validAlcoholLevels.join(", ")}. ` +
          `Received: "${alcoholConsumption}".`
      );
    }

    // dailyCalorieIntake: required, positive number
    if (dailyCalorieIntake === undefined || dailyCalorieIntake === null) {
      errors.push("'dailyCalorieIntake' (positive number, kcal) is required.");
    } else if (typeof dailyCalorieIntake !== "number" || !Number.isFinite(dailyCalorieIntake)) {
      errors.push("'dailyCalorieIntake' must be a finite number.");
    } else if (dailyCalorieIntake <= 0) {
      errors.push("'dailyCalorieIntake' must be a positive number.");
    }

    // Return all validation errors at once for better DX.
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed. See 'errors' array for details.",
        errors,
      });
    }

    // -----------------------------------------------------------------------
    // Deterministic score computation
    // -----------------------------------------------------------------------
    const lifestyleData = {
      sleepDuration,
      stepsWalked: Math.round(stepsWalked),
      smokingStatus,
      alcoholConsumption,
      dailyCalorieIntake: Math.round(dailyCalorieIntake),
    };

    const mentalWellnessScore = calculateMentalScore(lifestyleData);
    const physicalWellnessScore = calculatePhysicalScore(lifestyleData);

    // -----------------------------------------------------------------------
    // AI-generated prognosis (best-effort — never blocks the response)
    // -----------------------------------------------------------------------
    let prognosis = null;
    let prognosisError = null;

    try {
      prognosis = await generatePrognosis(lifestyleData, mentalWellnessScore, physicalWellnessScore);
    } catch (aiError) {
      console.error(
        `[NeuroPulse] Prognosis generation failed: ${aiError.message}`
      );
      prognosisError = aiError.message;
    }

    // -----------------------------------------------------------------------
    // Response assembly
    // -----------------------------------------------------------------------
    const result = {
      input: lifestyleData,
      mentalWellnessScore,
      physicalWellnessScore,
      prognosis,
      prognosisError,
      simulatedAt: new Date().toISOString(),
    };

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
