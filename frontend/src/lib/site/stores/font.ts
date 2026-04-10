import { writable, get } from 'svelte/store';
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
		fontFamily:
			"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
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

const ADMIN_UI_FONT_STACK =
	"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";

/** Public site follows font mode; admin/login/logout always use a neutral system stack. */
export function reapplyFontForCurrentRealm(): void {
	if (!browser) return;
	if (document.documentElement.getAttribute('data-dane-app') !== 'public') {
		document.documentElement.style.setProperty('--global-font-family', ADMIN_UI_FONT_STACK);
		return;
	}
	updateGlobalFont(get(fontMode));
}

// Subscribe to font mode changes and update localStorage + global font
if (browser) {
	fontMode.subscribe((mode) => {
		localStorage.setItem('fontMode', mode);
		reapplyFontForCurrentRealm();
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
