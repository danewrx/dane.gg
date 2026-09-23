import { afterEach, describe, expect, test } from 'bun:test';
import { getLoginLockoutMinutes, getLoginLockoutWindowMs } from './rateLimiting';

const ENV_KEY = 'ADMIN_LOGIN_LOCKOUT_MINUTES';

describe('getLoginLockoutMinutes', () => {
	afterEach(() => {
		delete process.env[ENV_KEY];
	});

	test('defaults to 15 when unset', () => {
		delete process.env[ENV_KEY];
		expect(getLoginLockoutMinutes()).toBe(15);
		expect(getLoginLockoutWindowMs()).toBe(15 * 60 * 1000);
	});

	test('reads valid env value', () => {
		process.env[ENV_KEY] = '30';
		expect(getLoginLockoutMinutes()).toBe(30);
	});

	test('falls back when invalid', () => {
		process.env[ENV_KEY] = 'not-a-number';
		expect(getLoginLockoutMinutes()).toBe(15);
	});
});
