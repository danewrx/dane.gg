import { Router, Request, Response } from 'express';
import { db } from '../db';
import { apiKeys, type NewApiKey } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireSession, requireAdmin, hashApiKey } from '../middleware/auth';
import { chatService } from '../services/chatService';
import crypto from 'crypto';

const router = Router();

/**
 * Generate a new API key
 * Format: dk_ prefix + UUID-like random string
 */
function generateApiKey(): { key: string; prefix: string; hash: string } {
	const randomBytes = crypto.randomBytes(32);
	const keyBody = randomBytes.toString('base64url').substring(0, 40);
	const key = `dk_${keyBody}`;
	const prefix = key.substring(0, 11);
	const hash = hashApiKey(key);

	return { key, prefix, hash };
}

/**
 * GET /api/api-keys - List all API keys (admin only)
 */
router.get('/', requireSession, requireAdmin, async (req: Request, res: Response) => {
	try {
		const keys = await db
			.select({
				id: apiKeys.id,
				name: apiKeys.name,
				keyPrefix: apiKeys.keyPrefix,
				permissions: apiKeys.permissions,
				isActive: apiKeys.isActive,
				lastUsedAt: apiKeys.lastUsedAt,
				expiresAt: apiKeys.expiresAt,
				createdAt: apiKeys.createdAt
			})
			.from(apiKeys)
			.orderBy(desc(apiKeys.createdAt));

		res.json({ keys });
	} catch (error) {
		console.error('Error listing API keys:', error);
		res.status(500).json({ error: 'Failed to list API keys' });
	}
});

/**
 * POST /api/api-keys - Create a new API key (admin only)
 */
router.post('/', requireSession, requireAdmin, async (req: Request, res: Response) => {
	try {
		const { name, permissions = 'full', expiresAt } = req.body;

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return res.status(400).json({ error: 'Name is required' });
		}

		if (name.length > 100) {
			return res.status(400).json({ error: 'Name must be 100 characters or less' });
		}

		const validPermissions = ['full', 'read', 'chat', 'webhooks'];
		if (!validPermissions.includes(permissions)) {
			return res.status(400).json({
				error: 'Invalid permissions. Must be: full, read, chat, or webhooks'
			});
		}

		const { key, prefix, hash } = generateApiKey();

		const newKey: NewApiKey = {
			name: name.trim(),
			keyHash: hash,
			keyPrefix: prefix,
			permissions,
			isActive: true,
			expiresAt: expiresAt ? new Date(expiresAt) : null,
			createdBy: req.user?.id || null
		};

		const result = await db.insert(apiKeys).values(newKey).returning({
			id: apiKeys.id,
			name: apiKeys.name,
			keyPrefix: apiKeys.keyPrefix,
			permissions: apiKeys.permissions,
			isActive: apiKeys.isActive,
			expiresAt: apiKeys.expiresAt,
			createdAt: apiKeys.createdAt
		});

		// Return the full key once
		res.status(201).json({
			message: 'API key created successfully. Save this key - it will not be shown again!',
			key: key,
			...result[0]
		});
	} catch (error: any) {
		console.error('Error creating API key:', error);

		if (error.code === '23505') {
			return res
				.status(409)
				.json({ error: 'An API key with this prefix already exists. Please try again.' });
		}

		res.status(500).json({ error: 'Failed to create API key' });
	}
});

/**
 * PATCH /api/api-keys/:id - Update an API key (name, active status, expiration)
 */
router.patch('/:id', requireSession, requireAdmin, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { name, isActive, expiresAt } = req.body;

		const updates: Partial<{ name: string; isActive: boolean; expiresAt: Date | null }> = {};

		if (name !== undefined) {
			if (typeof name !== 'string' || name.trim().length === 0) {
				return res.status(400).json({ error: 'Name cannot be empty' });
			}
			if (name.length > 100) {
				return res.status(400).json({ error: 'Name must be 100 characters or less' });
			}
			updates.name = name.trim();
		}

		if (isActive !== undefined) {
			if (typeof isActive !== 'boolean') {
				return res.status(400).json({ error: 'isActive must be a boolean' });
			}
			updates.isActive = isActive;
		}

		if (expiresAt !== undefined) {
			updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
		}

		if (Object.keys(updates).length === 0) {
			return res.status(400).json({ error: 'No valid fields to update' });
		}

		// Get the key prefix before updating
		const existing = await db
			.select({ keyPrefix: apiKeys.keyPrefix, isActive: apiKeys.isActive })
			.from(apiKeys)
			.where(eq(apiKeys.id, id))
			.limit(1);

		if (existing.length === 0) {
			return res.status(404).json({ error: 'API key not found' });
		}

		const keyPrefix = existing[0].keyPrefix;
		const wasActive = existing[0].isActive;
		const willBeDeactivated = updates.isActive === false && wasActive;

		const result = await db.update(apiKeys).set(updates).where(eq(apiKeys.id, id)).returning({
			id: apiKeys.id,
			name: apiKeys.name,
			keyPrefix: apiKeys.keyPrefix,
			permissions: apiKeys.permissions,
			isActive: apiKeys.isActive,
			expiresAt: apiKeys.expiresAt,
			lastUsedAt: apiKeys.lastUsedAt,
			createdAt: apiKeys.createdAt
		});

		// If the key deactivated, close all connections
		if (willBeDeactivated) {
			const closedCount = chatService.closeConnectionsForApiKey(keyPrefix);
			if (closedCount > 0) {
				console.log(`🔒 Closed ${closedCount} connection(s) for deactivated API key: ${keyPrefix}`);
			}
		}

		res.json({ message: 'API key updated', key: result[0] });
	} catch (error) {
		console.error('Error updating API key:', error);
		res.status(500).json({ error: 'Failed to update API key' });
	}
});

/**
 * POST /api/api-keys/:id/regenerate - Regenerate an API key (admin only)
 * This creates a new key with the same settings but new secret
 */
router.post(
	'/:id/regenerate',
	requireSession,
	requireAdmin,
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			// Get the existing key
			const existing = await db
				.select({ keyPrefix: apiKeys.keyPrefix })
				.from(apiKeys)
				.where(eq(apiKeys.id, id))
				.limit(1);

			if (existing.length === 0) {
				return res.status(404).json({ error: 'API key not found' });
			}

			const oldKeyPrefix = existing[0].keyPrefix;

			// Generate new key
			const { key, prefix, hash } = generateApiKey();

			// Update the key
			const result = await db
				.update(apiKeys)
				.set({
					keyHash: hash,
					keyPrefix: prefix,
					lastUsedAt: null
				})
				.where(eq(apiKeys.id, id))
				.returning({
					id: apiKeys.id,
					name: apiKeys.name,
					keyPrefix: apiKeys.keyPrefix,
					permissions: apiKeys.permissions,
					isActive: apiKeys.isActive,
					expiresAt: apiKeys.expiresAt,
					createdAt: apiKeys.createdAt
				});

			// Close all WebSocket connections using the old API key
			const closedCount = chatService.closeConnectionsForApiKey(oldKeyPrefix);
			if (closedCount > 0) {
				console.log(
					`🔒 Closed ${closedCount} connection(s) for regenerated API key: ${oldKeyPrefix}`
				);
			}

			res.json({
				message: 'API key regenerated. Save this key - it will not be shown again!',
				key: key,
				...result[0]
			});
		} catch (error) {
			console.error('Error regenerating API key:', error);
			res.status(500).json({ error: 'Failed to regenerate API key' });
		}
	}
);

/**
 * DELETE /api/api-keys/:id - Delete an API key (admin only)
 */
router.delete('/:id', requireSession, requireAdmin, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		// Get key prefix before deleting
		const existing = await db
			.select({ keyPrefix: apiKeys.keyPrefix })
			.from(apiKeys)
			.where(eq(apiKeys.id, id))
			.limit(1);

		if (existing.length === 0) {
			return res.status(404).json({ error: 'API key not found' });
		}

		const keyPrefix = existing[0].keyPrefix;

		// Delete key
		const result = await db.delete(apiKeys).where(eq(apiKeys.id, id)).returning({ id: apiKeys.id });

		// Close all ws connections using key
		const closedCount = chatService.closeConnectionsForApiKey(keyPrefix);
		if (closedCount > 0) {
			console.log(`🔒 Closed ${closedCount} connection(s) for deleted API key: ${keyPrefix}`);
		}

		res.json({ message: 'API key deleted', id: result[0].id });
	} catch (error) {
		console.error('Error deleting API key:', error);
		res.status(500).json({ error: 'Failed to delete API key' });
	}
});

export default router;
