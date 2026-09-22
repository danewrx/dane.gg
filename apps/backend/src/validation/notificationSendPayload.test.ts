import { afterEach, describe, expect, test } from 'bun:test';
import { parseSendNotificationRequest } from './notificationSendPayload';

const TOPIC_ENV = 'NTFY_TOPIC';

describe('parseSendNotificationRequest', () => {
	afterEach(() => {
		delete process.env[TOPIC_ENV];
	});

	test('returns test request when useTestPreset is true', () => {
		const result = parseSendNotificationRequest({ useTestPreset: true });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.request.kind).toBe('test');
		}
	});

	test('requires message for custom sends', () => {
		const result = parseSendNotificationRequest({});
		expect(result).toEqual({ ok: false, error: 'Message is required and must be a string' });
	});

	test('validates priority range', () => {
		process.env[TOPIC_ENV] = 'alerts';
		const result = parseSendNotificationRequest({
			message: 'hello',
			priority: 9
		});
		expect(result).toEqual({ ok: false, error: 'Priority must be a number between 1 and 5' });
	});

	test('validates tags shape', () => {
		process.env[TOPIC_ENV] = 'alerts';
		const result = parseSendNotificationRequest({
			message: 'hello',
			tags: ['ok', 1]
		});
		expect(result).toEqual({ ok: false, error: 'Tags must be an array of strings' });
	});

	test('requires topic when env is unset', () => {
		const result = parseSendNotificationRequest({ message: 'hello' });
		expect(result).toEqual({
			ok: false,
			error: 'No topic provided and NTFY_TOPIC environment variable is not set'
		});
	});

	test('parses valid custom request', () => {
		process.env[TOPIC_ENV] = 'alerts';
		const result = parseSendNotificationRequest({
			message: 'hello',
			title: 'Hi',
			priority: 4,
			tags: ['warning'],
			appearance: { markdown: true }
		});

		expect(result.ok).toBe(true);
		if (result.ok && result.request.kind === 'custom') {
			expect(result.request).toEqual({
				kind: 'custom',
				message: 'hello',
				title: 'Hi',
				priority: 4,
				tags: ['warning'],
				topic: 'alerts',
				appearance: { markdown: true }
			});
		}
	});
});
