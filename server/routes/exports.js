import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { verifyToken } from '../controllers/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STORAGE_DIR = path.resolve(dirname(__dirname), 'storage');

// POST /api/v1/exports - Create export
router.post('/', verifyToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { snippetId, format = 'png', theme = 'dracula_classic' } = req.body;

    if (!snippetId) {
      return res.status(400).json({
        error: 'Snippet ID required'
      });
    }

    // Generate export record
    const exportId = `exp_${Date.now()}`;
    const shareToken = `pub_${Math.random().toString(36).substr(2, 9)}`;

    const exportData = {
      exportId,
      userId,
      snippetId,
      format,
      theme,
      shareToken,
      isPublic: true,
      createdAt: new Date().toISOString(),
      expiresAt: null
    };

    // Save export metadata
    const exportsDir = path.join(STORAGE_DIR, 'exports');
    await fs.mkdir(exportsDir, { recursive: true });
    await fs.writeFile(
      path.join(exportsDir, `${exportId}.json`),
      JSON.stringify(exportData, null, 2),
      'utf8'
    );

    return res.status(201).json({
      success: true,
      data: exportData
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Failed to create export'
    });
  }
});

// GET /api/v1/exports/:userId - Get user exports
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const exportsDir = path.join(STORAGE_DIR, 'exports');

    const files = await fs.readdir(exportsDir).catch(() => []);
    const exports = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readFile(path.join(exportsDir, file), 'utf8');
        const exp = JSON.parse(data);
        if (exp.userId === userId) {
          exports.push(exp);
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: exports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Failed to fetch exports'
    });
  }
});

// GET /api/v1/exports/public/:shareToken - Get public export
router.get('/public/:shareToken', async (req, res) => {
  try {
    const { shareToken } = req.params;
    const exportsDir = path.join(STORAGE_DIR, 'exports');

    const files = await fs.readdir(exportsDir).catch(() => []);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readFile(path.join(exportsDir, file), 'utf8');
        const exp = JSON.parse(data);
        if (exp.shareToken === shareToken && exp.isPublic) {
          return res.status(200).json({
            success: true,
            data: exp
          });
        }
      }
    }

    return res.status(404).json({
      error: 'Export not found'
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Failed to fetch export'
    });
  }
});

export default router;
