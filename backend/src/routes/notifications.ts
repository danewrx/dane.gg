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
import { mergeNtfyAppearance, NTFY_APPEARANCE_OPTIONAL_DEFAULTS } from '../services/ntfyPublish';

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
		const { message, title, priority, tags, topic, useTestPreset, appearance } = req.body;

		if (useTestPreset === true) {
			if (!NotificationService.isConfigured()) {
				return res.status(400).json({
					error: 'NTFY_TOPIC environment variable is not set'
				});
			}
			const success = await NotificationService.sendTestNotification();
			if (!success) {
				return res.status(500).json({ error: 'Failed to send test notification' });
			}
			return res.json({
				success: true,
				message: 'Test notification sent using saved template',
				topic: process.env.NTFY_TOPIC
			});
		}

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
			if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) {
				return res.status(400).json({
					error: 'Tags must be an array of strings'
				});
			}
		}

		const finalTopic = topic || process.env.NTFY_TOPIC;
		if (!finalTopic) {
			return res.status(400).json({
				error: 'No topic provided and NTFY_TOPIC environment variable is not set'
			});
		}

		let success: boolean;
		if (appearance && typeof appearance === 'object') {
			const resolvedAppearance = mergeNtfyAppearance(
				{
					title: typeof title === 'string' ? title : 'Notification',
					body: message,
					priority: typeof priority === 'number' ? priority : 3,
					tags: Array.isArray(tags) ? tags : [],
					...NTFY_APPEARANCE_OPTIONAL_DEFAULTS
				},
				appearance
			);
			success = await NotificationService.sendWithAppearance(
				message,
				resolvedAppearance,
				finalTopic
			);
		} else {
			success = await NotificationService.send(message, title, priority || 3, tags, finalTopic);
		}

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
