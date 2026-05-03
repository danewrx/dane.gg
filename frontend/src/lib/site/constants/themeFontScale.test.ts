import { describe, expect, it } from 'vitest';
import { THEME_FONT_SCALE_MAX, THEME_FONT_SCALE_MIN, clampThemeFontScale } from './themeFontScale';

describe('clampThemeFontScale', () => {
	it('clamps high values', () => {
		expect(clampThemeFontScale(2)).toBe(String(THEME_FONT_SCALE_MAX));
		expect(clampThemeFontScale('9')).toBe(String(THEME_FONT_SCALE_MAX));
	});

	it('clamps low values', () => {
		expect(clampThemeFontScale(0.1)).toBe(String(THEME_FONT_SCALE_MIN));
	});

	it('returns 1 for invalid input', () => {
		expect(clampThemeFontScale(undefined)).toBe('1');
		expect(clampThemeFontScale('')).toBe('1');
		expect(clampThemeFontScale('x')).toBe('1');
	});

	it('passes through in-range numbers as string', () => {
		expect(clampThemeFontScale(1)).toBe('1');
		expect(clampThemeFontScale('1.0')).toBe('1');
	});
});
