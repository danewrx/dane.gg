import { logger } from '../utils/logger';
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { emojis } from '../db/schema';
import { desc, eq, not } from 'drizzle-orm';
import { requireSession, requireAdmin } from '../middleware/auth';
import { chatService } from '../services/chatService';

const router = Router();

/**
 * GET /api/emojis - Get active and hidden emojis
 * Query params:
 *   includeDeleted=true - also include deleted emojis
 */
router.get('/', async (req: Request, res: Response) => {
	try {
		const includeDeleted = req.query.includeDeleted === 'true';

		const allEmojis = await (includeDeleted
			? db.select().from(emojis).orderBy(desc(emojis.createdAt))
			: db
					.select()
					.from(emojis)
					.where(not(emojis.deleted))
					.orderBy(desc(emojis.createdAt)));

		res.json({
			success: true,
			data: allEmojis
		});
	} catch (error: any) {
		logger.error('Error fetching emojis:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to fetch emojis'
		});
	}
});

/**
 * PATCH /api/emojis/:id - Toggle hidden status
 */
router.patch('/:id', requireSession, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { hidden } = req.body;

		if (typeof hidden !== 'boolean') {
			return res.status(400).json({
				success: false,
				error: 'hidden must be a boolean'
			});
		}

		const [emoji] = await db.select().from(emojis).where(eq(emojis.id, id)).limit(1);

		if (!emoji) {
			return res.status(404).json({
				success: false,
				error: 'Emoji not found'
			});
		}

		const [updated] = await db
			.update(emojis)
			.set({ hidden })
			.where(eq(emojis.id, id))
			.returning();

		chatService.broadcastEmojiUpdate();

		res.json({
			success: true,
			data: updated
		});
	} catch (error: any) {
		logger.error('Error updating emoji:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to update emoji'
		});
	}
});

export default router;
