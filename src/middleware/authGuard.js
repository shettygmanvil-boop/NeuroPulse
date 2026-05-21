/**
 * authGuard.js — Authentication Middleware
 *
 * Responsibility:
 *   Verifies Firebase ID tokens on protected routes.  Extracts the
 *   decoded token payload and attaches it to `req.user` so downstream
 *   controllers can access the authenticated user's UID, email, and
 *   custom claims without re-verifying.
 *
 * Usage:
 *   import { authGuard } from "../middleware/authGuard.js";
 *   router.post("/journal/entries", authGuard, createEntry);
 *
 * Bypass:
 *   Set SKIP_AUTH=true in development to bypass token verification.
 *   This is NEVER honoured when NODE_ENV === "production".
 */

import { getAuth } from "firebase-admin/auth";
import { AuthenticationError } from "../utils/errors.js";

/**
 * Express middleware — verifies the Firebase ID token from the
 * Authorization header and populates `req.user`.
 */
export async function authGuard(req, _res, next) {
  // --- Dev bypass -----------------------------------------------------------
  const skipAuth =
    process.env.SKIP_AUTH === "true" &&
    process.env.NODE_ENV !== "production";

  if (skipAuth) {
    req.user = {
      uid: "dev-user",
      email: "dev@neuropulse.local",
      devBypass: true,
    };
    return next();
  }

  // --- Extract token --------------------------------------------------------
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(
      new AuthenticationError(
        "Missing or malformed Authorization header. Expected: Bearer <token>"
      )
    );
  }

  const idToken = authHeader.split("Bearer ")[1];

  if (!idToken || idToken.trim().length === 0) {
    return next(new AuthenticationError("Bearer token is empty."));
  }

  // --- Verify token ---------------------------------------------------------
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);

    // Attach the decoded claims to the request for downstream use.
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      emailVerified: decodedToken.email_verified || false,
      customClaims: decodedToken, // Full payload for advanced use cases.
    };

    return next();
  } catch (error) {
    // Firebase throws coded errors — surface a friendly message.
    const messages = {
      "auth/id-token-expired": "Token has expired. Please re-authenticate.",
      "auth/id-token-revoked": "Token has been revoked. Please re-authenticate.",
      "auth/argument-error": "Malformed token. Please provide a valid ID token.",
    };

    const friendlyMessage =
      messages[error.code] || "Invalid authentication token.";

    return next(new AuthenticationError(friendlyMessage));
  }
}

/**
 * Optional role-checking middleware factory.
 * Use after authGuard to enforce custom-claim-based RBAC.
 *
 * @param  {...string} requiredRoles — One or more role strings the user must have.
 * @returns {Function} Express middleware.
 *
 * @example
 *   router.delete("/admin/users/:id", authGuard, requireRole("admin"), deleteUser);
 */
export function requireRole(...requiredRoles) {
  return (req, _res, next) => {
    const userRoles = req.user?.customClaims?.roles || [];

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return next(
        new AuthenticationError(
          `This action requires one of the following roles: ${requiredRoles.join(", ")}.`
        )
      );
    }

    return next();
  };
}
