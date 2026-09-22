/**
 * Pastel-style status colors with two tonal sets: widgets on dark surfaces use
 * light pastels; on light surfaces (inferred from --theme-surface) use deeper
 * muted shades for contrast.
 */

export type SurfaceTone = 'light' | 'dark';

export const STATUS_PASTEL_ON_DARK = {
	ok: '#90ee90',
	down: '#ffb6c1',
	warn: '#fde68a',
	pending: '#e5e7eb',
	neutral: '#d1d5db',
	loading: '#fcd34d'
} as const;

export const STATUS_PASTEL_ON_LIGHT = {
	ok: '#2f6b52',
	down: '#a8485c',
	warn: '#b45309',
	pending: '#57534e',
	neutral: '#525252',
	loading: '#b45309'
} as const;

type Rgba = { r: number; g: number; b: number; a: number };

export function parseCssColor(input: string): Rgba | null {
	const s = input.trim();
	if (!s) return null;

	if (s.startsWith('#')) {
		let hex = s.slice(1);
		if (hex.length === 3) {
			hex = hex
				.split('')
				.map((c) => c + c)
				.join('');
		}
		if (hex.length === 4) {
			hex = hex
				.split('')
				.map((c) => c + c)
				.join('');
		}
		if (hex.length === 6) {
			const n = parseInt(hex, 16);
			if (Number.isNaN(n)) return null;
			return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
		}
		if (hex.length === 8) {
			const n = parseInt(hex, 16);
			if (Number.isNaN(n)) return null;
			const r = (n >> 24) & 255;
			const g = (n >> 16) & 255;
			const b = (n >> 8) & 255;
			const a = (n & 255) / 255;
			return { r, g, b, a };
		}
		return null;
	}

	const m = s.match(
		/^rgba?\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)(?:\s*,\s*([\d.]+))?\s*\)$/i
	);
	if (!m) return null;

	const parseCh = (v: string): number => {
		if (v.endsWith('%')) return Math.round((parseFloat(v) / 100) * 255);
		const n = parseFloat(v);
		return Number.isNaN(n) ? 0 : Math.round(Math.min(255, Math.max(0, n)));
	};

	const r = parseCh(m[1]);
	const g = parseCh(m[2]);
	const b = parseCh(m[3]);
	const a = m[4] != null && m[4] !== '' ? Math.min(1, Math.max(0, parseFloat(m[4]))) : 1;
	return { r, g, b, a: Number.isNaN(a) ? 1 : a };
}

export function compositeOnWhite(c: Rgba): { r: number; g: number; b: number } {
	const a = c.a;
	return {
		r: Math.round(c.r * a + 255 * (1 - a)),
		g: Math.round(c.g * a + 255 * (1 - a)),
		b: Math.round(c.b * a + 255 * (1 - a))
	};
}

export function relativeLuminance(r: number, g: number, b: number): number {
	const lin = (u: number) => {
		const x = u / 255;
		return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
	};
	const R = lin(r);
	const G = lin(g);
	const B = lin(b);
	return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Infer whether the theme surface reads as “light” for status contrast.
 */
export function inferSurfaceTone(surfaceCss: string): SurfaceTone {
	const raw = parseCssColor(surfaceCss);
	if (!raw) return 'dark';
	const comp = compositeOnWhite(raw);
	const L = relativeLuminance(comp.r, comp.g, comp.b);
	return L > 0.52 ? 'light' : 'dark';
}

export function statusPaletteForTone(tone: SurfaceTone) {
	return tone === 'light' ? STATUS_PASTEL_ON_LIGHT : STATUS_PASTEL_ON_DARK;
}

/** Lines to inject inside `:root { ... }` from theme surface. */
export function buildStatusCssVariables(surfaceColor: string): string {
	const tone = inferSurfaceTone(surfaceColor);
	const P = statusPaletteForTone(tone);
	return `  --theme-surface-tone: ${tone};
  --status-ok: ${P.ok};
  --status-down: ${P.down};
  --status-warn: ${P.warn};
  --status-pending: ${P.pending};
  --status-neutral: ${P.neutral};
  --status-loading: ${P.loading};`;
}

/**
 * Markdown code blocks: box tone opposes body text (not just widget surface).
 * `light` box = light grey fill + dark text; `dark` box = dark grey fill + light text.
 */
export function inferMarkdownCodeBlockTone(surfaceColor: string, textPrimary?: string): SurfaceTone {
	const text = textPrimary?.trim();
	if (text) {
		const raw = parseCssColor(text);
		if (raw) {
			const comp = compositeOnWhite(raw);
			// Light page text → dark code box; dark page text → light code box
			return relativeLuminance(comp.r, comp.g, comp.b) > 0.52 ? 'dark' : 'light';
		}
	}
	return inferSurfaceTone(surfaceColor);
}

/** Markdown inline `code` and fenced ``` blocks — grey box opposes text tone. */
export function buildMarkdownCodeCssVariables(surfaceColor: string, textPrimary?: string): string {
	const boxTone = inferMarkdownCodeBlockTone(surfaceColor, textPrimary);
	if (boxTone === 'light') {
		return `  --theme-code-tone: light;
  --theme-code-foreground: #1a1a1a;
  --theme-code-background: #e4e4e4;
  --theme-code-inline-background: #ebebeb;
  --theme-code-border: #c8c8c8;`;
	}
	return `  --theme-code-tone: dark;
  --theme-code-foreground: #f0f0f0;
  --theme-code-background: #2a2a2a;
  --theme-code-inline-background: #333333;
  --theme-code-border: #444444;`;
}
