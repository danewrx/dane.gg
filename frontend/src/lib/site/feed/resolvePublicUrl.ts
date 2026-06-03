export function resolvePublicAssetUrl(path: string | null | undefined, origin: string): string {
	if (!path?.trim()) return '';
	const trimmed = path.trim();
	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
		return trimmed;
	}
	if (trimmed.startsWith('/uploads/')) {
		const filename = trimmed.replace('/uploads/', '');
		return `${origin}/api/upload/file/${filename}`;
	}
	if (trimmed.startsWith('/')) {
		return `${origin}${trimmed}`;
	}
	return `${origin}/${trimmed}`;
}

export function absolutizeRelativeUrlsInHtml(html: string, origin: string): string {
	return html.replaceAll(
		/(\b(?:src|href))="(\/(?!\/)[^"]*)"/gi,
		(_match, attr: string, path: string) => `${attr}="${resolvePublicAssetUrl(path, origin)}"`
	);
}
