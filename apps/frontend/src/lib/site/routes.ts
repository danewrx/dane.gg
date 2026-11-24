const ROUTES_PREFIX = '/src/routes/(site)';
const PAGE_FILE = '/+page.svelte';

export function routePathsFromFiles(files: string[]): string[] {
	const paths = files
		.filter((file) => file.startsWith(ROUTES_PREFIX) && file.endsWith(PAGE_FILE))
		.map((file) => file.slice(ROUTES_PREFIX.length, -PAGE_FILE.length))
		.map((path) =>
			path
				.split('/')
				.filter((segment) => !/^\(.*\)$/.test(segment))
				.join('/')
		)
		.filter((path) => !path.includes('['))
		.map((path) => path || '/');
	return [...new Set(paths)].sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));
}

export const STATIC_ROUTE_PATHS = routePathsFromFiles(
	Object.keys(import.meta.glob('/src/routes/**/+page.svelte'))
);

export function nameFromPath(path: string): string {
	const last = path.split('/').filter(Boolean).pop() ?? '';
	const words = decodeURIComponent(last).replace(/[-_]+/g, ' ').trim();
	return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Home';
}
