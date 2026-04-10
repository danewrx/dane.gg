import { Router } from 'express';
import { ConfigService } from '../services/config';
import { requireSession } from '../middleware/auth';
import { chatService } from '../services/chatService';

const LIVE_BROADCAST_KEYS = new Set([
	'default_weather_type',
	'default_weather_speed',
	'enforce_weather_effects',
	'default_web_neko_type',
	'enforced_web_neko_type',
	'enforce_web_neko',
	'banner_text',
	'banner_enabled',
	'banner_bg_color',
	'banner_text_color',
	'banner_speed',
	'banner_transparent_bg'
]);

const router = Router();

// Get all site configuration
router.get('/', async (req, res) => {
	try {
		const configs = await ConfigService.getAll();

		res.json({
			success: true,
			data: configs
		});
	} catch (error) {
		console.error('❌ Config API Error:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch site configuration'
		});
	}
});

// Get a specific configuration value
router.get('/:key', async (req, res) => {
	try {
		const { key } = req.params;
		const value = await ConfigService.get(key);

		if (value === null) {
			return res.status(404).json({
				success: false,
				error: 'Configuration not found'
			});
		}

		res.json({
			success: true,
			data: {
				key,
				value
			}
		});
	} catch (error) {
		console.error('❌ Config API Error:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch configuration'
		});
	}
});

// Update a configuration value (requires authentication)
router.put('/:key', requireSession, async (req, res) => {
	try {
		const { key } = req.params;
		const { value, dataType = 'string' } = req.body;

		if (value === undefined || value === null) {
			return res.status(400).json({
				success: false,
				error: 'Value is required'
			});
		}

		const result = await ConfigService.set(key, value, dataType);

		if (LIVE_BROADCAST_KEYS.has(key)) {
			chatService.broadcastSiteConfigUpdate();
		}

		res.json({
			success: true,
			data: result
		});
	} catch (error) {
		console.error('❌ Config API Error:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update configuration'
		});
	}
});

export default router;
