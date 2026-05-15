/** Matches `website.social_links.svg_url` varchar length */
const MAX_LEN = 500;

/**
 * Validates an SVG asset URL for social links: absolute http(s), no credentials,
 * non-empty host. Returns normalized `href` or null.
 */
export function validateSvgIconUrl(input: string): string | null {
	const raw = input.trim();
	if (!raw) return null;

	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
	if (!url.hostname) return null;
	if (url.username !== '' || url.password !== '') return null;

	const href = url.href;
	if (href.length > MAX_LEN) return null;

	return href;
}
