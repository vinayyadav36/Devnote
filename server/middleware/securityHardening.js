import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * PILLAR 2: Enterprise Security & Rate Limiting
 * DDoS protection, input validation, payload hardening
 */

/**
 * In-memory rate limiter (no external dependencies)
 */
const rateLimitStore = new Map();

export function rateLimit(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const maxRequests = options.max || 100;

  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress;
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = rateLimitStore.get(key);

    // Reset if window expired
    if (now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    // Check limit
    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    record.count++;
    next();
  };
}

/**
 * Payload validation and sanitization
 */
export function validateAndSanitizeSnippet(req, res, next) {
  const { code, language, title } = req.body;

  // Validate code
  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      error: 'Malformed payload: code is required and must be a string'
    });
  }

  // 64KB size limit
  const codeSize = Buffer.byteLength(code, 'utf8');
  if (codeSize > 64 * 1024) {
    return res.status(413).json({
      error: `Payload too large: ${(codeSize / 1024).toFixed(2)}KB exceeds 64KB limit`
    });
  }

  // Sanitize title - remove HTML tags
  const sanitizedTitle = (title || 'Untitled Snippet')
    .replace(/[<>\"']/g, '')
    .substring(0, 200)
    .trim();

  // Validate and normalize language
  const allowedLanguages = [
    'javascript', 'typescript', 'python', 'java', 'csharp', 'go', 'rust',
    'sql', 'html', 'css', 'bash', 'json', 'xml', 'yaml', 'plaintext'
  ];
  const language_clean = (language || 'javascript')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  const normalizedLanguage = allowedLanguages.includes(language_clean) ? language_clean : 'plaintext';

  // Attach sanitized payload
  req.sanitizedPayload = {
    code: code.trim(),
    language: normalizedLanguage,
    title: sanitizedTitle
  };

  next();
}

/**
 * CORS and security headers
 */
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' cdn.tailwindcss.com; img-src 'self' data: blob:;"
  );
  next();
}

/**
 * Cleanup old rate limit entries (memory management)
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime + 60000) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute

export default {
  rateLimit,
  validateAndSanitizeSnippet,
  securityHeaders
};
