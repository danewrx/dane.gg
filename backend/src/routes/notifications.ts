import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';

const router = Router();

/**
 * POST /api/notifications/send
 * Send a notification to Ntfy (admin only)
 * 
 * Request body:
 * {
 *   "message": "Your notification message",
 *   "title": "Optional title",
 *   "priority": 3, // 1-5, optional, default: 3
 *   "tags": ["tag1", "tag2"], // optional
 *   "topic": "optional-topic" // optional, defaults to NTFY_TOPIC env var
 * }
 */
router.post('/send', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { message, title, priority, tags, topic } = req.body;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required and must be a string'
      });
    }

    if (priority !== undefined) {
      if (typeof priority !== 'number' || priority < 1 || priority > 5) {
        return res.status(400).json({
          error: 'Priority must be a number between 1 and 5'
        });
      }
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags) || !tags.every(tag => typeof tag === 'string')) {
        return res.status(400).json({
          error: 'Tags must be an array of strings'
        });
      }
    }

    // Check if Ntfy is configured (either topic provided or NTFY_TOPIC env var set)
    const finalTopic = topic || process.env.NTFY_TOPIC;
    if (!finalTopic) {
      return res.status(400).json({
        error: 'No topic provided and NTFY_TOPIC environment variable is not set'
      });
    }

    // Send notification
    const success = await NotificationService.send(
      message,
      title,
      priority || 3,
      tags,
      finalTopic
    );

    if (success) {
      res.json({
        success: true,
        message: 'Notification sent successfully',
        topic: finalTopic
      });
    } else {
      res.status(500).json({
        error: 'Failed to send notification'
      });
    }
  } catch (error: any) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/notifications/status
 * Check if notification service is configured (admin only)
 */
router.get('/status', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const isConfigured = NotificationService.isConfigured();
    const defaultTopic = process.env.NTFY_TOPIC || null;
    const ntfyUrl = process.env.NTFY_URL || 'https://ntfy.sh';

    res.json({
      configured: isConfigured,
      defaultTopic: defaultTopic,
      ntfyUrl: ntfyUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error checking notification status:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;

