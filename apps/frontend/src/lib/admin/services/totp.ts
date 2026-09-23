import { logger } from '$lib/logger';
import { settingsService } from './settings';
import { getErrorMessage } from '$lib/shared/utils/errorUtils';

export interface TotpSetupData {
	secret: string;
	qrCodeUrl: string;
	backupCodes: string[];
}

export interface TotpStatus {
	enabled: boolean;
	backupCodesCount: number;
}

export interface TotpVerificationResult {
	valid: boolean;
	error?: string;
}

export class TotpService {
	/**
	 * Get current TOTP status for the authenticated user
	 */
	static async getStatus(): Promise<TotpStatus> {
		const response = await settingsService.requestJson<TotpStatus>('/totp/status', {
			method: 'GET'
		});
		return response;
	}

	/**
	 * Generate TOTP setup data (secret, QR code, backup codes)
	 */
	static async generateSetup(): Promise<TotpSetupData> {
		const response = await settingsService.requestJson<TotpSetupData>('/totp/setup', {
			method: 'POST'
		});

		// Validate the backup codes in the response
		if (response.backupCodes) {
			const validation = this.validateBackupCodes(response.backupCodes);
			if (!validation.valid) {
				logger.error('Invalid backup codes received from server during setup:', validation.error);
				throw new Error(`Invalid backup codes received from server: ${validation.error}`);
			}
		}

		return response;
	}

	/**
	 * Enable TOTP for the user after verifying the setup
	 */
	static async enableTotp(
		secret: string,
		token: string,
		backupCodes: string[]
	): Promise<{ success: boolean; message?: string; error?: string }> {
		try {
			// Validate backup codes before sending to server
			const validation = this.validateBackupCodes(backupCodes);
			if (!validation.valid) {
				return {
					success: false,
					error: `Invalid backup codes: ${validation.error}`
				};
			}

			const response = await settingsService.requestJson<{
				success: boolean;
				message?: string;
				error?: string;
			}>('/totp/enable', {
				method: 'POST',
				body: JSON.stringify({
					secret,
					token,
					backupCodes
				})
			});
			return response;
		} catch (error: any) {
			return {
				success: false,
				error: getErrorMessage(error, 'Failed to enable TOTP')
			};
		}
	}

	/**
	 * Disable TOTP for the user
	 */
	static async disableTotp(
		currentPassword: string
	): Promise<{ success: boolean; message?: string; error?: string }> {
		try {
			const response = await settingsService.requestJson<{
				success: boolean;
				message?: string;
				error?: string;
			}>('/totp/disable', {
				method: 'POST',
				body: JSON.stringify({
					currentPassword
				})
			});
			return response;
		} catch (error: any) {
			return {
				success: false,
				error: getErrorMessage(error, 'Failed to disable TOTP')
			};
		}
	}

	/**
	 * Verify a TOTP token
	 */
	static async verifyToken(token: string): Promise<TotpVerificationResult> {
		try {
			const response = await settingsService.requestJson<TotpVerificationResult>('/totp/verify', {
				method: 'POST',
				body: JSON.stringify({ token })
			});
			return response;
		} catch (error: any) {
			return {
				valid: false,
				error: getErrorMessage(error, 'Failed to verify token')
			};
		}
	}

	/**
	 * Verify a backup code
	 */
	static async verifyBackupCode(code: string): Promise<TotpVerificationResult> {
		try {
			const response = await settingsService.requestJson<TotpVerificationResult>(
				'/totp/backup-codes/verify',
				{
					method: 'POST',
					body: JSON.stringify({ code })
				}
			);
			return response;
		} catch (error: any) {
			return {
				valid: false,
				error: getErrorMessage(error, 'Failed to verify backup code')
			};
		}
	}

	/**
	 * Validate backup codes array
	 */
	static validateBackupCodes(codes: string[]): { valid: boolean; error?: string } {
		// Check if codes is an array
		if (!Array.isArray(codes)) {
			return { valid: false, error: 'Backup codes must be an array' };
		}

		// Check expected count (10 codes)
		const expectedCount = 10;
		if (codes.length !== expectedCount) {
			return {
				valid: false,
				error: `Expected ${expectedCount} backup codes, received ${codes.length}`
			};
		}

		// Validate each code
		const codePattern = /^[A-F0-9]{4}-[A-F0-9]{4}$/;
		for (let i = 0; i < codes.length; i++) {
			const code = codes[i];

			// Check if code is a string
			if (typeof code !== 'string') {
				return {
					valid: false,
					error: `Backup code at index ${i} must be a string`
				};
			}

			// Check format (XXXX-XXXX with hexadecimal characters)
			if (!codePattern.test(code)) {
				return {
					valid: false,
					error: `Backup code at index ${i} has invalid format: "${code}". Expected format: XXXX-XXXX`
				};
			}

			// Check length (should be 9 characters: 4 + dash + 4)
			if (code.length !== 9) {
				return {
					valid: false,
					error: `Backup code at index ${i} has invalid length: "${code}". Expected 9 characters`
				};
			}
		}

		// Check for duplicates
		const uniqueCodes = new Set(codes);
		if (uniqueCodes.size !== codes.length) {
			return {
				valid: false,
				error: 'Backup codes contain duplicates'
			};
		}

		return { valid: true };
	}

	/**
	 * Regenerate backup codes
	 */
	static async regenerateBackupCodes(
		currentPassword: string
	): Promise<{ backupCodes?: string[]; error?: string }> {
		try {
			const response = await settingsService.requestJson<{
				backupCodes?: string[];
				error?: string;
			}>('/totp/backup-codes/regenerate', {
				method: 'POST',
				body: JSON.stringify({
					currentPassword
				})
			});

			// Validate the response backup codes
			if (response.backupCodes) {
				const validation = this.validateBackupCodes(response.backupCodes);
				if (!validation.valid) {
					logger.error('Invalid backup codes received from server:', validation.error);
					return {
						error: `Invalid backup codes received from server: ${validation.error}`
					};
				}
			}

			return response;
		} catch (error: any) {
			return {
				error: getErrorMessage(error, 'Failed to regenerate backup codes')
			};
		}
	}

	/**
	 * Validate token format (6 digits)
	 */
	static validateTokenFormat(token: string): boolean {
		return /^\d{6}$/.test(token);
	}

	/**
	 * Format backup code for display (add spaces for readability)
	 */
	static formatBackupCode(code: string): string {
		// If the code contains dashes, keep them; otherwise add spaces every 4 characters
		if (code.includes('-')) {
			return code;
		}
		return code.replace(/(.{4})/g, '$1 ').trim();
	}

	/**
	 * Clean backup code for submission (remove spaces and keep only alphanumeric + dashes)
	 */
	static cleanBackupCode(code: string): string {
		return code.replace(/\s+/g, '').toUpperCase();
	}
}
