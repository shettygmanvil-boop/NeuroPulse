/**
 * api.js — Central API Router
 *
 * Responsibility:
 *   Defines every public-facing REST endpoint and maps each one to
 *   the appropriate controller handler.  This file owns the URL
 *   structure; business logic lives exclusively in controllers.
 *
 * Mount point (set in server.js):
 *   app.use("/api/v1", apiRouter);
 */

import { Router } from "express";

// --- Controller imports -----------------------------------------------------
import {
  getHealthScores,
  computeHealthScore,
  getHealthTrends,
  compareHealthSnapshots,
  simulateLifestyleChanges,
} from "../controllers/analyticsController.js";

import {
  createEntry,
  getEntries,
  getEntrySentiment,
  analyzeEntry,
} from "../controllers/journalController.js";

// ---------------------------------------------------------------------------
// Router instance
// ---------------------------------------------------------------------------
const router = Router();

// --- Health-Score Analytics -------------------------------------------------
router.get("/analytics/scores/:userId", getHealthScores);
router.post("/analytics/scores", computeHealthScore);
router.get("/analytics/trends", getHealthTrends);
router.post("/analytics/compare", compareHealthSnapshots);

// --- Lifestyle Simulation ---------------------------------------------------
router.post("/simulate", simulateLifestyleChanges);

// --- Journal & Sentiment ----------------------------------------------------
router.post("/journal/entries", createEntry);
router.get("/journal/entries", getEntries);
router.get("/journal/entries/:entryId/sentiment", getEntrySentiment);
router.post("/journal/entries/analyze", analyzeEntry);

// --- Health Check (useful for load-balancer probes) -------------------------
router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
