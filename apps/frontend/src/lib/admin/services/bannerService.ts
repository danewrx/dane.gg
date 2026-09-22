import { logger } from '$lib/logger';
export interface BannerConfig {
	text: string;
	enabled: boolean;
	backgroundColor: string;
	textColor: string;
	speed: number;
	transparentBackground: boolean;
}

const API_BASE = '/api/config';

// Banner config keys in site_config table
const BANNER_KEYS = {
	TEXT: 'banner_text',
	ENABLED: 'banner_enabled',
	BG_COLOR: 'banner_bg_color',
	TEXT_COLOR: 'banner_text_color',
	SPEED: 'banner_speed',
	TRANSPARENT_BG: 'banner_transparent_bg'
};

/**
 * Get the current banner configuration (public endpoint)
 */
export async function getBanner(): Promise<BannerConfig | null> {
	try {
		const response = await fetch(API_BASE);
		const result = await response.json();

		if (!result.success || !result.data) {
			return null;
		}

		const configs = result.data;

		// Check if banner is enabled
		if (!configs[BANNER_KEYS.ENABLED]) {
			return null;
		}

		return {
			text: configs[BANNER_KEYS.TEXT] || '',
			enabled: configs[BANNER_KEYS.ENABLED] || false,
			backgroundColor: configs[BANNER_KEYS.BG_COLOR] || '#000000',
			textColor: configs[BANNER_KEYS.TEXT_COLOR] || '#ffffff',
			speed: configs[BANNER_KEYS.SPEED] || 50,
			transparentBackground: configs[BANNER_KEYS.TRANSPARENT_BG] || false
		};
	} catch (error) {
		logger.error('Error fetching banner:', error);
		return null;
	}
}

/**
 * Get banner configuration for admin (requires authentication)
 */
export async function getBannerConfig(): Promise<BannerConfig> {
	try {
		const response = await fetch(API_BASE, {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to load banner configuration');
		}

		const result = await response.json();

		if (!result.success || !result.data) {
			// Return defaults if no config exists
			return {
				text: '',
				enabled: false,
				backgroundColor: '#000000',
				textColor: '#ffffff',
				speed: 50,
				transparentBackground: false
			};
		}

		const configs = result.data;

		return {
			text: configs[BANNER_KEYS.TEXT] || '',
			enabled: configs[BANNER_KEYS.ENABLED] || false,
			backgroundColor: configs[BANNER_KEYS.BG_COLOR] || '#000000',
			textColor: configs[BANNER_KEYS.TEXT_COLOR] || '#ffffff',
			speed: configs[BANNER_KEYS.SPEED] || 50,
			transparentBackground: configs[BANNER_KEYS.TRANSPARENT_BG] || false
		};
	} catch (error) {
		logger.error('Error fetching banner config:', error);
		throw error;
	}
}

/**
 * Save banner configuration (requires authentication)
 */
export async function saveBannerConfig(config: BannerConfig): Promise<BannerConfig> {
	try {
		// Save each config value separately
		const updates = [
			{ key: BANNER_KEYS.TEXT, value: config.text, dataType: 'string' },
			{ key: BANNER_KEYS.ENABLED, value: config.enabled, dataType: 'boolean' },
			{ key: BANNER_KEYS.BG_COLOR, value: config.backgroundColor, dataType: 'string' },
			{ key: BANNER_KEYS.TEXT_COLOR, value: config.textColor, dataType: 'string' },
			{ key: BANNER_KEYS.SPEED, value: config.speed, dataType: 'number' },
			{ key: BANNER_KEYS.TRANSPARENT_BG, value: config.transparentBackground, dataType: 'boolean' }
		];

		await Promise.all(
			updates.map(async ({ key, value, dataType }) => {
				const response = await fetch(`${API_BASE}/${key}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					credentials: 'include',
					body: JSON.stringify({ value, dataType })
				});

				if (!response.ok) {
					throw new Error(`Failed to save ${key}`);
				}
			})
		);

		return config;
	} catch (error) {
		logger.error('Error saving banner config:', error);
		throw error;
	}
}
