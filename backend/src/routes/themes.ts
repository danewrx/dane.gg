import { Router } from 'express';
import { db } from '../db';
import { themes } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET active theme (public)
router.get('/active', async (req, res) => {
  try {
    const [activeTheme] = await db.select()
      .from(themes)
      .where(eq(themes.isActive, true))
      .limit(1);

    if (!activeTheme) {
      return res.json({
        success: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: activeTheme
    });
  } catch (error) {
    console.error('Error fetching active theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active theme'
    });
  }
});

// GET all themes (public)
router.get('/', async (req, res) => {
  try {
    const allThemes = await db.select()
      .from(themes)
      .orderBy(asc(themes.displayOrder));

    res.json({
      success: true,
      data: allThemes
    });
  } catch (error) {
    console.error('Error fetching themes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch themes'
    });
  }
});

// GET all themes (admin)
router.get('/all', requireAuth, async (req, res) => {
  try {
    const allThemes = await db.select()
      .from(themes)
      .orderBy(asc(themes.displayOrder));

    res.json({
      success: true,
      data: allThemes
    });
  } catch (error) {
    console.error('Error fetching themes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch themes'
    });
  }
});

// GET single theme by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [theme] = await db.select()
      .from(themes)
      .where(eq(themes.id, id));

    if (!theme) {
      return res.status(404).json({
        success: false,
        error: 'Theme not found'
      });
    }

    res.json({
      success: true,
      data: theme
    });
  } catch (error) {
    console.error('Error fetching theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch theme'
    });
  }
});

// POST create new theme
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      isActive,
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      surfaceColor,
      borderColor,
      textPrimary,
      textSecondary,
      textMuted,
      backgroundImage,
      backgroundImageExternal,
      backgroundOverlay,
      backgroundBlur,
      backgroundPosition,
      backgroundSize,
      backgroundAttachment,
      fontFamily,
      headingFontFamily,
      fontScale,
      borderRadius,
      customCss
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Theme name is required'
      });
    }

    const allThemes = await db.select().from(themes);
    const maxOrder = allThemes.reduce((max, t) => Math.max(max, t.displayOrder), -1);

    if (isActive) {
      await db.update(themes)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(themes.isActive, true));
    }

    const [newTheme] = await db.insert(themes).values({
      name,
      description: description || null,
      isActive: isActive || false,
      isDefault: false,
      primaryColor: primaryColor || '#ffffff',
      secondaryColor: secondaryColor || '#a1a1aa',
      accentColor: accentColor || '#6366f1',
      backgroundColor: backgroundColor || '#0a0a0a',
      surfaceColor: surfaceColor || '#1a1a1a',
      borderColor: borderColor || '#2a2a2a',
      textPrimary: textPrimary || '#ffffff',
      textSecondary: textSecondary || '#a1a1aa',
      textMuted: textMuted || '#71717a',
      backgroundImage: backgroundImage || null,
      backgroundImageExternal: backgroundImageExternal || false,
      backgroundOverlay: backgroundOverlay || 'rgba(0, 0, 0, 0.7)',
      backgroundBlur: backgroundBlur ?? 0,
      backgroundPosition: backgroundPosition || 'center center',
      backgroundSize: backgroundSize || 'cover',
      backgroundAttachment: backgroundAttachment || 'fixed',
      fontFamily: fontFamily || 'Inter',
      headingFontFamily: headingFontFamily || 'Inter',
      fontScale: fontScale || '1',
      borderRadius: borderRadius || '8px',
      customCss: customCss || null,
      displayOrder: maxOrder + 1
    }).returning();

    res.status(201).json({
      success: true,
      data: newTheme
    });
  } catch (error) {
    console.error('Error creating theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create theme'
    });
  }
});

// PUT update themes order
router.put('/order', requireAuth, async (req, res) => {
  try {
    const { themes: themesToUpdate } = req.body;

    if (!Array.isArray(themesToUpdate)) {
      return res.status(400).json({
        success: false,
        error: 'Themes array is required'
      });
    }

    for (const theme of themesToUpdate) {
      await db.update(themes)
        .set({
          displayOrder: theme.displayOrder,
          updatedAt: new Date()
        })
        .where(eq(themes.id, theme.id));
    }

    res.json({
      success: true,
      message: 'Themes order updated successfully'
    });
  } catch (error) {
    console.error('Error updating themes order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update themes order'
    });
  }
});

// PUT activate a theme
router.put('/:id/activate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify theme exists
    const [existingTheme] = await db.select()
      .from(themes)
      .where(eq(themes.id, id));

    if (!existingTheme) {
      return res.status(404).json({
        success: false,
        error: 'Theme not found'
      });
    }

    await db.update(themes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(themes.isActive, true));

    const [activatedTheme] = await db.update(themes)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(themes.id, id))
      .returning();

    res.json({
      success: true,
      data: activatedTheme,
      message: 'Theme activated successfully'
    });
  } catch (error) {
    console.error('Error activating theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate theme'
    });
  }
});

// PUT deactivate all themes (use default)
router.put('/deactivate', requireAuth, async (req, res) => {
  try {
    await db.update(themes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(themes.isActive, true));

    res.json({
      success: true,
      message: 'All themes deactivated'
    });
  } catch (error) {
    console.error('Error deactivating themes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate themes'
    });
  }
});

// PUT update theme
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      isActive,
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      surfaceColor,
      borderColor,
      textPrimary,
      textSecondary,
      textMuted,
      backgroundImage,
      backgroundImageExternal,
      backgroundOverlay,
      backgroundBlur,
      backgroundPosition,
      backgroundSize,
      backgroundAttachment,
      fontFamily,
      headingFontFamily,
      fontScale,
      borderRadius,
      customCss,
      displayOrder
    } = req.body;

    const updateData: Record<string, any> = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (accentColor !== undefined) updateData.accentColor = accentColor;
    if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor;
    if (surfaceColor !== undefined) updateData.surfaceColor = surfaceColor;
    if (borderColor !== undefined) updateData.borderColor = borderColor;
    if (textPrimary !== undefined) updateData.textPrimary = textPrimary;
    if (textSecondary !== undefined) updateData.textSecondary = textSecondary;
    if (textMuted !== undefined) updateData.textMuted = textMuted;
    if (backgroundImage !== undefined) updateData.backgroundImage = backgroundImage;
    if (backgroundImageExternal !== undefined) updateData.backgroundImageExternal = backgroundImageExternal;
    if (backgroundOverlay !== undefined) updateData.backgroundOverlay = backgroundOverlay;
    if (backgroundBlur !== undefined) updateData.backgroundBlur = backgroundBlur;
    if (backgroundPosition !== undefined) updateData.backgroundPosition = backgroundPosition;
    if (backgroundSize !== undefined) updateData.backgroundSize = backgroundSize;
    if (backgroundAttachment !== undefined) updateData.backgroundAttachment = backgroundAttachment;
    if (fontFamily !== undefined) updateData.fontFamily = fontFamily;
    if (headingFontFamily !== undefined) updateData.headingFontFamily = headingFontFamily;
    if (fontScale !== undefined) updateData.fontScale = fontScale;
    if (borderRadius !== undefined) updateData.borderRadius = borderRadius;
    if (customCss !== undefined) updateData.customCss = customCss;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

    // Handle isActive separately to ensure only one theme is active
    if (isActive === true) {
      // Deactivate all other themes first
      await db.update(themes)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(themes.isActive, true));
      updateData.isActive = true;
    } else if (isActive === false) {
      updateData.isActive = false;
    }

    const [updatedTheme] = await db.update(themes)
      .set(updateData)
      .where(eq(themes.id, id))
      .returning();

    if (!updatedTheme) {
      return res.status(404).json({
        success: false,
        error: 'Theme not found'
      });
    }

    res.json({
      success: true,
      data: updatedTheme
    });
  } catch (error) {
    console.error('Error updating theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update theme'
    });
  }
});

// POST duplicate a theme
router.post('/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name: newName } = req.body;

    const [originalTheme] = await db.select()
      .from(themes)
      .where(eq(themes.id, id));

    if (!originalTheme) {
      return res.status(404).json({
        success: false,
        error: 'Theme not found'
      });
    }

    const allThemes = await db.select().from(themes);
    const maxOrder = allThemes.reduce((max, t) => Math.max(max, t.displayOrder), -1);

    const [duplicatedTheme] = await db.insert(themes).values({
      name: newName || `${originalTheme.name} (Copy)`,
      description: originalTheme.description,
      isActive: false,
      isDefault: false,
      primaryColor: originalTheme.primaryColor,
      secondaryColor: originalTheme.secondaryColor,
      accentColor: originalTheme.accentColor,
      backgroundColor: originalTheme.backgroundColor,
      surfaceColor: originalTheme.surfaceColor,
      borderColor: originalTheme.borderColor,
      textPrimary: originalTheme.textPrimary,
      textSecondary: originalTheme.textSecondary,
      textMuted: originalTheme.textMuted,
      backgroundImage: originalTheme.backgroundImage,
      backgroundImageExternal: originalTheme.backgroundImageExternal,
      backgroundOverlay: originalTheme.backgroundOverlay,
      backgroundBlur: originalTheme.backgroundBlur,
      backgroundPosition: originalTheme.backgroundPosition,
      backgroundSize: originalTheme.backgroundSize,
      backgroundAttachment: originalTheme.backgroundAttachment,
      fontFamily: originalTheme.fontFamily,
      headingFontFamily: originalTheme.headingFontFamily,
      fontScale: originalTheme.fontScale,
      borderRadius: originalTheme.borderRadius,
      customCss: originalTheme.customCss,
      displayOrder: maxOrder + 1
    }).returning();

    res.status(201).json({
      success: true,
      data: duplicatedTheme
    });
  } catch (error) {
    console.error('Error duplicating theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to duplicate theme'
    });
  }
});

// DELETE theme
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if theme exists and is not a default theme
    const [existingTheme] = await db.select()
      .from(themes)
      .where(eq(themes.id, id));

    if (!existingTheme) {
      return res.status(404).json({
        success: false,
        error: 'Theme not found'
      });
    }

    if (existingTheme.isDefault) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete default themes'
      });
    }

    const [deletedTheme] = await db.delete(themes)
      .where(eq(themes.id, id))
      .returning();

    res.json({
      success: true,
      message: 'Theme deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete theme'
    });
  }
});

export default router;
