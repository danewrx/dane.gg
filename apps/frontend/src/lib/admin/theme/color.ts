export type Rgb = { r: number; g: number; b: number };

const HEX_COLOR_REGEX = /^#?[0-9A-Fa-f]{6}$/;

export function normalizeHex(hex: string): string | null {
	const value = hex.trim();
	if (!HEX_COLOR_REGEX.test(value)) return null;
	return value.startsWith('#') ? value.toLowerCase() : `#${value.toLowerCase()}`;
}

export function hexToRgb(hex: string): Rgb | null {
	const normalized = normalizeHex(hex);
	if (!normalized) return null;

	const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
	if (!result) return null;

	return {
		r: Number.parseInt(result[1], 16),
		g: Number.parseInt(result[2], 16),
		b: Number.parseInt(result[3], 16)
	};
}

export function rgbToHex({ r, g, b }: Rgb): string {
	const toHex = (channel: number) =>
		Math.max(0, Math.min(255, Math.round(channel)))
			.toString(16)
			.padStart(2, '0');

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function relativeLuminance({ r, g, b }: Rgb): number {
	const toLinear = (channel: number) => {
		const srgb = channel / 255;
		return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
	};

	return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(foreground: string, background: string): number {
	const fg = hexToRgb(foreground);
	const bg = hexToRgb(background);
	if (!fg || !bg) return 1;

	const l1 = relativeLuminance(fg);
	const l2 = relativeLuminance(bg);
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);

	return (lighter + 0.05) / (darker + 0.05);
}

export function pickForeground(background: string): '#000000' | '#ffffff' {
	const rgb = hexToRgb(background);
	if (!rgb) return '#ffffff';

	return relativeLuminance(rgb) > 0.5 ? '#000000' : '#ffffff';
}

export function mixHex(a: string, b: string, amount: number): string {
	const rgbA = hexToRgb(a);
	const rgbB = hexToRgb(b);
	if (!rgbA || !rgbB) return a;

	const ratio = Math.max(0, Math.min(1, amount));
	return rgbToHex({
		r: rgbA.r + (rgbB.r - rgbA.r) * ratio,
		g: rgbA.g + (rgbB.g - rgbA.g) * ratio,
		b: rgbA.b + (rgbB.b - rgbA.b) * ratio
	});
}

export function darkenHex(hex: string, percent: number): string {
	const rgb = hexToRgb(hex);
	if (!rgb) return hex;

	const factor = 1 - Math.max(0, Math.min(1, percent));
	return rgbToHex({
		r: rgb.r * factor,
		g: rgb.g * factor,
		b: rgb.b * factor
	});
}

export function lightenHex(hex: string, percent: number): string {
	return mixHex(hex, '#ffffff', percent);
}

function adjustTowardContrast(
	color: string,
	surface: string,
	minRatio: number,
	preferLighten: boolean
): string {
	if (contrastRatio(color, surface) >= minRatio) return color;

	const target = preferLighten ? '#ffffff' : '#000000';
	for (let step = 0.1; step <= 0.9; step += 0.1) {
		const candidate = mixHex(color, target, step);
		if (contrastRatio(candidate, surface) >= minRatio) {
			return candidate;
		}
	}

	return mixHex(color, target, 0.85);
}

/** Accent-colored text/icons on page surfaces (links, labels). */
export function resolveAccentOnSurface(accent: string, surface: string, isDark: boolean): string {
	return adjustTowardContrast(accent, surface, 4.5, isDark);
}

/** Filled buttons/badges using the accent as background. */
export function resolveAccentFill(accent: string, surface: string, isDark: boolean): string {
	if (contrastRatio(accent, surface) >= 3) return accent;

	const rgb = hexToRgb(accent);
	if (!rgb) return accent;

	// Preserve dark/light character of the user's pick; pair with pickForeground on the fill.
	if (relativeLuminance(rgb) < 0.5) return accent;
	if (relativeLuminance(rgb) > 0.5) return accent;

	return adjustTowardContrast(accent, surface, 3, isDark);
}

export function resolveAccentFillHoverForDarkTheme(fill: string): string {
	return lightenHex(fill, 0.08);
}

export function resolveAccentFillHoverForLightTheme(fill: string): string {
	return darkenHex(fill, 0.1);
}

export type AdminSurfaceColors = {
	primary: string;
	secondary: string;
};

export const ADMIN_SURFACES = {
	dark: {
		primary: '#1a1a1a',
		secondary: '#2d2d2d'
	},
	light: {
		primary: '#ffffff',
		secondary: '#f8fafc'
	}
} satisfies Record<'dark' | 'light', AdminSurfaceColors>;

export function getAdminSurfaces(isDark: boolean): AdminSurfaceColors {
	return isDark ? ADMIN_SURFACES.dark : ADMIN_SURFACES.light;
}

export function isDarkModeActive(): boolean {
	if (typeof document === 'undefined') return true;
	return document.documentElement.classList.contains('dark');
}

export type AccentTokens = {
	accent: string;
	accentFg: string;
	accentFgHover: string;
	accentBg: string;
	accentBgHover: string;
	accentOnSurface: string;
	accentMutedBg: string;
	accentMutedFg: string;
	accentBorder: string;
	accentLight: string;
	accentMedium: string;
};

export function buildAccentTokens(accent: string, isDark: boolean): AccentTokens {
	const surfaces = getAdminSurfaces(isDark);
	const onSurface = resolveAccentOnSurface(accent, surfaces.primary, isDark);
	const fill = resolveAccentFill(accent, surfaces.primary, isDark);
	const fillHover = isDark
		? resolveAccentFillHoverForDarkTheme(fill)
		: resolveAccentFillHoverForLightTheme(fill);
	const fillFg = pickForeground(fill);
	const fillHoverFg = pickForeground(fillHover);
	const mutedBg = mixHex(onSurface, surfaces.secondary, isDark ? 0.16 : 0.1);
	const mutedFg = pickForeground(mutedBg);

	return {
		accent,
		accentFg: fillFg,
		accentFgHover: fillHoverFg,
		accentBg: fill,
		accentBgHover: fillHover,
		accentOnSurface: onSurface,
		accentMutedBg: mutedBg,
		accentMutedFg: mutedFg,
		accentBorder: mixHex(onSurface, surfaces.primary, 0.45),
		accentLight: mixHex(onSurface, surfaces.secondary, isDark ? 0.12 : 0.08),
		accentMedium: mixHex(onSurface, surfaces.secondary, isDark ? 0.22 : 0.16)
	};
}

/** Whether the accent is hard to use in a specific admin theme (light or dark). */
export function accentHasLowContrast(accent: string, isDark: boolean): boolean {
	const surfaces = getAdminSurfaces(isDark);
	const rawVsSurface = contrastRatio(accent, surfaces.primary);
	const fill = resolveAccentFill(accent, surfaces.primary, isDark);
	const fillVsSurface = contrastRatio(fill, surfaces.primary);
	const onSurface = resolveAccentOnSurface(accent, surfaces.primary, isDark);
	const onSurfaceVsSurface = contrastRatio(onSurface, surfaces.primary);

	const fillBlendsIntoPage = fillVsSurface < 3;
	const labelsUnreadableOnPage =
		rawVsSurface < 4.5 && onSurfaceVsSurface < 4.5;

	return fillBlendsIntoPage || labelsUnreadableOnPage;
}

/** Warn in the picker when the accent is problematic in light or dark admin theme. */
export function accentHasLowContrastInAnyTheme(accent: string): boolean {
	return accentHasLowContrast(accent, false) || accentHasLowContrast(accent, true);
}
