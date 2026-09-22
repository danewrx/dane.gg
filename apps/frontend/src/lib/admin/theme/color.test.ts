import { describe, expect, it } from 'vitest';
import {
	accentHasLowContrast,
	accentHasLowContrastInAnyTheme,
	buildAccentTokens,
	contrastRatio,
	pickForeground,
	resolveAccentFill,
	resolveAccentOnSurface
} from './color';

describe('admin theme color', () => {
	it('picks dark text on light backgrounds', () => {
		expect(pickForeground('#ffffff')).toBe('#000000');
		expect(pickForeground('#ffffe0')).toBe('#000000');
	});

	it('picks light text on dark backgrounds', () => {
		expect(pickForeground('#000000')).toBe('#ffffff');
		expect(pickForeground('#2d2d2d')).toBe('#ffffff');
	});

	it('adjusts extreme accents for light mode surfaces', () => {
		const onSurface = resolveAccentOnSurface('#ffffe0', '#ffffff', false);
		expect(contrastRatio(onSurface, '#ffffff')).toBeGreaterThanOrEqual(4.5);

		const fill = resolveAccentFill('#ffffe0', '#ffffff', false);
		expect(fill).toBe('#ffffe0');
		expect(pickForeground(fill)).toBe('#000000');
	});

	it('preserves dark accent fills with light foreground', () => {
		const onSurface = resolveAccentOnSurface('#000000', '#1a1a1a', true);
		expect(contrastRatio(onSurface, '#1a1a1a')).toBeGreaterThanOrEqual(4.5);

		const fill = resolveAccentFill('#000000', '#1a1a1a', true);
		expect(fill).toBe('#000000');
		expect(pickForeground(fill)).toBe('#ffffff');
	});

	it('flags low-contrast accent presets per theme', () => {
		expect(accentHasLowContrast('#ffffe0', false)).toBe(true);
		expect(accentHasLowContrast('#000000', true)).toBe(true);
		expect(accentHasLowContrast('#3b82f6', true)).toBe(false);
	});

	it('flags neutrals that fail in either admin theme', () => {
		expect(accentHasLowContrastInAnyTheme('#d3d3d3')).toBe(true);
		expect(accentHasLowContrastInAnyTheme('#2d2d2d')).toBe(true);
		expect(accentHasLowContrastInAnyTheme('#000000')).toBe(true);
		expect(accentHasLowContrastInAnyTheme('#3b82f6')).toBe(false);
	});

	it('builds semantic accent tokens', () => {
		const tokens = buildAccentTokens('#3b82f6', true);
		expect(tokens.accent).toBe('#3b82f6');
		expect(tokens.accentFg).toMatch(/^#[0-9a-f]{6}$/);
		expect(tokens.accentFgHover).toMatch(/^#[0-9a-f]{6}$/);
		expect(tokens.accentBg).toMatch(/^#[0-9a-f]{6}$/);
		expect(tokens.accentOnSurface).toMatch(/^#[0-9a-f]{6}$/);
	});

	it('pairs muted foreground with muted fill luminance', () => {
		const tokens = buildAccentTokens('#808080', true);
		expect(contrastRatio(tokens.accentMutedFg, tokens.accentMutedBg)).toBeGreaterThanOrEqual(4);
	});
});
