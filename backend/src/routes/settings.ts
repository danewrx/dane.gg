import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { requireSession, requireAdmin } from '../middleware/auth';

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

// Get all admin settings (admin only)
router.get('/admin', requireSession, requireAdmin, async (req: Request, res: Response) => {
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

// Update admin settings (admin only)
router.post('/admin', requireSession, requireAdmin, async (req: Request, res: Response) => {
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

export default router;
