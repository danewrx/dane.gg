import { test, expect } from '@playwright/test';
import { gotoReady } from './helpers';

const routes = [
	{ name: 'About', path: '/about', selector: '.about-section' },
	{ name: 'Blog', path: '/blog', selector: '.blog-page' },
	{ name: 'Projects', path: '/projects' },
	{ name: 'Contact', path: '/contact' }
];

test.describe('Site navigation', () => {
	test('each nav link navigates to the correct page', async ({ page }) => {
		await gotoReady(page, '/');

		for (const route of routes) {
			const navLink = page
				.getByRole('navigation')
				.getByRole('link', { name: route.name, exact: true });
			const urlGlob = route.path === '/' ? '**/' : `**${route.path}`;
			await navLink.click();
			await page.waitForURL(urlGlob, { timeout: 20_000, waitUntil: 'domcontentloaded' });

			if (route.selector) {
				await expect(page.locator(route.selector)).toBeVisible();
			}

			await expect(page.locator('header')).toBeVisible();
		}
	});

	test('back navigation works after visiting a page', async ({ page }) => {
		await gotoReady(page, '/');
		await page.getByRole('navigation').getByRole('link', { name: 'About', exact: true }).click();
		await expect(page).toHaveURL('/about');

		await page.goBack();
		await expect(page).toHaveURL('/');
	});
});
