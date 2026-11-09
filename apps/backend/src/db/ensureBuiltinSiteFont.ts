import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { BUNDLED_SITE_FONTS, bundledFontFilePath } from './builtinSiteFont';
import { db } from './index';
import { fonts } from './schema';

const staticDir = (...parts: string[]) => path.join(process.cwd(), 'static', ...parts);

/** Copy each bundled font into uploads/fonts (same layout as dashboard uploads). */
export function ensureBuiltinSiteFontFileOnDisk(): void {
	for (const { name, diskFilename } of BUNDLED_SITE_FONTS) {
		try {
			const target = staticDir('uploads', 'fonts', diskFilename);
			if (fs.existsSync(target)) continue;
			const source = staticDir('fonts', 'builtin', diskFilename);
			if (!fs.existsSync(source)) {
				logger.warn(`Built-in ${name} font source missing at ${source} (skipping copy).`);
				continue;
			}
			fs.mkdirSync(path.dirname(target), { recursive: true });
			fs.copyFileSync(source, target);
			logger.info(`Installed built-in ${name} into uploads/fonts.`);
		} catch (error) {
			logger.error(`Failed to copy built-in ${name} font into uploads/fonts:`, error);
		}
	}
}

/**
 * Ensures a custom font row exists for every bundled font. Idempotent. A row with the same name
 * (e.g. an older Google Fonts entry) is converted to the bundled file instead of duplicated.
 */
export async function ensureBuiltinSiteFont(): Promise<void> {
	try {
		ensureBuiltinSiteFontFileOnDisk();

		for (const { name, diskFilename } of BUNDLED_SITE_FONTS) {
			const filePath = bundledFontFilePath(diskFilename);
			const [existing] = await db.select().from(fonts).where(eq(fonts.name, name)).limit(1);

			if (existing) {
				if (existing.type !== 'custom' || existing.filePath !== filePath) {
					await db
						.update(fonts)
						.set({ type: 'custom', googleFontFamily: null, filePath, updatedAt: new Date() })
						.where(eq(fonts.id, existing.id));
					logger.info(`Normalized built-in font row "${name}".`);
				}
				continue;
			}

			const orderRows = await db.select({ displayOrder: fonts.displayOrder }).from(fonts);
			const maxOrder = orderRows.reduce((m, r) => Math.max(m, r.displayOrder), -1);
			await db.insert(fonts).values({
				name,
				type: 'custom',
				googleFontFamily: null,
				filePath,
				displayOrder: maxOrder + 1
			});
			logger.info(`Registered built-in custom font "${name}".`);
		}
	} catch (error) {
		logger.error('Failed to ensure built-in site fonts:', error);
	}
}
