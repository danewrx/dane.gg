import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type WeatherType = 'none' | 'rain' | 'snow';

// Weather settings
export const weatherSettings = writable({
	type: 'none' as WeatherType,
	speed: 1.0 // 0.5 to 3.0
});

// Weather particles store
export const weatherParticles = writable<Array<{
	id: number;
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	opacity: number;
	life: number;
	type: 'rain' | 'snow';
}>>([]);

// Initialize weather from localStorage
if (browser) {
	const savedWeather = localStorage.getItem('weatherType') as WeatherType;
	const savedSpeed = localStorage.getItem('weatherSpeed');

	if (savedWeather && (savedWeather === 'none' || savedWeather === 'rain' || savedWeather === 'snow')) {
		weatherSettings.update(settings => ({
			...settings,
			type: savedWeather
		}));
	}

	if (savedSpeed) {
		const speed = parseFloat(savedSpeed);
		if (speed >= 0.5 && speed <= 3.0) {
			weatherSettings.update(settings => ({
				...settings,
				speed
			}));
		}
	}
}

// Subscribe to weather changes and save to localStorage
if (browser) {
	weatherSettings.subscribe((settings) => {
		localStorage.setItem('weatherType', settings.type);
		localStorage.setItem('weatherSpeed', settings.speed.toString());
	});
}

// Weather control functions
export function setWeatherType(type: WeatherType) {
	weatherSettings.update(settings => ({
		...settings,
		type
	}));
}

export function setWeatherSpeed(speed: number) {
	weatherSettings.update(settings => ({
		...settings,
		speed: Math.max(0.5, Math.min(3.0, speed)) // Extended speed range
	}));
}