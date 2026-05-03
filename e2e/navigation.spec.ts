import { test, expect } from '@playwright/test';

const routes = [
	{ name: 'About', path: '/about', selector: '.about-section' },
	{ name: 'Blog', path: '/blog', selector: '.blog-page' },
	{ name: 'Projects', path: '/projects' },
	{ name: 'Contact', path: '/contact' }
];

test.describe('Site navigation', () => {
	test('each nav link navigates to the correct page', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });

		for (const route of routes) {
			await page.locator(`.nav-link:has-text("${route.name}")`).click();
			await expect(page).toHaveURL(route.path);

			if (route.selector) {
				await expect(page.locator(route.selector)).toBeVisible();
			}

			await expect(page.locator('header')).toBeVisible();
		}
	});

	test('back navigation works after visiting a page', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		await page.locator('.nav-link:has-text("About")').click();
		await expect(page).toHaveURL('/about');

		await page.goBack();
		await expect(page).toHaveURL('/');
	});
});
