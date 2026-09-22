import { describe, expect, it } from 'vitest';
import { TotpService } from './totp';

/** Ten distinct codes matching /^[A-F0-9]{4}-[A-F0-9]{4}$/ */
function validBackupCodes(): string[] {
	return [
		'ABCD-0001',
		'ABCD-0002',
		'ABCD-0003',
		'ABCD-0004',
		'ABCD-0005',
		'ABCD-0006',
		'ABCD-0007',
		'ABCD-0008',
		'ABCD-0009',
		'ABCD-000A'
	];
}

describe('TotpService.validateTokenFormat', () => {
	it('accepts exactly six digits', () => {
		expect(TotpService.validateTokenFormat('000000')).toBe(true);
		expect(TotpService.validateTokenFormat('123456')).toBe(true);
	});

	it('rejects non-digit or wrong length', () => {
		expect(TotpService.validateTokenFormat('12345')).toBe(false);
		expect(TotpService.validateTokenFormat('1234567')).toBe(false);
		expect(TotpService.validateTokenFormat('12a456')).toBe(false);
		expect(TotpService.validateTokenFormat('')).toBe(false);
	});
});

describe('TotpService.validateBackupCodes', () => {
	it('accepts ten unique hex XXXX-XXXX codes', () => {
		const codes = validBackupCodes();
		expect(codes).toHaveLength(10);
		expect(TotpService.validateBackupCodes(codes)).toEqual({ valid: true });
	});

	it('rejects non-array', () => {
		expect(TotpService.validateBackupCodes(null as unknown as string[]).valid).toBe(false);
		expect(TotpService.validateBackupCodes(undefined as unknown as string[]).valid).toBe(false);
	});

	it('rejects wrong count', () => {
		const r = TotpService.validateBackupCodes(['A1B2-C3D4']);
		expect(r.valid).toBe(false);
		expect(r.error).toMatch(/Expected 10/);
	});

	it('rejects bad format and duplicates', () => {
		const codes = validBackupCodes();
		codes[3] = 'ZZZZ-ZZZZ';
		expect(TotpService.validateBackupCodes(codes).valid).toBe(false);

		const dup = validBackupCodes();
		dup[9] = dup[0];
		expect(TotpService.validateBackupCodes(dup).error).toMatch(/duplicates/i);
	});
});
