import { test, expect } from '@playwright/test';
import { gotoReady } from './helpers';

test.describe('Homepage', () => {
	test('loads and shows header + nav', async ({ page }) => {
		await gotoReady(page, '/');
		await expect(page.locator('header')).toBeVisible();
		await expect(page.locator('nav')).toBeVisible();

		const navLinks = page.locator('.nav-link');
		await expect(navLinks).toHaveCount(5);
		await expect(navLinks.first()).toHaveText('Home');
	});

	test('ASCII logo links to homepage', async ({ page }) => {
		await gotoReady(page, '/about');
		await page.click('.ascii-link');
		await expect(page).toHaveURL('/');
	});
});
