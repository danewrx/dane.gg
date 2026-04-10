import express from 'express';
import { requireSession } from '../middleware/auth.js';
import { TotpService } from '../services/totpService.js';
import { verifyPassword } from '../utils/password.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// All TOTP routes require authentication
router.use(requireSession);

/**
 * GET /api/totp/status
 * Get current TOTP status for the authenticated user
 */
router.get('/status', async (req, res) => {
	try {
		const userId = req.session.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'User not authenticated' });
		}

		const status = await TotpService.getTotpStatus(userId);
		res.json(status);
	} catch (error) {
		console.error('Error getting TOTP status:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * POST /api/totp/setup
 * Generate TOTP setup data (secret, QR code, backup codes)
 */
router.post('/setup', async (req, res) => {
	try {
		const userId = req.session.user?.id;
		const username = req.session.user?.username;

		if (!userId || !username) {
			return res.status(401).json({ error: 'User not authenticated' });
		}

		// Check if TOTP is already enabled
		const status = await TotpService.getTotpStatus(userId);
		if (status.enabled) {
			return res.status(400).json({ error: 'TOTP is already enabled for this account' });
		}

		const setupData = await TotpService.generateSetup(userId, username);
		res.json(setupData);
	} catch (error) {
		console.error('Error generating TOTP setup:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * POST /api/totp/enable
 * Enable TOTP for the user after verifying the setup
 */
router.post('/enable', async (req, res) => {
	try {
		const userId = req.session.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'User not authenticated' });
		}

		const { secret, token, backupCodes } = req.body;

		// Validate input
		if (!secret || !token || !Array.isArray(backupCodes)) {
			return res.status(400).json({ error: 'Missing required fields: secret, token, backupCodes' });
		}

		// Verify token format (6 digits)
		if (!/^\d{6}$/.test(token)) {
			return res.status(400).json({ error: 'Invalid token format' });
		}

		// Check if TOTP is already enabled
		const status = await TotpService.getTotpStatus(userId);
		if (status.enabled) {
			return res.status(400).json({ error: 'TOTP is already enabled for this account' });
		}

		const success = await TotpService.enableTotp(userId, secret, token, backupCodes);

		if (success) {
			res.json({ success: true, message: 'TOTP enabled successfully' });
		} else {
			res.status(400).json({ error: 'Invalid token or failed to enable TOTP' });
		}
	} catch (error) {
		console.error('Error enabling TOTP:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * POST /api/totp/disable
 * Disable TOTP for the user
 */
router.post('/disable', async (req, res) => {
	try {
		const userId = req.session.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'User not authenticated' });
		}

		const { currentPassword } = req.body;

		// Validate input
		if (!currentPassword) {
			return res.status(400).json({ error: 'Current password is required to disable TOTP' });
		}

		// Get user's password hash for verification
		const user = await db
			.select({
				id: users.id,
				passwordHash: users.passwordHash,
				totpEnabled: users.totpEnabled
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (user.length === 0) {
			return res.status(404).json({ error: 'User not found' });
		}

		const userData = user[0];

		// Check if TOTP is actually enabled
		if (!userData.totpEnabled) {
			return res.status(400).json({ error: 'TOTP is not enabled for this account' });
		}

		// Verify current password
		const isValidPassword = await verifyPassword(currentPassword, userData.passwordHash);
		if (!isValidPassword) {
			return res.status(401).json({
				error: 'Authentication failed',
				message: 'Current password is incorrect'
			});
		}

		// Disable TOTP only after password verification
		const success = await TotpService.disableTotp(userId);

		if (success) {
			res.json({ success: true, message: 'TOTP disabled successfully' });
		} else {
			res.status(500).json({ error: 'Failed to disable TOTP' });
		}
	} catch (error) {
		console.error('Error disabling TOTP:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * POST /api/totp/verify
 * Verify a TOTP token for the authenticated user
 */
router.post('/verify', async (req, res) => {
	try {
		const userId = req.session.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'User not authenticated' });
		}

		const { token } = req.body;

		// Validate input
		if (!token) {
			return res.status(400).json({ error: 'Token is required' });
		}

		// Verify token format (6 digits)
		if (!/^\d{6}$/.test(token)) {
			return res.status(400).json({ error: 'Invalid token format' });
		}

		const isValid = await TotpService.verifyTotpForUser(userId, token);

		if (isValid) {
			res.json({ valid: true });
		} else {
			res.status(400).json({ valid: false, error: 'Invalid token' });
		}
	} catch (error) {
		console.error('Error verifying TOTP:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * POST /api/totp/backup-codes/verify
 * Verify a backup code for the authenticated user
 */
router.post('/backup-codes/verify', async (req, res) => {
	try {
		const userId = req.session.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'User not authenticated' });
		}

		const { code } = req.body;

		// Validate input
		if (!code) {
			return res.status(400).json({ error: 'Backup code is required' });
		}

		const isValid = await TotpService.verifyBackupCode(userId, code);

		if (isValid) {
			res.json({ valid: true });
		} else {
			res.status(400).json({ valid: false, error: 'Invalid or already used backup code' });
		}
	} catch (error) {
		console.error('Error verifying backup code:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * POST /api/totp/backup-codes/regenerate
 * Regenerate backup codes for the authenticated user
 */
router.post('/backup-codes/regenerate', async (req, res) => {
	try {
		const userId = req.session.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'User not authenticated' });
		}

		const { currentPassword } = req.body;

		// Validate input
		if (!currentPassword) {
			return res
				.status(400)
				.json({ error: 'Current password is required to regenerate backup codes' });
		}

		// Get user's password hash for verification
		const user = await db
			.select({
				id: users.id,
				passwordHash: users.passwordHash,
				totpEnabled: users.totpEnabled
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (user.length === 0) {
			return res.status(404).json({ error: 'User not found' });
		}

		const userData = user[0];

		// Check if TOTP is actually enabled
		if (!userData.totpEnabled) {
			return res.status(400).json({ error: 'TOTP is not enabled for this account' });
		}

		// Verify current password
		const isValidPassword = await verifyPassword(currentPassword, userData.passwordHash);
		if (!isValidPassword) {
			return res.status(401).json({
				error: 'Authentication failed',
				message: 'Current password is incorrect'
			});
		}

		// Regenerate backup codes only after password verification
		const backupCodes = await TotpService.regenerateBackupCodes(userId);

		if (backupCodes) {
			res.json({ backupCodes });
		} else {
			res.status(400).json({ error: 'TOTP is not enabled or failed to regenerate backup codes' });
		}
	} catch (error) {
		console.error('Error regenerating backup codes:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
