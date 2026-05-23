import express from 'express';
import { EngineController } from '../controllers/engine.js';

const router = express.Router();

/**
 * PUBLIC API ROUTES
 * These endpoints allow external developers to use SALTEDHASH
 * transformation and parsing services programmatically
 */

// ========================================
// PUBLIC: Snippet Creation & Parsing
// ========================================

/**
 * POST /api/public/v1/transform/snippet
 * Transform raw code into a tokenized snippet with metadata
 */
router.post('/transform/snippet', async (req, res) => {
  try {
    const { code, language = 'javascript', title = 'Untitled' } = req.body;

    if (!code || code.length === 0) {
      return res.status(400).json({
        error: 'Code is required'
      });
    }

    const tokenized = await EngineController.tokenizeCode(code, language);

    return res.json({
      success: true,
      snippet: {
        title,
        language,
        code,
        tokens: tokenized.tokens,
        lineCount: tokenized.lineCount,
        estimatedReadingTime: Math.ceil(tokenized.lineCount / 10)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/public/v1/transform/note-to-story
 * Convert markdown notes into structured story format
 */
router.post('/transform/note-to-story', async (req, res) => {
  try {
    const { markdown } = req.body;

    if (!markdown) {
      return res.status(400).json({
        error: 'Markdown content is required'
      });
    }

    const story = await EngineController.parseNoteToStory(markdown);

    return res.json({
      success: true,
      story: {
        slides: story.slides,
        totalSlides: story.slides.length,
        estimatedReadingTime: Math.ceil(story.slides.length * 2)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/public/v1/transform/batch
 * Transform multiple snippets in one request
 */
router.post('/transform/batch', async (req, res) => {
  try {
    const { snippets } = req.body;

    if (!Array.isArray(snippets) || snippets.length === 0) {
      return res.status(400).json({
        error: 'Array of snippets is required'
      });
    }

    if (snippets.length > 50) {
      return res.status(400).json({
        error: 'Maximum 50 snippets per batch'
      });
    }

    const results = [];
    for (const snippet of snippets) {
      try {
        const tokenized = await EngineController.tokenizeCode(
          snippet.code,
          snippet.language || 'javascript'
        );
        results.push({
          success: true,
          title: snippet.title || 'Untitled',
          language: snippet.language,
          tokens: tokenized.tokens,
          lineCount: tokenized.lineCount
        });
      } catch (err) {
        results.push({
          success: false,
          title: snippet.title || 'Untitled',
          error: err.message
        });
      }
    }

    return res.json({
      success: true,
      results,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public/v1/themes
 * Get available rendering themes
 */
router.get('/themes', (req, res) => {
  const themes = [
    { id: 'dracula_classic', name: 'Dracula Classic', dark: true },
    { id: 'nord_frost', name: 'Nord Frost', dark: true },
    { id: 'cyberpunk_neon', name: 'Cyberpunk Neon', dark: true },
    { id: 'minimal_light', name: 'Minimal Light', dark: false },
    { id: 'github_dark', name: 'GitHub Dark', dark: true }
  ];

  return res.json({
    success: true,
    themes,
    count: themes.length
  });
});

/**
 * GET /api/public/v1/languages
 * Get supported programming languages
 */
router.get('/languages', (req, res) => {
  const languages = [
    'javascript',
    'typescript',
    'python',
    'java',
    'cpp',
    'csharp',
    'go',
    'rust',
    'php',
    'ruby',
    'swift',
    'kotlin',
    'scala',
    'elixir',
    'haskell',
    'r',
    'sql',
    'bash',
    'shell',
    'html',
    'css',
    'json',
    'xml',
    'yaml',
    'markdown'
  ];

  return res.json({
    success: true,
    languages,
    count: languages.length
  });
});

export default router;
