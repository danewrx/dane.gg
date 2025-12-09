import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireSession, requireAdmin } from '../middleware/auth';
import { db } from '../db';
import { emojis } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { chatService } from '../services/chatService';

const router = Router();

const emojiStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'static', 'emojis');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `emoji-${uniqueSuffix}${ext}`);
  }
});

// File filter for emojis (jpg, png, gif)
const emojiUpload = multer({
  storage: emojiStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max for emojis
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif'];
    
    const fileExt = path.extname(file.originalname).toLowerCase();
    const isValidType = allowedTypes.includes(file.mimetype) || allowedExts.includes(fileExt);
    
    if (isValidType) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and GIF files are allowed for emojis'));
    }
  }
});

/**
 * GET /api/emojis - Get all emojis (public endpoint)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const allEmojis = await db
      .select()
      .from(emojis)
      .orderBy(desc(emojis.createdAt));

    res.json({
      success: true,
      data: allEmojis
    });
  } catch (error: any) {
    console.error('Error fetching emojis:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch emojis'
    });
  }
});

/**
 * POST /api/emojis - Upload a new custom emoji (admin only)
 */
router.post('/', requireSession, requireAdmin, emojiUpload.single('file'), async (req: Request, res: Response) => {
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

    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        error: 'Emoji name is required'
      });
    }

    const nameRegex = /^[a-zA-Z0-9_-]+$/;
    const sanitizedName = name.trim().toLowerCase();
    
    if (!nameRegex.test(sanitizedName)) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        error: 'Emoji name can only contain letters, numbers, underscores, and hyphens'
      });
    }

    // Check if emoji name already exists
    const existing = await db
      .select()
      .from(emojis)
      .where(eq(emojis.name, sanitizedName))
      .limit(1);

    if (existing.length > 0) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(409).json({
        success: false,
        error: 'An emoji with this name already exists'
      });
    }

    // Save emoji to database
    const imageUrl = `/emojis/${req.file.filename}`;
    const [newEmoji] = await db.insert(emojis).values({
      name: sanitizedName,
      imageUrl: imageUrl,
      isCustom: true,
      createdBy: req.user.id
    }).returning();

    chatService.broadcastEmojiUpdate();

    res.json({
      success: true,
      data: newEmoji
    });
  } catch (error: any) {
    console.error('Error uploading emoji:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload emoji'
    });
  }
});

/**
 * DELETE /api/emojis/:id - Delete a custom emoji (admin only)
 */
router.delete('/:id', requireSession, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [emoji] = await db
      .select()
      .from(emojis)
      .where(eq(emojis.id, id))
      .limit(1);

    if (!emoji) {
      return res.status(404).json({
        success: false,
        error: 'Emoji not found'
      });
    }

    if (!emoji.isCustom) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete default emojis'
      });
    }

    const filePath = path.join(process.cwd(), 'static', emoji.imageUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await db.delete(emojis).where(eq(emojis.id, id));

    chatService.broadcastEmojiUpdate();

    res.json({
      success: true,
      message: 'Emoji deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting emoji:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete emoji'
    });
  }
});

export default router;

