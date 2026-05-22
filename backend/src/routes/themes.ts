import { logger } from '../utils/logger';
import { Router } from 'express';
import { db } from '../db';
import { themes, themeCategories, fonts } from '../db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { ConfigService } from '../services/config';

const router = Router();

const SITE_THEME_ENFORCEMENT_KEY = 'site_theme_enforcement';

function overlayDarkenToLegacyRgba(opacity: unknown): string {
	const n = Math.min(1, Math.max(0, parseFloat(String(opacity ?? '0')) || 0));
	return `rgba(0, 0, 0, ${n})`;
}

export type SiteThemeEnforcement = {
	enforced: boolean;
	themeId: string | null;
};

export async function getThemeEnforcement(): Promise<SiteThemeEnforcement> {
	const raw = await ConfigService.get(SITE_THEME_ENFORCEMENT_KEY);
	if (raw && typeof raw === 'object') {
		const o = raw as Record<string, unknown>;
		return {
			enforced: !!o.enforced,
			themeId: typeof o.themeId === 'string' ? o.themeId : null
		};
	}
	return { enforced: false, themeId: null };
}

async function getDefaultPublicThemeRow(): Promise<typeof themes.$inferSelect | null> {
	const [defaultTheme] = await db
		.select()
		.from(themes)
		.where(and(eq(themes.isDefault, true), eq(themes.isVisible, true)))
		.limit(1);

	if (defaultTheme) return defaultTheme;

	const [firstVisibleTheme] = await db
		.select()
		.from(themes)
		.where(eq(themes.isVisible, true))
		.orderBy(asc(themes.displayOrder))
		.limit(1);

	return firstVisibleTheme ?? null;
}

type ThemeCategoryPayload = {
	id: string;
	name: string;
	displayOrder: number;
} | null;

function mapCategoryFromJoin(
	category: { id: string; name: string; displayOrder: number } | null
): ThemeCategoryPayload {
	if (!category?.id) return null;
	return {
		id: category.id,
		name: category.name,
		displayOrder: category.displayOrder
	};
}

async function selectThemesWithCategories(whereClause?: ReturnType<typeof eq>) {
	const baseQuery = db
		.select({
			theme: themes,
			category: {
				id: themeCategories.id,
				name: themeCategories.name,
				displayOrder: themeCategories.displayOrder
			}
		})
		.from(themes)
		.leftJoin(themeCategories, eq(themes.categoryId, themeCategories.id))
		.orderBy(asc(themeCategories.displayOrder), asc(themes.displayOrder));

	const rows = whereClause ? await baseQuery.where(whereClause) : await baseQuery;

	return rows.map(({ theme, category }) => ({
		...theme,
		category: mapCategoryFromJoin(category)
	}));
}

async function getCustomCategoryId(): Promise<string | null> {
	const [row] = await db
		.select({ id: themeCategories.id })
		.from(themeCategories)
		.where(eq(themeCategories.name, 'Custom'))
		.limit(1);
	return row?.id ?? null;
}

async function resolveCategoryIdForCreate(
	categoryId: unknown
): Promise<string | null | undefined> {
	if (categoryId === null) return null;
	if (typeof categoryId === 'string' && categoryId) {
		const [cat] = await db
			.select({ id: themeCategories.id })
			.from(themeCategories)
			.where(eq(themeCategories.id, categoryId))
			.limit(1);
		if (!cat) return undefined;
		return categoryId;
	}
	return getCustomCategoryId();
}

async function enrichThemesWithFontUrls(themesData: any[]): Promise<any[]> {
	if (themesData.length === 0) return themesData;
	const customFonts = await db.select().from(fonts).where(eq(fonts.type, 'custom'));
	const byName = new Map(customFonts.map((f) => [f.name, f]));
	return themesData.map((t) => {
		const bodyFont = t.fontFamily ? byName.get(t.fontFamily) : null;
		const headingFont = t.headingFontFamily ? byName.get(t.headingFontFamily) : null;
		return {
			...t,
			bodyFontUrl: bodyFont?.filePath ?? null,
			headingFontUrl: headingFont?.filePath ?? null
		};
	});
}

function enrichThemeWithFontUrls(theme: any): Promise<any> {
	return enrichThemesWithFontUrls([theme]).then((arr) => arr[0]);
}

// GET default theme for public site
router.get('/active', async (req, res) => {
	try {
		const enforcement = await getThemeEnforcement();
		let row: typeof themes.$inferSelect | null = null;

		if (enforcement.enforced && enforcement.themeId) {
			const [forced] = await db
				.select()
				.from(themes)
				.where(eq(themes.id, enforcement.themeId))
				.limit(1);
			row = forced ?? null;
		}

		if (!row) {
			row = await getDefaultPublicThemeRow();
		}

		const enriched = row ? await enrichThemeWithFontUrls(row) : null;
		res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
		res.json({
			success: true,
			data: enriched,
			enforcement
		});
	} catch (error) {
		logger.error('Error fetching active theme:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch active theme'
		});
	}
});

// GET all themes (public - only visible themes)
router.get('/', async (req, res) => {
	try {
		const enforcement = await getThemeEnforcement();
		const visibleThemes = await selectThemesWithCategories(eq(themes.isVisible, true));

		const enriched = await enrichThemesWithFontUrls(visibleThemes);
		res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
		res.json({
			success: true,
			data: enriched,
			enforcement
		});
	} catch (error) {
		logger.error('Error fetching themes:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch themes'
		});
	}
});

// GET all themes (admin)
router.get('/all', requireAuth, async (req, res) => {
	try {
		const enforcement = await getThemeEnforcement();
		const allThemes = await selectThemesWithCategories();

		const enriched = await enrichThemesWithFontUrls(allThemes);
		res.json({
			success: true,
			data: enriched,
			enforcement
		});
	} catch (error) {
		logger.error('Error fetching themes:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch themes'
		});
	}
});

// PUT site-wide theme enforcement (admin)
router.put('/enforcement', requireAuth, async (req, res) => {
	try {
		const { enforced, themeId } = req.body as { enforced?: boolean; themeId?: string | null };

		if (typeof enforced !== 'boolean') {
			return res.status(400).json({
				success: false,
				error: 'enforced (boolean) is required'
			});
		}

		if (enforced) {
			if (!themeId || typeof themeId !== 'string') {
				return res.status(400).json({
					success: false,
					error: 'themeId is required when enforcement is enabled'
				});
			}

			const [existing] = await db.select().from(themes).where(eq(themes.id, themeId)).limit(1);

			if (!existing) {
				return res.status(404).json({
					success: false,
					error: 'Theme not found'
				});
			}
		}

		const payload: SiteThemeEnforcement = {
			enforced,
			themeId: enforced && themeId ? themeId : null
		};

		await ConfigService.set(SITE_THEME_ENFORCEMENT_KEY, payload, 'json');

		res.json({
			success: true,
			data: payload
		});
	} catch (error) {
		logger.error('Error updating theme enforcement:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update theme enforcement'
		});
	}
});

// GET all theme categories (admin)
router.get('/categories/all', requireAuth, async (req, res) => {
	try {
		const categories = await db
			.select()
			.from(themeCategories)
			.orderBy(asc(themeCategories.displayOrder), asc(themeCategories.name));

		res.json({
			success: true,
			data: categories
		});
	} catch (error) {
		logger.error('Error fetching theme categories:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch theme categories'
		});
	}
});

// POST create theme category (admin)
router.post('/categories', requireAuth, async (req, res) => {
	try {
		const { name } = req.body;

		if (!name || !String(name).trim()) {
			return res.status(400).json({
				success: false,
				error: 'Category name is required'
			});
		}

		const trimmed = String(name).trim();
		const allCategories = await db.select().from(themeCategories);
		const maxOrder = allCategories.reduce((max, cat) => Math.max(max, cat.displayOrder), -1);

		const [newCategory] = await db
			.insert(themeCategories)
			.values({
				name: trimmed,
				displayOrder: maxOrder + 1
			})
			.returning();

		res.status(201).json({
			success: true,
			data: newCategory
		});
	} catch (error: any) {
		logger.error('Error creating theme category:', error);
		if (error.code === '23505') {
			return res.status(400).json({
				success: false,
				error: 'A category with this name already exists'
			});
		}
		res.status(500).json({
			success: false,
			error: 'Failed to create theme category'
		});
	}
});

// PUT update theme category order (admin)
router.put('/categories/order', requireAuth, async (req, res) => {
	try {
		const { categoryOrders } = req.body;

		if (!Array.isArray(categoryOrders)) {
			return res.status(400).json({
				success: false,
				error: 'categoryOrders must be an array'
			});
		}

		await Promise.all(
			categoryOrders.map(({ id, displayOrder }: { id: string; displayOrder: number }) =>
				db
					.update(themeCategories)
					.set({ displayOrder: Number.parseInt(String(displayOrder), 10) })
					.where(eq(themeCategories.id, id))
			)
		);

		res.json({
			success: true,
			message: 'Category order updated successfully'
		});
	} catch (error) {
		logger.error('Error updating theme category order:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update category order'
		});
	}
});

// PUT update theme category (admin)
router.put('/categories/:id', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;
		const { name } = req.body;

		if (!name || !String(name).trim()) {
			return res.status(400).json({
				success: false,
				error: 'Category name is required'
			});
		}

		const [updatedCategory] = await db
			.update(themeCategories)
			.set({ name: String(name).trim() })
			.where(eq(themeCategories.id, id))
			.returning();

		if (!updatedCategory) {
			return res.status(404).json({
				success: false,
				error: 'Category not found'
			});
		}

		res.json({
			success: true,
			data: updatedCategory
		});
	} catch (error: any) {
		logger.error('Error updating theme category:', error);
		if (error.code === '23505') {
			return res.status(400).json({
				success: false,
				error: 'A category with this name already exists'
			});
		}
		res.status(500).json({
			success: false,
			error: 'Failed to update theme category'
		});
	}
});

// DELETE theme category (admin)
router.delete('/categories/:id', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;

		const [deletedCategory] = await db
			.delete(themeCategories)
			.where(eq(themeCategories.id, id))
			.returning();

		if (!deletedCategory) {
			return res.status(404).json({
				success: false,
				error: 'Category not found'
			});
		}

		res.json({
			success: true,
			data: deletedCategory,
			message: 'Category deleted successfully'
		});
	} catch (error) {
		logger.error('Error deleting theme category:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to delete theme category'
		});
	}
});

// GET single theme by ID
router.get('/:id', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;

		const [theme] = await db.select().from(themes).where(eq(themes.id, id));

		if (!theme) {
			return res.status(404).json({
				success: false,
				error: 'Theme not found'
			});
		}

		const enriched = await enrichThemeWithFontUrls(theme);
		res.json({
			success: true,
			data: enriched
		});
	} catch (error) {
		logger.error('Error fetching theme:', error);
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
			categoryId,
			isVisible,
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
			backgroundBlur,
			backgroundPosition,
			backgroundSize,
			backgroundAttachment,
			fontFamily,
			headingFontFamily,
			fontScale,
			borderRadius,
			widgetBorderRadius,
			customCss,
			scanlinesOpacity,
			overlayVignetteOpacity,
			overlayGridOpacity,
			overlayGrainOpacity,
			overlayGlareOpacity,
			overlayDarkenOpacity
		} = req.body;

		if (!name) {
			return res.status(400).json({
				success: false,
				error: 'Theme name is required'
			});
		}

		const resolvedCategoryId = await resolveCategoryIdForCreate(categoryId);
		if (resolvedCategoryId === undefined) {
			return res.status(400).json({
				success: false,
				error: 'Category not found'
			});
		}

		const allThemes = await db.select().from(themes);
		const maxOrder = allThemes.reduce((max, t) => Math.max(max, t.displayOrder), -1);

		const [newTheme] = await db
			.insert(themes)
			.values({
				name,
				description: description || null,
				categoryId: resolvedCategoryId,
				isDefault: false,
				isVisible: isVisible !== false,
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
				backgroundOverlay: overlayDarkenToLegacyRgba(overlayDarkenOpacity ?? '0.7'),
				backgroundBlur: backgroundBlur ?? 0,
				backgroundPosition: backgroundPosition || 'center center',
				backgroundSize: backgroundSize || 'cover',
				backgroundAttachment: backgroundAttachment || 'fixed',
				fontFamily: fontFamily || 'Inter',
				headingFontFamily: headingFontFamily || 'Inter',
				fontScale: fontScale || '1',
				borderRadius: borderRadius || '8px',
				widgetBorderRadius: widgetBorderRadius || borderRadius || '8px',
				customCss: customCss || null,
				scanlinesOpacity: scanlinesOpacity ?? '1',
				overlayVignetteOpacity: overlayVignetteOpacity ?? '0',
				overlayGridOpacity: overlayGridOpacity ?? '0',
				overlayGrainOpacity: overlayGrainOpacity ?? '0',
				overlayGlareOpacity: overlayGlareOpacity ?? '0',
				overlayDarkenOpacity: overlayDarkenOpacity ?? '0.7',
				displayOrder: maxOrder + 1
			})
			.returning();

		res.status(201).json({
			success: true,
			data: newTheme
		});
	} catch (error) {
		logger.error('Error creating theme:', error);
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
			await db
				.update(themes)
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
		logger.error('Error updating themes order:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update themes order'
		});
	}
});

// PUT set theme as default
router.put('/:id/set-default', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;

		const [existingTheme] = await db.select().from(themes).where(eq(themes.id, id));

		if (!existingTheme) {
			return res.status(404).json({
				success: false,
				error: 'Theme not found'
			});
		}

		await db
			.update(themes)
			.set({ isDefault: false, updatedAt: new Date() })
			.where(eq(themes.isDefault, true));

		const [defaultTheme] = await db
			.update(themes)
			.set({ isDefault: true, updatedAt: new Date() })
			.where(eq(themes.id, id))
			.returning();

		res.json({
			success: true,
			data: defaultTheme,
			message: 'Default theme updated successfully'
		});
	} catch (error) {
		logger.error('Error setting default theme:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to set default theme'
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
			categoryId,
			isVisible,
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
			backgroundBlur,
			backgroundPosition,
			backgroundSize,
			backgroundAttachment,
			fontFamily,
			headingFontFamily,
			fontScale,
			borderRadius,
			widgetBorderRadius,
			customCss,
			displayOrder,
			scanlinesOpacity,
			overlayVignetteOpacity,
			overlayGridOpacity,
			overlayGrainOpacity,
			overlayGlareOpacity,
			overlayDarkenOpacity
		} = req.body;

		const updateData: Record<string, any> = {
			updatedAt: new Date()
		};

		if (name !== undefined) updateData.name = name;
		if (description !== undefined) updateData.description = description;
		if (categoryId !== undefined) {
			if (categoryId === null) {
				updateData.categoryId = null;
			} else {
				const resolvedCategoryId = await resolveCategoryIdForCreate(categoryId);
				if (resolvedCategoryId === undefined) {
					return res.status(400).json({
						success: false,
						error: 'Category not found'
					});
				}
				updateData.categoryId = resolvedCategoryId;
			}
		}
		if (isVisible !== undefined) updateData.isVisible = isVisible;
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
		if (backgroundImageExternal !== undefined)
			updateData.backgroundImageExternal = backgroundImageExternal;
		if (backgroundBlur !== undefined) updateData.backgroundBlur = backgroundBlur;
		if (backgroundPosition !== undefined) updateData.backgroundPosition = backgroundPosition;
		if (backgroundSize !== undefined) updateData.backgroundSize = backgroundSize;
		if (backgroundAttachment !== undefined) updateData.backgroundAttachment = backgroundAttachment;
		if (fontFamily !== undefined) updateData.fontFamily = fontFamily;
		if (headingFontFamily !== undefined) updateData.headingFontFamily = headingFontFamily;
		if (fontScale !== undefined) updateData.fontScale = fontScale;
		if (borderRadius !== undefined) updateData.borderRadius = borderRadius;
		if (widgetBorderRadius !== undefined) updateData.widgetBorderRadius = widgetBorderRadius;
		if (customCss !== undefined) updateData.customCss = customCss;
		if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
		if (scanlinesOpacity !== undefined) updateData.scanlinesOpacity = scanlinesOpacity;
		if (overlayVignetteOpacity !== undefined)
			updateData.overlayVignetteOpacity = overlayVignetteOpacity;
		if (overlayGridOpacity !== undefined) updateData.overlayGridOpacity = overlayGridOpacity;
		if (overlayGrainOpacity !== undefined) updateData.overlayGrainOpacity = overlayGrainOpacity;
		if (overlayGlareOpacity !== undefined) updateData.overlayGlareOpacity = overlayGlareOpacity;
		if (overlayDarkenOpacity !== undefined) {
			updateData.overlayDarkenOpacity = overlayDarkenOpacity;
			updateData.backgroundOverlay = overlayDarkenToLegacyRgba(overlayDarkenOpacity);
		}

		const [updatedTheme] = await db
			.update(themes)
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
		logger.error('Error updating theme:', error);
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

		const [originalTheme] = await db.select().from(themes).where(eq(themes.id, id));

		if (!originalTheme) {
			return res.status(404).json({
				success: false,
				error: 'Theme not found'
			});
		}

		const allThemes = await db.select().from(themes);
		const maxOrder = allThemes.reduce((max, t) => Math.max(max, t.displayOrder), -1);

		const [duplicatedTheme] = await db
			.insert(themes)
			.values({
				name: newName || `${originalTheme.name} (Copy)`,
				description: originalTheme.description,
				isDefault: false,
				isVisible: true,
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
				widgetBorderRadius: originalTheme.widgetBorderRadius ?? originalTheme.borderRadius,
				customCss: originalTheme.customCss,
				scanlinesOpacity: originalTheme.scanlinesOpacity,
				overlayVignetteOpacity: originalTheme.overlayVignetteOpacity,
				overlayGridOpacity: originalTheme.overlayGridOpacity,
				overlayGrainOpacity: originalTheme.overlayGrainOpacity,
				overlayGlareOpacity: originalTheme.overlayGlareOpacity,
				overlayDarkenOpacity: originalTheme.overlayDarkenOpacity ?? '0',
				categoryId: originalTheme.categoryId,
				displayOrder: maxOrder + 1
			})
			.returning();

		res.status(201).json({
			success: true,
			data: duplicatedTheme
		});
	} catch (error) {
		logger.error('Error duplicating theme:', error);
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
		const [existingTheme] = await db.select().from(themes).where(eq(themes.id, id));

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

		const enc = await getThemeEnforcement();
		if (enc.enforced && enc.themeId === id) {
			return res.status(400).json({
				success: false,
				error:
					'Cannot delete the enforced site theme. Disable theme enforcement in Site Themes first.'
			});
		}

		await db.delete(themes).where(eq(themes.id, id)).returning();

		res.json({
			success: true,
			message: 'Theme deleted successfully'
		});
	} catch (error) {
		logger.error('Error deleting theme:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to delete theme'
		});
	}
});

export default router;
