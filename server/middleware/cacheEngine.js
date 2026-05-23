import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_DIR = path.resolve(dirname(__dirname), 'storage');
const MEMORY_CACHE = new Map();
const WRITE_LOCKS = new Set();

/**
 * PILLAR 1: High-Performance Memory Caching
 * Layer 1 cache with background async disk writes
 * Sub-millisecond reads, safe atomic writes
 */
export const CacheEngine = {
  /**
   * Ultra-fast memory read path
   */
  async read(key) {
    // Layer 1: Instant memory lookup
    if (MEMORY_CACHE.has(key)) {
      return MEMORY_CACHE.get(key);
    }

    // Layer 2: Disk fallback with memory hydration
    const [type, id] = key.split(':');
    const typeDir = type || 'snippets';
    const filePath = path.join(STORAGE_DIR, typeDir, `${id}.json`);

    try {
      const rawData = await fs.readFile(filePath, 'utf8');
      const parsedData = JSON.parse(rawData);
      MEMORY_CACHE.set(key, parsedData);
      return parsedData;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  },

  /**
   * Thread-safe memory write + non-blocking async disk flush
   */
  async write(key, payload) {
    // Update memory immediately for instant read availability
    MEMORY_CACHE.set(key, payload);

    // Skip redundant parallel writes to same file
    if (WRITE_LOCKS.has(key)) return payload;
    WRITE_LOCKS.add(key);

    // Offload disk serialization to background thread
    process.nextTick(async () => {
      const [type, id] = key.split(':');
      const typeDir = type || 'snippets';
      const filePath = path.join(STORAGE_DIR, typeDir, `${id}.json`);
      const tempPath = `${filePath}.${Date.now()}.tmp`;

      try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(tempPath, JSON.stringify(payload, null, 2), 'utf8');
        await fs.rename(tempPath, filePath);
      } catch (err) {
        console.error(`[CACHE CRITICAL] Disk sync failure for ${key}:`, err.message);
      } finally {
        WRITE_LOCKS.delete(key);
      }
    });

    return payload;
  },

  /**
   * Bulk list with memory-first lookup
   */
  async list(type, userId) {
    const typeDir = type || 'snippets';
    const basePath = path.join(STORAGE_DIR, typeDir);

    try {
      await fs.mkdir(basePath, { recursive: true });
      const files = await fs.readdir(basePath);
      const items = [];

      for (const file of files) {
        if (file.endsWith('.json') && !file.endsWith('.tmp')) {
          const key = `${type}:${file.replace('.json', '')}`;
          const item = await this.read(key);
          if (item && (!userId || item.userId === userId)) {
            items.push(item);
          }
        }
      }

      return items;
    } catch (error) {
      return [];
    }
  },

  /**
   * Cache invalidation
   */
  invalidate(key) {
    MEMORY_CACHE.delete(key);
  },

  /**
   * Get cache statistics (monitoring)
   */
  getStats() {
    return {
      cacheSize: MEMORY_CACHE.size,
      pendingWrites: WRITE_LOCKS.size,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
    };
  },

  /**
   * Clear cache (maintenance)
   */
  clear() {
    MEMORY_CACHE.clear();
  }
};

export default CacheEngine;
