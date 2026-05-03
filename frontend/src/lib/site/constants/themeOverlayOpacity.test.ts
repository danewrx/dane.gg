import { describe, expect, it } from 'vitest';
import { clampThemeUnitOpacity, themeDarkenToRgba } from './themeOverlayOpacity';

describe('clampThemeUnitOpacity', () => {
	it('uses fallback for empty or null', () => {
		expect(clampThemeUnitOpacity(undefined, '0.5')).toBe('0.5');
		expect(clampThemeUnitOpacity(null, '0.5')).toBe('0.5');
		expect(clampThemeUnitOpacity('  ', '0.5')).toBe('0.5');
	});

	it('clamps to 0–1', () => {
		expect(clampThemeUnitOpacity('-1', '0')).toBe('0');
		expect(clampThemeUnitOpacity('2', '0')).toBe('1');
	});

	it('returns fallback for NaN', () => {
		expect(clampThemeUnitOpacity('nope', '0.25')).toBe('0.25');
	});
});

describe('themeDarkenToRgba', () => {
	it('builds rgba from clamped opacity', () => {
		expect(themeDarkenToRgba('0.4', '0')).toBe('rgba(0, 0, 0, 0.4)');
	});
});
