import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	timeout: process.env.CI ? 60_000 : 30_000,
	workers: process.env.CI
		? Number(process.env.PW_CI_WORKERS) > 0
			? Number(process.env.PW_CI_WORKERS)
			: 2
		: undefined,
	reporter: process.env.CI ? [['list'], ['html']] : 'html',

	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},

	projects: [
		{
			name: 'chromium',
			use: { browserName: 'chromium' }
		},
		{
			name: 'firefox',
			use: { browserName: 'firefox' }
		},
		...(process.env.CI || process.env.PLAYWRIGHT_ALL_BROWSERS
			? [{ name: 'webkit', use: { browserName: 'webkit' as const } }]
			: [])
	],

	webServer: {
		command: 'bun run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
		timeout: process.env.CI ? 60_000 : 30_000
	}
});
