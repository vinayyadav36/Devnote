/**
 * In-Memory Transaction Queue for Safe Concurrent Writes
 * Prevents file corruption from simultaneous writes to same file
 * 
 * Architecture:
 * - Per-file write queues stored in Map keyed by file path
 * - Pending writes read from memory cache (dirty reads optimization)
 * - File locks ensure serial execution of writes
 */

const writeQueues = new Map(); // Map<filePath, Promise>
const memoryCache = new Map(); // Map<filePath, data>

/**
 * Queue a write operation to be executed serially
 * Safe for concurrent requests to same file
 */
export async function queueWrite(filePath, data, writeFn) {
  // Update memory cache immediately for dirty reads
  memoryCache.set(filePath, data);
  
  // Get existing queue for this file, or create new
  const currentQueue = writeQueues.get(filePath) || Promise.resolve();
  
  // Chain new write onto queue
  const newQueue = currentQueue.then(() => writeFn(filePath, data));
  
  writeQueues.set(filePath, newQueue);
  
  try {
    await newQueue;
  } catch (error) {
    // Remove from cache on write failure
    memoryCache.delete(filePath);
    throw error;
  }
}

/**
 * Get data from cache if pending write, otherwise null
 * Enables dirty reads for fast responses during concurrent writes
 */
export function getCachedData(filePath) {
  return memoryCache.get(filePath);
}

/**
 * Invalidate cache for a file
 */
export function invalidateCache(filePath) {
  memoryCache.delete(filePath);
}

/**
 * Get current write queue status (for monitoring)
 */
export function getQueueStatus() {
  return {
    totalQueues: writeQueues.size,
    queuedFiles: Array.from(writeQueues.keys()),
    cacheSize: memoryCache.size
  };
}

export default {
  queueWrite,
  getCachedData,
  invalidateCache,
  getQueueStatus
};
