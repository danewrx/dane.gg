import { describe, expect, it } from 'vitest';
import { buildRobotsTxt, isNoIndexPath } from './robots';

describe('isNoIndexPath', () => {
	it('flags the admin, login and logout areas and everything below them', () => {
		for (const path of ['/admin', '/admin/configuration/seo', '/login', '/logout']) {
			expect(isNoIndexPath(path)).toBe(true);
		}
	});

	it('leaves public pages indexable', () => {
		for (const path of ['/', '/about', '/blog', '/blog/admin-tips', '/projects/abc']) {
			expect(isNoIndexPath(path)).toBe(false);
		}
	});
});

describe('buildRobotsTxt', () => {
	const txt = buildRobotsTxt('https://dane.gg');

	it('allows crawling in general but disallows the noindex areas', () => {
		expect(txt).toContain('User-agent: *');
		for (const prefix of ['/admin', '/login', '/logout']) {
			expect(txt).toContain(`Disallow: ${prefix}\n`);
		}
		expect(txt).not.toMatch(/^Disallow:\s*$/m);
	});

	it('points at the sitemap on the given origin', () => {
		expect(txt).toContain('Sitemap: https://dane.gg/sitemap.xml');
	});
});
