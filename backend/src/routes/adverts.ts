import { logger } from '../utils/logger';
import { Router } from 'express';
import { db } from '../db';
import { adverts } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { chatService } from '../services/chatService';

const router = Router();

// Notify connected clients so the public banner re-fetches live.
function broadcastAdvertsUpdate() {
	try {
		chatService.broadcastSiteConfigUpdate();
	} catch (error) {
		logger.error('Failed to broadcast adverts update:', error);
	}
}

function normaliseString(value: unknown, fallback = ''): string {
	return typeof value === 'string' ? value.trim() : fallback;
}

// GET active adverts (public)
router.get('/', async (req, res) => {
	try {
		const rows = await db
			.select()
			.from(adverts)
			.where(eq(adverts.isActive, true))
			.orderBy(asc(adverts.displayOrder), asc(adverts.createdAt));

		res.json({ success: true, data: rows });
	} catch (error) {
		logger.error('Error fetching adverts:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch adverts' });
	}
});

// GET all adverts (admin)
router.get('/all', requireAuth, async (req, res) => {
	try {
		const rows = await db
			.select()
			.from(adverts)
			.orderBy(asc(adverts.displayOrder), asc(adverts.createdAt));

		res.json({ success: true, data: rows });
	} catch (error) {
		logger.error('Error fetching adverts:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch adverts' });
	}
});

// POST create advert (admin)
router.post('/', requireAuth, async (req, res) => {
	try {
		const imageUrl = normaliseString(req.body.imageUrl);
		if (!imageUrl) {
			return res.status(400).json({ success: false, error: 'Image is required' });
		}

		const title = normaliseString(req.body.title);
		const description = normaliseString(req.body.description);
		const linkUrl = normaliseString(req.body.linkUrl);
		const isActive = req.body.isActive === undefined ? true : Boolean(req.body.isActive);

		const existing = await db.select({ displayOrder: adverts.displayOrder }).from(adverts);
		const maxOrder = existing.reduce((max, row) => Math.max(max, row.displayOrder), -1);

		const [row] = await db
			.insert(adverts)
			.values({
				title,
				description: description || null,
				imageUrl,
				linkUrl,
				isActive,
				displayOrder: maxOrder + 1
			})
			.returning();

		broadcastAdvertsUpdate();
		res.status(201).json({ success: true, data: row });
	} catch (error) {
		logger.error('Error creating advert:', error);
		res.status(500).json({ success: false, error: 'Failed to create advert' });
	}
});

// PUT update adverts order (bulk) - MUST be before /:id
router.put('/order', requireAuth, async (req, res) => {
	try {
		const { adverts: toUpdate } = req.body;
		if (!Array.isArray(toUpdate)) {
			return res.status(400).json({ success: false, error: 'Adverts array is required' });
		}

		for (const item of toUpdate) {
			if (!item?.id) continue;
			await db
				.update(adverts)
				.set({ displayOrder: Number(item.displayOrder) || 0, updatedAt: new Date() })
				.where(eq(adverts.id, item.id));
		}

		broadcastAdvertsUpdate();
		res.json({ success: true, message: 'Advert order updated' });
	} catch (error) {
		logger.error('Error updating advert order:', error);
		res.status(500).json({ success: false, error: 'Failed to update advert order' });
	}
});

// PUT update advert (admin)
router.put('/:id', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (req.body.title !== undefined) updateData.title = normaliseString(req.body.title);
		if (req.body.description !== undefined) {
			updateData.description = normaliseString(req.body.description) || null;
		}
		if (req.body.imageUrl !== undefined) {
			const imageUrl = normaliseString(req.body.imageUrl);
			if (!imageUrl) {
				return res.status(400).json({ success: false, error: 'Image cannot be empty' });
			}
			updateData.imageUrl = imageUrl;
		}
		if (req.body.linkUrl !== undefined) updateData.linkUrl = normaliseString(req.body.linkUrl);
		if (req.body.isActive !== undefined) updateData.isActive = Boolean(req.body.isActive);
		if (req.body.displayOrder !== undefined) {
			updateData.displayOrder = Number(req.body.displayOrder) || 0;
		}

		const [row] = await db.update(adverts).set(updateData).where(eq(adverts.id, id)).returning();

		if (!row) {
			return res.status(404).json({ success: false, error: 'Advert not found' });
		}

		broadcastAdvertsUpdate();
		res.json({ success: true, data: row });
	} catch (error) {
		logger.error('Error updating advert:', error);
		res.status(500).json({ success: false, error: 'Failed to update advert' });
	}
});

// DELETE advert (admin)
router.delete('/:id', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;

		const [row] = await db.delete(adverts).where(eq(adverts.id, id)).returning();

		if (!row) {
			return res.status(404).json({ success: false, error: 'Advert not found' });
		}

		broadcastAdvertsUpdate();
		res.json({ success: true, message: 'Advert deleted' });
	} catch (error) {
		logger.error('Error deleting advert:', error);
		res.status(500).json({ success: false, error: 'Failed to delete advert' });
	}
});

export default router;
