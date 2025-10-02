import { Router } from 'express';
import { WidgetService } from '../services/widgetService';

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

    // Update status in database using unified widget service
    const data = {
      status,
      lastUpdate: new Date().toISOString()
    };

    const success = await WidgetService.updateWidgetData('discord-widget', data);

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

/**
 * POST /api/webhooks/services/update
 * Webhook endpoint to update services status
 */
router.post('/services/update', validateWebhookAuth, async (req, res) => {
  try {
    const { heartbeat, monitor } = req.body;

    if (!monitor || !heartbeat) {
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    const service = monitor.name.toLowerCase();
    const status = heartbeat.status;

    // Update services status in database
    const data = {
      services: {
        [service]: {
          status: status === 1 ? 1 : 0,
          lastUpdate: heartbeat.time || new Date().toISOString()
        }
      },
      lastUpdated: new Date().toISOString()
    };

    const success = await WidgetService.updateWidgetData('services_status', data);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Services status updated successfully',
        service,
        status,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ error: 'Failed to update services status' });
    }
  } catch (error) {
    console.error('Services status webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/webhooks/twitter/update
 * Webhook endpoint to update latest tweet
 */
router.post('/twitter/update', validateWebhookAuth, async (req, res) => {
  try {
    const { accountName, username, profilePicture, caption, postedTime } = req.body;

    if (!accountName || !username || !caption || !postedTime) {
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    // Update latest tweet in database
    const data = {
      accountName,
      username,
      profilePicture,
      text: caption,
      createdAt: postedTime,
      lastUpdate: new Date().toISOString()
    };

    const success = await WidgetService.updateWidgetData('latest_tweet', data);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Twitter status updated successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ error: 'Failed to update Twitter status' });
    }
  } catch (error) {
    console.error('Twitter webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router;
