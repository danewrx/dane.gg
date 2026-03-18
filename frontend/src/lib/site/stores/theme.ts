import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { clampThemeFontScale } from '$lib/site/constants/themeFontScale';

export interface SiteTheme {
	id: string;
	name: string;
	description: string | null;
	isActive: boolean;
	isDefault: boolean;
	
	// Colors
	primaryColor: string;
	secondaryColor: string;
	accentColor: string;
	backgroundColor: string;
	surfaceColor: string;
	borderColor: string;
	textPrimary: string;
	textSecondary: string;
	textMuted: string;
	
	// Background
	backgroundImage: string | null;
	backgroundImageExternal: boolean;
	backgroundOverlay: string;
	backgroundBlur: number;
	backgroundPosition: string;
	backgroundSize: string;
	backgroundAttachment: string;
	
	// Typography
	fontFamily: string;
	headingFontFamily: string;
	fontScale: string;
	/** Custom font file URL for body */
	bodyFontUrl?: string | null;
	/** Custom font file URL for headings */
	headingFontUrl?: string | null;
	
	// Other
	borderRadius: string;
	widgetBorderRadius?: string;
	customCss: string | null;
}

// Default theme (fallback)
export const DEFAULT_THEME: SiteTheme = {
	id: 'default',
	name: 'Default',
	description: 'Default site theme',
	isActive: true,
	isDefault: true,
	
	// Colors
	primaryColor: '#ffffff',
	secondaryColor: '#a1a1aa',
	accentColor: '#6366f1',
	backgroundColor: '#0a0a0a',
	surfaceColor: '#1a1a1a',
	borderColor: '#ffffff',
	textPrimary: '#ffffff',
	textSecondary: '#a1a1aa',
	textMuted: '#71717a',
	
	// Background
	backgroundImage: '/assets/img/backgrounds/1.png',
	backgroundImageExternal: false,
	backgroundOverlay: 'rgba(0, 0, 0, 0.7)',
	backgroundBlur: 0,
	backgroundPosition: 'center center',
	backgroundSize: 'cover',
	backgroundAttachment: 'fixed',
	
	// Typography
	fontFamily: 'Inter',
	headingFontFamily: 'Inter',
	fontScale: '1',
	
	// Other
	borderRadius: '0px',
	widgetBorderRadius: '0px',
	customCss: null
};

// Theme store
export const siteTheme = writable<SiteTheme>(DEFAULT_THEME);
export const themeLoading = writable<boolean>(true);
export const themeError = writable<string | null>(null);

export const themeColors = derived(siteTheme, ($theme) => ({
	primary: $theme.primaryColor,
	secondary: $theme.secondaryColor,
	accent: $theme.accentColor,
	background: $theme.backgroundColor,
	surface: $theme.surfaceColor,
	border: $theme.borderColor,
	textPrimary: $theme.textPrimary,
	textSecondary: $theme.textSecondary,
	textMuted: $theme.textMuted
}));

export const themeBackground = derived(siteTheme, ($theme) => ({
	image: $theme.backgroundImage,
	isExternal: $theme.backgroundImageExternal,
	overlay: $theme.backgroundOverlay,
	blur: $theme.backgroundBlur,
	position: $theme.backgroundPosition,
	size: $theme.backgroundSize,
	attachment: $theme.backgroundAttachment
}));

export const themeFonts = derived(siteTheme, ($theme) => ({
	body: $theme.fontFamily,
	heading: $theme.headingFontFamily,
	scale: clampThemeFontScale($theme.fontScale)
}));

/**
 * Load active theme (or user's preferred theme)
 */
export async function loadSiteTheme(): Promise<void> {
	if (!browser) return;

	themeLoading.set(true);
	themeError.set(null);

	try {
		const savedThemeId = localStorage.getItem('selectedTheme');
		
		if (savedThemeId) {
			const themesResponse = await fetch('/api/themes');
			
			if (themesResponse.ok) {
				const themesData = await themesResponse.json();
				const savedTheme = themesData.data?.find((t: SiteTheme) => t.id === savedThemeId);
				
				if (savedTheme) {
					siteTheme.set(savedTheme);
					themeLoading.set(false);
					return;
				} else {
					// Saved theme is no longer visible, clear from localStorage
					localStorage.removeItem('selectedTheme');
				}
			}
		}
		
		const response = await fetch('/api/themes/active');
		
		if (!response.ok) {
			throw new Error(`Failed to fetch theme: ${response.statusText}`);
		}

		const data = await response.json();
		
		if (data.success && data.data) {
			siteTheme.set(data.data);
		} else {
			siteTheme.set(DEFAULT_THEME);
		}
	} catch (error) {
		console.error('Error loading site theme:', error);
		themeError.set(error instanceof Error ? error.message : 'Unknown error');
		siteTheme.set(DEFAULT_THEME);
	} finally {
		themeLoading.set(false);
	}
}

export function applyThemeStyles(theme: SiteTheme): void {
	if (!browser) return;

	// Inject @font-face for custom fonts
	injectCustomFontFaces(theme);

	const root = document.documentElement;

	// Colors
	root.style.setProperty('--theme-primary', theme.primaryColor);
	root.style.setProperty('--theme-secondary', theme.secondaryColor);
	root.style.setProperty('--theme-accent', theme.accentColor);
	root.style.setProperty('--theme-background', theme.backgroundColor);
	root.style.setProperty('--theme-surface', theme.surfaceColor);
	root.style.setProperty('--theme-border', theme.borderColor);
	root.style.setProperty('--theme-text-primary', theme.textPrimary);
	root.style.setProperty('--theme-text-secondary', theme.textSecondary);
	root.style.setProperty('--theme-text-muted', theme.textMuted);

	// Background
	root.style.setProperty('--theme-bg-overlay', theme.backgroundOverlay);
	root.style.setProperty('--theme-bg-blur', `${theme.backgroundBlur}px`);
	root.style.setProperty('--theme-bg-position', theme.backgroundPosition);
	root.style.setProperty('--theme-bg-size', theme.backgroundSize);
	root.style.setProperty('--theme-bg-attachment', theme.backgroundAttachment);

	// Typography
	root.style.setProperty(
		'--theme-font-scale',
		clampThemeFontScale(theme.fontScale)
	);
	root.style.setProperty(
		'--theme-border-radius',
		theme.borderRadius?.trim() || '0px'
	);
	const widgetR =
		theme.widgetBorderRadius?.trim() || theme.borderRadius?.trim() || '0px';
	root.style.setProperty('--theme-widget-border-radius', widgetR);
	
	// Font families (with fallbacks)
	const bodyFont = theme.fontFamily ? `'${theme.fontFamily}', sans-serif` : 'sans-serif';
	const headingFont = theme.headingFontFamily ? `'${theme.headingFontFamily}', sans-serif` : bodyFont;
	root.style.setProperty('--theme-font-family', bodyFont);
	root.style.setProperty('--theme-heading-font', headingFont);

	if (theme.backgroundImage) {
		const url = theme.backgroundImage.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
		root.style.setProperty('--theme-bg-image', `url('${url}')`);
	} else {
		root.style.setProperty('--theme-bg-image', 'none');
	}
}

/**
 * Load Google Fonts
 */
export function loadGoogleFonts(fonts: string[]): void {
	if (!browser) return;

	const systemFonts = ['system-ui', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'];
	const fontsToLoad = fonts.filter(font => {
		const cleanFont = font.replace(/['"]/g, '').trim();
		return !systemFonts.includes(cleanFont.toLowerCase()) && cleanFont.length > 0;
	});

	if (fontsToLoad.length === 0) return;

	const existingLink = document.querySelector('link[data-google-fonts]');
	const fontQuery = fontsToLoad
		.map(font => `family=${encodeURIComponent(font)}:wght@300;400;500;600;700`)
		.join('&');
	
	const newHref = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;

	if (existingLink) {
		if (existingLink.getAttribute('href') !== newHref) {
			existingLink.setAttribute('href', newHref);
		}
	} else {
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = newHref;
		link.setAttribute('data-google-fonts', 'true');
		document.head.appendChild(link);
	}
}

/**
 * Inject @font-face for custom theme fonts
 * Uses single style tag so it can be replaced when theme changes
 */
function injectCustomFontFaces(theme: SiteTheme): void {
	if (!browser) return;

	const existing = document.querySelector('style[data-theme-custom-fonts]');
	const rules: string[] = [];

	if (theme.bodyFontUrl && theme.fontFamily) {
		const url = theme.bodyFontUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
		const family = theme.fontFamily.replace(/'/g, "\\'");
		rules.push(`@font-face { font-family: '${family}'; src: url('${url}'); }`);
	}
	if (theme.headingFontUrl && theme.headingFontFamily && theme.headingFontFamily !== theme.fontFamily) {
		const url = theme.headingFontUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
		const family = theme.headingFontFamily.replace(/'/g, "\\'");
		rules.push(`@font-face { font-family: '${family}'; src: url('${url}'); }`);
	} else if (theme.headingFontUrl && theme.headingFontFamily) {
		const url = theme.headingFontUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
		const family = theme.headingFontFamily.replace(/'/g, "\\'");
		rules.push(`@font-face { font-family: '${family}'; src: url('${url}'); }`);
	}

	if (rules.length === 0) {
		existing?.remove();
		return;
	}

	const style = existing ?? document.createElement('style');
	style.setAttribute('data-theme-custom-fonts', 'true');
	style.textContent = rules.join('\n');
	if (!existing) document.head.appendChild(style);
}

/**
 * Apply custom CSS from theme
 */
export function applyCustomCss(css: string | null): void {
	if (!browser) return;

	const existingStyle = document.querySelector('style[data-theme-custom]');

	if (css) {
		if (existingStyle) {
			existingStyle.textContent = css;
		} else {
			const style = document.createElement('style');
			style.setAttribute('data-theme-custom', 'true');
			style.textContent = css;
			document.head.appendChild(style);
		}
	} else if (existingStyle) {
		existingStyle.remove();
	}
}

// Subscribe to theme changes and apply styles
if (browser) {
	siteTheme.subscribe((theme) => {
		applyThemeStyles(theme);
		const fontsToLoad: string[] = [];
		if (!theme.bodyFontUrl && theme.fontFamily) fontsToLoad.push(theme.fontFamily);
		if (!theme.headingFontUrl && theme.headingFontFamily && theme.headingFontFamily !== theme.fontFamily) {
			fontsToLoad.push(theme.headingFontFamily);
		}
		loadGoogleFonts(fontsToLoad);
		applyCustomCss(theme.customCss);
	});
}
