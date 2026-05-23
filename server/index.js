import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARE ==========
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '64kb' })); // Enforce 64KB limit per spec
app.use(express.urlencoded({ limit: '64kb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ========== ROUTES (to be imported) ==========
// Auth routes
import authRoutes from './routes/auth.js';
app.use('/api/v1/auth', authRoutes);

// Snippet routes
import snippetRoutes from './routes/snippets.js';
app.use('/api/v1/snippets', snippetRoutes);

// Transform routes
import transformRoutes from './routes/transform.js';
app.use('/api/v1/transform', transformRoutes);

// Share/Public routes
import shareRoutes from './routes/share.js';
app.use('/api/v1/share', shareRoutes);

// Admin routes
import adminRoutes from './routes/admin.js';
app.use('/api/v1/admin', adminRoutes);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'UNKNOWN_ERROR',
      statusCode: err.statusCode || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      statusCode: 404
    }
  });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  SALTEDHASH Dev Suite - Backend        ║
║  Server running on port ${PORT}        ║
║  Environment: ${process.env.NODE_ENV || 'development'}       ║
╚════════════════════════════════════════╝
  `);
});

export default app;
