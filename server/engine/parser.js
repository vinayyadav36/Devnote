/**
 * Lightweight RegExp-based Code Parser
 * Language detection, syntax analysis, and metrics
 * No external dependencies - works in Node.js and browser
 */

// Language detection patterns
const LANGUAGE_PATTERNS = {
  javascript: /^(?:const|let|var|function|class|import|export|async|await|=>|\.forEach|\.map|\.filter)/m,
  typescript: /^(interface|type|namespace|enum|declare|generic|@types)/m,
  python: /^(?:def|class|import|from|if __name__|print|lambda|self\.)/m,
  java: /^(?:public|private|class|interface|package|import|static|void)/m,
  rust: /^(?:fn|struct|enum|impl|trait|use|mod|pub|async)/m,
  go: /^(?:package|import|func|type|const|var|interface|defer|go )/m,
  csharp: /^(?:using|namespace|public|class|interface|void|async|await)/m,
  ruby: /^(?:def|class|module|require|attr_|@|puts|puts|gets|\.each|\.map)/m,
  sql: /^(?:SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|FROM|WHERE|JOIN)/i,
  html: /^(?:<html|<head|<body|<div|<!DOCTYPE|<script|<style)/i,
  css: /^(?:@media|@keyframes|@import|body|html|\.[\w-]+|#[\w-]+|[\w-]+\s*\{)/m,
  json: /^\s*[\{\[](?:\s*"[\w-]+"\s*:|[\w\d"'\[\]{}:,.\s-])*[\}\]]\s*$/,
  yaml: /^(?:---|\s+[\w-]+:\s+[\w"']*)/m,
  shell: /^(?:#!/bin/|alias|export|function|if\s+\[\s+|for\s+|while\s+|echo|cd)/m,
  markdown: /^(?:#|##|###|\*|>\s|-\s|\+\s|\d+\.)/m,
  xml: /^(?:<\?xml|<[\w]+\s|<!DOCTYPE)/i,
  cpp: /^(?:#include|namespace|using|class|struct|void|const|template)/m,
  php: /^<\?php|function\s+|class\s+|namespace\s+|echo\s+|return\s+/m,
  kotlin: /^(?:fun|class|interface|object|package|import|var|val|data|sealed)/m,
  swift: /^(?:func|class|struct|enum|protocol|import|let|var|async|await)/m,
  plaintext: /^.*/
};

// Comment patterns for different languages
const COMMENT_PATTERNS = {
  javascript: { single: /\/\//, multi: /\/\*.*?\*\//s },
  typescript: { single: /\/\//, multi: /\/\*.*?\*\//s },
  python: { single: /#/, multi: /"""[\s\S]*?"""/ },
  java: { single: /\/\//, multi: /\/\*.*?\*\//s },
  rust: { single: /\/\//, multi: /\/\*.*?\*\//s },
  go: { single: /\/\//, multi: /\/\*.*?\*\//s },
  csharp: { single: /\/\//, multi: /\/\*.*?\*\//s },
  ruby: { single: /#/, multi: /=begin[\s\S]*?=end/ },
  sql: { single: /--/, multi: /\/\*.*?\*\//s },
  html: { multi: /<!--[\s\S]*?-->/ },
  css: { multi: /\/\*.*?\*\//s },
  shell: { single: /#/ },
  cpp: { single: /\/\//, multi: /\/\*.*?\*\//s }
};

// Token patterns for syntax highlighting
const TOKEN_PATTERNS = {
  keywords: {
    javascript: /\b(const|let|var|function|class|async|await|return|if|else|for|while|do|switch|case|break|continue|import|export|default|from|as|new|this|static|extends|super|try|catch|finally|throw)\b/g,
    python: /\b(def|class|import|from|return|if|else|elif|for|while|break|continue|try|except|finally|raise|with|as|lambda|async|await|yield)\b/g,
    java: /\b(public|private|protected|static|final|class|interface|enum|extends|implements|import|package|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|this|super|abstract|synchronized|volatile)\b/g,
  },
  strings: /(["'`])(\\.|(?!\1).)*\1/g,
  numbers: /\b\d+\.?\d*([eE][+-]?\d+)?\b/g,
  comments: null // Handled separately per language
};

/**
 * Detect programming language from code
 * Returns language ID and confidence (0-1)
 */
export function detectLanguage(code) {
  if (!code || typeof code !== 'string') return { language: 'plaintext', confidence: 0 };
  
  const lines = code.split('\n').filter(l => l.trim());
  const firstNonEmptyLine = lines.find(l => l.trim());
  
  // Shebang check
  if (firstNonEmptyLine?.startsWith('#!')) {
    if (firstNonEmptyLine.includes('python')) return { language: 'python', confidence: 0.95 };
    if (firstNonEmptyLine.includes('node')) return { language: 'javascript', confidence: 0.95 };
    if (firstNonEmptyLine.includes('bash') || firstNonEmptyLine.includes('sh')) return { language: 'shell', confidence: 0.95 };
  }
  
  // Count pattern matches for each language
  const scores = {};
  Object.entries(LANGUAGE_PATTERNS).forEach(([lang, pattern]) => {
    const matches = code.match(pattern);
    scores[lang] = matches ? matches.length : 0;
  });
  
  // Find highest score
  const detected = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const [language, matchCount] = detected;
  
  // Calculate confidence based on match density
  const codeLength = code.length;
  const confidence = Math.min(matchCount / 10, 1);
  
  return {
    language: matchCount > 0 ? language : 'plaintext',
    confidence
  };
}

/**
 * Analyze code for metrics
 */
export function analyzeCode(code, language = null) {
  if (!code || typeof code !== 'string') {
    return {
      lineCount: 0,
      codeLineCount: 0,
      commentLineCount: 0,
      blankLineCount: 0,
      hasComments: false,
      complexity: 0,
      averageLineLength: 0
    };
  }
  
  const lang = language || detectLanguage(code).language;
  const lines = code.split('\n');
  const commentPattern = COMMENT_PATTERNS[lang];
  
  let codeLineCount = 0;
  let commentLineCount = 0;
  let blankLineCount = 0;
  let totalLength = 0;
  let complexityScore = 0;
  let hasComments = false;
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    if (!trimmed) {
      blankLineCount++;
      return;
    }
    
    // Check for comments
    if (commentPattern?.single && commentPattern.single.test(trimmed)) {
      commentLineCount++;
      hasComments = true;
      return;
    }
    
    if (commentPattern?.multi && commentPattern.multi.test(trimmed)) {
      commentLineCount++;
      hasComments = true;
      return;
    }
    
    // Count code lines
    codeLineCount++;
    totalLength += line.length;
    
    // Complexity indicators
    if (/if\s*\(|for\s*\(|while\s*\(|case\s+|catch\s*\(/.test(trimmed)) complexityScore += 2;
    if (/\?.*:/.test(trimmed)) complexityScore += 1; // Ternary
    if (/=>/.test(trimmed)) complexityScore += 1; // Arrow function
    if (/function|class|def|struct/.test(trimmed)) complexityScore += 3;
  });
  
  const totalCodeLines = codeLineCount + commentLineCount;
  
  return {
    lineCount: lines.length,
    codeLineCount,
    commentLineCount,
    blankLineCount,
    hasComments,
    complexity: Math.ceil(complexityScore / Math.max(totalCodeLines, 1)),
    averageLineLength: totalCodeLines > 0 ? Math.round(totalLength / totalCodeLines) : 0
  };
}

/**
 * Extract function/class names from code
 */
export function extractIdentifiers(code, language = null) {
  if (!code || typeof code !== 'string') return [];
  
  const lang = language || detectLanguage(code).language;
  const identifiers = [];
  
  // Function extraction patterns
  const functionPatterns = {
    javascript: /(?:const|let|var|function)\s+(\w+)\s*(?:=|:|\()/g,
    typescript: /(?:const|let|var|function)\s+(\w+)\s*(?:=|:|\(|<)/g,
    python: /def\s+(\w+)\s*\(/g,
    java: /(?:public|private|protected)?\s*(?:static)?\s*(?:\w+\s+)+(\w+)\s*\(/g,
    rust: /fn\s+(\w+)\s*\(/g,
    go: /func\s+(?:\([^)]*\))?\s*(\w+)\s*\(/g,
    csharp: /(?:public|private|protected)?\s*(?:static)?\s*(?:async)?\s*\w+\s+(\w+)\s*\(/g
  };
  
  const classPatterns = {
    javascript: /class\s+(\w+)\s*(?:extends|{)/g,
    typescript: /class\s+(\w+)\s*(?:extends|implements|<|{)/g,
    python: /class\s+(\w+)\s*[:(]/g,
    java: /class\s+(\w+)\s*(?:extends|implements|{)/g,
    rust: /struct\s+(\w+)/g,
    go: /type\s+(\w+)\s+struct/g,
    csharp: /class\s+(\w+)\s*(?::|{)/g
  };
  
  // Extract functions
  const funcPattern = functionPatterns[lang];
  if (funcPattern) {
    let match;
    while ((match = funcPattern.exec(code))) {
      identifiers.push({ type: 'function', name: match[1] });
    }
  }
  
  // Extract classes
  const classPattern = classPatterns[lang];
  if (classPattern) {
    let match;
    while ((match = classPattern.exec(code))) {
      identifiers.push({ type: 'class', name: match[1] });
    }
  }
  
  return identifiers;
}

/**
 * Get description from code comments
 * Extracts docstring or first multi-line comment
 */
export function extractDescription(code, language = null) {
  if (!code || typeof code !== 'string') return '';
  
  const lang = language || detectLanguage(code).language;
  
  // JavaScript/TypeScript JSDoc
  if (['javascript', 'typescript', 'java', 'cpp', 'csharp'].includes(lang)) {
    const jsdocMatch = code.match(/\/\*\*[\s\S]*?\*\//);
    if (jsdocMatch) {
      return jsdocMatch[0]
        .split('\n')
        .map(line => line.replace(/^\s*\*\s?/, '').trim())
        .filter(line => line && !line.startsWith('/'))
        .join(' ')
        .substring(0, 200);
    }
  }
  
  // Python docstring
  if (lang === 'python') {
    const docstringMatch = code.match(/"""[\s\S]*?"""|'''[\s\S]*?'''/);
    if (docstringMatch) {
      return docstringMatch[0].replace(/["']{3}/g, '').trim().substring(0, 200);
    }
  }
  
  return '';
}

/**
 * Format code with basic beautification
 * Normalize indentation, remove trailing spaces
 */
export function beautifyCode(code, indentSize = 2) {
  if (!code || typeof code !== 'string') return '';
  
  const indent = ' '.repeat(indentSize);
  let result = '';
  let indentLevel = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const prevChar = code[i - 1];
    const nextChar = code[i + 1];
    
    // Track string state
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
    
    // Skip if inside string
    if (inString) {
      result += char;
      continue;
    }
    
    // Handle newlines
    if (char === '\n') {
      result += '\n';
      continue;
    }
    
    // Skip multiple spaces (collapse to single)
    if (char === ' ' && prevChar === ' ') {
      continue;
    }
    
    result += char;
  }
  
  return result.trim();
}

export default {
  detectLanguage,
  analyzeCode,
  extractIdentifiers,
  extractDescription,
  beautifyCode
};
