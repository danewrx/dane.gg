import fs from 'node:fs';
import path from 'node:path';
import { and, eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import {
	BUILTIN_SITE_FONT_DISK_FILENAME,
	BUILTIN_SITE_FONT_FILE_PATH,
	BUILTIN_SITE_FONT_NAME,
	isBundledBuiltinSiteFont
} from './builtinSiteFont';
import { db } from './index';
import { fonts } from './schema';

const BUILTIN_FONT_SHIPPED_PATH = path.join(
	process.cwd(),
	'static',
	'fonts',
	'builtin',
	BUILTIN_SITE_FONT_DISK_FILENAME
);
const BUILTIN_FONT_UPLOADS_PATH = path.join(
	process.cwd(),
	'static',
	'uploads',
	'fonts',
	BUILTIN_SITE_FONT_DISK_FILENAME
);

export function ensureBuiltinSiteFontFileOnDisk(): void {
	try {
		if (fs.existsSync(BUILTIN_FONT_UPLOADS_PATH)) return;
		if (!fs.existsSync(BUILTIN_FONT_SHIPPED_PATH)) {
			logger.warn(
				`Built-in W95FA font source missing at ${BUILTIN_FONT_SHIPPED_PATH} (skipping copy into uploads/fonts).`
			);
			return;
		}
		fs.mkdirSync(path.dirname(BUILTIN_FONT_UPLOADS_PATH), { recursive: true });
		fs.copyFileSync(BUILTIN_FONT_SHIPPED_PATH, BUILTIN_FONT_UPLOADS_PATH);
		logger.info('Installed built-in W95FA into uploads/fonts (same layout as dashboard uploads).');
	} catch (error) {
		logger.error('Failed to copy built-in W95FA font into uploads/fonts:', error);
	}
}

/**
 * Ensures the bundled W95FA custom font row exists in the database.
 * Idempotent; corrects `file_path` if the row exists but pointed elsewhere.
 */
export async function ensureBuiltinSiteFont(): Promise<void> {
	try {
		ensureBuiltinSiteFontFileOnDisk();
		const [existing] = await db
			.select()
			.from(fonts)
			.where(and(eq(fonts.type, 'custom'), eq(fonts.name, BUILTIN_SITE_FONT_NAME)))
			.limit(1);

		if (existing) {
			const needsPath =
				!isBundledBuiltinSiteFont(existing) || existing.filePath !== BUILTIN_SITE_FONT_FILE_PATH;
			if (needsPath) {
				await db
					.update(fonts)
					.set({
						type: 'custom',
						googleFontFamily: null,
						filePath: BUILTIN_SITE_FONT_FILE_PATH,
						updatedAt: new Date()
					})
					.where(eq(fonts.id, existing.id));
				logger.info(`Normalized built-in font row "${BUILTIN_SITE_FONT_NAME}" file path.`);
			}
			return;
		}

		const orderRows = await db.select({ displayOrder: fonts.displayOrder }).from(fonts);
		const maxOrder = orderRows.reduce((m, r) => Math.max(m, r.displayOrder), -1);

		await db.insert(fonts).values({
			name: BUILTIN_SITE_FONT_NAME,
			type: 'custom',
			googleFontFamily: null,
			filePath: BUILTIN_SITE_FONT_FILE_PATH,
			displayOrder: maxOrder + 1
		});
		logger.info(`Registered built-in custom font "${BUILTIN_SITE_FONT_NAME}".`);
	} catch (error) {
		logger.error('Failed to ensure built-in site font:', error);
	}
}
