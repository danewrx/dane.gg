import { Router } from 'express';
import { DiscordStatusService } from '../services/discordStatusService';
import { TweetService } from '../services/tweetService';

const router = Router();

/**
 * Middleware to validate webhook authentication
 */
function validateWebhookAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.WEBHOOK_AUTH_TOKEN;
  const expectedAuth = `Bearer ${expectedToken}`;

  if (!authHeader || authHeader !== expectedAuth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * POST /api/webhooks/discord-status/update
 * Webhook endpoint to update Discord status
 */
router.post('/discord-status/update', validateWebhookAuth, async (req, res) => {
  try {
    const { status } = req.body;

    // Validate input
    if (typeof status !== 'number' || ![0, 1].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status value. Must be 0 (offline) or 1 (online)' 
      });
    }

    const success = await DiscordStatusService.updateStatus(status);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Discord status updated successfully',
        status,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ error: 'Failed to update Discord status' });
    }
  } catch (error) {
    console.error('Discord status webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
