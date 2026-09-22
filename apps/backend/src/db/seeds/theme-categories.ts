import { logger } from '../../utils/logger';
import { db } from '../index';
import { themeCategories, themes } from '../schema';
import { eq } from 'drizzle-orm';

export const BUNDLED_THEME_CATEGORY_SEEDS = [
	{ name: 'Default', displayOrder: 1 },
	{ name: 'Retro', displayOrder: 2 },
	{ name: 'Editor (Dark)', displayOrder: 3 },
	{ name: 'Editor (Light)', displayOrder: 4 },
	{ name: 'Special', displayOrder: 5 },
	{ name: 'Custom', displayOrder: 6 }
] as const;

/** Bundled light editor themes (for legacy Editor → split migration). */
export const EDITOR_LIGHT_THEME_NAMES = new Set([
	'Catppuccin Latte',
	'GitHub Light',
	'One Light',
	'Gruvbox Light',
	'Rose Pine Dawn'
]);

/** Theme name → category name for bundled themes. */
export const BUNDLED_THEME_CATEGORY_BY_NAME: Record<string, string> = {
	Default: 'Default',
	'Cyberpunk Neon': 'Special',
	'Windows XP': 'Retro',
	'Windows 95': 'Retro',
	'Matrix Terminal': 'Retro',
	GeoCities: 'Retro',
	Dracula: 'Editor (Dark)',
	'Catppuccin Mocha': 'Editor (Dark)',
	'Tokyo Night': 'Editor (Dark)',
	Gruvbox: 'Editor (Dark)',
	'One Dark': 'Editor (Dark)',
	Nord: 'Editor (Dark)',
	'Rosé Pine': 'Editor (Dark)',
	'Catppuccin Latte': 'Editor (Light)',
	'GitHub Light': 'Editor (Light)',
	'One Light': 'Editor (Light)',
	'Gruvbox Light': 'Editor (Light)',
	'Rose Pine Dawn': 'Editor (Light)',
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

	await migrateLegacyEditorCategory();

	return [...byName.values()].sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Move themes off deprecated "Editor" category; remove category when empty. */
export async function migrateLegacyEditorCategory() {
	const categories = await db.select().from(themeCategories);
	const legacyEditor = categories.find((c) => c.name === 'Editor');
	if (!legacyEditor) return;

	const darkId = categories.find((c) => c.name === 'Editor (Dark)')?.id;
	const lightId = categories.find((c) => c.name === 'Editor (Light)')?.id;
	if (!darkId && !lightId) return;

	const onLegacy = await db
		.select({ id: themes.id, name: themes.name })
		.from(themes)
		.where(eq(themes.categoryId, legacyEditor.id));

	for (const theme of onLegacy) {
		const targetId = EDITOR_LIGHT_THEME_NAMES.has(theme.name) ? lightId : darkId;
		if (!targetId) continue;

		await db
			.update(themes)
			.set({ categoryId: targetId, updatedAt: new Date() })
			.where(eq(themes.id, theme.id));
		logger.info(
			`Migrated theme "${theme.name}" from Editor → ${EDITOR_LIGHT_THEME_NAMES.has(theme.name) ? 'Editor (Light)' : 'Editor (Dark)'}`
		);
	}

	const [stillUsed] = await db
		.select({ id: themes.id })
		.from(themes)
		.where(eq(themes.categoryId, legacyEditor.id))
		.limit(1);

	if (!stillUsed) {
		await db.delete(themeCategories).where(eq(themeCategories.id, legacyEditor.id));
		logger.info('Removed legacy Editor category');
	}
}

export async function applyBundledThemeCategoryAssignments() {
	await ensureThemeCategories();

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
