import { logger } from '../utils/logger';
import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { db } from '../db';
import { buttonLinks, userUploads } from '../db/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { chatService } from '../services/chatService';
import { ImageSourceError, loadImageSource } from './adverts';
import { isUUID } from './tracking';

const router = Router();

const MAX_TITLE_LENGTH = 100;
const MAX_URL_LENGTH = 500; // matches the varchar(500) columns
const MIRRORABLE_FORMATS: Record<string, string> = {
	gif: 'image/gif',
	png: 'image/png',
	webp: 'image/webp',
	jpeg: 'image/jpeg'
};

function broadcastButtonsUpdate() {
	try {
		chatService.broadcastSiteConfigUpdate();
	} catch (error) {
		logger.error('Failed to broadcast buttons update:', error);
	}
}

const normaliseString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function isHttpUrl(value: string): boolean {
	try {
		const { protocol } = new URL(value);
		return protocol === 'http:' || protocol === 'https:';
	} catch {
		return false;
	}
}

export function isValidButtonImage(value: string): boolean {
	if (value.startsWith('/assets/') || value.startsWith('/uploads/')) {
		return !value.includes('..');
	}
	return isHttpUrl(value);
}

type ButtonFields = { title: string; linkUrl: string; imageUrl: string };

export function validateButtonFields(fields: Partial<ButtonFields>): string | null {
	const { title, linkUrl, imageUrl } = fields;
	if (title !== undefined && title.length > MAX_TITLE_LENGTH) {
		return `Title must be ${MAX_TITLE_LENGTH} characters or fewer`;
	}
	if (linkUrl !== undefined && !(isHttpUrl(linkUrl) && linkUrl.length <= MAX_URL_LENGTH)) {
		return `Link must be a valid http(s) URL of ${MAX_URL_LENGTH} characters or fewer`;
	}
	if (
		imageUrl !== undefined &&
		!(isValidButtonImage(imageUrl) && imageUrl.length <= MAX_URL_LENGTH)
	) {
		return 'Image must be an http(s) URL or an uploaded file';
	}
	return null;
}

// GET active buttons (public)
router.get('/', async (req, res) => {
	try {
		const rows = await db
			.select()
			.from(buttonLinks)
			.where(eq(buttonLinks.isActive, true))
			.orderBy(asc(buttonLinks.displayOrder), asc(buttonLinks.createdAt));

		res.json({ success: true, data: rows });
	} catch (error) {
		logger.error('Error fetching buttons:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch buttons' });
	}
});

// GET all buttons (admin)
router.get('/all', requireAuth, async (req, res) => {
	try {
		const rows = await db
			.select()
			.from(buttonLinks)
			.orderBy(asc(buttonLinks.displayOrder), asc(buttonLinks.createdAt));

		res.json({ success: true, data: rows });
	} catch (error) {
		logger.error('Error fetching buttons:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch buttons' });
	}
});

// POST save a remote image onto this server (admin), for sites that block hotlinking
router.post('/mirror', requireAuth, async (req, res) => {
	try {
		const source = normaliseString(req.body.source);
		if (!isHttpUrl(source)) {
			return res
				.status(400)
				.json({ success: false, error: 'A valid http(s) image URL is required' });
		}

		const input = await loadImageSource(source); // SSRF-guarded fetch, 15MB cap
		const format =
			(
				await sharp(input)
					.metadata()
					.catch(() => null)
			)?.format ?? '';
		const mimetype = MIRRORABLE_FORMATS[format];
		if (!mimetype) {
			return res
				.status(400)
				.json({ success: false, error: 'Only GIF, PNG, WebP or JPEG images can be saved' });
		}

		// Stored as-is (not re-encoded) so animated GIFs keep their animation.
		const ext = format === 'jpeg' ? 'jpg' : format;
		const filename = `button-${crypto.randomUUID()}.${ext}`;
		const uploadDir = path.join(process.cwd(), 'static', 'uploads');
		fs.mkdirSync(uploadDir, { recursive: true });
		fs.writeFileSync(path.join(uploadDir, filename), input);

		const filePath = `/uploads/${filename}`;
		if (req.user) {
			await db.insert(userUploads).values({
				userId: req.user.id,
				filename,
				originalName: filename,
				path: filePath,
				size: input.byteLength,
				mimetype,
				isExternal: false
			});
		}

		res.json({ success: true, data: { path: filePath } });
	} catch (error) {
		if (error instanceof ImageSourceError) {
			return res.status(error.status).json({ success: false, error: error.message });
		}
		logger.error('Error saving button image:', error);
		res.status(500).json({ success: false, error: 'Failed to save image' });
	}
});

// POST create button (admin)
router.post('/', requireAuth, async (req, res) => {
	try {
		const fields: ButtonFields = {
			title: normaliseString(req.body.title),
			linkUrl: normaliseString(req.body.linkUrl),
			imageUrl: normaliseString(req.body.imageUrl)
		};
		if (!fields.title || !fields.linkUrl || !fields.imageUrl) {
			return res.status(400).json({ success: false, error: 'Title, link and image are required' });
		}
		const invalid = validateButtonFields(fields);
		if (invalid) {
			return res.status(400).json({ success: false, error: invalid });
		}

		const [{ maxOrder }] = await db
			.select({ maxOrder: sql<number>`COALESCE(MAX(${buttonLinks.displayOrder}), -1)` })
			.from(buttonLinks);

		const [row] = await db
			.insert(buttonLinks)
			.values({
				...fields,
				isActive: req.body.isActive === undefined ? true : Boolean(req.body.isActive),
				displayOrder: maxOrder + 1
			})
			.returning();

		broadcastButtonsUpdate();
		res.status(201).json({ success: true, data: row });
	} catch (error) {
		logger.error('Error creating button:', error);
		res.status(500).json({ success: false, error: 'Failed to create button' });
	}
});

// PUT update button order (bulk)
router.put('/order', requireAuth, async (req, res) => {
	try {
		const { buttons } = req.body;
		const valid =
			Array.isArray(buttons) &&
			buttons.every(
				(b) => b && isUUID(b.id) && Number.isInteger(b.displayOrder) && b.displayOrder >= 0
			);
		if (!valid) {
			return res
				.status(400)
				.json({ success: false, error: 'buttons must be an array of { id, displayOrder }' });
		}

		await db.transaction(async (tx) => {
			for (const { id, displayOrder } of buttons) {
				await tx
					.update(buttonLinks)
					.set({ displayOrder, updatedAt: new Date() })
					.where(eq(buttonLinks.id, id));
			}
		});

		broadcastButtonsUpdate();
		res.json({ success: true, message: 'Button order updated' });
	} catch (error) {
		logger.error('Error updating button order:', error);
		res.status(500).json({ success: false, error: 'Failed to update button order' });
	}
});

// PUT update button (admin)
router.put('/:id', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;

		const fields: Partial<ButtonFields> = {};
		for (const key of ['title', 'linkUrl', 'imageUrl'] as const) {
			if (req.body[key] !== undefined) fields[key] = normaliseString(req.body[key]);
		}
		if (Object.values(fields).some((value) => !value)) {
			return res
				.status(400)
				.json({ success: false, error: 'Title, link and image cannot be empty' });
		}
		const invalid = validateButtonFields(fields);
		if (invalid) {
			return res.status(400).json({ success: false, error: invalid });
		}

		const updateData: Record<string, unknown> = { ...fields, updatedAt: new Date() };
		if (req.body.isActive !== undefined) updateData.isActive = Boolean(req.body.isActive);

		const [row] = await db
			.update(buttonLinks)
			.set(updateData)
			.where(eq(buttonLinks.id, id))
			.returning();
		if (!row) {
			return res.status(404).json({ success: false, error: 'Button not found' });
		}

		broadcastButtonsUpdate();
		res.json({ success: true, data: row });
	} catch (error) {
		logger.error('Error updating button:', error);
		res.status(500).json({ success: false, error: 'Failed to update button' });
	}
});

// DELETE button (admin)
router.delete('/:id', requireAuth, async (req, res) => {
	try {
		const [row] = await db.delete(buttonLinks).where(eq(buttonLinks.id, req.params.id)).returning();
		if (!row) {
			return res.status(404).json({ success: false, error: 'Button not found' });
		}

		broadcastButtonsUpdate();
		res.json({ success: true, message: 'Button deleted' });
	} catch (error) {
		logger.error('Error deleting button:', error);
		res.status(500).json({ success: false, error: 'Failed to delete button' });
	}
});

export default router;
