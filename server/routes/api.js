import express from 'express';
import {
  saveSnippet,
  transformNote,
  renderPostcard,
  getSnippet,
  listUserSnippets
} from '../controllers/engine.js';
import { verifyToken } from '../controllers/auth.js';
import authRoutes from './auth.js';
import storyRoutes from './stories.js';
import exportRoutes from './exports.js';

const router = express.Router();

// ========== AUTH ROUTES ==========
router.use('/auth', authRoutes);

// ========== SNIPPET ROUTES ==========
router.post('/snippets', saveSnippet);
router.get('/snippets/:userId', listUserSnippets);
router.get('/snippet/:snippetId', getSnippet);

// ========== TRANSFORMATION ROUTES ==========
router.post('/transform/story', transformNote);
router.post('/render/postcard', renderPostcard);

// ========== STORY ROUTES ==========
router.use('/stories', storyRoutes);

// ========== EXPORT ROUTES ==========
router.use('/exports', exportRoutes);

export default router;
