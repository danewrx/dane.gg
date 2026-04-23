import { logger } from '../utils/logger';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireSession, requireAdmin } from '../middleware/auth';
import { chatService } from '../services/chatService';
import { db } from '../db';
import { chatNotificationSounds } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import {
	DEFAULT_CHAT_NOTIFICATION_SOUND_ID,
	DEFAULT_CHAT_NOTIFICATION_SOUND_NAME
} from '../constants/chatNotificationSounds';

const router = Router();

const soundStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		const uploadDir = path.join(process.cwd(), 'static', 'chat-sounds');
		if (!fs.existsSync(uploadDir)) {
			fs.mkdirSync(uploadDir, { recursive: true });
		}
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname).toLowerCase() || '.mp3';
		cb(null, `notify-${uniqueSuffix}${ext}`);
	}
});

const soundUpload = multer({
	storage: soundStorage,
	limits: { fileSize: 512 * 1024 },
	fileFilter: (req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase();
		const okExt = ['.mp3', '.wav', '.ogg', '.webm', '.m4a'].includes(ext);
		if (okExt) {
			cb(null, true);
		} else {
			cb(new Error('Allowed: MP3, WAV, OGG, WebM, M4A (max 512KB)'));
		}
	}
});

/* Get public list for site settings */
router.get('/', async (req: Request, res: Response) => {
	try {
		const rows = await db
			.select()
			.from(chatNotificationSounds)
			.orderBy(desc(chatNotificationSounds.createdAt));

		const sorted = [...rows].sort((a, b) => {
			const aDef = a.name === DEFAULT_CHAT_NOTIFICATION_SOUND_NAME ? 0 : 1;
			const bDef = b.name === DEFAULT_CHAT_NOTIFICATION_SOUND_NAME ? 0 : 1;
			if (aDef !== bDef) return aDef - bDef;
			const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
			const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
			return tb - ta;
		});

		res.json({ success: true, data: sorted });
	} catch (error: any) {
		logger.error('Error fetching chat notification sounds:', error);
		res.status(500).json({ success: false, error: error.message || 'Failed to fetch sounds' });
	}
});

/* Post admin upload */
router.post(
	'/',
	requireSession,
	requireAdmin,
	soundUpload.single('file'),
	async (req: Request, res: Response) => {
		try {
			if (!req.file) {
				return res.status(400).json({ success: false, error: 'No file uploaded' });
			}
			if (!req.user) {
				if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
				return res.status(401).json({ success: false, error: 'User not authenticated' });
			}

			const rawLabel = req.body.displayName ?? req.body.name;
			if (!rawLabel || typeof rawLabel !== 'string' || !rawLabel.trim()) {
				if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
				return res.status(400).json({ success: false, error: 'Display name is required' });
			}

			const displayName = rawLabel.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
			if (!displayName) {
				if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
				return res.status(400).json({ success: false, error: 'Display name is required' });
			}
			if (displayName.length > 120) {
				if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
				return res
					.status(400)
					.json({ success: false, error: 'Display name must be 120 characters or less' });
			}

			const internalName = path.parse(req.file.filename).name;
			if (internalName === DEFAULT_CHAT_NOTIFICATION_SOUND_NAME) {
				if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
				return res.status(500).json({ success: false, error: 'Unexpected file name collision' });
			}

			const soundUrl = `/chat-sounds/${req.file.filename}`;
			const [row] = await db
				.insert(chatNotificationSounds)
				.values({
					name: internalName,
					displayName,
					soundUrl,
					createdBy: req.user.id
				})
				.returning();

			chatService.broadcastNotificationSoundsUpdate();
			res.json({ success: true, data: row });
		} catch (error: any) {
			logger.error('Error uploading chat notification sound:', error);
			if (req.file && fs.existsSync(req.file.path)) {
				try {
					fs.unlinkSync(req.file.path);
				} catch {}
			}
			res.status(500).json({ success: false, error: error.message || 'Failed to upload sound' });
		}
	}
);

/* Delete */
router.delete('/:id', requireSession, requireAdmin, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const [row] = await db
			.select()
			.from(chatNotificationSounds)
			.where(eq(chatNotificationSounds.id, id))
			.limit(1);

		if (!row) {
			return res.status(404).json({ success: false, error: 'Sound not found' });
		}

		if (
			row.id === DEFAULT_CHAT_NOTIFICATION_SOUND_ID ||
			row.name === DEFAULT_CHAT_NOTIFICATION_SOUND_NAME
		) {
			return res.status(403).json({
				success: false,
				error: 'The built-in default notification sound cannot be deleted'
			});
		}

		const rel = row.soundUrl.replace(/^\//, '');
		const filePath = path.join(process.cwd(), 'static', rel);
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}

		await db.delete(chatNotificationSounds).where(eq(chatNotificationSounds.id, id));

		chatService.broadcastNotificationSoundsUpdate();
		res.json({ success: true, message: 'Sound deleted' });
	} catch (error: any) {
		logger.error('Error deleting chat notification sound:', error);
		res.status(500).json({ success: false, error: error.message || 'Failed to delete sound' });
	}
});

export default router;
