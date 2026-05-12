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

export async function openSettingsPanel(page: Page) {
	const openBtn = page.locator('.settings-icon');
	await openBtn.scrollIntoViewIfNeeded();
	await expect(openBtn).toBeVisible({ timeout: 15_000 });
	for (let attempt = 0; attempt < 3; attempt++) {
		await openBtn.evaluate((el) => (el as HTMLButtonElement).click());
		try {
			await expect(page.locator('.settings-panel.open')).toBeVisible({ timeout: 3_000 });
			return;
		} catch {
			/* Svelte may batch the first synthetic click; retry */
		}
	}
	await expect(page.locator('.settings-panel.open')).toBeVisible({ timeout: 15_000 });
}
