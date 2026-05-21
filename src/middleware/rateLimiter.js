/**
 * rateLimiter.js — In-Memory Rate Limiting Middleware
 *
 * Responsibility:
 *   Protects API endpoints from abuse by limiting the number of
 *   requests a single client can make within a sliding time window.
 *   Uses an in-memory store suitable for single-instance deployments.
 *
 * Note:
 *   For horizontally scaled deployments, replace the in-memory Map
 *   with a Redis-backed store (e.g. `rate-limit-redis`).
 *
 * Usage:
 *   import { rateLimiter } from "../middleware/rateLimiter.js";
 *   router.post("/journal/entries", rateLimiter({ maxRequests: 10 }), createEntry);
 */

import { RateLimitError } from "../utils/errors.js";

/**
 * Creates a rate-limiting middleware.
 *
 * @param {Object}  [options]
 * @param {number}  [options.windowMs=60000]   — Time window in milliseconds.
 * @param {number}  [options.maxRequests=30]    — Max requests per window per client.
 * @param {Function} [options.keyGenerator]     — Extracts a unique client key from the request.
 * @returns {Function} Express middleware.
 */
export function rateLimiter({
  windowMs = 60_000,
  maxRequests = 30,
  keyGenerator = (req) => req.ip || req.connection?.remoteAddress || "unknown",
} = {}) {
  /** @type {Map<string, { count: number, resetAt: number }>} */
  const store = new Map();

  // Periodic cleanup to prevent unbounded memory growth.
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, windowMs * 2);

  // Allow Node to exit cleanly even if the interval is still running.
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    const clientKey = keyGenerator(req);
    const now = Date.now();

    let entry = store.get(clientKey);

    // First request from this client, or window has expired.
    if (!entry || now >= entry.resetAt) {
      entry = { count: 1, resetAt: now + windowMs };
      store.set(clientKey, entry);
    } else {
      entry.count += 1;
    }

    // Set standard rate-limit headers for client visibility.
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    res.set("X-RateLimit-Limit", String(maxRequests));
    res.set("X-RateLimit-Remaining", String(remaining));
    res.set("X-RateLimit-Reset", String(resetSeconds));

    if (entry.count > maxRequests) {
      res.set("Retry-After", String(resetSeconds));
      return next(new RateLimitError(resetSeconds));
    }

    return next();
  };
}
