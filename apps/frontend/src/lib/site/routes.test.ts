import { describe, expect, it } from 'vitest';
import { nameFromPath, routePathsFromFiles, STATIC_ROUTE_PATHS } from './routes';

const file = (path: string) => `/src/routes/(site)${path}/+page.svelte`;

describe('routePathsFromFiles', () => {
	it('turns page files into URL paths, home first then alphabetical', () => {
		expect(routePathsFromFiles([file('/contact'), file(''), file('/about')])).toEqual([
			'/',
			'/about',
			'/contact'
		]);
	});

	it('skips [param] routes, which have no single URL', () => {
		expect(routePathsFromFiles([file('/blog'), file('/blog/[slug=blogSlug]')])).toEqual(['/blog']);
	});

	it('drops (group) folders and keeps nested pages', () => {
		expect(routePathsFromFiles([file('/(extras)/uses'), file('/projects/archive')])).toEqual([
			'/projects/archive',
			'/uses'
		]);
	});

	it('ignores other files and routes outside the public site', () => {
		expect(
			routePathsFromFiles([
				'/src/routes/(site)/blog/rss.xml/+server.ts',
				'/src/routes/(site)/+layout.svelte',
				'/src/routes/(admin)/admin/+page.svelte',
				file('/about')
			])
		).toEqual(['/about']);
	});

	it('finds the real site pages and none of the dynamic ones', () => {
		for (const path of ['/', '/about', '/contact', '/projects', '/blog']) {
			expect(STATIC_ROUTE_PATHS).toContain(path);
		}
		expect(STATIC_ROUTE_PATHS.some((path) => path.includes('['))).toBe(false);
		expect(STATIC_ROUTE_PATHS.some((path) => path.startsWith('/admin'))).toBe(false);
	});
});

describe('nameFromPath', () => {
	it('makes a readable name from the last path segment', () => {
		expect(nameFromPath('/uses')).toBe('Uses');
		expect(nameFromPath('/our-work')).toBe('Our work');
		expect(nameFromPath('/projects/side_projects')).toBe('Side projects');
		expect(nameFromPath('/')).toBe('Home');
	});
});
