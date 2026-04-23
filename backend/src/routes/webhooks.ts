import { logger } from '../utils/logger';
import { Router } from 'express';
import { DiscordStatusService } from '../services/discordStatusService';
import { requireAuth, requireWebhookAccess } from '../middleware/auth';

const router = Router();

/**
 * POST /webhooks/discord-status/update
 */
router.post('/discord-status/update', requireAuth, requireWebhookAccess, async (req, res) => {
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
		logger.error('Discord status webhook error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
