import { logger } from '../utils/logger';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { fonts } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = Router();

const FONTS_UPLOAD_DIR = path.join(process.cwd(), 'static', 'uploads', 'fonts');
const ALLOWED_EXT = ['.woff', '.woff2', '.ttf', '.otf'];
const MAX_FONT_SIZE = 5 * 1024 * 1024; // 5MB

const fontStorage = multer.diskStorage({
	destination: (_req, _file, cb) => {
		if (!fs.existsSync(FONTS_UPLOAD_DIR)) {
			fs.mkdirSync(FONTS_UPLOAD_DIR, { recursive: true });
		}
		cb(null, FONTS_UPLOAD_DIR);
	},
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase();
		const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '-');
		const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
		cb(null, `${base}-${unique}${ext}`);
	}
});

const fontUpload = multer({
	storage: fontStorage,
	limits: { fileSize: MAX_FONT_SIZE },
	fileFilter: (_req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase();
		if (ALLOWED_EXT.includes(ext)) {
			cb(null, true);
		} else {
			cb(new Error(`Allowed font formats: ${ALLOWED_EXT.join(', ')}`));
		}
	}
});

const DEFAULT_GOOGLE_FONTS = [
	'Inter',
	'Roboto',
	'Open Sans',
	'Lato',
	'Montserrat',
	'Poppins',
	'Source Sans Pro',
	'Nunito',
	'Raleway',
	'Ubuntu',
	'Playfair Display',
	'Merriweather',
	'PT Sans',
	'Oswald',
	'Quicksand',
	'Work Sans',
	'Fira Sans',
	'Rubik',
	'Karla',
	'Manrope',
	'Space Grotesk',
	'DM Sans',
	'JetBrains Mono',
	'Fira Code',
	'Rajdhani',
	'Orbitron'
];

/**
 * GET /api/fonts
 * List all fonts (Google + custom). Auth required for admin theme editor.
 * Seeds default Google fonts if table is empty.
 */
router.get('/', requireAuth, async (_req: Request, res: Response) => {
	try {
		let allFonts = await db.select().from(fonts).orderBy(asc(fonts.displayOrder), asc(fonts.name));
		if (allFonts.length === 0) {
			await db.insert(fonts).values(
				DEFAULT_GOOGLE_FONTS.map((name, i) => ({
					name,
					type: 'google',
					googleFontFamily: name,
					filePath: null,
					displayOrder: i
				}))
			);
			allFonts = await db.select().from(fonts).orderBy(asc(fonts.displayOrder), asc(fonts.name));
		}
		res.json({ success: true, data: allFonts });
	} catch (error) {
		logger.error('Error fetching fonts:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch fonts' });
	}
});

/**
 * POST /api/fonts/upload
 * Upload a custom font. Saves to static/uploads/fonts and creates font record.
 */
router.post(
	'/upload',
	requireAuth,
	fontUpload.single('file'),
	async (req: Request, res: Response) => {
		try {
			if (!req.file) {
				return res.status(400).json({ success: false, error: 'No file uploaded' });
			}

			const name =
				(req.body.name as string)?.trim() ||
				path.basename(req.file.originalname, path.extname(req.file.originalname));
			const filePath = `/uploads/fonts/${req.file.filename}`;

			const existing = await db.select().from(fonts);
			const maxOrder = existing.reduce((max, f) => Math.max(max, f.displayOrder), -1);

			const [created] = await db
				.insert(fonts)
				.values({
					name,
					type: 'custom',
					googleFontFamily: null,
					filePath,
					displayOrder: maxOrder + 1
				})
				.returning();

			res.status(201).json({ success: true, data: created });
		} catch (error: any) {
			logger.error('Font upload error:', error);
			res.status(500).json({ success: false, error: error.message || 'Failed to upload font' });
		}
	}
);

/**
 * DELETE /api/fonts/:id
 * Delete a custom font
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const [font] = await db.select().from(fonts).where(eq(fonts.id, id));

		if (!font) {
			return res.status(404).json({ success: false, error: 'Font not found' });
		}
		if (font.type !== 'custom') {
			return res.status(400).json({ success: false, error: 'Only custom fonts can be deleted' });
		}

		if (font.filePath) {
			const fullPath = path.join(process.cwd(), 'static', font.filePath);
			if (fs.existsSync(fullPath)) {
				fs.unlinkSync(fullPath);
			}
		}

		await db.delete(fonts).where(eq(fonts.id, id));
		res.json({ success: true, message: 'Font deleted' });
	} catch (error) {
		logger.error('Error deleting font:', error);
		res.status(500).json({ success: false, error: 'Failed to delete font' });
	}
});

export default router;
