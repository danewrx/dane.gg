/**
 * `getReadableTagColors` keeps a tag's hue/identity but nudges its lightness
 * until the text meets a minimum contrast ratio against the surface it sits on
 */

import { compositeOnWhite, parseCssColor, relativeLuminance } from './statusSemantics';

export interface TagColors {
	text: string;
	background: string;
	border: string;
}

const TARGET_CONTRAST = 4.5;
// Tint/border opacities for the tag chip
const BG_ALPHA = 0.14;
const BORDER_ALPHA = 0.32;
// Surfaces lighter than this are light
const LIGHT_SURFACE_LUMINANCE = 0.52;

type Rgb = { r: number; g: number; b: number };

function contrastRatio(l1: number, l2: number): number {
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	return (lighter + 0.05) / (darker + 0.05);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	const d = max - min;
	let h = 0;
	let s = 0;
	if (d !== 0) {
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			default:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}
	return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
	h /= 360;
	s /= 100;
	l /= 100;
	if (s === 0) {
		const v = Math.round(l * 255);
		return { r: v, g: v, b: v };
	}
	const hue2rgb = (p: number, q: number, t: number): number => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	return {
		r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
		g: Math.round(hue2rgb(p, q, h) * 255),
		b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
	};
}

function compositeOver(fg: Rgb, alpha: number, bg: Rgb): Rgb {
	return {
		r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
		g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
		b: Math.round(fg.b * alpha + bg.b * (1 - alpha))
	};
}

/**
 * Returns text/background/border colours for a tag chip that stay legible on
 * the given surface. The hue and saturation are preserved
 */
/**
 * Adjusts text colour for legibility against a solid background.
 * Shifts lightness until WCAG AA (4.5:1) is met.
 */
export function getReadableTextColor(textColorCss: string, bgColorCss: string): string {
	const text = parseCssColor(textColorCss);
	if (!text) return textColorCss;

	const bgParsed = parseCssColor(bgColorCss);
	const bg: Rgb = bgParsed ? compositeOnWhite(bgParsed) : { r: 26, g: 26, b: 26 };
	const bgLum = relativeLuminance(bg.r, bg.g, bg.b);
	const bgIsLight = bgLum > LIGHT_SURFACE_LUMINANCE;

	let rgb = compositeOnWhite(text);
	const [h, s] = rgbToHsl(rgb.r, rgb.g, rgb.b);
	let [, , l] = rgbToHsl(rgb.r, rgb.g, rgb.b);

	const step = bgIsLight ? -2 : 2;

	for (let i = 0; i < 60; i++) {
		const textLum = relativeLuminance(rgb.r, rgb.g, rgb.b);
		if (contrastRatio(textLum, bgLum) >= TARGET_CONTRAST) break;

		const nextL = l + step;
		l = Math.min(100, Math.max(0, nextL));
		rgb = hslToRgb(h, s, l);
		if (nextL <= 0 || nextL >= 100) break;
	}

	return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function getReadableTagColors(tagColorCss: string, surfaceCss: string): TagColors {
	const tag = parseCssColor(tagColorCss);
	if (!tag) {
		// Unparseable colour: fall back to raw value
		return { text: tagColorCss, background: 'transparent', border: tagColorCss };
	}

	const surfaceParsed = parseCssColor(surfaceCss);
	const surface: Rgb = surfaceParsed ? compositeOnWhite(surfaceParsed) : { r: 26, g: 26, b: 26 };
	const surfaceLum = relativeLuminance(surface.r, surface.g, surface.b);
	const surfaceIsLight = surfaceLum > LIGHT_SURFACE_LUMINANCE;

	let rgb = compositeOnWhite(tag);
	const [h, s] = rgbToHsl(rgb.r, rgb.g, rgb.b);
	let [, , l] = rgbToHsl(rgb.r, rgb.g, rgb.b);

	const step = surfaceIsLight ? -2 : 2;

	for (let i = 0; i < 60; i++) {
		const chipBg = compositeOver(rgb, BG_ALPHA, surface);
		const textLum = relativeLuminance(rgb.r, rgb.g, rgb.b);
		const bgLum = relativeLuminance(chipBg.r, chipBg.g, chipBg.b);
		if (contrastRatio(textLum, bgLum) >= TARGET_CONTRAST) break;

		const nextL = l + step;
		l = Math.min(100, Math.max(0, nextL));
		rgb = hslToRgb(h, s, l);
		if (nextL <= 0 || nextL >= 100) break;
	}

	return {
		text: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
		background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${BG_ALPHA})`,
		border: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${BORDER_ALPHA})`
	};
}
