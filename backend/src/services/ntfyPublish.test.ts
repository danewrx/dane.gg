import { describe, expect, test } from 'bun:test';
import { buildNtfyPublishHeaders, mergeNtfyAppearance } from './ntfyPublish';
import { DEFAULT_NOTIFICATION_SETTINGS } from './notificationSettings';

describe('buildNtfyPublishHeaders', () => {
	test('includes icon, click, and markdown', () => {
		const appearance = mergeNtfyAppearance(DEFAULT_NOTIFICATION_SETTINGS.test, {
			markdown: true,
			click: 'https://example.com/admin',
			icon: 'https://example.com/icon.png'
		});

		const headers = buildNtfyPublishHeaders(appearance);
		expect(headers['Content-Type']).toBe('text/markdown');
		expect(headers.Markdown).toBe('yes');
		expect(headers.Click).toBe('https://example.com/admin');
		expect(headers.Icon).toBe('https://example.com/icon.png');
	});

	test('strips emoji from title headers', () => {
		const appearance = mergeNtfyAppearance(DEFAULT_NOTIFICATION_SETTINGS.test, {
			title: 'Alert with emoji stripped'
		});
		const headers = buildNtfyPublishHeaders(appearance);
		expect(headers.Title).toBe('Alert with emoji stripped');
	});
});
