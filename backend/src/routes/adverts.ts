import { logger } from '../utils/logger';
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { db } from '../db';
import { adverts, userUploads } from '../db/schema';
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

const MAX_ADVERT_WIDTH = 1456;

export class ImageSourceError extends Error {
	status: number;
	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

/** SSRF guard: refuse obviously internal/private hosts. Exported for tests. */
export function isPrivateAdvertHost(hostname: string): boolean {
	const host = hostname.toLowerCase();
	return (
		host === 'localhost' ||
		host === '0.0.0.0' ||
		host === '::1' ||
		host.endsWith('.local') ||
		/^127\./.test(host) ||
		/^10\./.test(host) ||
		/^192\.168\./.test(host) ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
		/^169\.254\./.test(host)
	);
}

/**
 * Resolve a `/uploads/...` source to an absolute file path
 */
export function resolveUploadSourcePath(source: string, rootDir = process.cwd()): string {
	const relative = source.replace(/^\//, '');
	const filePath = path.resolve(rootDir, 'static', relative);
	const uploadsRoot = path.resolve(rootDir, 'static', 'uploads');
	if (filePath !== uploadsRoot && !filePath.startsWith(uploadsRoot + path.sep)) {
		throw new ImageSourceError(400, 'Invalid image path');
	}
	return filePath;
}

/**
 * Clamp a requested crop region to the image's frame bounds.
 */
export function clampCropRegion(
	x: number,
	y: number,
	width: number,
	height: number,
	imgW: number,
	frameH: number
): { left: number; top: number; width: number; height: number } {
	const left = Math.min(Math.max(0, Math.round(x)), imgW - 1);
	const top = Math.min(Math.max(0, Math.round(y)), frameH - 1);
	return {
		left,
		top,
		width: Math.max(1, Math.min(Math.round(width), imgW - left)),
		height: Math.max(1, Math.min(Math.round(height), frameH - top))
	};
}

export function pickAdvertOutputFormat(format: string | undefined): {
	ext: string;
	mimetype: string;
} {
	switch (format) {
		case 'gif':
			return { ext: 'gif', mimetype: 'image/gif' };
		case 'webp':
			return { ext: 'webp', mimetype: 'image/webp' };
		case 'jpeg':
			return { ext: 'jpg', mimetype: 'image/jpeg' };
		default:
			return { ext: 'png', mimetype: 'image/png' };
	}
}

/**
 * Crop an image buffer to the given source-pixel region
 */
export async function cropAdvertImage(
	input: Buffer,
	region: { x: number; y: number; width: number; height: number }
): Promise<{ buffer: Buffer; ext: string; mimetype: string }> {
	const image = sharp(input, { animated: true });
	const meta = await image.metadata();
	const imgW = meta.width ?? 0;
	const frameH = meta.pageHeight ?? meta.height ?? 0;
	if (!imgW || !frameH) {
		throw new ImageSourceError(400, 'Could not read image dimensions');
	}

	const clamped = clampCropRegion(region.x, region.y, region.width, region.height, imgW, frameH);

	let pipeline = image.extract(clamped);
	if (clamped.width > MAX_ADVERT_WIDTH) {
		pipeline = pipeline.resize({ width: MAX_ADVERT_WIDTH });
	}

	const { ext, mimetype } = pickAdvertOutputFormat(meta.format);
	switch (ext) {
		case 'gif':
			pipeline = pipeline.gif();
			break;
		case 'webp':
			pipeline = pipeline.webp({ quality: 90 });
			break;
		case 'jpg':
			pipeline = pipeline.jpeg({ quality: 90 });
			break;
		default:
			pipeline = pipeline.png();
	}

	return { buffer: await pipeline.toBuffer(), ext, mimetype };
}

// Load an advert image source as a buffer: either a local /uploads/ path or
// an external URL (fetched server-side with basic SSRF guards).
async function loadImageSource(source: string): Promise<Buffer> {
	if (source.startsWith('/uploads/')) {
		const filePath = resolveUploadSourcePath(source);
		if (!fs.existsSync(filePath)) {
			throw new ImageSourceError(404, 'Image file not found');
		}
		return fs.readFileSync(filePath);
	}

	let target: URL;
	try {
		target = new URL(source);
	} catch {
		throw new ImageSourceError(400, 'Invalid URL');
	}
	if (target.protocol !== 'http:' && target.protocol !== 'https:') {
		throw new ImageSourceError(400, 'Only http(s) URLs are allowed');
	}
	if (isPrivateAdvertHost(target.hostname)) {
		throw new ImageSourceError(400, 'URL host not allowed');
	}

	const upstream = await fetch(target, {
		redirect: 'follow',
		signal: AbortSignal.timeout(10_000),
		headers: {
			// Some image hosts reject requests without a browser-like UA.
			'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
			Accept: 'image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5'
		}
	});
	if (!upstream.ok) {
		throw new ImageSourceError(502, `Image fetch failed (${upstream.status})`);
	}
	const contentType = upstream.headers.get('content-type') || '';
	if (!contentType.startsWith('image/')) {
		throw new ImageSourceError(400, 'URL is not an image');
	}
	const buffer = Buffer.from(await upstream.arrayBuffer());
	if (buffer.byteLength > 15 * 1024 * 1024) {
		throw new ImageSourceError(413, 'Image too large (max 15MB)');
	}
	return buffer;
}

// POST crop an advert image server-side (admin). Uses sharp so animated GIFs/WebPs keep their animation
router.post('/crop', requireAuth, async (req, res) => {
	try {
		const source = normaliseString(req.body.source);
		if (!source) {
			return res.status(400).json({ success: false, error: 'Image source is required' });
		}
		const x = Number(req.body.x);
		const y = Number(req.body.y);
		const width = Number(req.body.width);
		const height = Number(req.body.height);
		if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
			return res.status(400).json({ success: false, error: 'Invalid crop region' });
		}

		const input = await loadImageSource(source);
		const { buffer: output, ext, mimetype } = await cropAdvertImage(input, { x, y, width, height });

		const filename = `advert-crop-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
		const uploadDir = path.join(process.cwd(), 'static', 'uploads');
		if (!fs.existsSync(uploadDir)) {
			fs.mkdirSync(uploadDir, { recursive: true });
		}
		fs.writeFileSync(path.join(uploadDir, filename), output);

		const filePath = `/uploads/${filename}`;
		if (req.user) {
			await db.insert(userUploads).values({
				userId: req.user.id,
				filename,
				originalName: filename,
				path: filePath,
				size: output.byteLength,
				mimetype,
				isExternal: false
			});
		}

		res.json({ success: true, data: { path: filePath } });
	} catch (error) {
		if (error instanceof ImageSourceError) {
			return res.status(error.status).json({ success: false, error: error.message });
		}
		logger.error('Error cropping advert image:', error);
		res.status(500).json({ success: false, error: 'Failed to crop image' });
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
