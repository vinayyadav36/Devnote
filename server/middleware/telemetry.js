import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOGS_DIR = path.resolve(dirname(__dirname), 'logs');

// Ensure logs directory exists
fs.mkdirSync(LOGS_DIR, { recursive: true });

const LOG_FILE = path.join(LOGS_DIR, 'telemetry.log');
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a', encoding: 'utf8' });

/**
 * PILLAR 2: Event Telemetry Middleware
 * Logs all HTTP requests/responses with minimal overhead
 */
export function systemTelemetry(req, res, next) {
  const requestStartTime = Date.now();
  const clientIp = req.ip || req.headers['x-real-ip'] || '127.0.0.1';

  // Hook response finish to log after send
  res.on('finish', () => {
    const latency = Date.now() - requestStartTime;
    const telemetryPayload = {
      timestamp: new Date().toISOString(),
      clientIp,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latencyMs: latency,
      userAgent: req.headers['user-agent'] || 'unknown',
      userId: req.user?.id || 'anonymous'
    };

    // Write atomically
    logStream.write(JSON.stringify(telemetryPayload) + '\n');
  });

  next();
}

export default systemTelemetry;
