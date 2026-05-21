/**
 * errorHandler.js — Global Error Handling Middleware
 *
 * Responsibility:
 *   Catches all errors that bubble up from controllers and middleware,
 *   maps them to appropriate HTTP responses, and logs them for
 *   operational visibility.  Recognises custom AppError subclasses
 *   for precise status codes and hides internal details in production.
 *
 * Mount order:
 *   Must be the LAST middleware registered (after all routes).
 */

import { AppError } from "../utils/errors.js";

/**
 * Express 4-argument error-handling middleware.
 * Express recognises the 4-arg signature as an error handler.
 *
 * @param {Error} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  // --- Determine if this is a known application error ----------------------
  const isOperational = err instanceof AppError;
  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === "production";

  // --- Logging -------------------------------------------------------------
  if (status >= 500) {
    // Server errors always get full stack traces for debugging.
    console.error(`[NeuroPulse] CRITICAL (${status}):`, err);
  } else if (!isProduction) {
    // Client errors logged at info level in non-production environments.
    console.warn(`[NeuroPulse] Client error (${status}): ${err.message}`);
  }

  // --- Build response payload ----------------------------------------------
  if (isOperational) {
    // AppError subclasses know how to serialise themselves.
    return res.status(status).json(err.toJSON());
  }

  // Unknown / unexpected errors — never leak internals in production.
  return res.status(status).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: isProduction
        ? "An unexpected error occurred. Please try again later."
        : err.message,
      ...(isProduction ? {} : { stack: err.stack }),
    },
  });
}

/**
 * Catch-all middleware for undefined routes.
 * Mount AFTER all valid routes but BEFORE the error handler.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
}
