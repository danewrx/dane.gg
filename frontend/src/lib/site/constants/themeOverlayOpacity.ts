export function clampThemeUnitOpacity(v: string | undefined | null, fallback: string): string {
	if (v == null || String(v).trim() === '') return fallback;
	const n = parseFloat(String(v));
	if (Number.isNaN(n)) return fallback;
	return String(Math.min(1, Math.max(0, n)));
}
