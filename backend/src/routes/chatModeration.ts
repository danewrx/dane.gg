import { Router, Request, Response } from 'express';
import { requireSession } from '../middleware/auth';
import { ChatService } from '../services/chatService';
import { db } from '../db';
import { chatModerationRules } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { ContentModerationService } from '../services/contentModeration';

const router = Router();

/**
 * DELETE /api/chat/moderation/messages/:id
 * Delete a message (admin only)
 */
router.delete('/messages/:id', requireSession, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		
		// Delete message from database
		await ChatService.deleteMessage(id);

		// Broadcast message deletion to all clients
		const { chatWebSocketServer } = await import('../services/chatWebSocket');
		chatWebSocketServer.broadcastMessageDeletion(id);

		res.json({
			success: true,
			message: 'Message deleted'
		});
	} catch (error) {
		console.error('Error deleting message:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to delete message'
		});
	}
});

/**
 * GET /api/chat/moderation/rules
 * Get all moderation rules (admin only)
 */
router.get('/rules', requireSession, async (req: Request, res: Response) => {
	try {
		const rules = await db.query.chatModerationRules.findMany({
			orderBy: desc(chatModerationRules.createdAt)
		});

		res.json({
			success: true,
			data: rules
		});
	} catch (error) {
		console.error('Error fetching moderation rules:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch moderation rules'
		});
	}
});

/**
 * POST /api/chat/moderation/rules
 * Create a new moderation rule (admin only)
 */
router.post('/rules', requireSession, async (req: Request, res: Response) => {
	try {
		const { type, value, description } = req.body;

		if (!type || !value) {
			return res.status(400).json({
				success: false,
				error: 'Type and value are required'
			});
		}

		if (type !== 'word' && type !== 'pattern') {
			return res.status(400).json({
				success: false,
				error: 'Type must be "word" or "pattern"'
			});
		}

		// Validate regex pattern
		if (type === 'pattern') {
			try {
				new RegExp(value);
			} catch (error) {
				return res.status(400).json({
					success: false,
					error: 'Invalid regex pattern'
				});
			}
		}

		// Check if rule exists
		const existing = await db.query.chatModerationRules.findFirst({
			where: eq(chatModerationRules.value, value)
		});

		if (existing) {
			return res.status(400).json({
				success: false,
				error: 'This rule already exists'
			});
		}

		const userId = (req as any).session?.userId || null;

		const [newRule] = await db.insert(chatModerationRules).values({
			type,
			value: value.trim(),
			description: description?.trim() || null,
			createdBy: userId
		}).returning();

		ContentModerationService.invalidateCache();

		res.json({
			success: true,
			data: newRule
		});
	} catch (error) {
		console.error('Error creating moderation rule:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to create moderation rule'
		});
	}
});

/**
 * DELETE /api/chat/moderation/rules/:id
 * Delete a moderation rule (admin only)
 */
router.delete('/rules/:id', requireSession, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const rule = await db.query.chatModerationRules.findFirst({
			where: eq(chatModerationRules.id, id)
		});

		if (!rule) {
			return res.status(404).json({
				success: false,
				error: 'Rule not found'
			});
		}

		await db.delete(chatModerationRules)
			.where(eq(chatModerationRules.id, id));

		ContentModerationService.invalidateCache();

		res.json({
			success: true,
			message: 'Rule deleted'
		});
	} catch (error) {
		console.error('Error deleting moderation rule:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to delete moderation rule'
		});
	}
});

/**
 * PUT /api/chat/moderation/rules/:id
 * Update a moderation rule (admin only)
 */
router.put('/rules/:id', requireSession, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { value, description } = req.body;

		const rule = await db.query.chatModerationRules.findFirst({
			where: eq(chatModerationRules.id, id)
		});

		if (!rule) {
			return res.status(404).json({
				success: false,
				error: 'Rule not found'
			});
		}

		// Validate regex pattern
		if (rule.type === 'pattern' && value) {
			try {
				new RegExp(value);
			} catch (error) {
				return res.status(400).json({
					success: false,
					error: 'Invalid regex pattern'
				});
			}
		}

		const [updatedRule] = await db.update(chatModerationRules)
			.set({
				value: value ? value.trim() : undefined,
				description: description !== undefined ? (description?.trim() || null) : undefined,
				updatedAt: new Date()
			})
			.where(eq(chatModerationRules.id, id))
			.returning();

		ContentModerationService.invalidateCache();

		res.json({
			success: true,
			data: updatedRule
		});
	} catch (error) {
		console.error('Error updating moderation rule:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update moderation rule'
		});
	}
});

export default router;

