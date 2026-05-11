import { expect, type Page } from '@playwright/test';

/**
 * Navigate and wait until the shell is ready.
 * Avoids `networkidle` — Vite dev + widgets often keep connections open, so networkidle
 * flakes (especially WebKit) and under parallel workers.
 */
export async function gotoReady(page: Page, path: string) {
	await page.goto(path, { waitUntil: 'load', timeout: 60_000 });
	await expect(page.locator('header')).toBeVisible({ timeout: 25_000 });
}
