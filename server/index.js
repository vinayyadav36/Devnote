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
const NODE_ENV = process.env.NODE_ENV || 'development';

// ========== MIDDLEWARE ==========
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Enforce 64KB size limit per MVP spec
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ limit: '64kb', extended: true }));

// PILLAR 2: Telemetry middleware
import systemTelemetry from './middleware/telemetry.js';
app.use(systemTelemetry);

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method.padEnd(6)} ${req.path}`);
  next();
});

// ========== API ROUTES ==========
import apiRoutes from './routes/api.js';
import publicApiRoutes from './routes/public-api.js';
app.use('/api/v1', apiRoutes);
app.use('/api/public/v1', publicApiRoutes);

// PILLAR 3: Admin diagnostics endpoint
import AdminDiagnosticsController from './controllers/adminDiagnostics.js';
app.get('/api/v1/admin/diagnostics', AdminDiagnosticsController.getMetrics);

// Filesystem monitor status endpoint
app.get('/api/v1/admin/monitor-status', (req, res) => {
  // Security: Validate admin token
  const adminToken = req.headers['x-saltedhash-admin-token'];
  if (!adminToken || adminToken !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ error: 'Access denied' });
  }

  return res.json({
    success: true,
    monitor: filesystemMonitor.getStatus(),
    history: filesystemMonitor.getRecoveryHistory(10)
  });
});

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ========== STATIC FILES ==========
app.use(express.static('dist'));

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'UNKNOWN_ERROR',
      statusCode: err.statusCode || 500,
      timestamp: new Date().toISOString()
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
import { filesystemMonitor } from './utils/filesystemMonitor.js';

const server = app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════╗
║  ⚡ SALTEDHASH Dev Suite                 ║
║  Backend Service Online                  ║
╟───────────────────────────────────────────╢
║  PORT: ${PORT.toString().padEnd(36)}║
║  ENV:  ${NODE_ENV.padEnd(36)}║
║  TIME: ${new Date().toISOString()}   ║
╚═══════════════════════════════════════════╝
  `);

  // Start filesystem monitor (auto-recovery for corrupted JSON files)
  filesystemMonitor.start();
  console.log('✅ Filesystem monitor active');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📌 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;
