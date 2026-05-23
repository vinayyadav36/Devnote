import express from 'express';
import {
  saveSnippet,
  transformNote,
  renderPostcard,
  getSnippet,
  listUserSnippets
} from '../controllers/engine.js';

const router = express.Router();

// Snippet routes
router.post('/snippets', saveSnippet);
router.get('/snippets/:userId', listUserSnippets);
router.get('/snippet/:snippetId', getSnippet);

// Transformation routes
router.post('/transform/story', transformNote);
router.post('/render/postcard', renderPostcard);

export default router;
