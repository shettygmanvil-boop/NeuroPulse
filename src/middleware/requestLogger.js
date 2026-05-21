/**
 * requestLogger.js — HTTP Request Logging Middleware
 *
 * Responsibility:
 *   Logs every incoming request with method, path, status code, and
 *   response time.  Designed for structured (JSON) logging so log
 *   aggregation services (Cloud Logging, Datadog, ELK) can parse
 *   entries without regex.
 *
 * Mount order:
 *   Must be registered BEFORE route handlers so the timer starts
 *   at the top of the middleware chain.
 */

/**
 * Returns an Express middleware that logs each request/response cycle.
 *
 * @param {Object} [options]
 * @param {boolean} [options.json=true] — Emit structured JSON logs.
 * @param {boolean} [options.silent=false] — Disable logging (useful in tests).
 * @returns {Function} Express middleware.
 */
export function requestLogger({ json = true, silent = false } = {}) {
  return (req, res, next) => {
    if (silent) return next();

    const start = process.hrtime.bigint();

    // Capture the original end() to inject timing after response is sent.
    const originalEnd = res.end;
    res.end = function (...args) {
      const durationNs = Number(process.hrtime.bigint() - start);
      const durationMs = (durationNs / 1e6).toFixed(2);

      const entry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: parseFloat(durationMs),
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get("user-agent") || "unknown",
      };

      if (json) {
        console.log(JSON.stringify(entry));
      } else {
        console.log(
          `[${entry.timestamp}] ${entry.method} ${entry.path} → ${entry.status} (${durationMs}ms)`
        );
      }

      originalEnd.apply(res, args);
    };

    next();
  };
}
