import { describe, expect, test } from 'bun:test';
import { validatePasswordStrength } from './password';

describe('validatePasswordStrength', () => {
	test('accepts a strong password', () => {
		const r = validatePasswordStrength('Aa1!aaaa');
		expect(r.isValid).toBe(true);
	});

	test('rejects short password', () => {
		const r = validatePasswordStrength('Aa1!x');
		expect(r.isValid).toBe(false);
		expect(r.message).toMatch(/8 characters/);
	});

	test('requires lowercase, uppercase, digit, and special', () => {
		expect(validatePasswordStrength('Aaaaaaa1!').isValid).toBe(true);
		expect(validatePasswordStrength('aaaaaa1!').isValid).toBe(false);
		expect(validatePasswordStrength('AAAAAA1!').isValid).toBe(false);
		expect(validatePasswordStrength('AAAAAAa!').isValid).toBe(false);
		expect(validatePasswordStrength('AAAAAAa1').isValid).toBe(false);
	});

	test('rejects over 128 characters', () => {
		const body = 'Aa1!' + 'x'.repeat(125);
		expect(body.length).toBe(129);
		const r = validatePasswordStrength(body);
		expect(r.isValid).toBe(false);
		expect(r.message).toMatch(/128/);
	});
});
