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

	test('does not render the advert slot when no adverts are configured', async ({ page }) => {
		// The e2e database has adverts disabled/empty; the guarded slot must not
		// leave an empty gap between Recent posts and Systems status.
		await gotoReady(page, '/');
		await expect(page.locator('.advert-slot')).toHaveCount(0);
	});
});
