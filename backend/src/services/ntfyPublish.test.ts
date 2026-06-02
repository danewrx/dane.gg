import { describe, expect, test } from 'bun:test';
import { buildNtfyPublishHeaders, mergeNtfyAppearance } from './ntfyPublish';
import { DEFAULT_NOTIFICATION_SETTINGS } from './notificationSettings';
import { renderNotificationTemplate, resolveTemplatedAppearance } from './ntfyTemplate';

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

describe('renderNotificationTemplate', () => {
	test('replaces known placeholders', () => {
		const result = renderNotificationTemplate(
			'User {username} from {ip} at {time}',
			{ username: 'alice', ip: '10.0.0.1', time: '2026-01-01T00:00:00.000Z' }
		);
		expect(result).toBe('User alice from 10.0.0.1 at 2026-01-01T00:00:00.000Z');
	});

	test('leaves unknown placeholders empty', () => {
		const result = renderNotificationTemplate('Hello {missing}', {});
		expect(result).toBe('Hello ');
	});
});

describe('resolveTemplatedAppearance', () => {
	test('renders body and title templates', () => {
		const appearance = mergeNtfyAppearance(DEFAULT_NOTIFICATION_SETTINGS.adminLogin.success, {
			title: 'Login: {username}',
			body: 'Signed in from {ip}'
		});

		const { message, appearance: resolved } = resolveTemplatedAppearance(appearance, {
			username: 'bob',
			ip: '192.0.2.1'
		});

		expect(message).toBe('Signed in from 192.0.2.1');
		expect(resolved.title).toBe('Login: bob');
	});
});
