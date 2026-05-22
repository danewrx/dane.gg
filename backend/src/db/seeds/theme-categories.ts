import { logger } from '../../utils/logger';
import { db } from '../index';
import { themeCategories, themes } from '../schema';
import { eq } from 'drizzle-orm';

export const BUNDLED_THEME_CATEGORY_SEEDS = [
	{ name: 'Default', displayOrder: 1 },
	{ name: 'Retro', displayOrder: 2 },
	{ name: 'Editor', displayOrder: 3 },
	{ name: 'Special', displayOrder: 4 },
	{ name: 'Custom', displayOrder: 5 }
] as const;

/** Theme name → category name for bundled themes. */
export const BUNDLED_THEME_CATEGORY_BY_NAME: Record<string, string> = {
	Default: 'Default',
	'Cyberpunk Neon': 'Special',
	'Windows XP': 'Retro',
	'Windows 95': 'Retro',
	GeoCities: 'Retro',
	Dracula: 'Editor',
	'Catppuccin Mocha': 'Editor',
	'Tokyo Night': 'Editor',
	Gruvbox: 'Editor',
	'Lets All Love Lain': 'Special'
};

export async function seedThemeCategories() {
	logger.info('Seeding theme categories...');
	return db.insert(themeCategories).values([...BUNDLED_THEME_CATEGORY_SEEDS]).returning();
}

/** Upsert bundled categories by name (safe on existing DBs). */
export async function ensureThemeCategories() {
	const existing = await db.select().from(themeCategories);
	const byName = new Map(existing.map((c) => [c.name, c]));

	for (const seed of BUNDLED_THEME_CATEGORY_SEEDS) {
		if (!byName.has(seed.name)) {
			const [inserted] = await db.insert(themeCategories).values(seed).returning();
			if (inserted) {
				byName.set(seed.name, inserted);
				logger.info(`Inserted theme category: ${seed.name}`);
			}
		}
	}

	return [...byName.values()].sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function applyBundledThemeCategoryAssignments() {
	const categories = await db.select().from(themeCategories);
	const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));

	for (const [themeName, categoryName] of Object.entries(BUNDLED_THEME_CATEGORY_BY_NAME)) {
		const categoryId = categoryIdByName.get(categoryName);
		if (!categoryId) {
			logger.warn(`Theme category "${categoryName}" not found — skipped assignment for "${themeName}"`);
			continue;
		}

		const rows = await db
			.update(themes)
			.set({ categoryId, updatedAt: new Date() })
			.where(eq(themes.name, themeName))
			.returning({ id: themes.id });

		if (rows.length > 0) {
			logger.info(`Assigned theme "${themeName}" → category "${categoryName}"`);
		}
	}
}
