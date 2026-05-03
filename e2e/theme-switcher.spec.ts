import { test, expect, type Page } from '@playwright/test';

async function openThemeSwitcher(page: Page) {
	const settingsIcon = page.locator('button[aria-label="Open settings"]');
	await settingsIcon.waitFor({ state: 'visible', timeout: 15_000 });
	await settingsIcon.click();
	await expect(page.locator('.settings-backdrop')).toBeVisible();

	await page.locator('.settings-content').evaluate((el) => {
		el.querySelector('.theme-button')?.scrollIntoView({ block: 'center' });
	});

	const themeButton = page.locator('.theme-button');
	if (await themeButton.isDisabled()) {
		test.skip(true, 'Theme is enforced by admin — switcher is locked');
	}

	await themeButton.click({ force: true });
	await expect(page.locator('.theme-window')).toBeVisible();
}

function getCssVar(page: Page, varName: string) {
	return page.evaluate(
		(name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
		varName
	);
}

test.describe('Theme switcher', () => {
	test('opens and shows available themes', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		await openThemeSwitcher(page);

		const cards = page.locator('.theme-card');
		expect(await cards.count()).toBeGreaterThanOrEqual(1);

		const activeCard = page.locator('.theme-card.active');
		await expect(activeCard).toHaveCount(1);
		await expect(activeCard.locator('.active-badge')).toHaveText('Active');
	});

	test('each theme card shows name and color preview', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		await openThemeSwitcher(page);

		const firstCard = page.locator('.theme-card').first();
		await expect(firstCard.locator('.theme-name')).not.toBeEmpty();
		await expect(firstCard.locator('.theme-preview')).toBeVisible();
		await expect(firstCard.locator('.color-bar')).toBeVisible();
	});

	test('switching theme changes CSS custom properties', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
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
		await page.goto('/', { waitUntil: 'networkidle' });
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
		await targetCard.click();
		await expect(targetCard).toHaveClass(/active/, { timeout: 5_000 });

		await page.locator('.theme-window .close-button').click();
		await expect(page.locator('.theme-window')).not.toBeVisible();

		await page.locator('.settings-backdrop').click();

		const settingsIcon = page.locator('button[aria-label="Open settings"]');
		await settingsIcon.click();
		await expect(page.locator('.settings-backdrop')).toBeVisible();

		await page.locator('.settings-content').evaluate((el) => {
			el.querySelector('.theme-button')?.scrollIntoView({ block: 'center' });
		});
		await page.locator('.theme-button').click({ force: true });
		await expect(page.locator('.theme-window')).toBeVisible();

		const reOpenedActive = page.locator('.theme-card.active .theme-name');
		await expect(reOpenedActive).toHaveText(targetName!);
	});

	test('closes via X button and backdrop', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		await openThemeSwitcher(page);

		await page.locator('.theme-window .close-button').click();
		await expect(page.locator('.theme-window')).not.toBeVisible();

		await page.locator('.settings-content').evaluate((el) => {
			el.querySelector('.theme-button')?.scrollIntoView({ block: 'center' });
		});
		await page.locator('.theme-button').click({ force: true });
		await expect(page.locator('.theme-window')).toBeVisible();

		await page.locator('.window-backdrop').click({ position: { x: 5, y: 5 } });
		await expect(page.locator('.theme-window')).not.toBeVisible();
	});
});
