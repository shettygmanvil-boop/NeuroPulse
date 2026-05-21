/**
 * Main Application Entry Point (server.js)
 * 
 * This file sets up the Express application, configures global middleware (like CORS and JSON parsing),
 * mounts the API routes, and starts the server listening on a specific port.
 * 
 * By keeping this file focused on configuration and startup, the application remains modular
 * and easier to maintain or test.
 */

import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';

// Initialize the Express application
const app = express();

// Define the port to run on, falling back to 3000 if not specified in environment
const PORT = process.env.PORT || 3000;

// ==========================================
// Middleware Configuration
// ==========================================

// Enable Cross-Origin Resource Sharing to allow frontend applications to connect
app.use(cors());

// Parse incoming JSON requests and place the parsed data in req.body
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));


// ==========================================
// Route Mounting
// ==========================================

// Mount all API routes under the '/api' prefix
app.use('/api', apiRoutes);

// A simple health-check route to verify the server is running
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'NeuroPulse API is running' });
});

// Handle 404 for undefined routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});


// ==========================================
// Server Initialization
// ==========================================

app.listen(PORT, () => {
  console.log(`🚀 NeuroPulse Server is running on http://localhost:${PORT}`);
  console.log(`👉 API endpoints accessible at http://localhost:${PORT}/api`);
});
