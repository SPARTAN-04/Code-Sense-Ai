import express from 'express';
import { handleGithubWebhook } from '../controllers/webhook.controller.js';

const router = express.Router();

/**
 * Test route
 */
router.get('/test', (req, res) => {
  console.log('✅ Webhook test route hit');

  return res.status(200).json({
    success: true,
    message: 'Webhook route working correctly',
  });
});

/**
 * GitHub webhook route
 */
router.post('/github', handleGithubWebhook);

export default router;