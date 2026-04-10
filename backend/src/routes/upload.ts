import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireSession } from '../middleware/auth';
import { db } from '../db';
import { userUploads } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Configure storage
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const uploadDir = path.join(process.cwd(), 'static', 'uploads');

		if (!fs.existsSync(uploadDir)) {
			fs.mkdirSync(uploadDir, { recursive: true });
		}

		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		// Generate filename: timestamp-random-originalname
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname);
		const nameWithoutExt = path.basename(file.originalname, ext);
		const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-');
		cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
	}
});

// File filter
function createFileFilter(allowedTypes: string[]) {
	return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
		const fileExt = path.extname(file.originalname).toLowerCase().slice(1);
		const mimeType = file.mimetype;

		// Check if file type is allowed
		const isAllowed = allowedTypes.some((type) => {
			// By extension
			if (type.startsWith('.')) {
				return fileExt === type.slice(1);
			}
			// By MIME type
			if (type.includes('/')) {
				return mimeType === type || mimeType.startsWith(type.split('/')[0] + '/');
			}
			// Check category (e.g. image, video)
			return mimeType.startsWith(type + '/');
		});

		if (isAllowed) {
			cb(null, true);
		} else {
			cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`));
		}
	};
}

// Default upload configuration
const defaultUpload = multer({
	storage: storage,
	limits: {
		fileSize: 10 * 1024 * 1024 // 10MB default
	},
	fileFilter: createFileFilter(['image'])
});

/**
 * Upload single file
 * POST /api/upload
 * Requires authentication
 */
router.post(
	'/',
	requireSession,
	defaultUpload.single('file'),
	async (req: Request, res: Response) => {
		try {
			if (!req.file) {
				return res.status(400).json({
					success: false,
					error: 'No file uploaded'
				});
			}

			if (!req.user) {
				return res.status(401).json({
					success: false,
					error: 'User not authenticated'
				});
			}

			// Save to database
			const [uploadRecord] = await db
				.insert(userUploads)
				.values({
					userId: req.user.id,
					filename: req.file.filename,
					originalName: req.file.originalname,
					path: `/uploads/${req.file.filename}`,
					size: req.file.size,
					mimetype: req.file.mimetype,
					isExternal: false
				})
				.returning();

			res.json({
				success: true,
				data: {
					id: uploadRecord.id,
					filename: req.file.filename,
					originalName: req.file.originalname,
					path: `/uploads/${req.file.filename}`,
					size: req.file.size,
					mimetype: req.file.mimetype,
					isExternal: false
				}
			});
		} catch (error: any) {
			console.error('Upload error:', error);
			res.status(500).json({
				success: false,
				error: error.message || 'Failed to upload file'
			});
		}
	}
);

/**
 * Upload single file with custom configuration
 * POST /api/upload/custom
 * Requires authentication
 * Query params: allowedTypes (comma-separated), maxSize (bytes)
 */
router.post(
	'/custom',
	requireSession,
	(req: Request, res: Response, next) => {
		const allowedTypesParam = req.query.allowedTypes as string;
		const maxSizeParam = req.query.maxSize as string;

		const allowedTypes = allowedTypesParam
			? allowedTypesParam.split(',').map((t) => t.trim())
			: ['image'];
		const maxSize = maxSizeParam ? parseInt(maxSizeParam, 10) : 10 * 1024 * 1024;

		const customUpload = multer({
			storage: storage,
			limits: {
				fileSize: maxSize
			},
			fileFilter: createFileFilter(allowedTypes)
		});

		customUpload.single('file')(req, res, (err) => {
			if (err) {
				return res.status(400).json({
					success: false,
					error: err.message || 'File upload failed'
				});
			}
			next();
		});
	},
	async (req: Request, res: Response) => {
		try {
			if (!req.file) {
				return res.status(400).json({
					success: false,
					error: 'No file uploaded'
				});
			}

			if (!req.user) {
				return res.status(401).json({
					success: false,
					error: 'User not authenticated'
				});
			}

			// Save to database
			const [uploadRecord] = await db
				.insert(userUploads)
				.values({
					userId: req.user.id,
					filename: req.file.filename,
					originalName: req.file.originalname,
					path: `/uploads/${req.file.filename}`,
					size: req.file.size,
					mimetype: req.file.mimetype,
					isExternal: false
				})
				.returning();

			res.json({
				success: true,
				data: {
					id: uploadRecord.id,
					filename: req.file.filename,
					originalName: req.file.originalname,
					path: `/uploads/${req.file.filename}`,
					size: req.file.size,
					mimetype: req.file.mimetype,
					isExternal: false
				}
			});
		} catch (error: any) {
			console.error('Upload error:', error);
			res.status(500).json({
				success: false,
				error: error.message || 'Failed to upload file'
			});
		}
	}
);

/**
 * Serve uploaded file
 * GET /api/upload/file/:filename
 * Public endpoint
 */
router.get('/file/:filename', async (req: Request, res: Response) => {
	try {
		const { filename } = req.params;

		// Security check: ensure filename doesn't contain path traversal
		if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
			return res.status(400).json({
				success: false,
				error: 'Invalid filename'
			});
		}

		const filePath = path.join(process.cwd(), 'static', 'uploads', filename);

		// Check if file exists
		if (!fs.existsSync(filePath)) {
			return res.status(404).json({
				success: false,
				error: 'File not found'
			});
		}

		// Send file
		res.sendFile(filePath);
	} catch (error: any) {
		console.error('Error serving file:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to serve file'
		});
	}
});

/**
 * Get all uploads (admin only) or user's own uploads
 * GET /api/upload
 * Requires authentication
 */
router.get('/', requireSession, async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			return res.status(401).json({
				success: false,
				error: 'User not authenticated'
			});
		}

		// If admin, get all uploads; otherwise get only user's uploads
		const uploads = await db
			.select()
			.from(userUploads)
			.where(req.user.isAdmin ? undefined : eq(userUploads.userId, req.user.id))
			.orderBy(desc(userUploads.createdAt));

		res.json({
			success: true,
			data: uploads
		});
	} catch (error: any) {
		console.error('Error fetching uploads:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to fetch uploads'
		});
	}
});

/**
 * Get upload by ID
 * GET /api/upload/id/:id
 * Requires authentication
 */
router.get('/id/:id', requireSession, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		if (!req.user) {
			return res.status(401).json({
				success: false,
				error: 'User not authenticated'
			});
		}

		const [upload] = await db.select().from(userUploads).where(eq(userUploads.id, id)).limit(1);

		if (!upload) {
			return res.status(404).json({
				success: false,
				error: 'Upload not found'
			});
		}

		if (upload.userId !== req.user.id && !req.user.isAdmin) {
			return res.status(403).json({
				success: false,
				error: 'You do not have permission to view this upload'
			});
		}

		res.json({
			success: true,
			data: upload
		});
	} catch (error: any) {
		console.error('Error fetching upload:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to fetch upload'
		});
	}
});

/**
 * Delete uploaded file
 * DELETE /api/upload/:filename
 * Requires authentication
 */
router.delete('/:filename', requireSession, async (req: Request, res: Response) => {
	try {
		const { filename } = req.params;
		const filePath = path.join(process.cwd(), 'static', 'uploads', filename);

		// Ensure filename contains no path traversal
		if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
			return res.status(400).json({
				success: false,
				error: 'Invalid filename'
			});
		}

		if (!req.user) {
			return res.status(401).json({
				success: false,
				error: 'User not authenticated'
			});
		}

		// Find upload
		const [uploadRecord] = await db
			.select()
			.from(userUploads)
			.where(eq(userUploads.filename, filename))
			.limit(1);

		// Check if user owns the file
		if (!uploadRecord) {
			return res.status(404).json({
				success: false,
				error: 'Upload record not found'
			});
		}

		if (uploadRecord.userId !== req.user.id && !req.user.isAdmin) {
			return res.status(403).json({
				success: false,
				error: 'You do not have permission to delete this file'
			});
		}

		// Delete file if it exists and is not external
		if (!uploadRecord.isExternal && fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}

		// Delete db record
		await db.delete(userUploads).where(eq(userUploads.id, uploadRecord.id));

		res.json({
			success: true,
			message: 'File deleted successfully'
		});
	} catch (error: any) {
		console.error('Delete error:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to delete file'
		});
	}
});

export default router;
