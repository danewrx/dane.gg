import { logger } from '$lib/logger';
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { clampThemeFontScale } from '$lib/site/constants/themeFontScale';
import { clampThemeUnitOpacity, themeDarkenToRgba } from '$lib/site/constants/themeOverlayOpacity';
import {
	buildMarkdownCodeCssVariables,
	buildStatusCssVariables,
	inferMarkdownCodeBlockTone,
	inferSurfaceTone
} from '$lib/site/constants/statusSemantics';

export type ThemeEnforcementState = {
	enforced: boolean;
	themeId: string | null;
};

export const themeEnforcement = writable<ThemeEnforcementState>({
	enforced: false,
	themeId: null
});

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
	scanlinesOpacity?: string;
	overlayVignetteOpacity?: string;
	overlayGridOpacity?: string;
	overlayGrainOpacity?: string;
	overlayGlareOpacity?: string;
	overlayDarkenOpacity?: string;
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
	backgroundImage: '/assets/themes/default/backgrounds/1.png',
	backgroundImageExternal: false,
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
	customCss: null,
	scanlinesOpacity: '1',
	overlayVignetteOpacity: '0',
	overlayGridOpacity: '0',
	overlayGrainOpacity: '0',
	overlayGlareOpacity: '0',
	overlayDarkenOpacity: '0.7'
};

// Theme store
export const siteTheme = writable<SiteTheme>(DEFAULT_THEME);
export const themeLoading = writable<boolean>(true);
export const themeError = writable<string | null>(null);

/** Slug for bundled GeoCities theme (`html[data-theme="geocities"]` in seed customCss). */
export const GEOCITIES_THEME_SLUG = 'geocities';

export function themeSlugFromName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replaceAll(/\s+/g, '-')
		.replaceAll(/[^a-z0-9-]/g, '');
}

export const isGeoCitiesTheme = derived(
	siteTheme,
	($theme) => themeSlugFromName($theme.name) === GEOCITIES_THEME_SLUG
);

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
	overlay: themeDarkenToRgba($theme.overlayDarkenOpacity, '0'),
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

function applyActiveThemePayload(payload: {
	success?: boolean;
	data?: SiteTheme | null;
	enforcement?: ThemeEnforcementState;
}): void {
	if (payload.enforcement) {
		themeEnforcement.set({
			enforced: !!payload.enforcement.enforced,
			themeId: typeof payload.enforcement.themeId === 'string' ? payload.enforcement.themeId : null
		});
	}
	if (payload.success && payload.data) {
		siteTheme.set(payload.data as SiteTheme);
	} else {
		siteTheme.set(DEFAULT_THEME);
	}
}

type ActiveThemeApiPayload = {
	success?: boolean;
	data?: SiteTheme | null;
	enforcement?: ThemeEnforcementState;
};

let ssrActiveThemePayload: ActiveThemeApiPayload | null = null;

/**
 * Apply `/api/themes/active` JSON from SSR
 */
export function hydratePublicThemeFromSsr(payload: unknown): void {
	if (!payload || typeof payload !== 'object') return;
	const p = payload as ActiveThemeApiPayload;
	applyActiveThemePayload(p);
	themeLoading.set(false);
	ssrActiveThemePayload = p;
}

/**
 * Load active theme (or user's preferred theme). Honors admin theme enforcement from the API.
 */
export async function loadSiteTheme(): Promise<void> {
	if (!browser) return;

	themeError.set(null);

	try {
		let activeData: ActiveThemeApiPayload;

		if (ssrActiveThemePayload) {
			activeData = ssrActiveThemePayload;
			ssrActiveThemePayload = null;
		} else {
			themeLoading.set(true);
			const activeRes = await fetch('/api/themes/active', { cache: 'no-store' });

			if (!activeRes.ok) {
				throw new Error(`Failed to fetch theme: ${activeRes.statusText}`);
			}

			activeData = await activeRes.json();
		}

		const enforcement: ThemeEnforcementState = activeData.enforcement ?? {
			enforced: false,
			themeId: null
		};
		themeEnforcement.set(enforcement);

		if (enforcement.enforced) {
			// Keep localStorage `selectedTheme` so when enforcement is turned off we can restore
			// the visitor's previous choice on the next load (enforced theme still wins while locked).
			applyActiveThemePayload(activeData);
			return;
		}

		const savedThemeId = localStorage.getItem('selectedTheme');

		if (savedThemeId) {
			themeLoading.set(true);
			const themesResponse = await fetch('/api/themes', { cache: 'no-store' });

			if (themesResponse.ok) {
				const themesData = await themesResponse.json();

				if (themesData.enforcement?.enforced) {
					themeEnforcement.set({
						enforced: true,
						themeId:
							typeof themesData.enforcement.themeId === 'string'
								? themesData.enforcement.themeId
								: null
					});
					const r2 = await fetch('/api/themes/active', { cache: 'no-store' });
					if (r2.ok) {
						const d2 = await r2.json();
						applyActiveThemePayload(d2);
					} else {
						applyActiveThemePayload(activeData);
					}
					return;
				}

				const savedTheme = themesData.data?.find((t: SiteTheme) => t.id === savedThemeId);

				if (savedTheme) {
					siteTheme.set(savedTheme);
					themeLoading.set(false);
					return;
				}
				localStorage.removeItem('selectedTheme');
			}
		}

		applyActiveThemePayload(activeData);
	} catch (error) {
		logger.error('Error loading site theme:', error);
		themeError.set(error instanceof Error ? error.message : 'Unknown error');
		siteTheme.set(DEFAULT_THEME);
	} finally {
		themeLoading.set(false);
	}
}

function clearInlineThemeVars(): void {
	if (!browser) return;
	const root = document.documentElement;
	const toRemove: string[] = [];
	for (let i = 0; i < root.style.length; i++) {
		const p = root.style.item(i);
		if (p.startsWith('--theme-')) toRemove.push(p);
	}
	for (const p of toRemove) root.style.removeProperty(p);
}

function quoteCssString(s: string): string {
	return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Theme fields as a stylesheet so {@link applyCustomCss} can override any variable
 */
function buildThemeVarsStylesheet(theme: SiteTheme): string {
	const widgetR = theme.widgetBorderRadius?.trim() || theme.borderRadius?.trim() || '0px';
	const bodyFam = theme.fontFamily ? quoteCssString(theme.fontFamily) : '';
	const headingFam = theme.headingFontFamily ? quoteCssString(theme.headingFontFamily) : bodyFam;
	const bodyFont = bodyFam ? `'${bodyFam}', sans-serif` : 'sans-serif';
	const headingFont = headingFam ? `'${headingFam}', sans-serif` : bodyFont;

	let bgImageCss = 'none';
	if (theme.backgroundImage) {
		const url = quoteCssString(theme.backgroundImage);
		bgImageCss = `url('${url}')`;
	}

	const scale = clampThemeFontScale(theme.fontScale);
	const br = theme.borderRadius?.trim() || '0px';

	return `html[data-dane-app="public"] {
  --theme-primary: ${theme.primaryColor};
  --theme-secondary: ${theme.secondaryColor};
  --theme-accent: ${theme.accentColor};
  --theme-background: ${theme.backgroundColor};
  --theme-surface: ${theme.surfaceColor};
  --theme-border: ${theme.borderColor};
  --theme-text-primary: ${theme.textPrimary};
  --theme-text-secondary: ${theme.textSecondary};
  --theme-text-muted: ${theme.textMuted};
  --text-primary: ${theme.textPrimary};
  --text-secondary: ${theme.textSecondary};
  --text-muted: ${theme.textMuted};
  --accent-color: ${theme.accentColor};
  --border-color: ${theme.borderColor};
  --bg-primary: ${theme.surfaceColor};
  --bg-secondary: ${theme.backgroundColor};
  --theme-bg-overlay: ${themeDarkenToRgba(theme.overlayDarkenOpacity, '0')};
  --theme-bg-blur: ${theme.backgroundBlur}px;
  --theme-bg-position: ${theme.backgroundPosition};
  --theme-bg-size: ${theme.backgroundSize};
  --theme-bg-attachment: ${theme.backgroundAttachment};
  --theme-font-scale: ${scale};
  --theme-border-radius: ${br};
  --theme-widget-border-radius: ${widgetR};
  --theme-font-family: ${bodyFont};
  --theme-heading-font: ${headingFont};
  --theme-bg-image: ${bgImageCss};
  --theme-scanlines-opacity: ${clampThemeUnitOpacity(theme.scanlinesOpacity, '1')};
  --theme-overlay-vignette-opacity: ${clampThemeUnitOpacity(theme.overlayVignetteOpacity, '0')};
  --theme-overlay-grid-opacity: ${clampThemeUnitOpacity(theme.overlayGridOpacity, '0')};
  --theme-overlay-grain-opacity: ${clampThemeUnitOpacity(theme.overlayGrainOpacity, '0')};
  --theme-overlay-glare-opacity: ${clampThemeUnitOpacity(theme.overlayGlareOpacity, '0')};
${buildStatusCssVariables(theme.surfaceColor)}
${buildMarkdownCodeCssVariables(theme.surfaceColor, theme.textPrimary)}
}`;
}

/** Remove public-site theme presentation (vars, custom CSS, Google Fonts link) — for admin /login /logout. */
export function clearSiteThemePresentation(): void {
	if (!browser) return;
	clearInlineThemeVars();
	document.querySelector('style[data-theme-vars]')?.remove();
	document.querySelector('style[data-theme-custom-fonts]')?.remove();
	document.querySelector('style[data-theme-custom]')?.remove();
	document.querySelector('link[data-google-fonts]')?.remove();
	try {
		delete document.documentElement.dataset.theme;
		delete document.documentElement.dataset.themeSurfaceTone;
		delete document.documentElement.dataset.themeCodeTone;
	} catch {
		/* ignore */
	}
}

/** Apply active site theme to the document (only when `data-dane-app="public"`). */
export function applyBrowserSiteThemeToDom(theme: SiteTheme): void {
	if (!browser) return;
	if (document.documentElement.dataset.daneApp !== 'public') return;
	applyThemeStyles(theme);
	const fontsToLoad: string[] = [];
	if (!theme.bodyFontUrl && theme.fontFamily) fontsToLoad.push(theme.fontFamily);
	if (
		!theme.headingFontUrl &&
		theme.headingFontFamily &&
		theme.headingFontFamily !== theme.fontFamily
	) {
		fontsToLoad.push(theme.headingFontFamily);
	}
	loadGoogleFonts(fontsToLoad);
	applyCustomCss(theme.customCss);
}

export function applyThemeStyles(theme: SiteTheme): void {
	if (!browser) return;

	injectCustomFontFaces(theme);
	clearInlineThemeVars();

	const css = buildThemeVarsStylesheet(theme);
	let el = document.querySelector('style[data-theme-vars]') as HTMLStyleElement | null;
	if (!el) {
		el = document.createElement('style');
		el.setAttribute('data-theme-vars', 'true');
		document.head.appendChild(el);
	}
	el.textContent = css;

	try {
		const slug = themeSlugFromName(theme.name);
		if (slug) {
			document.documentElement.dataset.theme = slug;
		} else {
			delete document.documentElement.dataset.theme;
		}
		document.documentElement.dataset.themeSurfaceTone = inferSurfaceTone(theme.surfaceColor);
		document.documentElement.dataset.themeCodeTone = inferMarkdownCodeBlockTone(
			theme.surfaceColor,
			theme.textPrimary
		);
	} catch {
		/* ignore */
	}
}

/**
 * Load Google Fonts
 */
export function loadGoogleFonts(fonts: string[]): void {
	if (!browser) return;

	const systemFonts = ['system-ui', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'];
	const fontsToLoad = fonts.filter((font) => {
		const cleanFont = font.replace(/['"]/g, '').trim();
		return !systemFonts.includes(cleanFont.toLowerCase()) && cleanFont.length > 0;
	});

	if (fontsToLoad.length === 0) return;

	const existingLink = document.querySelector('link[data-google-fonts]');
	const fontQuery = fontsToLoad
		.map((font) => `family=${encodeURIComponent(font)}:wght@300;400;500;600;700`)
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
	if (
		theme.headingFontUrl &&
		theme.headingFontFamily &&
		theme.headingFontFamily !== theme.fontFamily
	) {
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

/**
 * Used by theme preview iframe: updates store; subscriber applies CSS + fonts + customCss.
 */
export function applyThemePreviewPayload(theme: SiteTheme): void {
	if (!browser) return;
	siteTheme.set(theme);
	themeLoading.set(false);
	themeError.set(null);
}

// Subscribe to theme changes and apply styles (public site only)
if (browser) {
	siteTheme.subscribe((theme) => {
		applyBrowserSiteThemeToDom(theme);
	});
}
