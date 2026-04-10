import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import {
	siteConfig,
	loadSiteConfig,
	SITE_CONFIG_UPDATED_EVENT,
	type SiteConfig
} from './siteConfig';
import { subscribeSiteConfigBroadcast } from '$lib/shared/utils/siteConfigLiveSync';

export type WeatherType = 'none' | 'rain' | 'snow';

// Weather configuration (for UI display)
export const weatherConfig = {
	none: {
		name: 'Disable Weather',
		description: 'No weather effects'
	},
	rain: {
		name: 'Rain',
		description: 'Falling rain with splashes'
	},
	snow: {
		name: 'Snow',
		description: 'Falling snow that accumulates'
	}
};

// Weather settings - start with undefined to indicate not initialized
export const weatherSettings = writable<{
	type: WeatherType;
	speed: number;
} | null>(null);

// Weather particles store
export const weatherParticles = writable<
	Array<{
		id: number;
		x: number;
		y: number;
		vx: number;
		vy: number;
		size: number;
		opacity: number;
		life: number;
		type: 'rain' | 'snow';
	}>
>([]);

// Track if we've initialized weather settings
let weatherInitialized = false;

// Initialize weather from site config and localStorage
if (browser) {
	// Load site configuration first
	loadSiteConfig().then(() => {
		// Subscribe to site config changes
		siteConfig.subscribe((config) => {
			if (config.enforce_weather_effects) {
				// If enforced, use the configured values
				weatherSettings.set({
					type: config.default_weather_type,
					speed: config.default_weather_speed
				});
				console.log(
					'🔒 Using enforced weather settings:',
					config.default_weather_type,
					config.default_weather_speed
				);
			} else if (!weatherInitialized) {
				// Only restore user preferences on first load when not enforced
				const savedWeather = localStorage.getItem('weatherType') as WeatherType;
				const savedSpeed = localStorage.getItem('weatherSpeed');

				console.log('🔄 Restoring weather settings from localStorage:', {
					savedWeather,
					savedSpeed
				});

				let weatherType = config.default_weather_type;
				let weatherSpeed = config.default_weather_speed;

				// Use saved values if they exist and are valid
				if (
					savedWeather &&
					(savedWeather === 'none' || savedWeather === 'rain' || savedWeather === 'snow')
				) {
					weatherType = savedWeather;
					console.log('✅ Using saved weather type:', weatherType);
				} else {
					console.log('📋 Using database default weather type:', weatherType);
				}

				if (savedSpeed) {
					const speed = parseFloat(savedSpeed);
					if (speed >= 0.5 && speed <= 3.0) {
						weatherSpeed = speed;
						console.log('✅ Using saved weather speed:', weatherSpeed);
					} else {
						console.log('📋 Using database default weather speed:', weatherSpeed);
					}
				} else {
					console.log('📋 Using database default weather speed:', weatherSpeed);
				}

				weatherSettings.set({
					type: weatherType,
					speed: weatherSpeed
				});

				weatherInitialized = true;
			}
		});
	});
}

// Track enforcement state for localStorage saving
let isEnforced = false;

// Subscribe to enforcement changes
if (browser) {
	siteConfig.subscribe((config) => {
		isEnforced = config.enforce_weather_effects;
	});
}

// Track if settings were changed by user (not system initialization)
let userChangedSettings = false;

// Subscribe to weather changes and save to localStorage (only when not enforced and user changed)
if (browser) {
	weatherSettings.subscribe((settings) => {
		// Only save to localStorage if weather effects are not enforced AND user changed settings
		if (!isEnforced && userChangedSettings && settings) {
			localStorage.setItem('weatherType', settings.type);
			localStorage.setItem('weatherSpeed', settings.speed.toString());
			console.log('💾 Saved weather settings to localStorage:', settings);
		} else if (isEnforced) {
			console.log('🚫 Weather settings not saved - enforcement is ON');
		} else if (!userChangedSettings) {
			console.log('🚫 Weather settings not saved - system initialization');
		}
	});
}

// Weather control functions
export function setWeatherType(type: WeatherType) {
	userChangedSettings = true; // Mark that user changed settings
	weatherSettings.update((settings) => {
		if (settings) {
			return {
				...settings,
				type
			};
		}
		return { type, speed: 1.0 };
	});
}

export function setWeatherSpeed(speed: number) {
	userChangedSettings = true; // Mark that user changed settings
	weatherSettings.update((settings) => {
		if (settings) {
			return {
				...settings,
				speed: Math.max(0.5, Math.min(3.0, speed)) // Extended speed range
			};
		}
		return { type: 'none', speed: Math.max(0.5, Math.min(3.0, speed)) };
	});
}

// Function to restore user preferences from localStorage
export function restoreUserPreferences() {
	if (!browser || isEnforced) return;

	const savedWeather = localStorage.getItem('weatherType') as WeatherType;
	const savedSpeed = localStorage.getItem('weatherSpeed');

	let weatherType: WeatherType = 'none';
	let weatherSpeed = 1.0;

	// Use saved values if they exist and are valid
	if (
		savedWeather &&
		(savedWeather === 'none' || savedWeather === 'rain' || savedWeather === 'snow')
	) {
		weatherType = savedWeather;
	}

	if (savedSpeed) {
		const speed = parseFloat(savedSpeed);
		if (speed >= 0.5 && speed <= 3.0) {
			weatherSpeed = speed;
		}
	}

	weatherSettings.set({
		type: weatherType,
		speed: weatherSpeed
	});

	// Reset initialization flag so it can be restored again if needed
	weatherInitialized = false;
}

export function applyWeatherFromServerConfig(config: SiteConfig): void {
	if (!browser) return;

	userChangedSettings = false;

	if (config.enforce_weather_effects) {
		weatherSettings.set({
			type: config.default_weather_type,
			speed: config.default_weather_speed
		});
		return;
	}

	const savedWeather = localStorage.getItem('weatherType') as WeatherType;
	const savedSpeed = localStorage.getItem('weatherSpeed');

	let weatherType = config.default_weather_type;
	let weatherSpeed = config.default_weather_speed;

	if (
		savedWeather &&
		(savedWeather === 'none' || savedWeather === 'rain' || savedWeather === 'snow')
	) {
		weatherType = savedWeather;
	}

	if (savedSpeed) {
		const speed = parseFloat(savedSpeed);
		if (speed >= 0.5 && speed <= 3.0) {
			weatherSpeed = speed;
		}
	}

	weatherSettings.set({
		type: weatherType,
		speed: weatherSpeed
	});
}

export async function reloadSiteConfigAndApplyWeather(): Promise<void> {
	if (!browser) return;

	await loadSiteConfig();
	applyWeatherFromServerConfig(get(siteConfig));

	window.dispatchEvent(new CustomEvent(SITE_CONFIG_UPDATED_EVENT));
}

let siteConfigReloadDebounce: ReturnType<typeof setTimeout> | null = null;

export function scheduleReloadSiteConfigAndApplyWeather(): void {
	if (!browser) return;
	if (siteConfigReloadDebounce) clearTimeout(siteConfigReloadDebounce);
	siteConfigReloadDebounce = setTimeout(() => {
		siteConfigReloadDebounce = null;
		void reloadSiteConfigAndApplyWeather();
	}, 350);
}

if (browser) {
	subscribeSiteConfigBroadcast(() => {
		scheduleReloadSiteConfigAndApplyWeather();
	});
}
