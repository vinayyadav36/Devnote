import express from 'express';
import { transformNote } from '../controllers/engine.js';
import { verifyToken } from '../controllers/auth.js';

const router = express.Router();

// POST /api/v1/stories - Create story from markdown
router.post('/', verifyToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { markdown, title } = req.body;

    if (!markdown) {
      return res.status(400).json({
        error: 'Markdown content required'
      });
    }

    // Pass to engine controller with user context
    const reqWithUser = {
      body: {
        ...req.body,
        userId,
        storyId: `sty_${Date.now()}`
      }
    };

    const resProxy = {
      status: (code) => ({
        json: (data) => {
          res.status(code).json(data);
        }
      })
    };

    await transformNote(reqWithUser, resProxy);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to create story'
    });
  }
});

export default router;
