/**
 * server.js — NeuroPulse Application Entry Point
 *
 * Responsibility:
 *   Bootstraps the Express application, registers global middleware
 *   (CORS, JSON body parsing, request logging, rate limiting),
 *   mounts the versioned API router, attaches the centralised error
 *   handler, and starts the HTTP server.
 *
 * Middleware execution order:
 *   1. Request logger   — captures timing for every request
 *   2. CORS             — cross-origin headers
 *   3. JSON parser      — body parsing with size limit
 *   4. Rate limiter     — abuse protection
 *   5. API routes       — business logic
 *   6. 404 catch-all    — undefined routes
 *   7. Error handler    — centralised error responses
 *
 * Usage:
 *   npm start          — production
 *   npm run dev        — development with auto-restart (Node ≥ 18.11)
 */

import express from "express";
import cors from "cors";

import apiRouter from "./routes/api.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

// ---------------------------------------------------------------------------
// Application instance
// ---------------------------------------------------------------------------
const app = express();

const isProduction = process.env.NODE_ENV === "production";

// ---------------------------------------------------------------------------
// 1. Request logging — must be first to capture full request lifecycle.
// ---------------------------------------------------------------------------
app.use(
  requestLogger({
    json: isProduction, // Structured JSON in prod, human-readable in dev.
  })
);

// ---------------------------------------------------------------------------
// 2. CORS — Cross-Origin Resource Sharing.
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: isProduction
      ? process.env.ALLOWED_ORIGINS?.split(",") || []
      : "*", // Wide-open for development.
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    credentials: true,
    maxAge: 86400, // Cache preflight for 24 hours.
  })
);

// ---------------------------------------------------------------------------
// 3. Body parsing — JSON with abuse-prevention size limit.
// ---------------------------------------------------------------------------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ---------------------------------------------------------------------------
// 4. Rate limiting — global baseline; routes can add stricter limits.
// ---------------------------------------------------------------------------
app.use(
  rateLimiter({
    windowMs: 60_000, // 1-minute sliding window.
    maxRequests: 60,  // 60 requests per minute per client.
  })
);

// ---------------------------------------------------------------------------
// 5. Routes
// ---------------------------------------------------------------------------

// All domain routes live behind the /api/v1 prefix for clean versioning.
app.use("/api/v1", apiRouter);

// Root-level service info — useful for monitoring dashboards.
app.get("/", (_req, res) => {
  res.status(200).json({
    service: "NeuroPulse API",
    version: "1.0.0",
    status: "operational",
    documentation: "/api/v1/health",
    environment: isProduction ? "production" : "development",
  });
});

// ---------------------------------------------------------------------------
// 6. 404 catch-all — must come AFTER all valid routes.
// ---------------------------------------------------------------------------
app.use(notFoundHandler);

// ---------------------------------------------------------------------------
// 7. Global error handler — must be the LAST middleware registered.
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Server start
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[NeuroPulse] ──────────────────────────────────────────────`);
  console.log(`[NeuroPulse]  Environment : ${isProduction ? "production" : "development"}`);
  console.log(`[NeuroPulse]  Server      : http://localhost:${PORT}`);
  console.log(`[NeuroPulse]  API base    : http://localhost:${PORT}/api/v1`);
  console.log(`[NeuroPulse]  Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`[NeuroPulse] ──────────────────────────────────────────────`);
});

export default app;
