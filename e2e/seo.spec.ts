import { test, expect } from '@playwright/test';

test.describe('SEO basics', () => {
	test('homepage has a title', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		const title = await page.title();
		expect(title.length).toBeGreaterThan(0);
	});

	test('pages have canonical link', async ({ page }) => {
		for (const path of ['/', '/about', '/blog', '/contact']) {
			await page.goto(path, { waitUntil: 'networkidle', timeout: 15_000 });
			const canonical = page.locator('link[rel="canonical"]');
			await expect(canonical).toHaveCount(1);
		}
	});
});
