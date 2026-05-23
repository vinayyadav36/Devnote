import fs from 'fs/promises';
import path from 'path';
import Prism from 'prismjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load Prism language components
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-java.js';
import 'prismjs/components/prism-csharp.js';
import 'prismjs/components/prism-php.js';
import 'prismjs/components/prism-go.js';
import 'prismjs/components/prism-rust.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-markup.js'; // HTML
import 'prismjs/components/prism-sql.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-yaml.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_DIR = path.resolve(dirname(__dirname), 'storage/snippets');
const STORIES_DIR = path.resolve(dirname(__dirname), 'storage/stories');
const EXPORTS_DIR = path.resolve(dirname(__dirname), 'storage/exports');

// Thread-safe write queues
const writeQueues = new Map();

/**
 * Thread-safe transactional queue to prevent concurrent write file corruption.
 * Ensures only one write happens to each file at a time.
 */
async function safeWriteFile(filePath, data) {
  if (!writeQueues.has(filePath)) {
    writeQueues.set(filePath, Promise.resolve());
  }

  const currentQueue = writeQueues.get(filePath);
  const nextWrite = currentQueue
    .then(async () => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const tempPath = `${filePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
      await fs.rename(tempPath, filePath);
    })
    .catch((error) => {
      // Clean up temp file on error
      const tempPath = `${filePath}.tmp`;
      fs.unlink(tempPath).catch(() => {});
      throw error;
    });

  writeQueues.set(filePath, nextWrite);
  return nextWrite;
}

/**
 * Server-Side PrismJS Tokenization Engine
 * Safely highlights code and extracts token metadata
 */
export function tokenizeCode(code, language) {
  try {
    // Normalize language name
    const normalizedLang = language ? language.toLowerCase() : 'javascript';
    
    // Check if language is supported by Prism
    const hasGrammar = Prism.languages[normalizedLang];
    const safeLang = hasGrammar ? normalizedLang : 'javascript';
    
    // Get Prism grammar
    const grammar = Prism.languages[safeLang] || Prism.languages.javascript;
    
    // Tokenize code
    const html = Prism.highlight(code, grammar, safeLang);
    
    return {
      html,
      language: safeLang,
      linesCount: code.split('\n').length,
      characterCount: code.length
    };
  } catch (error) {
    // Fallback to plain text on error
    return {
      html: `<pre><code>${escapeHtml(code)}</code></pre>`,
      language: 'plaintext',
      linesCount: code.split('\n').length,
      characterCount: code.length
    };
  }
}

/**
 * Hybrid Markdown Parser Engine (Note-to-Story)
 * 
 * Parsing Rules:
 * 1. Explicit: Split by horizontal rules (---) if present
 * 2. Implicit: Split by H2/H3 headers if no --- markers
 */
export function parseNoteToStory(markdownText) {
  let sections = [];

  // Rule 1: Check for explicit horizontal rule markers
  if (markdownText.includes('\n---\n') || markdownText.includes('\n----\n')) {
    sections = markdownText.split(/\n-{3,}\n/);
  } else {
    // Rule 2: Implicit Fallback - split by H2 or H3 headers
    sections = markdownText.split(/(?=\n#{2,3}\s)/g);
  }

  return sections
    .map((section, index) => {
      const lines = section.trim().split('\n');
      
      // Extract heading from first line if it starts with #
      const headingMatch = lines[0]?.match(/^#{1,3}\s(.+)/);
      const heading = headingMatch ? headingMatch[1].trim() : `Step ${index + 1}`;

      // Extract narrative text (filter out headers, code blocks, and empty lines)
      const narrative = lines
        .filter(
          (line) =>
            !line.startsWith('#') &&
            !line.startsWith('```') &&
            line.trim() !== ''
        )
        .join(' ')
        .trim()
        .substring(0, 500); // Limit narrative to 500 chars

      // Extract code block using regex bounds
      const codeBlockMatch = section.match(/```([\w]*)\n([\s\S]*?)```/);
      let extractedCode = null;

      if (codeBlockMatch) {
        const lang = codeBlockMatch[1] || 'javascript';
        const rawCode = codeBlockMatch[2].trim();
        extractedCode = {
          ...tokenizeCode(rawCode, lang),
          raw: rawCode
        };
      }

      return {
        step: index + 1,
        heading,
        text: narrative,
        code: extractedCode
      };
    })
    .filter((slide) => slide.heading || slide.text || slide.code); // Remove empty slides
}

/**
 * Detect programming language from code content
 */
export function detectLanguage(code) {
  const indicators = {
    javascript: /\b(const|let|var|function|async|await|import|export|=>|\.forEach|\.map)\b/m,
    typescript: /\b(interface|type|async|await|generic|@types)\b/m,
    python: /\b(def|class|import|from|if __name__|print|lambda)\b/m,
    java: /\b(public|private|class|interface|package|import|static)\b/m,
    csharp: /\b(using|namespace|public|class|void|async)\b/m,
    php: /^<\?php|\$\w+|\bfunction\s+\w+|echo\s+/m,
    go: /\b(package|func|import|type|interface|defer)\b/m,
    rust: /\b(fn|struct|enum|impl|trait|pub)\b/m,
    sql: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|FROM|WHERE|JOIN)\b/i,
    html: /^<!DOCTYPE|<html|<head|<body|<div/i,
    css: /^\.|#|\w+\s*\{|@media|@keyframes/m,
    bash: /^#!/,
    json: /^\{|\[.*\]|\}$/m,
    yaml: /^---|\s+\w+:\s+/m
  };

  for (const [lang, pattern] of Object.entries(indicators)) {
    if (pattern.test(code)) {
      return lang;
    }
  }

  return 'plaintext';
}

/**
 * Extract code metrics and metadata
 */
export function analyzeCode(code, language = null) {
  const lang = language || detectLanguage(code);
  const lines = code.split('\n');
  const nonEmptyLines = lines.filter((l) => l.trim() !== '');

  const metrics = {
    totalLines: lines.length,
    nonEmptyLines: nonEmptyLines.length,
    blankLines: lines.length - nonEmptyLines.length,
    averageLineLength:
      nonEmptyLines.length > 0
        ? Math.round(
            nonEmptyLines.reduce((sum, l) => sum + l.length, 0) /
              nonEmptyLines.length
          )
        : 0,
    hasComments: /\/\/|\/\*|#|--|\/\*/.test(code),
    language: lang
  };

  return metrics;
}

/**
 * HTML escape helper to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// ========== CONTROLLER ACTIONS ==========

/**
 * Save Snippet Controller
 */
export async function saveSnippet(req, res) {
  try {
    const { snippetId, userId, title, code, language, tags, isPublic } =
      req.body;

    // Validation
    if (!snippetId || !userId || !code) {
      return res.status(400).json({
        error: 'Missing required fields: snippetId, userId, code'
      });
    }

    if (code.length > 65536) {
      // 64KB limit
      return res.status(413).json({
        error: 'Code exceeds 64KB size limit'
      });
    }

    // Parse and tokenize code
    const detectedLang = language || detectLanguage(code);
    const parsed = tokenizeCode(code, detectedLang);
    const metrics = analyzeCode(code, detectedLang);

    // Build payload
    const payload = {
      snippetId,
      userId,
      title: title || 'Untitled Snippet',
      code: code, // Store raw code
      language: parsed.language,
      htmlHighlight: parsed.html,
      tags: Array.isArray(tags) ? tags : [],
      isPublic: Boolean(isPublic),
      metrics,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save with thread-safe write
    const targetPath = path.join(STORAGE_DIR, `${snippetId}.json`);
    await safeWriteFile(targetPath, payload);

    return res.status(201).json({
      success: true,
      data: payload
    });
  } catch (error) {
    console.error('Save Snippet Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Transform Note to Story Controller
 */
export async function transformNote(req, res) {
  try {
    const { storyId, userId, markdown, title } = req.body;

    if (!markdown || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: markdown, userId'
      });
    }

    // Parse markdown to story slides
    const slides = parseNoteToStory(markdown);

    if (slides.length === 0) {
      return res.status(400).json({
        error: 'No valid slides generated from markdown'
      });
    }

    // Build story payload
    const payload = {
      storyId: storyId || `sty_${Date.now()}`,
      userId,
      title: title || 'Untitled Story',
      slides,
      exportHistory: {
        platforms: [],
        lastExported: null
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Optionally save to storage
    if (storyId) {
      const targetPath = path.join(STORIES_DIR, `${storyId}.json`);
      await safeWriteFile(targetPath, payload);
    }

    return res.status(200).json({
      success: true,
      data: payload
    });
  } catch (error) {
    console.error('Transform Note Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Render Postcard (Export) Controller
 */
export async function renderPostcard(req, res) {
  try {
    const { exportId, userId, snippetId, theme, format } = req.body;

    if (!exportId || !userId || !snippetId) {
      return res.status(400).json({
        error: 'Missing required fields: exportId, userId, snippetId'
      });
    }

    // Build export payload (actual rendering happens client-side)
    const payload = {
      exportId,
      userId,
      snippetId,
      theme: theme || 'dracula_classic',
      format: format || 'png',
      shareToken: `pub_${Date.now()}`,
      isPublic: true,
      createdAt: new Date().toISOString()
    };

    // Save export record
    const targetPath = path.join(EXPORTS_DIR, `${exportId}.json`);
    await safeWriteFile(targetPath, payload);

    return res.status(201).json({
      success: true,
      data: payload
    });
  } catch (error) {
    console.error('Render Postcard Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Get snippet by ID
 */
export async function getSnippet(req, res) {
  try {
    const { snippetId } = req.params;

    const filePath = path.join(STORAGE_DIR, `${snippetId}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    const snippet = JSON.parse(data);

    return res.status(200).json({
      success: true,
      data: snippet
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: 'Snippet not found'
      });
    }
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * List user snippets
 */
export async function listUserSnippets(req, res) {
  try {
    const { userId } = req.params;

    await fs.mkdir(STORAGE_DIR, { recursive: true });
    const files = await fs.readdir(STORAGE_DIR);
    const snippets = [];

    for (const file of files) {
      if (file.endsWith('.json') && !file.endsWith('.tmp')) {
        const data = await fs.readFile(path.join(STORAGE_DIR, file), 'utf8');
        const snippet = JSON.parse(data);
        if (snippet.userId === userId) {
          snippets.push(snippet);
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: snippets
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}

export default {
  saveSnippet,
  transformNote,
  renderPostcard,
  getSnippet,
  listUserSnippets,
  tokenizeCode,
  parseNoteToStory,
  detectLanguage,
  analyzeCode
};
