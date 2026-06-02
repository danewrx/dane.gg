import { logger } from '../utils/logger';
import { Router, Request, Response } from 'express';
import { requireSession } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';
import { ConfigService } from '../services/config';
import {
	DEFAULT_NOTIFICATION_SETTINGS,
	getNotificationSettings,
	invalidateNotificationSettingsCache,
	NTFY_SETTINGS_KEY,
	validateNotificationSettings
} from '../services/notificationSettings';
import {
	executeCustomSend,
	executeTestPresetSend,
	parseSendNotificationRequest
} from '../validation/notificationSendPayload';

const router = Router();

/**
 * GET /api/notifications/settings
 * Server connection status + editable notification preferences (authenticated)
 */
router.get('/settings', requireSession, async (_req: Request, res: Response) => {
	try {
		const settings = await getNotificationSettings();

		res.json({
			configured: NotificationService.isConfigured(),
			defaultTopic: process.env.NTFY_TOPIC || null,
			ntfyUrl: (process.env.NTFY_URL || 'https://ntfy.sh').replace(/\/$/, ''),
			authConfigured: NotificationService.hasAuthConfigured(),
			envNote:
				'Topic, server URL, and auth tokens are set via environment variables on the server (not stored in the database).',
			settings,
			defaults: structuredClone(DEFAULT_NOTIFICATION_SETTINGS),
			timestamp: new Date().toISOString()
		});
	} catch (error: unknown) {
		logger.error('Error loading notification settings:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * PUT /api/notifications/settings
 * Save notification preferences to site_config (authenticated)
 */
router.put('/settings', requireSession, async (req: Request, res: Response) => {
	try {
		const { settings } = req.body as { settings?: unknown };
		if (!settings || typeof settings !== 'object') {
			return res.status(400).json({ error: 'settings object is required' });
		}

		const validated = validateNotificationSettings(settings);
		await ConfigService.set(NTFY_SETTINGS_KEY, validated, 'json');
		invalidateNotificationSettingsCache();

		res.json({
			success: true,
			settings: validated,
			timestamp: new Date().toISOString()
		});
	} catch (error: unknown) {
		logger.error('Error saving notification settings:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * POST /api/notifications/send
 * Send a notification to Ntfy (authenticated users only)
 */
router.post('/send', requireSession, async (req: Request, res: Response) => {
	try {
		const parsed = parseSendNotificationRequest(req.body);
		if (!parsed.ok) {
			return res.status(400).json({ error: parsed.error });
		}

		const result =
			parsed.request.kind === 'test'
				? await executeTestPresetSend()
				: await executeCustomSend(parsed.request);

		if (result.status === 200) {
			return res.json(result.body);
		}

		return res.status(result.status).json({ error: result.error });
	} catch (error: unknown) {
		logger.error('Error sending notification:', error);
		res.status(500).json({
			error: 'Internal server error'
		});
	}
});

/**
 * GET /api/notifications/status
 * Check if notification service is configured (authenticated users only)
 */
router.get('/status', requireSession, async (_req: Request, res: Response) => {
	try {
		const settings = await getNotificationSettings();

		res.json({
			configured: NotificationService.isConfigured(),
			defaultTopic: process.env.NTFY_TOPIC || null,
			ntfyUrl: (process.env.NTFY_URL || 'https://ntfy.sh').replace(/\/$/, ''),
			authConfigured: NotificationService.hasAuthConfigured(),
			settings,
			timestamp: new Date().toISOString()
		});
	} catch (error: unknown) {
		logger.error('Error checking notification status:', error);
		res.status(500).json({
			error: 'Internal server error'
		});
	}
});

export default router;
