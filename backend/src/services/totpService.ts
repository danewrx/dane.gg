import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { users, totpBackupCodes } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export interface TotpSetupData {
	secret: string;
	qrCodeUrl: string;
	backupCodes: string[];
}

export interface TotpStatus {
	enabled: boolean;
	backupCodesCount: number;
}

export class TotpService {
	private static APP_NAME = 'dane.gg';
	private static BACKUP_CODES_COUNT = 10;
	private static BACKUP_CODE_LENGTH = 8;

	/**
	 * Generate a new TOTP secret and setup data for a user
	 */
	static async generateSetup(userId: string, username: string): Promise<TotpSetupData> {
		// Generate a new secret
		const secret = new OTPAuth.Secret({ size: 32 });

		// Create TOTP instance
		const totp = new OTPAuth.TOTP({
			issuer: this.APP_NAME,
			label: username,
			algorithm: 'SHA1',
			digits: 6,
			period: 30,
			secret: secret
		});

		// Generate QR code URL
		const qrCodeUrl = await QRCode.toDataURL(totp.toString());

		// Generate backup codes
		const backupCodes = this.generateBackupCodes();

		return {
			secret: secret.base32,
			qrCodeUrl,
			backupCodes
		};
	}

	/**
	 * Verify TOTP token and enable 2FA for user
	 */
	static async enableTotp(
		userId: string,
		secret: string,
		token: string,
		backupCodes: string[]
	): Promise<boolean> {
		// Verify the token
		if (!this.verifyToken(secret, token)) {
			return false;
		}

		try {
			// Start transaction
			await db.transaction(async (tx) => {
				// Update user with TOTP secret and enable 2FA
				await tx
					.update(users)
					.set({
						totpSecret: secret,
						totpEnabled: true
					})
					.where(eq(users.id, userId));

				// Hash and store backup codes
				const hashedCodes = await Promise.all(
					backupCodes.map(async (code) => ({
						userId,
						codeHash: await bcrypt.hash(code, 12),
						used: false,
						createdAt: new Date()
					}))
				);

				// Clear any existing backup codes for this user
				await tx.delete(totpBackupCodes).where(eq(totpBackupCodes.userId, userId));

				// Insert new backup codes
				await tx.insert(totpBackupCodes).values(hashedCodes);
			});

			return true;
		} catch (error) {
			console.error('Error enabling TOTP:', error);
			return false;
		}
	}

	/**
	 * Disable TOTP for a user
	 */
	static async disableTotp(userId: string): Promise<boolean> {
		try {
			await db.transaction(async (tx) => {
				// Disable TOTP and clear secret
				await tx
					.update(users)
					.set({
						totpSecret: null,
						totpEnabled: false
					})
					.where(eq(users.id, userId));

				// Delete all backup codes
				await tx.delete(totpBackupCodes).where(eq(totpBackupCodes.userId, userId));
			});

			return true;
		} catch (error) {
			console.error('Error disabling TOTP:', error);
			return false;
		}
	}

	/**
	 * Verify TOTP token for authentication
	 */
	static async verifyTotpForUser(userId: string, token: string): Promise<boolean> {
		try {
			// Get user's TOTP secret
			const user = await db
				.select({
					totpSecret: users.totpSecret,
					totpEnabled: users.totpEnabled
				})
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			if (!user[0] || !user[0].totpEnabled || !user[0].totpSecret) {
				return false;
			}

			return this.verifyToken(user[0].totpSecret, token);
		} catch (error) {
			console.error('Error verifying TOTP for user:', error);
			return false;
		}
	}

	/**
	 * Verify backup code for authentication
	 */
	static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
		try {
			// Get all unused backup codes for the user
			const backupCodes = await db
				.select()
				.from(totpBackupCodes)
				.where(and(eq(totpBackupCodes.userId, userId), eq(totpBackupCodes.used, false)));

			// Check each backup code
			for (const backupCode of backupCodes) {
				const isValid = await bcrypt.compare(code, backupCode.codeHash);
				if (isValid) {
					// Mark the backup code as used
					await db
						.update(totpBackupCodes)
						.set({
							used: true,
							usedAt: new Date()
						})
						.where(eq(totpBackupCodes.id, backupCode.id));

					return true;
				}
			}

			return false;
		} catch (error) {
			console.error('Error verifying backup code:', error);
			return false;
		}
	}

	/**
	 * Get TOTP status for a user
	 */
	static async getTotpStatus(userId: string): Promise<TotpStatus> {
		try {
			// Get user's TOTP status
			const user = await db
				.select({
					totpEnabled: users.totpEnabled
				})
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			// Count unused backup codes
			const backupCodesResult = await db
				.select({
					count: totpBackupCodes.id
				})
				.from(totpBackupCodes)
				.where(and(eq(totpBackupCodes.userId, userId), eq(totpBackupCodes.used, false)));

			return {
				enabled: user[0]?.totpEnabled || false,
				backupCodesCount: backupCodesResult.length
			};
		} catch (error) {
			console.error('Error getting TOTP status:', error);
			return {
				enabled: false,
				backupCodesCount: 0
			};
		}
	}

	/**
	 * Generate new backup codes for a user
	 */
	static async regenerateBackupCodes(userId: string): Promise<string[] | null> {
		try {
			// Check if user has TOTP enabled
			const user = await db
				.select({
					totpEnabled: users.totpEnabled
				})
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			if (!user[0]?.totpEnabled) {
				return null;
			}

			// Generate new backup codes
			const backupCodes = this.generateBackupCodes();

			// Hash and store new backup codes
			const hashedCodes = await Promise.all(
				backupCodes.map(async (code) => ({
					userId,
					codeHash: await bcrypt.hash(code, 12),
					used: false,
					createdAt: new Date()
				}))
			);

			await db.transaction(async (tx) => {
				// Clear existing backup codes
				await tx.delete(totpBackupCodes).where(eq(totpBackupCodes.userId, userId));

				// Insert new backup codes
				await tx.insert(totpBackupCodes).values(hashedCodes);
			});

			return backupCodes;
		} catch (error) {
			console.error('Error regenerating backup codes:', error);
			return null;
		}
	}

	/**
	 * Verify a TOTP token against a secret
	 */
	private static verifyToken(secret: string, token: string): boolean {
		try {
			const totp = new OTPAuth.TOTP({
				algorithm: 'SHA1',
				digits: 6,
				period: 30,
				secret: OTPAuth.Secret.fromBase32(secret)
			});

			// Verify with a window of ±1 period (30 seconds) to account for clock drift
			const delta = totp.validate({
				token,
				window: 1
			});

			return delta !== null;
		} catch (error) {
			console.error('Error verifying TOTP token:', error);
			return false;
		}
	}

	/**
	 * Generate secure backup codes
	 */
	private static generateBackupCodes(): string[] {
		const codes: string[] = [];

		for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
			const code = crypto
				.randomBytes(this.BACKUP_CODE_LENGTH / 2)
				.toString('hex')
				.toUpperCase();
			// Format as XXXX-XXXX for better readability
			const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;
			codes.push(formattedCode);
		}

		return codes;
	}
}
