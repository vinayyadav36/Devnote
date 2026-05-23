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
import CanvasTemplateController from '../controllers/canvasTemplates.js';

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

// ========== CANVAS TEMPLATE ROUTES ==========
router.post('/admin/canvas-templates', CanvasTemplateController.saveTemplate);
router.get('/admin/canvas-templates', CanvasTemplateController.getTemplates);
router.get('/admin/canvas-templates/:id', CanvasTemplateController.getTemplate);
router.put('/admin/canvas-templates/:id', CanvasTemplateController.updateTemplate);
router.delete('/admin/canvas-templates/:id', CanvasTemplateController.deleteTemplate);

// ========== EXPORT ROUTES ==========
router.use('/exports', exportRoutes);

export default router;
