import { describe, expect, test } from 'bun:test';
import { buildNtfyPublishHeaders, mergeNtfyAppearance } from './ntfyPublish';
import { DEFAULT_NOTIFICATION_SETTINGS } from './notificationSettings';
import {
	renderNotificationTemplate,
	resolveTemplatedAppearance,
	testNotificationTemplateVars
} from './ntfyTemplate';

const base = DEFAULT_NOTIFICATION_SETTINGS.test;

describe('mergeNtfyAppearance', () => {
	test('returns a copy of base for non-object input', () => {
		const merged = mergeNtfyAppearance(base, null);
		expect(merged).toEqual(base);
		expect(merged).not.toBe(base);
	});

	test('clamps priority between 1 and 5', () => {
		expect(mergeNtfyAppearance(base, { priority: 0 }).priority).toBe(1);
		expect(mergeNtfyAppearance(base, { priority: 99 }).priority).toBe(5);
		expect(mergeNtfyAppearance(base, { priority: '4' }).priority).toBe(4);
		expect(mergeNtfyAppearance(base, { priority: 'bad' }).priority).toBe(base.priority);
	});

	test('normalizes tags and limits count', () => {
		const tags = mergeNtfyAppearance(base, {
			tags: [' Warning ', 'SKULL', 'bad-tag!', 'one', 'two', 'three', 'four', 'five', 'six', 'seven']
		}).tags;

		expect(tags).toEqual(['warning', 'skull', 'badtag', 'one', 'two', 'three', 'four', 'five']);
	});

	test('drops tags longer than 32 characters', () => {
		const tags = mergeNtfyAppearance(base, {
			tags: ['valid', 'a'.repeat(40)]
		}).tags;
		expect(tags).toEqual(['valid']);
	});

	test('rejects invalid optional URLs', () => {
		const merged = mergeNtfyAppearance(base, {
			click: 'javascript:alert(1)',
			icon: 'not-a-url'
		});
		expect(merged.click).toBe('');
		expect(merged.icon).toBe('');
	});

	test('accepts valid http and https URLs', () => {
		const merged = mergeNtfyAppearance(base, {
			click: 'https://dane.gg/admin',
			icon: 'http://example.com/icon.png'
		});
		expect(merged.click).toBe('https://dane.gg/admin');
		expect(merged.icon).toBe('http://example.com/icon.png');
	});

	test('strips non-ascii characters from title', () => {
		const merged = mergeNtfyAppearance(base, { title: 'Alert 🚨 here' });
		expect(merged.title).toBe('Alert here');
	});

	test('keeps base body when sanitized body is empty', () => {
		const merged = mergeNtfyAppearance(base, { body: '' });
		expect(merged.body).toBe(base.body);
	});

	test('preserves explicit enabled flag', () => {
		expect(mergeNtfyAppearance(base, { enabled: false }).enabled).toBe(false);
	});
});

describe('buildNtfyPublishHeaders', () => {
	test('includes icon, click, and markdown', () => {
		const appearance = mergeNtfyAppearance(base, {
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

	test('uses plain text content type when markdown is disabled', () => {
		const headers = buildNtfyPublishHeaders(mergeNtfyAppearance(base, { markdown: false }));
		expect(headers['Content-Type']).toBe('text/plain');
		expect(headers.Markdown).toBeUndefined();
	});

	test('omits optional headers when values are empty', () => {
		const headers = buildNtfyPublishHeaders(
			mergeNtfyAppearance(base, {
				click: '',
				icon: ''
			})
		);

		expect(headers.Click).toBeUndefined();
		expect(headers.Icon).toBeUndefined();
	});

	test('omits Tags header when tag list is empty', () => {
		const headers = buildNtfyPublishHeaders({
			...base,
			tags: [],
			click: '',
			icon: ''
		});
		expect(headers.Tags).toBeUndefined();
	});

	test('joins tags for the Tags header', () => {
		const headers = buildNtfyPublishHeaders(
			mergeNtfyAppearance(base, { tags: ['warning', 'admin'] })
		);
		expect(headers.Tags).toBe('warning,admin');
	});

	test('includes title and priority', () => {
		const headers = buildNtfyPublishHeaders(
			mergeNtfyAppearance(base, { title: 'Test alert', priority: 4 })
		);
		expect(headers.Title).toBe('Test alert');
		expect(headers.Priority).toBe('4');
	});
});

describe('renderNotificationTemplate', () => {
	test('replaces known placeholders', () => {
		const result = renderNotificationTemplate(
			'User {username} from {ip} at {time}',
			{ username: 'alice', ip: '192.0.2.1', time: '2026-01-01T00:00:00.000Z' }
		);
		expect(result).toBe('User alice from 192.0.2.1 at 2026-01-01T00:00:00.000Z');
	});

	test('leaves unknown placeholders empty', () => {
		const result = renderNotificationTemplate('Hello {missing}', {});
		expect(result).toBe('Hello ');
	});

	test('stringifies numeric values', () => {
		const result = renderNotificationTemplate('Attempt {attemptCount}/{maxAttempts}', {
			attemptCount: 3,
			maxAttempts: 5
		});
		expect(result).toBe('Attempt 3/5');
	});

	test('treats null values as empty', () => {
		const result = renderNotificationTemplate('User {username}', { username: null });
		expect(result).toBe('User ');
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

describe('testNotificationTemplateVars', () => {
	test('includes sample values for common placeholders', () => {
		const vars = testNotificationTemplateVars();
		expect(vars.username).toBe('testuser');
		expect(vars.ip).toBe('192.0.2.1');
		expect(vars.error).toContain('test');
		const { time } = vars;
		expect(typeof time).toBe('string');
		if (typeof time === 'string') {
			expect(time.length).toBeGreaterThan(0);
		}
	});
});
