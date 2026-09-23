import { test, expect, type Page } from '@playwright/test';
import { gotoReady, openSettingsPanel, clickInSettingsPanel } from './helpers';

async function openThemeSwitcher(page: Page) {
	await openSettingsPanel(page);

	const themeButton = page.locator('.theme-button');
	if (await themeButton.isDisabled()) {
		test.skip(true, 'Theme is enforced by admin — switcher is locked');
	}

	await clickInSettingsPanel(page, '.theme-button');
	await expect(page.locator('.theme-window')).toBeVisible();
	await expect(page.locator('.theme-window .loading-state')).toHaveCount(0, {
		timeout: 15_000
	});
	const themeWin = page.locator('.theme-window');
	if (await themeWin.getByText('No themes available').isVisible()) {
		test.skip(true, 'Theme window is empty — /api/themes returned no rows');
	}
	await expect(page.locator('.theme-card').first()).toBeVisible({ timeout: 15_000 });
}

function getCssVar(page: Page, varName: string) {
	return page.evaluate(
		(name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
		varName
	);
}

test.describe.configure({ mode: 'serial' });
test.describe('Theme switcher', () => {
	test.beforeAll(async ({ request }, testInfo) => {
		try {
			await expect
				.poll(
					async () => {
						const res = await request.get('/api/themes');
						if (!res.ok()) return 0;
						const j = await res.json();
						return Array.isArray(j?.data) ? j.data.length : 0;
					},
					{ timeout: 60_000 }
				)
				.toBeGreaterThan(0);
		} catch {
			if (process.env.CI) {
				throw new Error(
					'CI requires at least one theme from GET /api/themes (seed the DB or fix the API).'
				);
			}
			testInfo.skip(true, '/api/themes has no themes — seed backend or start with a populated DB');
		}
	});

	test('opens and shows available themes', async ({ page }) => {
		await gotoReady(page, '/');
		await openThemeSwitcher(page);

		const cards = page.locator('.theme-card');
		expect(await cards.count()).toBeGreaterThanOrEqual(1);

		const activeCard = page.locator('.theme-card.active');
		await expect(activeCard).toHaveCount(1);
		await expect(activeCard.locator('.active-badge')).toHaveText('Active');
	});

	test('each theme card shows name and color preview', async ({ page }) => {
		await gotoReady(page, '/');
		await openThemeSwitcher(page);

		const firstCard = page.locator('.theme-card').first();
		await expect(firstCard.locator('.theme-name')).not.toBeEmpty();
		await expect(firstCard.locator('.theme-preview')).toBeVisible();
		await expect(firstCard.locator('.color-bar')).toBeVisible();
	});

	test('switching theme changes CSS custom properties', async ({ page }) => {
		await gotoReady(page, '/');
		await openThemeSwitcher(page);

		const cards = page.locator('.theme-card');
		const count = await cards.count();
		if (count < 2) {
			test.skip(true, 'Only one theme available — cannot test switching');
		}

		const accentBefore = await getCssVar(page, '--theme-accent');
		const bgBefore = await getCssVar(page, '--theme-background');

		const activeCard = page.locator('.theme-card.active');
		const activeIndex = await activeCard.evaluate((el) => {
			const parent = el.parentElement;
			return parent ? Array.from(parent.children).indexOf(el) : 0;
		});

		const targetIndex = activeIndex === 0 ? 1 : 0;
		const targetCard = cards.nth(targetIndex);
		await targetCard.click();

		await expect(targetCard).toHaveClass(/active/, { timeout: 5_000 });
		await expect(targetCard.locator('.active-badge')).toHaveText('Active');

		const accentAfter = await getCssVar(page, '--theme-accent');
		const bgAfter = await getCssVar(page, '--theme-background');

		const changed = accentBefore !== accentAfter || bgBefore !== bgAfter;
		expect(changed).toBe(true);
	});

	test('switching theme persists after closing and reopening', async ({ page }) => {
		await gotoReady(page, '/');
		await openThemeSwitcher(page);

		const cards = page.locator('.theme-card');
		const count = await cards.count();
		if (count < 2) {
			test.skip(true, 'Only one theme available');
		}

		const activeCard = page.locator('.theme-card.active');
		const activeIndex = await activeCard.evaluate((el) => {
			const parent = el.parentElement;
			return parent ? Array.from(parent.children).indexOf(el) : 0;
		});
		const targetIndex = activeIndex === 0 ? 1 : 0;
		const targetCard = cards.nth(targetIndex);

		const targetName = await targetCard.locator('.theme-name').textContent();
		if (!targetName) throw new Error('expected theme name on card');
		await targetCard.click();
		await expect(targetCard).toHaveClass(/active/, { timeout: 5_000 });

		await page.locator('.theme-window .close-button').click();
		await expect(page.locator('.theme-window')).not.toBeVisible();

		await page.locator('.settings-backdrop').click();

		await openSettingsPanel(page);

		await clickInSettingsPanel(page, '.theme-button');
		await expect(page.locator('.theme-window')).toBeVisible();

		const reOpenedActive = page.locator('.theme-card.active .theme-name');
		await expect(reOpenedActive).toHaveText(targetName);
	});

	test('closes via X button and backdrop', async ({ page }) => {
		await gotoReady(page, '/');
		await openThemeSwitcher(page);

		await page.locator('.theme-window .close-button').click();
		await expect(page.locator('.theme-window')).not.toBeVisible();

		await clickInSettingsPanel(page, '.theme-button');
		await expect(page.locator('.theme-window')).toBeVisible();

		await page.locator('.window-backdrop').click({ position: { x: 5, y: 5 } });
		await expect(page.locator('.theme-window')).not.toBeVisible();
	});
});
