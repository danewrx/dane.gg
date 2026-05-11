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
});
