export const NOINDEX_PATH_PREFIXES = ['/admin', '/login', '/logout'] as const;

export function isNoIndexPath(pathname: string): boolean {
	return NOINDEX_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function buildRobotsTxt(origin: string): string {
	return [
		'User-agent: *',
		...NOINDEX_PATH_PREFIXES.map((prefix) => `Disallow: ${prefix}`),
		'',
		`Sitemap: ${origin}/sitemap.xml`,
		''
	].join('\n');
}
