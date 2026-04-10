import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

// Default theme
const defaultTheme: Theme = 'dark';

// Create the theme store
function createThemeStore() {
	const { subscribe, set, update } = writable<Theme>(defaultTheme);

	return {
		subscribe,
		// Toggle between light and dark themes
		toggle: () => {
			update((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
		},
		// Set a specific theme
		setTheme: (theme: Theme) => {
			set(theme);
		},
		// Initialize theme from localStorage or system preference
		init: () => {
			if (browser) {
				// Check localStorage first
				const savedTheme = localStorage.getItem('theme') as Theme;
				if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
					set(savedTheme);
					return;
				}

				// Fall back to system preference
				const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
				set(prefersDark ? 'dark' : 'light');
			}
		}
	};
}

// Create the store instance
export const theme = createThemeStore();

// Subscribe to theme changes and save to localStorage
if (browser) {
	theme.subscribe((currentTheme) => {
		localStorage.setItem('theme', currentTheme);
		// Update the document class for CSS targeting
		document.documentElement.setAttribute('data-theme', currentTheme);
	});
}
