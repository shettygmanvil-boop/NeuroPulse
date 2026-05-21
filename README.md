# NeuroPulse API

> Production-grade healthcare analytics backend powered by **Express** and **Google Gemini AI**.

NeuroPulse is a modular Node.js backend that analyses patient journal entries and biometric health metrics using AI-driven sentiment analysis, stress scoring, and burnout prediction.

---

## Architecture

```
src/
├── server.js                        ← Entry point & middleware pipeline
├── config/
│   └── firebase.js                  ← Firebase Admin SDK initialisation
├── controllers/
│   ├── analyticsController.js       ← AI health-score computation (Gemini)
│   └── journalController.js         ← AI journal sentiment analysis (Gemini)
├── middleware/
│   ├── authGuard.js                 ← Firebase Auth token verification + RBAC
│   ├── errorHandler.js              ← Centralised error handler + 404 catch-all
│   ├── rateLimiter.js               ← In-memory sliding-window rate limiter
│   └── requestLogger.js             ← Structured HTTP request logging
├── routes/
│   └── api.js                       ← Versioned REST endpoint definitions
└── utils/
    └── errors.js                    ← Custom AppError class hierarchy
```

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 3. Run in development (auto-restart on file changes)
npm run dev

# 4. Run in production
NODE_ENV=production npm start
```

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Health Check

| Method | Path      | Description            |
|--------|-----------|------------------------|
| GET    | `/health` | Service readiness probe |

### Journal & Sentiment Analysis

| Method | Path                                | Description                            |
|--------|-------------------------------------|----------------------------------------|
| POST   | `/journal/entries`                  | Create entry + AI sentiment analysis   |
| GET    | `/journal/entries`                  | List entries (paginated)               |
| GET    | `/journal/entries/:entryId/sentiment` | Get stored sentiment for an entry    |
| POST   | `/journal/entries/analyze`          | Standalone AI analysis (no persistence)|

#### Journal Analysis Response Schema

```json
{
  "sentiment": "Positive | Negative | Neutral",
  "stressScore": 0-100,
  "detectedEmotions": ["anxiety", "gratitude", "..."],
  "burnoutPrediction": "Low Risk | Moderate Risk | High Risk",
  "explanation": "Clinical rationale..."
}
```

### Health-Score Analytics

| Method | Path                         | Description                              |
|--------|------------------------------|------------------------------------------|
| GET    | `/analytics/scores/:userId`  | Get latest health scores for a user      |
| POST   | `/analytics/scores`          | Submit metrics for AI health computation |
| GET    | `/analytics/trends`          | Historical trend data for charting       |
| POST   | `/analytics/compare`         | Compare two metric snapshots with deltas |

#### Health Score Response Schema

```json
{
  "cognitiveScore": 0-100,
  "stressIndex": 0-100,
  "sleepQuality": 0-100,
  "overallWellness": 0-100,
  "riskLevel": "Healthy | Mild Concern | Moderate Risk | High Risk | Critical",
  "recommendations": ["..."],
  "summary": "Clinical rationale..."
}
```

## Middleware Pipeline

Requests flow through the following middleware in order:

1. **Request Logger** — Structured JSON logs with response timing
2. **CORS** — Configurable origin whitelist (wide-open in dev)
3. **JSON Parser** — Body parsing with 1MB size limit
4. **Rate Limiter** — 60 req/min per client, `X-RateLimit-*` headers
5. **Routes** — Business logic
6. **404 Catch-All** — Structured error for undefined routes
7. **Error Handler** — Maps `AppError` subclasses to HTTP status codes

## Environment Variables

| Variable                        | Required | Description                          |
|---------------------------------|----------|--------------------------------------|
| `PORT`                          | No       | Server port (default: 3000)          |
| `NODE_ENV`                      | No       | `development` or `production`        |
| `GEMINI_API_KEY`                | Yes      | Google AI API key                    |
| `GOOGLE_APPLICATION_CREDENTIALS`| Yes      | Path to Firebase service account key |
| `FIREBASE_DATABASE_URL`         | No       | Realtime Database URL                |
| `SKIP_AUTH`                     | No       | `true` to bypass auth in dev only    |
| `ALLOWED_ORIGINS`               | No       | Comma-separated CORS origins (prod)  |

## Error Handling

All errors use structured JSON responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": {}
  }
}
```

Custom error classes in `src/utils/errors.js`:

| Class                  | Status | Code                    |
|------------------------|--------|-------------------------|
| `ValidationError`      | 400    | `VALIDATION_ERROR`      |
| `AuthenticationError`  | 401    | `AUTHENTICATION_ERROR`  |
| `ForbiddenError`       | 403    | `FORBIDDEN`             |
| `NotFoundError`        | 404    | `NOT_FOUND`             |
| `ConflictError`        | 409    | `CONFLICT`              |
| `RateLimitError`       | 429    | `RATE_LIMITED`           |
| `ExternalServiceError` | 502    | `EXTERNAL_SERVICE_ERROR` |

## License

MIT
