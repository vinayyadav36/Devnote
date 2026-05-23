import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOGS_DIR = path.resolve(dirname(__dirname), 'logs');

/**
 * Application Telemetry System
 * Logs all events to JSON files for analysis
 */
export class TelemetrySystem {
  constructor() {
    this.eventBuffer = [];
    this.flushInterval = 5000; // Flush every 5 seconds
    this.startAutoFlush();
  }

  /**
   * Log an event
   */
  async logEvent(eventType, data = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      ...data
    };

    this.eventBuffer.push(event);

    if (this.eventBuffer.length > 100) {
      await this.flush();
    }
  }

  /**
   * Flush buffered events to disk
   */
  async flush() {
    if (this.eventBuffer.length === 0) return;

    try {
      await fs.mkdir(LOGS_DIR, { recursive: true });

      const dateStr = new Date().toISOString().split('T')[0];
      const logFile = path.join(LOGS_DIR, `events_${dateStr}.jsonl`);

      const lines = this.eventBuffer.map((e) => JSON.stringify(e)).join('\n') + '\n';
      await fs.appendFile(logFile, lines, 'utf8');

      this.eventBuffer = [];
    } catch (error) {
      console.error('Telemetry flush error:', error);
    }
  }

  /**
   * Auto-flush mechanism
   */
  startAutoFlush() {
    setInterval(() => {
      this.flush().catch(console.error);
    }, this.flushInterval);
  }

  /**
   * Get events from today
   */
  async getTodayEvents() {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const logFile = path.join(LOGS_DIR, `events_${dateStr}.jsonl`);

      const content = await fs.readFile(logFile, 'utf8');
      return content
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l));
    } catch {
      return [];
    }
  }

  /**
   * Get statistics
   */
  async getStats() {
    const events = await this.getTodayEvents();

    const stats = {
      totalEvents: events.length,
      byType: {},
      byHour: {}
    };

    for (const event of events) {
      // Count by type
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;

      // Count by hour
      const hour = new Date(event.timestamp).getHours();
      const hourKey = `${hour}:00`;
      stats.byHour[hourKey] = (stats.byHour[hourKey] || 0) + 1;
    }

    return stats;
  }
}

export const telemetry = new TelemetrySystem();

export default telemetry;
