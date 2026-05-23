import express from 'express';
import {
  requestMagicLink,
  verifyMagicLink,
  verifyToken,
  getCurrentUser,
  updateUserProfile
} from '../controllers/auth.js';

const router = express.Router();

// Public routes
router.post('/magic-link/request', requestMagicLink);
router.post('/magic-link/verify', verifyMagicLink);

// Protected routes
router.get('/me', verifyToken, getCurrentUser);
router.patch('/me', verifyToken, updateUserProfile);

export default router;
