import { logger } from '../utils/logger';
import { Router } from 'express';
import { DiscordStatusService } from '../services/discordStatusService';
import { requireAuth, requireWebhookAccess } from '../middleware/auth';
import { db } from '../db';
import { emojis } from '../db/schema';
import { eq, isNotNull, notInArray, inArray, and } from 'drizzle-orm';
import { chatService } from '../services/chatService';

const router = Router();

/**
 * POST /webhooks/discord-status/update
 */
router.post('/discord-status/update', requireAuth, requireWebhookAccess, async (req, res) => {
	try {
		const { status } = req.body;

		// Validate input
		if (typeof status !== 'number' || ![0, 1].includes(status)) {
			return res.status(400).json({
				error: 'Invalid status value. Must be 0 (offline) or 1 (online)'
			});
		}

		const success = await DiscordStatusService.updateStatus(status);

		if (success) {
			res.json({
				success: true,
				message: 'Discord status updated successfully',
				status,
				timestamp: new Date().toISOString()
			});
		} else {
			res.status(500).json({ error: 'Failed to update Discord status' });
		}
	} catch (error) {
		logger.error('Discord status webhook error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * POST /webhooks/discord-emojis/sync
 * Full sync of Discord server emojis. Bot calls this on startup and on GUILD_EMOJIS_UPDATE.
 * Body: { emojis: [{ id: string, name: string, imageUrl: string }] }
 */
router.post('/discord-emojis/sync', requireAuth, requireWebhookAccess, async (req, res) => {
	try {
		const { emojis: incoming } = req.body;

		if (!Array.isArray(incoming)) {
			return res.status(400).json({ error: 'emojis must be an array' });
		}

		const nameRegex = /^[a-zA-Z0-9_-]+$/;
		let synced = 0;
		let skipped = 0;

		for (const e of incoming) {
			if (!e.id || !e.name || !e.imageUrl) {
				skipped++;
				continue;
			}

			const name = String(e.name).toLowerCase().trim();
			const discordId = String(e.id);
			const imageUrl = String(e.imageUrl);

			if (!nameRegex.test(name)) {
				skipped++;
				continue;
			}

			const [existing] = await db
				.select()
				.from(emojis)
				.where(eq(emojis.discordEmojiId, discordId))
				.limit(1);

			if (existing) {
				await db.update(emojis).set({ name, imageUrl }).where(eq(emojis.discordEmojiId, discordId));
				synced++;
			} else {
				const [nameConflict] = await db.select().from(emojis).where(eq(emojis.name, name)).limit(1);

				if (nameConflict && !nameConflict.discordEmojiId) {
					logger.warn(`Discord emoji "${name}" skipped: conflicts with site-uploaded emoji`);
					skipped++;
					continue;
				}

				await db
					.insert(emojis)
					.values({ name, imageUrl, isCustom: true, discordEmojiId: discordId })
					.onConflictDoUpdate({
						target: emojis.name,
						set: { imageUrl, discordEmojiId: discordId }
					});
				synced++;
			}
		}

		// Mark Discord emojis that no longer exist as deleted
		const incomingIds = incoming.map((e) => String(e.id)).filter(Boolean);
		if (incomingIds.length > 0) {
			await db
				.update(emojis)
				.set({ deleted: true })
				.where(
					and(isNotNull(emojis.discordEmojiId), notInArray(emojis.discordEmojiId, incomingIds))
				);
		} else {
			await db.update(emojis).set({ deleted: true }).where(isNotNull(emojis.discordEmojiId));
		}

		// Un-delete any Discord emojis that are back
		const undeleteIds = incomingIds.filter(Boolean);
		if (undeleteIds.length > 0) {
			await db
				.update(emojis)
				.set({ deleted: false })
				.where(and(isNotNull(emojis.discordEmojiId), inArray(emojis.discordEmojiId, undeleteIds)));
		}

		chatService.broadcastEmojiUpdate();

		logger.info(`Discord emoji sync complete: ${synced} synced, ${skipped} skipped`);
		res.json({ success: true, synced, skipped });
	} catch (error: any) {
		logger.error('Discord emoji sync error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
