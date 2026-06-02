import { describe, expect, test } from 'bun:test';
import {
	DEFAULT_NOTIFICATION_SETTINGS,
	TEST_NOTIFICATION_PRESET,
	validateNotificationSettings
} from './notificationSettings';

describe('validateNotificationSettings', () => {
	test('returns defaults for empty input', () => {
		const settings = validateNotificationSettings({});
		expect(settings.adminLogin.failedMode).toBe('lockout');
		expect(settings.adminLogin.success.enabled).toBe(true);
		expect(settings.adminLogin.success.tags).toEqual(
			DEFAULT_NOTIFICATION_SETTINGS.adminLogin.success.tags
		);
		expect(settings.test.title).toBe(TEST_NOTIFICATION_PRESET.title);
	});

	test('accepts valid failedMode values', () => {
		expect(validateNotificationSettings({ adminLogin: { failedMode: 'each' } }).adminLogin.failedMode).toBe(
			'each'
		);
		expect(validateNotificationSettings({ adminLogin: { failedMode: 'off' } }).adminLogin.failedMode).toBe(
			'off'
		);
		expect(
			validateNotificationSettings({ adminLogin: { failedMode: 'LOCKOUT' } }).adminLogin.failedMode
		).toBe('lockout');
	});

	test('falls back to default failedMode for invalid values', () => {
		const settings = validateNotificationSettings({ adminLogin: { failedMode: 'sometimes' } });
		expect(settings.adminLogin.failedMode).toBe('lockout');
	});

	test('merges appearance overrides onto defaults', () => {
		const settings = validateNotificationSettings({
			adminLogin: {
				success: {
					title: 'Custom login title',
					priority: 5,
					tags: ['custom_tag']
				}
			}
		});

		expect(settings.adminLogin.success.title).toBe('Custom login title');
		expect(settings.adminLogin.success.priority).toBe(5);
		expect(settings.adminLogin.success.tags).toEqual(['custom_tag']);
		expect(settings.adminLogin.success.body).toBe(
			DEFAULT_NOTIFICATION_SETTINGS.adminLogin.success.body
		);
	});

	test('maps legacy successEnabled to success.enabled', () => {
		const disabled = validateNotificationSettings({
			adminLogin: { successEnabled: false }
		});
		expect(disabled.adminLogin.success.enabled).toBe(false);

		const enabled = validateNotificationSettings({
			adminLogin: { successEnabled: true, success: { enabled: false } }
		});
		expect(enabled.adminLogin.success.enabled).toBe(false);
	});

	test('maps legacy twitter.enabled to failure and restored', () => {
		const disabled = validateNotificationSettings({
			twitter: { enabled: false }
		});
		expect(disabled.twitter.failure.enabled).toBe(false);
		expect(disabled.twitter.restored.enabled).toBe(false);

		const enabled = validateNotificationSettings({
			twitter: { enabled: true, failure: { enabled: false } }
		});
		expect(enabled.twitter.failure.enabled).toBe(false);
		expect(enabled.twitter.restored.enabled).toBe(true);
	});

	test('sanitizes invalid URLs and tags in stored settings', () => {
		const settings = validateNotificationSettings({
			test: {
				click: 'javascript:alert(1)',
				icon: 'ftp://example.com/icon.png',
				tags: [' Warning ', 'bad-tag!', '', 'a'.repeat(40)]
			}
		});

		expect(settings.test.click).toBe('');
		expect(settings.test.icon).toBe('');
		expect(settings.test.tags).toEqual(['warning', 'badtag']);
	});

	test('handles non-object input gracefully', () => {
		const settings = validateNotificationSettings(null);
		expect(settings.adminLogin.failedMode).toBe('lockout');
		expect(settings.twitter.failure.title).toBe(
			DEFAULT_NOTIFICATION_SETTINGS.twitter.failure.title
		);
	});
});
