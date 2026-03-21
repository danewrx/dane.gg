import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type FontMode = 'theme' | 'system';

// Default font mode: use the theme's font
const defaultFontMode: FontMode = 'theme';

// Create the font store
export const fontMode = writable<FontMode>(defaultFontMode);

// Font configurations
export const fontConfigs = {
	theme: {
		name: 'Theme font',
		description: 'Use the font from your selected theme',
		fontFamily: 'var(--theme-font-family)'
	},
	system: {
		name: 'System font',
		description: 'Your system default font for better readability',
		fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
	}
};

// Initialize font mode from localStorage
if (browser) {
	const saved = localStorage.getItem('fontMode');
	if (saved === 'theme' || saved === 'system') {
		fontMode.set(saved);
	} else if (saved === 'w95') {
		fontMode.set('theme');
	}
}

// Subscribe to font mode changes and update localStorage + global font
if (browser) {
	fontMode.subscribe((mode) => {
		localStorage.setItem('fontMode', mode);
		updateGlobalFont(mode);
	});
}

function updateGlobalFont(mode: FontMode) {
	if (!browser) return;
	const config = fontConfigs[mode];
	document.documentElement.style.setProperty('--global-font-family', config.fontFamily);
}

// Set specific font mode
export function setFontMode(mode: FontMode) {
	fontMode.set(mode);
}

// Initialize font on load
if (browser) {
	const saved = localStorage.getItem('fontMode');
	const mode = (saved === 'theme' || saved === 'system' ? saved : saved === 'w95' ? 'theme' : defaultFontMode) as FontMode;
	updateGlobalFont(mode);
}
