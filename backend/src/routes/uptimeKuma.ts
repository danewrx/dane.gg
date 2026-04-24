import { logger } from '../utils/logger';
import { Router } from 'express';
import { UptimeKumaService } from '../services/uptimeKumaService';
import { ConfigService } from '../services/config';
import { requireSession } from '../middleware/auth';

const router = Router();

function initializeUptimeKuma() {
	try {
		const baseUrl = process.env.UPTIME_KUMA_URL;
		const apiKey = process.env.UPTIME_KUMA_API_KEY;

		if (baseUrl) {
			UptimeKumaService.initialize(baseUrl, apiKey || undefined);
			logger.info('Uptime Kuma service initialized');
		} else {
			logger.warn('UPTIME_KUMA_URL environment variable not set.');
		}
	} catch (error) {
		logger.error('Error initializing Uptime Kuma service:', error);
	}
}

initializeUptimeKuma();

// Get all available monitors
router.get('/monitors', requireSession, async (req, res) => {
	try {
		const baseUrl = process.env.UPTIME_KUMA_URL;

		if (!baseUrl) {
			return res.status(400).json({
				success: false,
				error: 'Uptime Kuma not configured',
				message:
					'UPTIME_KUMA_URL environment variable is not set. Please set it in your environment configuration.'
			});
		}

		const apiKey = process.env.UPTIME_KUMA_API_KEY;
		UptimeKumaService.initialize(baseUrl, apiKey || undefined);

		const monitors = await UptimeKumaService.getAllMonitors();

		res.json({
			success: true,
			data: monitors
		});
	} catch (error: any) {
		logger.error('Error fetching monitors:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch monitors',
			message: error.message || 'Unknown error'
		});
	}
});

// Get status for selected monitors (public endpoint)
router.get('/status', async (req, res) => {
	try {
		const baseUrl = process.env.UPTIME_KUMA_URL;

		if (!baseUrl) {
			return res.json({
				success: true,
				data: []
			});
		}

		const apiKey = process.env.UPTIME_KUMA_API_KEY;
		UptimeKumaService.initialize(baseUrl, apiKey || undefined);

		let selectedMonitorIds = await ConfigService.get('uptime_kuma_selected_monitors');

		if (selectedMonitorIds === null || selectedMonitorIds === undefined) {
			selectedMonitorIds = [];
		}

		if (!Array.isArray(selectedMonitorIds) || selectedMonitorIds.length === 0) {
			return res.json({
				success: true,
				data: []
			});
		}

		const monitors = await UptimeKumaService.getMonitorStatus(selectedMonitorIds);

		res.json({
			success: true,
			data: monitors
		});
	} catch (error: any) {
		logger.error('Error fetching monitor status:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch monitor status',
			message: error.message || 'Unknown error'
		});
	}
});

// Get selected monitor IDs
router.get('/selected', requireSession, async (req, res) => {
	try {
		let selectedMonitorIds = await ConfigService.get('uptime_kuma_selected_monitors');

		if (selectedMonitorIds === null || selectedMonitorIds === undefined) {
			selectedMonitorIds = [];
		}

		if (!Array.isArray(selectedMonitorIds)) {
			selectedMonitorIds = [];
		}

		res.json({
			success: true,
			data: selectedMonitorIds
		});
	} catch (error: any) {
		logger.error('Error fetching selected monitors:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch selected monitors'
		});
	}
});

// Update selected monitor IDs
router.put('/selected', requireSession, async (req, res) => {
	try {
		const { monitorIds, customNames } = req.body;

		if (!Array.isArray(monitorIds)) {
			return res.status(400).json({
				success: false,
				error: 'monitorIds must be an array'
			});
		}

		const baseUrl = process.env.UPTIME_KUMA_URL;
		const apiKey = process.env.UPTIME_KUMA_API_KEY;
		if (baseUrl) {
			UptimeKumaService.initialize(baseUrl, apiKey || undefined);
		}

		const validIds = monitorIds.filter((id) => typeof id === 'number' && id > 0);

		await ConfigService.set('uptime_kuma_selected_monitors', validIds, 'json');

		if (baseUrl && validIds.length > 0) {
			try {
				const monitors = await UptimeKumaService.getMonitorStatus(validIds);

				if (customNames && typeof customNames === 'object') {
					for (const monitor of monitors) {
						if (customNames[monitor.id] !== undefined) {
							monitor.customName = customNames[monitor.id] || undefined;
						}
					}
				}

				await UptimeKumaService.saveMonitorsToCache(monitors);
				logger.info(`Updated cache with ${monitors.length} selected monitors`);
			} catch (error: any) {
				logger.error('Error updating cache with selected monitors:', error.message);
			}
		} else if (validIds.length === 0) {
			try {
				await UptimeKumaService.clearCache();
				logger.info('Cleared cache (no monitors selected)');
			} catch (error: any) {
				logger.error('Error clearing cache:', error.message);
			}
		}

		res.json({
			success: true,
			data: validIds,
			message: 'Selected monitors updated successfully'
		});
	} catch (error: any) {
		logger.error('Error updating selected monitors:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update selected monitors',
			message: error.message || 'Unknown error'
		});
	}
});

// Update custom names for monitors
router.put('/custom-names', requireSession, async (req, res) => {
	try {
		const { customNames } = req.body;

		if (!customNames || typeof customNames !== 'object') {
			return res.status(400).json({
				success: false,
				error: 'customNames must be an object mapping monitor IDs to custom names'
			});
		}

		const baseUrl = process.env.UPTIME_KUMA_URL;
		const apiKey = process.env.UPTIME_KUMA_API_KEY;
		if (baseUrl) {
			UptimeKumaService.initialize(baseUrl, apiKey || undefined);
		}

		await UptimeKumaService.updateCustomNames(customNames);

		res.json({
			success: true,
			message: 'Custom names updated successfully'
		});
	} catch (error: any) {
		logger.error('Error updating custom names:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update custom names',
			message: error.message || 'Unknown error'
		});
	}
});

// Update Uptime Kuma configuration
router.put('/config', requireSession, async (req, res) => {
	try {
		res.status(400).json({
			success: false,
			error: 'Configuration is read-only',
			message:
				'Uptime Kuma URL and API key must be set via environment variables (UPTIME_KUMA_URL and UPTIME_KUMA_API_KEY). Please update your environment configuration and restart the server.'
		});
	} catch (error: any) {
		logger.error('Error updating Uptime Kuma config:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update configuration',
			message: error.message || 'Unknown error'
		});
	}
});

// Get Uptime Kuma configuration
router.get('/config', requireSession, async (req, res) => {
	try {
		const baseUrl = process.env.UPTIME_KUMA_URL || '';
		const apiKey = process.env.UPTIME_KUMA_API_KEY || '';

		res.json({
			success: true,
			data: {
				baseUrl,
				apiKey: apiKey ? '***' : '',
				isConfigured: !!baseUrl
			}
		});
	} catch (error: any) {
		logger.error('Error fetching Uptime Kuma config:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch configuration'
		});
	}
});

// Test connection to Uptime Kuma instance
router.get('/test-connection', requireSession, async (req, res) => {
	try {
		const baseUrl = process.env.UPTIME_KUMA_URL;
		const apiKey = process.env.UPTIME_KUMA_API_KEY;

		if (!baseUrl) {
			return res.json({
				success: true,
				data: {
					connected: false,
					message: 'Uptime Kuma URL not configured'
				}
			});
		}

		UptimeKumaService.initialize(baseUrl, apiKey || undefined);
		const result = await UptimeKumaService.testConnection();

		res.json({
			success: true,
			data: result
		});
	} catch (error: any) {
		logger.error('Error testing connection:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to test connection',
			message: error.message || 'Unknown error'
		});
	}
});

export default router;
