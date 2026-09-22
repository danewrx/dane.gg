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

const settingsPanel = (page: Page) => page.locator('.settings-panel[role="dialog"]');

/** Wait until the fly transition has finished (panel fully on screen). */
async function waitForSettingsPanelSettled(page: Page) {
	await expect(settingsPanel(page)).toBeVisible({ timeout: 15_000 });
	await page.waitForFunction(
		() => {
			const panel = document.querySelector('.settings-panel[role="dialog"]');
			if (!panel) return false;
			const { transform } = getComputedStyle(panel);
			if (transform === 'none') return true;
			const m = new DOMMatrixReadOnly(transform);
			return Math.abs(m.m41) < 4;
		},
		undefined,
		{ timeout: 5_000 }
	);
}

export async function openSettingsPanel(page: Page) {
	const openBtn = page.locator('.settings-icon');
	await openBtn.scrollIntoViewIfNeeded();
	await expect(openBtn).toBeVisible({ timeout: 15_000 });
	for (let attempt = 0; attempt < 3; attempt++) {
		await openBtn.evaluate((el) => (el as HTMLButtonElement).click());
		try {
			await waitForSettingsPanelSettled(page);
			return;
		} catch {
			/* Svelte may batch the first synthetic click; retry */
		}
	}
	await waitForSettingsPanelSettled(page);
}

export async function expectSettingsPanelClosed(page: Page) {
	await expect(settingsPanel(page)).toHaveCount(0, { timeout: 5_000 });
}

export async function scrollSettingsPanelTo(page: Page, selector: string) {
	await page.locator('.settings-content').evaluate(
		(el, sel) => {
			el.querySelector(sel)?.scrollIntoView({ block: 'center', inline: 'nearest' });
		},
		selector
	);
}

/** Click inside the settings panel (avoids "outside viewport" during slide animation). */
export async function clickInSettingsPanel(page: Page, selector: string) {
	const target = page.locator(selector).first();
	await scrollSettingsPanelTo(page, selector);
	await expect(target).toBeAttached();
	await target.evaluate((el) => (el as HTMLElement).click());
}
