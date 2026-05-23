import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_ROOT = path.join(__dirname, '../storage');

// ========== ATOMIC FILE OPERATIONS ==========
/**
 * Atomic write: write to temp file, then rename
 * Prevents corruption from partial writes (internal)
 */
async function atomicWrite(filePath, data) {
  const tempPath = `${filePath}.tmp`;
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write to temp file
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
    
    // Atomic rename
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file on failure
    try {
      await fs.unlink(tempPath);
    } catch (e) {}
    throw error;
  }
}

/**
 * Atomic write with full path resolution
 * Used by public APIs
 */
export async function atomicWriteFile(relativePath, data) {
  const fullPath = path.join(STORAGE_ROOT, relativePath);
  return atomicWrite(fullPath, data);
}

/**
 * Read file as string
 */
export async function readFile(filePath) {
  const fullPath = path.join(STORAGE_ROOT, filePath);
  return fs.readFile(fullPath, 'utf8');
}

/**
 * Delete file
 */
export async function deleteFile(filePath) {
  const fullPath = path.join(STORAGE_ROOT, filePath);
  return fs.unlink(fullPath);
}

/**
 * Get all files in a collection as objects
 */
export async function getCollection(collectionName) {
  const collectionPath = path.join(STORAGE_ROOT, collectionName);
  const files = await listDir(collectionPath).catch(() => []);
  const items = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = await readJSON(path.join(collectionPath, file));
      if (data) items.push(data);
    } catch (error) {
      console.warn(`Failed to read ${file}:`, error.message);
    }
  }

  return items;
}

/**
 * List all files in a directory
 */
async function listDir(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    return files.filter(f => f.endsWith('.json') && !f.endsWith('.tmp'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// ========== USER STORAGE ==========
export const userStorage = {
  async create(userData) {
    const userId = `usr_${uuidv4().slice(0, 8)}`;
    const filePath = path.join(STORAGE_ROOT, 'users', `${userId}.json`);
    
    const user = {
      userId,
      username: userData.username,
      email: userData.email,
      passwordHash: userData.passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        defaultTheme: 'nord_dark',
        watermarkText: userData.username,
        ...userData.settings
      }
    };
    
    await atomicWrite(filePath, user);
    return user;
  },

  async get(userId) {
    const filePath = path.join(STORAGE_ROOT, 'users', `${userId}.json`);
    return readJSON(filePath);
  },

  async getByEmail(email) {
    const usersDir = path.join(STORAGE_ROOT, 'users');
    const files = await listDir(usersDir);
    
    for (const file of files) {
      const user = await readJSON(path.join(usersDir, file));
      if (user && user.email === email) {
        return user;
      }
    }
    return null;
  },

  async update(userId, updates) {
    const user = await this.get(userId);
    if (!user) throw new Error('User not found');
    
    const updated = {
      ...user,
      ...updates,
      userId: user.userId, // Prevent ID change
      createdAt: user.createdAt, // Prevent creation date change
      updatedAt: new Date().toISOString()
    };
    
    const filePath = path.join(STORAGE_ROOT, 'users', `${userId}.json`);
    await atomicWrite(filePath, updated);
    return updated;
  }
};

// ========== SNIPPET STORAGE ==========
export const snippetStorage = {
  async create(snippetData, userId) {
    const snippetId = `snp_${uuidv4().slice(0, 8)}`;
    const filePath = path.join(STORAGE_ROOT, 'snippets', `${snippetId}.json`);
    
    const snippet = {
      snippetId,
      userId,
      title: snippetData.title,
      code: snippetData.code,
      language: snippetData.language || 'plaintext',
      description: snippetData.description || '',
      tags: snippetData.tags || [],
      isPublic: snippetData.isPublic !== undefined ? snippetData.isPublic : false,
      metrics: {
        linesOfCode: (snippetData.code || '').split('\n').length,
        hasComments: /\/\/|\/\*|\#|--|\/\*/.test(snippetData.code || '')
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await atomicWrite(filePath, snippet);
    return snippet;
  },

  async get(snippetId) {
    const filePath = path.join(STORAGE_ROOT, 'snippets', `${snippetId}.json`);
    return readJSON(filePath);
  },

  async getUserSnippets(userId) {
    const snippetsDir = path.join(STORAGE_ROOT, 'snippets');
    const files = await listDir(snippetsDir);
    const snippets = [];
    
    for (const file of files) {
      const snippet = await readJSON(path.join(snippetsDir, file));
      if (snippet && snippet.userId === userId) {
        snippets.push(snippet);
      }
    }
    
    return snippets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  async update(snippetId, updates, userId) {
    const snippet = await this.get(snippetId);
    if (!snippet) throw new Error('Snippet not found');
    if (snippet.userId !== userId) throw new Error('Unauthorized');
    
    const updated = {
      ...snippet,
      ...updates,
      snippetId: snippet.snippetId,
      userId: snippet.userId,
      createdAt: snippet.createdAt,
      updatedAt: new Date().toISOString(),
      metrics: {
        linesOfCode: (updates.code || snippet.code).split('\n').length,
        hasComments: /\/\/|\/\*|\#|--|\/\*/.test(updates.code || snippet.code)
      }
    };
    
    const filePath = path.join(STORAGE_ROOT, 'snippets', `${snippetId}.json`);
    await atomicWrite(filePath, updated);
    return updated;
  },

  async delete(snippetId, userId) {
    const snippet = await this.get(snippetId);
    if (!snippet) throw new Error('Snippet not found');
    if (snippet.userId !== userId) throw new Error('Unauthorized');
    
    const filePath = path.join(STORAGE_ROOT, 'snippets', `${snippetId}.json`);
    await fs.unlink(filePath);
    return true;
  }
};

// ========== STORY STORAGE ==========
export const storyStorage = {
  async create(storyData, userId) {
    const storyId = `sty_${uuidv4().slice(0, 8)}`;
    const filePath = path.join(STORAGE_ROOT, 'stories', `${storyId}.json`);
    
    const story = {
      storyId,
      userId,
      sourceSnippetId: storyData.sourceSnippetId,
      title: storyData.title,
      slides: storyData.slides || [],
      exportHistory: {
        platforms: [],
        lastExported: null
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await atomicWrite(filePath, story);
    return story;
  },

  async get(storyId) {
    const filePath = path.join(STORAGE_ROOT, 'stories', `${storyId}.json`);
    return readJSON(filePath);
  },

  async getUserStories(userId) {
    const storiesDir = path.join(STORAGE_ROOT, 'stories');
    const files = await listDir(storiesDir);
    const stories = [];
    
    for (const file of files) {
      const story = await readJSON(path.join(storiesDir, file));
      if (story && story.userId === userId) {
        stories.push(story);
      }
    }
    
    return stories.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  async update(storyId, updates, userId) {
    const story = await this.get(storyId);
    if (!story) throw new Error('Story not found');
    if (story.userId !== userId) throw new Error('Unauthorized');
    
    const updated = {
      ...story,
      ...updates,
      storyId: story.storyId,
      userId: story.userId,
      createdAt: story.createdAt,
      updatedAt: new Date().toISOString()
    };
    
    const filePath = path.join(STORAGE_ROOT, 'stories', `${storyId}.json`);
    await atomicWrite(filePath, updated);
    return updated;
  },

  async delete(storyId, userId) {
    const story = await this.get(storyId);
    if (!story) throw new Error('Story not found');
    if (story.userId !== userId) throw new Error('Unauthorized');
    
    const filePath = path.join(STORAGE_ROOT, 'stories', `${storyId}.json`);
    await fs.unlink(filePath);
    return true;
  }
};

// ========== EXPORT STORAGE ==========
export const exportStorage = {
  async create(exportData, userId) {
    const exportId = `exp_${uuidv4().slice(0, 8)}`;
    const filePath = path.join(STORAGE_ROOT, 'exports', `${exportId}.json`);
    
    const record = {
      exportId,
      userId,
      snippetId: exportData.snippetId,
      storyId: exportData.storyId,
      format: exportData.format,
      content: exportData.content,
      shareToken: `pub_${uuidv4()}`,
      isPublic: exportData.isPublic || false,
      createdAt: new Date().toISOString(),
      expiresAt: exportData.expiresAt || null
    };
    
    await atomicWrite(filePath, record);
    return record;
  },

  async getByToken(shareToken) {
    const exportsDir = path.join(STORAGE_ROOT, 'exports');
    const files = await listDir(exportsDir);
    
    for (const file of files) {
      const record = await readJSON(path.join(exportsDir, file));
      if (record && record.shareToken === shareToken && record.isPublic) {
        return record;
      }
    }
    return null;
  },

  async getUserExports(userId) {
    const exportsDir = path.join(STORAGE_ROOT, 'exports');
    const files = await listDir(exportsDir);
    const exports = [];
    
    for (const file of files) {
      const record = await readJSON(path.join(exportsDir, file));
      if (record && record.userId === userId) {
        exports.push(record);
      }
    }
    
    return exports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
};

export default {
  userStorage,
  snippetStorage,
  storyStorage,
  exportStorage
};
