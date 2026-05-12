import { test, expect, type Page } from '@playwright/test';
import { gotoReady, openSettingsPanel } from './helpers';

async function closeSettings(page: Page) {
	await page.locator('.settings-backdrop').click();
	await expect(page.locator('.settings-panel.open')).toHaveCount(0);
}

async function scrollPanelTo(page: Page, selector: string) {
	await page.locator('.settings-content').evaluate(
		(el, sel) => {
			const target = el.querySelector(sel);
			target?.scrollIntoView({ block: 'center' });
		},
		selector
	);
}

test.describe.configure({ mode: 'serial' });
test.describe('Settings panel', () => {
	test.beforeEach(async ({ page }) => {
		await gotoReady(page, '/');
	});

	test('opens via gear icon and closes via backdrop', async ({ page }) => {
		await expect(page.locator('.settings-panel.open')).toHaveCount(0);

		await openSettingsPanel(page);
		await closeSettings(page);
	});

	test('closes via Escape key', async ({ page }) => {
		await openSettingsPanel(page);

		await page.locator('.settings-backdrop').focus();
		await page.keyboard.press('Escape');
		await expect(page.locator('.settings-panel.open')).toHaveCount(0);
	});

	test('shows all settings sections', async ({ page }) => {
		await openSettingsPanel(page);

		const headings = await page.locator('.settings-section h3').allTextContents();
		expect(headings).toContain('Theme');
		expect(headings).toContain('Font');
		expect(headings).toContain('Weather Effects');
		expect(headings).toContain('Neko');
		expect(headings).toContain('Chat');
	});

	test('font selector has options and can be changed', async ({ page }) => {
		await openSettingsPanel(page);
		await scrollPanelTo(page, '#font-select');

		const fontSelect = page.locator('#font-select');
		await expect(fontSelect).toBeVisible();

		const options = await fontSelect.locator('option').allTextContents();
		expect(options.length).toBeGreaterThanOrEqual(2);

		const currentValue = await fontSelect.inputValue();
		const newValue = currentValue === 'theme' ? 'system' : 'theme';
		await fontSelect.selectOption(newValue);
		expect(await fontSelect.inputValue()).toBe(newValue);
	});

	test('weather type selector has options', async ({ page }) => {
		await openSettingsPanel(page);
		await scrollPanelTo(page, '#weather-type');

		const weatherSelect = page.locator('#weather-type');
		await expect(weatherSelect).toBeVisible();

		const options = await weatherSelect.locator('option').allTextContents();
		expect(options.length).toBeGreaterThanOrEqual(2);
	});

	test('weather speed slider appears when effect is active', async ({ page }) => {
		await openSettingsPanel(page);
		await scrollPanelTo(page, '#weather-type');

		const weatherSelect = page.locator('#weather-type');
		await weatherSelect.selectOption('rain');

		await scrollPanelTo(page, '#weather-speed');
		const speedSlider = page.locator('#weather-speed');
		await expect(speedSlider).toBeVisible();

		await weatherSelect.selectOption('none');
		await expect(speedSlider).not.toBeVisible();
	});

	test('neko picker grid is visible with options', async ({ page }) => {
		await openSettingsPanel(page);
		await scrollPanelTo(page, '.oneko-grid');

		const nekoGrid = page.locator('.oneko-grid');
		await expect(nekoGrid).toBeVisible();

		const options = nekoGrid.locator('.oneko-option');
		expect(await options.count()).toBeGreaterThan(1);
	});

	test('neko picker can select a variant', async ({ page }) => {
		await openSettingsPanel(page);
		await scrollPanelTo(page, '.oneko-grid');

		const firstOption = page.locator('.oneko-grid .oneko-option').first();
		await firstOption.click({ force: true });
		await expect(firstOption).toHaveAttribute('aria-pressed', 'true');
	});

	test('chat notifications checkbox toggles', async ({ page }) => {
		await openSettingsPanel(page);
		await scrollPanelTo(page, '.chat-notification-controls');

		const checkbox = page.locator('.chat-notification-controls input[type="checkbox"]');
		await expect(checkbox).toBeVisible();

		const wasChecked = await checkbox.isChecked();
		await checkbox.click({ force: true });
		expect(await checkbox.isChecked()).toBe(!wasChecked);
	});

	test('theme button opens theme switcher window', async ({ page }) => {
		await openSettingsPanel(page);
		await scrollPanelTo(page, '.theme-button');

		const themeButton = page.locator('.theme-button');
		const isDisabled = await themeButton.isDisabled();

		if (!isDisabled) {
			await themeButton.click({ force: true });
			const themeWindow = page.locator('.theme-window');
			await expect(themeWindow).toBeVisible();

			await themeWindow.locator('.close-button').click();
			await expect(themeWindow).not.toBeVisible();
		}
	});

	test('settings gear icon is present on every page', async ({ page }) => {
		const routes = ['/', '/about', '/projects', '/blog', '/contact'];
		for (const route of routes) {
			await gotoReady(page, route);
			await expect(page.locator('.settings-icon')).toBeVisible();
		}
	});
});
