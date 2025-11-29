import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users, siteConfig } from '../db/schema';
import { eq } from 'drizzle-orm';
import { requireSession } from '../middleware/auth';
import { chatService } from '../services/chatService';

const router = Router();

// Get user settings (requires authentication)
router.get('/theme', requireSession, async (req: Request, res: Response) => {
  try {
    const user = await db.select({
      themePreference: users.themePreference
    }).from(users).where(eq(users.id, req.user!.id)).limit(1);

    if (user.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    res.json({
      success: true,
      themePreference: user[0].themePreference || 'system',
      message: 'Theme preference retrieved successfully'
    });

  } catch (error) {
    console.error('Get theme preference error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get theme preference'
    });
  }
});

// Get user accent color (requires authentication)
router.get('/accent-color', requireSession, async (req: Request, res: Response) => {
  try {
    const user = await db.select({
      accentColor: users.accentColor
    }).from(users).where(eq(users.id, req.user!.id)).limit(1);

    if (user.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    res.json({
      success: true,
      accentColor: user[0].accentColor || '#3b82f6',
      message: 'Accent color retrieved successfully'
    });

  } catch (error) {
    console.error('Get accent color error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get accent color'
    });
  }
});

// Update user theme preference (requires authentication)
router.post('/theme', requireSession, async (req: Request, res: Response) => {
  try {
    const { themePreference } = req.body;

    // Validate theme preference
    if (!themePreference || !['light', 'dark', 'system'].includes(themePreference)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Theme preference must be one of: light, dark, system'
      });
    }

    // Update theme preference in database
    await db.update(users)
      .set({ themePreference })
      .where(eq(users.id, req.user!.id));

    res.json({
      success: true,
      themePreference,
      message: 'Theme preference updated successfully'
    });

  } catch (error) {
    console.error('Update theme preference error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update theme preference'
    });
  }
});

// Update user accent color (requires authentication)
router.post('/accent-color', requireSession, async (req: Request, res: Response) => {
  try {
    const { accentColor } = req.body;

    // Validate accent color (hex format)
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!accentColor || !hexColorRegex.test(accentColor)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Accent color must be a valid hex color (e.g., #3b82f6)'
      });
    }

    // Update accent color in database
    await db.update(users)
      .set({ accentColor })
      .where(eq(users.id, req.user!.id));

    res.json({
      success: true,
      accentColor,
      message: 'Accent color updated successfully'
    });

  } catch (error) {
    console.error('Update accent color error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update accent color'
    });
  }
});

// Get all admin settings (authenticated users only)
router.get('/admin', requireSession, async (req: Request, res: Response) => {
  try {
    // Future: Return system-wide admin settings
    res.json({
      success: true,
      settings: {
        // Placeholder for future admin settings
        maintenance_mode: false,
        registration_enabled: true,
        site_title: 'dane.gg Admin'
      },
      message: 'Admin settings retrieved successfully'
    });

  } catch (error) {
    console.error('Get admin settings error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get admin settings'
    });
  }
});

// Update admin settings (authenticated users only)
router.post('/admin', requireSession, async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;

    // Validate settings object
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Settings object is required'
      });
    }

    // Future: Implement admin settings storage
    // For now, just acknowledge the request
    res.json({
      success: true,
      settings,
      message: 'Admin settings updated successfully'
    });

  } catch (error) {
    console.error('Update admin settings error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update admin settings'
    });
  }
});

// Get admin chat nickname (authenticated users only)
router.get('/admin-chat-nickname', requireSession, async (req: Request, res: Response) => {
  try {
    const result = await db.select({
      value: siteConfig.value
    }).from(siteConfig).where(eq(siteConfig.key, 'admin_chat_nickname')).limit(1);

    const nickname = result.length > 0 ? result[0].value : 'Admin';

    res.json({
      success: true,
      nickname,
      message: 'Admin chat nickname retrieved successfully'
    });

  } catch (error) {
    console.error('Get admin chat nickname error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get admin chat nickname'
    });
  }
});

// Update admin chat nickname (authenticated users only)
router.post('/admin-chat-nickname', requireSession, async (req: Request, res: Response) => {
  try {
    const { nickname } = req.body;

    if (!nickname || typeof nickname !== 'string') {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Nickname is required'
      });
    }

    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length < 1 || trimmedNickname.length > 20) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Nickname must be between 1 and 20 characters'
      });
    }

    const existing = await db.select().from(siteConfig).where(eq(siteConfig.key, 'admin_chat_nickname')).limit(1);

    if (existing.length > 0) {
      await db.update(siteConfig)
        .set({ 
          value: trimmedNickname,
          updatedAt: new Date()
        })
        .where(eq(siteConfig.key, 'admin_chat_nickname'));
    } else {
      await db.insert(siteConfig).values({
        key: 'admin_chat_nickname',
        value: trimmedNickname,
        description: 'Nickname used by admins in the site chat',
        dataType: 'string',
        isActive: true
      });
    }

    res.json({
      success: true,
      nickname: trimmedNickname,
      message: 'Admin chat nickname updated successfully'
    });

  } catch (error) {
    console.error('Update admin chat nickname error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update admin chat nickname'
    });
  }
});

// Get admin chat color (authenticated users only)
router.get('/admin-chat-color', requireSession, async (req: Request, res: Response) => {
  try {
    const result = await db.select({
      value: siteConfig.value
    }).from(siteConfig).where(eq(siteConfig.key, 'admin_chat_color')).limit(1);

    const color = result.length > 0 ? result[0].value : '#f5b700';

    res.json({
      success: true,
      color,
      message: 'Admin chat color retrieved successfully'
    });

  } catch (error) {
    console.error('Get admin chat color error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get admin chat color'
    });
  }
});

// Update admin chat color (authenticated users only)
router.post('/admin-chat-color', requireSession, async (req: Request, res: Response) => {
  try {
    const { color } = req.body;

    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!color || !hexColorRegex.test(color)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Color must be a valid hex color (e.g., #f5b700)'
      });
    }

    const existing = await db.select().from(siteConfig).where(eq(siteConfig.key, 'admin_chat_color')).limit(1);

    if (existing.length > 0) {
      await db.update(siteConfig)
        .set({ 
          value: color,
          updatedAt: new Date()
        })
        .where(eq(siteConfig.key, 'admin_chat_color'));
    } else {
      await db.insert(siteConfig).values({
        key: 'admin_chat_color',
        value: color,
        description: 'Color used for admin nickname in the site chat',
        dataType: 'string',
        isActive: true
      });
    }

    chatService.broadcastAdminConfig({ color });

    res.json({
      success: true,
      color,
      message: 'Admin chat color updated successfully'
    });

  } catch (error) {
    console.error('Update admin chat color error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update admin chat color'
    });
  }
});

export default router;
