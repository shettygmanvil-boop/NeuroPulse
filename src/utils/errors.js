/**
 * errors.js — Custom Error Classes
 *
 * Responsibility:
 *   Provides a hierarchy of application-specific error classes so
 *   controllers and middleware can throw semantically meaningful
 *   errors that the global error handler maps to correct HTTP status
 *   codes automatically.
 *
 * Usage:
 *   import { ValidationError, NotFoundError } from "../utils/errors.js";
 *   throw new ValidationError("Email is required.");
 */

// ---------------------------------------------------------------------------
// Base application error — all custom errors extend this.
// ---------------------------------------------------------------------------
export class AppError extends Error {
  /**
   * @param {string}  message  — Human-readable error description.
   * @param {number}  status   — HTTP status code to surface to the client.
   * @param {string}  code     — Machine-readable error code for programmatic handling.
   * @param {Object}  [details] — Optional structured payload (field errors, etc.).
   */
  constructor(message, status = 500, code = "INTERNAL_ERROR", details = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    // Maintain proper stack trace in V8 environments.
    Error.captureStackTrace?.(this, this.constructor);
  }

  /** Serialise for JSON responses — keeps internals out of production payloads. */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

// ---------------------------------------------------------------------------
// 400 — Bad Request / Validation failures
// ---------------------------------------------------------------------------
export class ValidationError extends AppError {
  constructor(message = "Validation failed.", details = null) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

// ---------------------------------------------------------------------------
// 401 — Unauthenticated
// ---------------------------------------------------------------------------
export class AuthenticationError extends AppError {
  constructor(message = "Authentication required.") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

// ---------------------------------------------------------------------------
// 403 — Forbidden
// ---------------------------------------------------------------------------
export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions.") {
    super(message, 403, "FORBIDDEN");
  }
}

// ---------------------------------------------------------------------------
// 404 — Not Found
// ---------------------------------------------------------------------------
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found.`, 404, "NOT_FOUND");
  }
}

// ---------------------------------------------------------------------------
// 409 — Conflict (duplicate entries, version mismatches)
// ---------------------------------------------------------------------------
export class ConflictError extends AppError {
  constructor(message = "Resource conflict.") {
    super(message, 409, "CONFLICT");
  }
}

// ---------------------------------------------------------------------------
// 429 — Too Many Requests
// ---------------------------------------------------------------------------
export class RateLimitError extends AppError {
  constructor(retryAfterSeconds = 60) {
    super("Too many requests. Please try again later.", 429, "RATE_LIMITED", {
      retryAfterSeconds,
    });
  }
}

// ---------------------------------------------------------------------------
// 502 — Bad Gateway (upstream service failures, e.g. Gemini API down)
// ---------------------------------------------------------------------------
export class ExternalServiceError extends AppError {
  constructor(serviceName = "External service", originalMessage = "") {
    super(
      `${serviceName} is temporarily unavailable.`,
      502,
      "EXTERNAL_SERVICE_ERROR",
      originalMessage ? { upstream: originalMessage } : null
    );
  }
}
