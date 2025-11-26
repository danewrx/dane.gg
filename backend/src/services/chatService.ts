import { db } from '../db';
import { messages } from '../db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';

export class ChatService {
	/**
	 * Save a message to the database
	 */
	static async saveMessage(visitorId: string, displayName: string, message: string): Promise<typeof messages.$inferSelect> {
		const [savedMessage] = await db.insert(messages).values({
			username: displayName || `User_${visitorId.substring(0, 8)}`,
			content: message.trim(),
			messageType: 'chat',
			visitorId: visitorId
		}).returning();

		return savedMessage;
	}

	/**
	 * Get recent messages within time window
	 * @param limit Maximum number of messages to return
	 * @param hoursBack Number of hours to look back (default 24hrs)
	 */
	static async getRecentMessages(limit: number = 50, hoursBack: number = 24): Promise<typeof messages.$inferSelect[]> {
		const timeAgo = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

		const recentMessages = await db
			.select()
			.from(messages)
			.where(
				and(
					eq(messages.messageType, 'chat'),
					gte(messages.timestamp, timeAgo)
				)
			)
			.orderBy(desc(messages.timestamp))
			.limit(limit);

		return recentMessages.reverse();
	}

	/**
	 * Delete a message
	 */
	static async deleteMessage(messageId: string): Promise<void> {
		await db.delete(messages)
			.where(eq(messages.id, messageId));
	}
}

