import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type FontMode = 'w95' | 'system';

// Default font mode
const defaultFontMode: FontMode = 'w95';

// Create the font store
export const fontMode = writable<FontMode>(defaultFontMode);

// Font configurations
export const fontConfigs = {
	w95: {
		name: 'Windows 95',
		fontFamily: "'W95FA', 'JetBrains Mono', 'Courier New', monospace",
		description: 'Retro Windows 95 style'
	},
	system: {
		name: 'System',
		fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
		description: 'Your system default font'
	}
};

// Initialize font mode from localStorage
if (browser) {
	const savedFontMode = localStorage.getItem('fontMode') as FontMode;
	if (savedFontMode && (savedFontMode === 'w95' || savedFontMode === 'system')) {
		fontMode.set(savedFontMode);
	}
}

// Subscribe to font mode changes and update localStorage
if (browser) {
	fontMode.subscribe((mode) => {
		localStorage.setItem('fontMode', mode);
		updateGlobalFont(mode);
	});
}

// Function to update the global font
function updateGlobalFont(mode: FontMode) {
	if (!browser) return;
	
	const config = fontConfigs[mode];
	document.documentElement.style.setProperty('--global-font-family', config.fontFamily);
}

// Toggle between font modes
export function toggleFontMode() {
	fontMode.update(current => current === 'w95' ? 'system' : 'w95');
}

// Set specific font mode
export function setFontMode(mode: FontMode) {
	fontMode.set(mode);
}

// Initialize font on load
if (browser) {
	// Set initial font
	const currentMode = localStorage.getItem('fontMode') as FontMode || defaultFontMode;
	updateGlobalFont(currentMode);
}
