import { test, expect } from '@playwright/test';
import { gotoReady } from './helpers';

test.describe('SEO basics', () => {
	test('homepage has a title', async ({ page }) => {
		await gotoReady(page, '/');
		const title = await page.title();
		expect(title.length).toBeGreaterThan(0);
	});

	test('pages have canonical link', async ({ page }) => {
		for (const path of ['/', '/about', '/blog', '/contact']) {
			await gotoReady(page, path);
			const canonical = page.locator('link[rel="canonical"]');
			await expect(canonical).toHaveCount(1);
		}
	});

	test('blog page advertises RSS feed', async ({ page }) => {
		await gotoReady(page, '/blog');
		const feedLink = page.locator('link[rel="alternate"][type="application/rss+xml"]');
		await expect(feedLink).toHaveCount(1);
		await expect(feedLink).toHaveAttribute('href', '/blog/rss.xml');
	});

	test('blog RSS feed returns valid XML', async ({ request }) => {
		const response = await request.get('/blog/rss.xml');
		expect(response.ok()).toBeTruthy();
		expect(response.headers()['content-type']).toContain('application/xml');
		const body = await response.text();
		expect(body).toContain('<rss version="2.0"');
		expect(body).toContain('<channel>');
	});
});
