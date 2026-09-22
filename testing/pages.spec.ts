import { test, expect } from '@playwright/test';

test.describe('Site pages load without errors', () => {
	const pages = [
		{ path: '/', name: 'Home', content: 'header' },
		{ path: '/about', name: 'About', content: '.about-section' },
		{ path: '/projects', name: 'Projects', content: '.page-content' },
		{ path: '/blog', name: 'Blog', content: '.blog-page' },
		{ path: '/contact', name: 'Contact', content: '.page-content' }
	];

	for (const page of pages) {
		test(`${page.name} (${page.path}) loads`, async ({ page: p }) => {
			const errors: string[] = [];
			p.on('pageerror', (err) => errors.push(err.message));

			const response = await p.goto(page.path, { waitUntil: 'load', timeout: 60_000 });
			expect(response?.status()).toBeLessThan(400);

			await expect(p.locator(page.content).first()).toBeVisible({ timeout: 15_000 });
			await expect(p.locator('header')).toBeVisible();
			await expect(p.locator('nav')).toBeVisible();

			expect(errors).toEqual([]);
		});
	}

	test('non-existent page returns 404', async ({ page }) => {
		const response = await page.goto('/this-page-does-not-exist');
		expect(response?.status()).toBe(404);
	});
});
