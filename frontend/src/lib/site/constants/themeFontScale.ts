export const THEME_FONT_SCALE_MIN = 0.88;
export const THEME_FONT_SCALE_MAX = 1.12;
export const THEME_FONT_SCALE_STEP = 0.005;

export function clampThemeFontScale(scale: string | number | undefined): string {
	const n = typeof scale === 'number' ? scale : parseFloat(String(scale ?? '1'));
	if (Number.isNaN(n)) return '1';
	return String(Math.min(THEME_FONT_SCALE_MAX, Math.max(THEME_FONT_SCALE_MIN, n)));
}
