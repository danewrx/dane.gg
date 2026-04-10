import { Router } from 'express';
import { db } from '../db';
import { messages } from '../db/schema';
import { desc, lt } from 'drizzle-orm';
import { requireSession } from '../middleware/auth';

const router = Router();

/**
 * Get paginated chat messages (authenticated only)
 */
router.get('/messages', requireSession, async (req, res) => {
	try {
		const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
		const before = req.query.before as string | undefined; // ISO timestamp

		let query = db
			.select({
				id: messages.id,
				username: messages.username,
				content: messages.content,
				timestamp: messages.timestamp,
				messageType: messages.messageType,
				messageColor: messages.messageColor,
				messageSource: messages.messageSource
			})
			.from(messages);

		if (before) {
			const beforeDate = new Date(before);
			query = query.where(lt(messages.timestamp, beforeDate)) as typeof query;
		}

		const result = await query.orderBy(desc(messages.timestamp)).limit(limit);

		const messagesData = result.reverse().map((msg) => {
			const timestamp = msg.timestamp ? new Date(msg.timestamp) : new Date();
			return {
				id: msg.id,
				timestamp: timestamp.toISOString(),
				nickname: msg.username,
				message: msg.content,
				messageType: msg.messageType,
				color: msg.messageColor || undefined,
				source: msg.messageSource || 'web'
			};
		});

		// Check if there are more messages
		let hasMore = false;
		if (messagesData.length > 0) {
			const oldestInBatch = messagesData[0].timestamp;
			const olderCount = await db
				.select({ id: messages.id })
				.from(messages)
				.where(lt(messages.timestamp, new Date(oldestInBatch)))
				.limit(1);
			hasMore = olderCount.length > 0;
		}

		res.json({
			success: true,
			data: {
				messages: messagesData,
				hasMore,
				nextCursor: messagesData.length > 0 ? messagesData[0].timestamp : null
			}
		});
	} catch (error) {
		console.error('❌ Chat messages API Error:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch chat messages'
		});
	}
});

export default router;
