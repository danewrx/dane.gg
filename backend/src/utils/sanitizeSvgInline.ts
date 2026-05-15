/** Inline SVG pasted by admins */

const MAX_LEN = 50_000;
const BLOCKED =
	/<\/(?:script|foreignObject|iframe|embed|object)\b|<(?:script|foreignObject|iframe|embed|object)\b|[\s"'`]on\w+\s*=|javascript:|data:text\/html|<\?xml-stylesheet\b/i;

export function sanitizeSvgInlineMarkup(input: string): string | null {
	const raw = input.trim();
	if (!raw.toLowerCase().startsWith('<svg')) return null;
	if (raw.length > MAX_LEN) return null;
	if (BLOCKED.test(raw)) return null;
	return raw;
}
