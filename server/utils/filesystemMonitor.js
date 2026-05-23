import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_DIR = path.resolve(dirname(__dirname), 'storage');
const BACKUPS_DIR = path.resolve(dirname(__dirname), 'backups', 'corrupted');

/**
 * FILESYSTEM MONITOR
 * Watches for corrupted JSON files and auto-recovers them
 */
export class FilesystemMonitor {
  constructor() {
    this.scanInterval = 60000; // Scan every 60 seconds
    this.isRunning = false;
    this.scanHistory = [];
    this.recoveryLog = createWriteStream(path.join(BACKUPS_DIR, 'recovery.log'), {
      flags: 'a'
    });
  }

  /**
   * Start monitoring
   */
  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🔍 Filesystem Monitor started');

    this.scanInterval = setInterval(async () => {
      try {
        await this.scan();
      } catch (error) {
        console.error('Monitor scan error:', error);
      }
    }, this.scanInterval);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.isRunning) {
      clearInterval(this.scanInterval);
      this.isRunning = false;
      console.log('⛔ Filesystem Monitor stopped');
    }
  }

  /**
   * Scan storage directory for corrupted files
   */
  async scan() {
    try {
      await fs.mkdir(BACKUPS_DIR, { recursive: true });

      const entities = ['users', 'snippets', 'stories', 'exports'];

      for (const entity of entities) {
        const entityPath = path.join(STORAGE_DIR, entity);

        try {
          const files = await fs.readdir(entityPath);

          for (const file of files) {
            if (!file.endsWith('.json')) continue;

            const filePath = path.join(entityPath, file);
            const result = await this.validateFile(filePath);

            if (!result.valid) {
              console.warn(`⚠️  Corrupted file detected: ${filePath}`);
              await this.recoverFile(filePath, result);
            }
          }
        } catch (error) {
          console.error(`Error scanning ${entity}:`, error.message);
        }
      }

      this.scanHistory.push({
        timestamp: new Date().toISOString(),
        status: 'completed'
      });

      // Keep only last 100 scans
      if (this.scanHistory.length > 100) {
        this.scanHistory.shift();
      }
    } catch (error) {
      console.error('Scan error:', error);
    }
  }

  /**
   * Validate JSON file
   */
  async validateFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');

      // Try to parse as JSON
      try {
        JSON.parse(content);
        return { valid: true };
      } catch (parseError) {
        return {
          valid: false,
          reason: 'Invalid JSON',
          parseError: parseError.message
        };
      }
    } catch (readError) {
      return {
        valid: false,
        reason: 'Read error',
        readError: readError.message
      };
    }
  }

  /**
   * Recover corrupted file
   */
  async recoverFile(filePath, validationResult) {
    try {
      const fileName = path.basename(filePath);
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const backupPath = path.join(
        BACKUPS_DIR,
        `${fileName}.corrupted_${timestamp}`
      );

      // Backup corrupted file
      await fs.copyFile(filePath, backupPath);

      // Create empty JSON template based on entity type
      const template = this.getEmptyTemplate(filePath);

      // Write template to file
      await fs.writeFile(filePath, JSON.stringify(template, null, 2), 'utf8');

      // Log recovery
      const logEntry = {
        timestamp: new Date().toISOString(),
        file: filePath,
        reason: validationResult.reason,
        backupPath,
        action: 'recovered'
      };

      this.recoveryLog.write(JSON.stringify(logEntry) + '\n');

      console.log(`✅ Recovered ${fileName}`);

      return { success: true, backupPath };
    } catch (error) {
      console.error('Recovery failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get empty template for file type
   */
  getEmptyTemplate(filePath) {
    const fileName = path.basename(filePath);

    if (fileName.includes('user')) {
      return {
        id: `user_recovered_${Date.now()}`,
        email: 'recovered@saltedhash.dev',
        createdAt: new Date().toISOString(),
        lastLogin: null,
        profile: { name: '', bio: '' }
      };
    } else if (fileName.includes('snippet')) {
      return {
        id: `snippet_recovered_${Date.now()}`,
        userId: 'unknown',
        code: '// Recovered file',
        language: 'javascript',
        title: 'Recovered Snippet',
        tags: ['recovered'],
        createdAt: new Date().toISOString()
      };
    } else if (fileName.includes('story')) {
      return {
        id: `story_recovered_${Date.now()}`,
        userId: 'unknown',
        slides: [],
        title: 'Recovered Story',
        createdAt: new Date().toISOString()
      };
    } else if (fileName.includes('export')) {
      return {
        id: `export_recovered_${Date.now()}`,
        snippetId: 'unknown',
        format: 'image',
        theme: 'dracula_classic',
        createdAt: new Date().toISOString()
      };
    }

    return {};
  }

  /**
   * Get recovery status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      scanCount: this.scanHistory.length,
      lastScan: this.scanHistory[this.scanHistory.length - 1] || null,
      scanInterval: this.scanInterval
    };
  }

  /**
   * Get recovery history
   */
  getRecoveryHistory(limit = 50) {
    return this.scanHistory.slice(-limit);
  }
}

export const filesystemMonitor = new FilesystemMonitor();

export default filesystemMonitor;
