import { logger } from '$lib/logger';
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export const SITE_CONFIG_UPDATED_EVENT = 'siteConfigUpdated';

export interface SiteConfig {
	default_weather_type: 'none' | 'rain' | 'snow';
	default_weather_speed: number;
	enforce_weather_effects: boolean;
	default_web_neko_type: string;
	/** Skin for everyone when `enforce_web_neko` is true. */
	enforced_web_neko_type: string;
	/** When true, ignore localStorage and use `enforced_web_neko_type`. */
	enforce_web_neko: boolean;
	site_title: string;
	site_description: string;
}

// Default configuration (fallback)
const DEFAULT_CONFIG: SiteConfig = {
	default_weather_type: 'none',
	default_weather_speed: 1.0,
	enforce_weather_effects: false,
	default_web_neko_type: 'white',
	enforced_web_neko_type: 'white',
	enforce_web_neko: false,
	site_title: 'dane.gg - Software Engineer & Designer',
	site_description:
		"Hi, I'm Dane! I'm a software engineer & freelance designer from Manchester, UK."
};

// Store for site configuration
export const siteConfig = writable<SiteConfig>(DEFAULT_CONFIG);
export const configLoading = writable<boolean>(false);
export const configError = writable<string | null>(null);

// Derived stores for specific config values
export const defaultWeatherType = derived(siteConfig, ($config) => $config.default_weather_type);
export const defaultWeatherSpeed = derived(siteConfig, ($config) => $config.default_weather_speed);
export const enforceWeatherEffects = derived(
	siteConfig,
	($config) => $config.enforce_weather_effects
);
export const siteTitle = derived(siteConfig, ($config) => $config.site_title);
export const siteDescription = derived(siteConfig, ($config) => $config.site_description);

/**
 * Load site configuration from the API
 */
export async function loadSiteConfig(): Promise<void> {
	if (!browser) return;

	configLoading.set(true);
	configError.set(null);

	try {
		const response = await fetch('/api/config');

		if (!response.ok) {
			throw new Error(`Failed to fetch site configuration: ${response.statusText}`);
		}

		const data = await response.json();

		if (data.success) {
			siteConfig.set({ ...DEFAULT_CONFIG, ...data.data });
		} else {
			throw new Error(data.error || 'Failed to load site configuration');
		}
	} catch (error) {
		logger.error('Error loading site configuration:', error);
		configError.set(error instanceof Error ? error.message : 'Unknown error');

		// Fall back to default configuration
		siteConfig.set(DEFAULT_CONFIG);
	} finally {
		configLoading.set(false);
	}
}

/**
 * Get a specific configuration value
 */
export async function getConfigValue(key: string): Promise<any> {
	if (!browser) return null;

	try {
		const response = await fetch(`/api/config/${key}`);

		if (!response.ok) {
			throw new Error(`Failed to fetch config value: ${response.statusText}`);
		}

		const data = await response.json();

		if (data.success) {
			return data.data.value;
		} else {
			throw new Error(data.error || 'Failed to load config value');
		}
	} catch (error) {
		logger.error(`Error loading config value '${key}':`, error);
		return null;
	}
}

/**
 * Update a configuration value (admin only)
 */
export async function updateConfigValue(
	key: string,
	value: any,
	dataType: string = 'string'
): Promise<boolean> {
	if (!browser) return false;

	try {
		const response = await fetch(`/api/config/${key}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ value, dataType })
		});

		if (!response.ok) {
			throw new Error(`Failed to update config value: ${response.statusText}`);
		}

		const data = await response.json();

		if (data.success) {
			// Reload the entire configuration to keep it in sync
			await loadSiteConfig();
			return true;
		} else {
			throw new Error(data.error || 'Failed to update config value');
		}
	} catch (error) {
		logger.error(`Error updating config value '${key}':`, error);
		return false;
	}
}

// Initialize configuration on load
if (browser) {
	loadSiteConfig();
}
