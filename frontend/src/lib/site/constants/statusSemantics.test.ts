import { describe, expect, it } from 'vitest';
import {
	buildMarkdownCodeCssVariables,
	buildStatusCssVariables,
	compositeOnWhite,
	inferMarkdownCodeBlockTone,
	inferSurfaceTone,
	parseCssColor,
	relativeLuminance,
	statusPaletteForTone
} from './statusSemantics';

describe('parseCssColor', () => {
	it('parses 6-digit hex', () => {
		expect(parseCssColor('#112233')).toEqual({ r: 17, g: 34, b: 51, a: 1 });
	});

	it('expands 3-digit hex', () => {
		expect(parseCssColor('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 });
	});

	it('parses 8-digit hex with alpha', () => {
		const c = parseCssColor('#11223380');
		expect(c).not.toBeNull();
		expect(c!.r).toBe(17);
		expect(c!.g).toBe(34);
		expect(c!.b).toBe(51);
		expect(c!.a).toBeCloseTo(128 / 255, 5);
	});

	it('parses rgb and rgba', () => {
		expect(parseCssColor('rgb(0, 128, 255)')).toEqual({ r: 0, g: 128, b: 255, a: 1 });
		expect(parseCssColor('rgba(10, 20, 30, 0.5)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
	});

	it('returns null for empty or invalid', () => {
		expect(parseCssColor('')).toBeNull();
		expect(parseCssColor('   ')).toBeNull();
		expect(parseCssColor('not-a-color')).toBeNull();
		expect(parseCssColor('#gggggg')).toBeNull();
	});
});

describe('compositeOnWhite', () => {
	it('blends opaque color onto white', () => {
		expect(compositeOnWhite({ r: 0, g: 0, b: 0, a: 1 })).toEqual({ r: 0, g: 0, b: 0 });
		expect(compositeOnWhite({ r: 255, g: 0, b: 0, a: 0.5 })).toEqual({ r: 255, g: 128, b: 128 });
	});
});

describe('relativeLuminance', () => {
	it('is ~1 for white and lower for mid gray', () => {
		expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 5);
		const l = relativeLuminance(128, 128, 128);
		expect(l).toBeGreaterThan(0);
		expect(l).toBeLessThan(1);
	});
});

describe('inferSurfaceTone', () => {
	it('treats near-white surface as light', () => {
		expect(inferSurfaceTone('#ffffff')).toBe('light');
		expect(inferSurfaceTone('#f5f5f5')).toBe('light');
	});

	it('treats near-black surface as dark', () => {
		expect(inferSurfaceTone('#0a0a0a')).toBe('dark');
		expect(inferSurfaceTone('#000000')).toBe('dark');
	});

	it('defaults to dark for unparseable input', () => {
		expect(inferSurfaceTone('nope')).toBe('dark');
	});
});

describe('statusPaletteForTone', () => {
	it('selects palette by tone', () => {
		expect(statusPaletteForTone('light').ok).toMatch(/^#/);
		expect(statusPaletteForTone('dark').ok).toMatch(/^#/);
		expect(statusPaletteForTone('light')).not.toEqual(statusPaletteForTone('dark'));
	});
});

describe('buildStatusCssVariables', () => {
	it('emits expected custom property names', () => {
		const css = buildStatusCssVariables('#1a1a1a');
		expect(css).toContain('--theme-surface-tone:');
		expect(css).toContain('--status-ok:');
		expect(css).toContain('--status-down:');
		expect(css).toContain('--status-loading:');
	});
});

describe('inferMarkdownCodeBlockTone', () => {
	it('uses text primary when set (dark text → light box)', () => {
		expect(inferMarkdownCodeBlockTone('#0a0a0a', '#000000')).toBe('light');
	});

	it('uses text primary when set (light text → dark box)', () => {
		expect(inferMarkdownCodeBlockTone('#c0c0c0', '#ffffff')).toBe('dark');
	});

	it('falls back to surface when text is missing', () => {
		expect(inferMarkdownCodeBlockTone('#c0c0c0')).toBe('light');
		expect(inferMarkdownCodeBlockTone('#1a1a1a')).toBe('dark');
	});
});

describe('buildMarkdownCodeCssVariables', () => {
	it('uses dark text on a light grey box for light surfaces', () => {
		const css = buildMarkdownCodeCssVariables('#c0c0c0', '#000000');
		expect(css).toContain('--theme-code-tone: light');
		expect(css).toContain('--theme-code-foreground: #1a1a1a');
		expect(css).toContain('--theme-code-background: #e4e4e4');
	});

	it('uses light text on a dark grey box for dark surfaces', () => {
		const css = buildMarkdownCodeCssVariables('#1a1a1a', '#f0f0f0');
		expect(css).toContain('--theme-code-tone: dark');
		expect(css).toContain('--theme-code-foreground: #f0f0f0');
		expect(css).toContain('--theme-code-background: #2a2a2a');
	});
});
