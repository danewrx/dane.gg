import { and, asc, count, eq, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { BUILTIN_SITE_FONT_NAME } from './builtinSiteFont';
import { BUILTIN_DEFAULT_THEME_INSERT } from './builtinDefaultTheme';
import { db } from './index';
import { fonts, themes } from './schema';

/** Stable key for pg_advisory_xact_lock (arbitrary int4). */
const DEFAULT_THEME_BOOTSTRAP_LOCK = 884_001_002;

/** One-time style of upgrade: legacy seeded Default theme still on Inter → bundled W95FA. */
async function syncLegacyDefaultThemeFontsIfNeeded(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
): Promise<void> {
	const [builtinFont] = await tx
		.select({ id: fonts.id })
		.from(fonts)
		.where(and(eq(fonts.type, 'custom'), eq(fonts.name, BUILTIN_SITE_FONT_NAME)))
		.limit(1);
	if (!builtinFont) return;

	const result = await tx
		.update(themes)
		.set({
			fontFamily: BUILTIN_SITE_FONT_NAME,
			headingFontFamily: BUILTIN_SITE_FONT_NAME,
			updatedAt: new Date()
		})
		.where(
			and(
				eq(themes.isDefault, true),
				eq(themes.name, 'Default'),
				eq(themes.fontFamily, 'Inter'),
				eq(themes.headingFontFamily, 'Inter')
			)
		)
		.returning({ id: themes.id });

	if (result.length > 0) {
		logger.info(
			'Updated legacy default theme typography from Inter to built-in W95FA (body + headings).'
		);
	}
}

/**
 * Guarantees at least one theme is marked default.
 * - If the table is empty, inserts the built-in Default theme (same as first seed row).
 * - If rows exist but none have is_default, clears flags and sets the first row by display_order.
 *
 * Uses an advisory transaction lock so concurrent startup cannot insert two defaults.
 */
export async function ensureDefaultTheme(): Promise<void> {
	try {
		await db.transaction(async (tx) => {
			await tx.execute(sql`SELECT pg_advisory_xact_lock(${DEFAULT_THEME_BOOTSTRAP_LOCK})`);

			await syncLegacyDefaultThemeFontsIfNeeded(tx);

			const [existingDefault] = await tx
				.select({ id: themes.id })
				.from(themes)
				.where(eq(themes.isDefault, true))
				.limit(1);

			if (existingDefault) return;

			const [{ value: themeCount }] = await tx.select({ value: count() }).from(themes);

			if (Number(themeCount) === 0) {
				await tx.insert(themes).values(BUILTIN_DEFAULT_THEME_INSERT);
				logger.info(
					'Ensured built-in default site theme exists (inserted; themes table was empty).'
				);
				return;
			}

			await tx.update(themes).set({ isDefault: false, updatedAt: new Date() });

			const [first] = await tx
				.select({ id: themes.id })
				.from(themes)
				.orderBy(asc(themes.displayOrder))
				.limit(1);

			if (first) {
				await tx
					.update(themes)
					.set({ isDefault: true, updatedAt: new Date() })
					.where(eq(themes.id, first.id));
				logger.info(
					'Ensured a default theme exists (assigned is_default to the first theme by display order).'
				);
			}
		});
	} catch (error) {
		logger.error('Failed to ensure default site theme:', error);
	}
}
