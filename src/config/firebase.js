/**
 * firebase.js — Firebase Admin SDK Initialization
 *
 * Responsibility:
 *   Bootstraps the Firebase Admin SDK so every downstream service
 *   (Firestore, Auth, Cloud Functions, etc.) can import a single,
 *   pre-configured instance instead of re-initializing on their own.
 *
 * Environment:
 *   GOOGLE_APPLICATION_CREDENTIALS — path to the service-account JSON key.
 *   FIREBASE_DATABASE_URL           — (optional) Realtime Database URL.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ---------------------------------------------------------------------------
// Guard: prevent duplicate initialization during hot-reloads or test suites.
// ---------------------------------------------------------------------------
const existingApps = getApps();

const app =
  existingApps.length > 0
    ? existingApps[0]
    : initializeApp({
        // When GOOGLE_APPLICATION_CREDENTIALS is set the SDK picks it up
        // automatically; an explicit cert() call is shown here for clarity.
        credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
        databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
      });

// ---------------------------------------------------------------------------
// Firestore client — ready for import wherever data-access is needed.
// ---------------------------------------------------------------------------
const db = getFirestore(app);

export { app, db };
