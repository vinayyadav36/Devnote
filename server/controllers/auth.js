import fs from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_DIR = path.resolve(dirname(__dirname), 'storage');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const MAGIC_LINK_EXPIRY = 15 * 60 * 1000; // 15 minutes

// In-memory store for magic links (use Redis in production)
const magicLinks = new Map();

/**
 * Generate magic link token for email-based authentication
 */
export async function requestMagicLink(req, res) {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'Valid email address required'
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + MAGIC_LINK_EXPIRY;

    // Store magic link
    magicLinks.set(token, {
      email,
      expiresAt,
      used: false
    });

    // In production, send email here. For MVP, return the link
    const magicLinkUrl = `http://localhost:5173/auth/verify?token=${token}`;

    console.log(`📧 Magic link for ${email}: ${magicLinkUrl}`);

    return res.status(200).json({
      success: true,
      message: 'Magic link sent to email',
      // In MVP, return link for testing. Remove in production.
      magicLink: magicLinkUrl
    });
  } catch (error) {
    console.error('Magic link error:', error);
    return res.status(500).json({
      error: 'Failed to create magic link'
    });
  }
}

/**
 * Verify magic link and create session
 */
export async function verifyMagicLink(req, res) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token required'
      });
    }

    // Check if token exists
    const linkData = magicLinks.get(token);
    if (!linkData) {
      return res.status(401).json({
        error: 'Invalid or expired token'
      });
    }

    // Check expiry
    if (Date.now() > linkData.expiresAt) {
      magicLinks.delete(token);
      return res.status(401).json({
        error: 'Token expired'
      });
    }

    // Check if already used
    if (linkData.used) {
      return res.status(401).json({
        error: 'Token already used'
      });
    }

    // Mark as used
    linkData.used = true;

    // Get or create user
    const userId = await getOrCreateUser(linkData.email);

    // Create JWT token
    const jwtToken = jwt.sign(
      { userId, email: linkData.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Clean up magic link after 1 hour
    setTimeout(() => magicLinks.delete(token), 3600000);

    return res.status(200).json({
      success: true,
      token: jwtToken,
      userId,
      email: linkData.email
    });
  } catch (error) {
    console.error('Verify magic link error:', error);
    return res.status(500).json({
      error: 'Failed to verify token'
    });
  }
}

/**
 * Get or create user from email
 */
async function getOrCreateUser(email) {
  try {
    const usersDir = path.join(STORAGE_DIR, 'users');
    await fs.mkdir(usersDir, { recursive: true });

    // Check if user exists
    const files = await fs.readdir(usersDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readFile(path.join(usersDir, file), 'utf8');
        const user = JSON.parse(data);
        if (user.email === email) {
          return user.userId;
        }
      }
    }

    // Create new user
    const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const username = email.split('@')[0];

    const userFile = {
      userId,
      username,
      email,
      createdAt: new Date().toISOString(),
      settings: {
        defaultTheme: 'dracula_classic',
        watermarkText: username
      }
    };

    await fs.writeFile(
      path.join(usersDir, `${userId}.json`),
      JSON.stringify(userFile, null, 2),
      'utf8'
    );

    return userId;
  } catch (error) {
    console.error('Error getting/creating user:', error);
    throw error;
  }
}

/**
 * Verify JWT token middleware
 */
export function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authorization token required'
      });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token'
    });
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(req, res) {
  try {
    const { userId } = req.user;

    const userFile = path.join(STORAGE_DIR, 'users', `${userId}.json`);
    const data = await fs.readFile(userFile, 'utf8');
    const user = JSON.parse(data);

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    return res.status(404).json({
      error: 'User not found'
    });
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(req, res) {
  try {
    const { userId } = req.user;
    const { username, settings } = req.body;

    const userFile = path.join(STORAGE_DIR, 'users', `${userId}.json`);
    const data = await fs.readFile(userFile, 'utf8');
    const user = JSON.parse(data);

    if (username) user.username = username;
    if (settings) user.settings = { ...user.settings, ...settings };
    user.updatedAt = new Date().toISOString();

    await fs.writeFile(userFile, JSON.stringify(user, null, 2), 'utf8');

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to update profile'
    });
  }
}

export default {
  requestMagicLink,
  verifyMagicLink,
  verifyToken,
  getCurrentUser,
  updateUserProfile
};
