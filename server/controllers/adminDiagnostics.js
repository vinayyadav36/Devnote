import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_DIR = path.resolve(dirname(__dirname), 'storage');

/**
 * PILLAR 3: Real-Time Admin Diagnostic Dashboard
 * Monitors system health, memory usage, disk allocation, and data volumes
 */
export const AdminDiagnosticsController = {
  /**
   * System health snapshot endpoint
   */
  async getMetrics(req, res) {
    try {
      // Security: Validate admin token
      const adminToken = req.headers['x-saltedhash-admin-token'];
      if (!adminToken || adminToken !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).json({
          error: 'Access denied. Invalid admin credentials.'
        });
      }

      // Memory metrics
      const memoryUsage = process.memoryUsage();
      const freeSystemMem = os.freemem();
      const totalSystemMem = os.totalmem();
      const nodeUptime = process.uptime();

      // Read data volumes
      const counts = { users: 0, snippets: 0, stories: 0, exports: 0 };
      const entities = ['users', 'snippets', 'stories', 'exports'];

      for (const entity of entities) {
        try {
          const entityPath = path.join(STORAGE_DIR, entity);
          const files = await fs.readdir(entityPath).catch(() => []);
          counts[entity] = files.filter((f) => f.endsWith('.json')).length;
        } catch {
          counts[entity] = 0;
        }
      }

      // Calculate storage usage
      let totalStorageSize = 0;
      try {
        const output = await fs.readdir(STORAGE_DIR, { recursive: true });
        for (const file of output) {
          const fullPath = path.join(STORAGE_DIR, file);
          try {
            const stats = await fs.stat(fullPath);
            totalStorageSize += stats.size;
          } catch {
            // Skip if can't stat
          }
        }
      } catch {
        totalStorageSize = 0;
      }

      return res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        system: {
          uptime: `${Math.floor(nodeUptime / 3600)}h ${Math.floor((nodeUptime % 3600) / 60)}m`,
          cpuCount: os.cpus().length,
          cpuLoad: os.loadavg(),
          systemMemory: {
            total: `${(totalSystemMem / 1024 / 1024 / 1024).toFixed(2)}GB`,
            free: `${(freeSystemMem / 1024 / 1024 / 1024).toFixed(2)}GB`,
            used: `${((totalSystemMem - freeSystemMem) / 1024 / 1024 / 1024).toFixed(2)}GB`
          }
        },
        process: {
          heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
          rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`,
          external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`
        },
        storage: {
          totalSize: `${(totalStorageSize / 1024 / 1024).toFixed(2)}MB`,
          recordVolumes: counts,
          totalRecords: Object.values(counts).reduce((a, b) => a + b, 0)
        },
        health: {
          status: 'operational',
          memoryUsagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
          cpuLoadPercent: Math.round((os.loadavg()[0] / os.cpus().length) * 100)
        }
      });
    } catch (error) {
      console.error('Diagnostics error:', error);
      return res.status(500).json({
        error: error.message
      });
    }
  }
};

export default AdminDiagnosticsController;
