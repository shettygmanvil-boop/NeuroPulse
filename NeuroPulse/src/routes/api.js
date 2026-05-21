/**
 * API Routes
 * 
 * This file centralizes all the routing for the application. It maps HTTP endpoints to 
 * their corresponding controller functions. This keeps the main server.js clean and 
 * organizes endpoints logically.
 */

import express from 'express';
import { processHealthScore, getHealthHistory } from '../controllers/analyticsController.js';
import { processSentiment, getJournalEntry } from '../controllers/journalController.js';

const router = express.Router();

// ==========================================
// Analytics Routes
// ==========================================

// POST /api/analytics/health-score - Submit metrics to calculate a health score
router.post('/analytics/health-score', processHealthScore);

// GET /api/analytics/history - Retrieve the user's health score history
router.get('/analytics/history', getHealthHistory);


// ==========================================
// Journal Routes
// ==========================================

// POST /api/journal/sentiment - Submit a journal entry (text/voice) for sentiment analysis
router.post('/journal/sentiment', processSentiment);

// GET /api/journal/:id - Retrieve a specific journal entry
router.get('/journal/:id', getJournalEntry);

export default router;
