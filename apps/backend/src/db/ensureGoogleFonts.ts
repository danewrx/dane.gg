import { count } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { DEFAULT_GOOGLE_FONT_NAMES } from './defaultGoogleFontsList';
import { db } from './index';
import { fonts } from './schema';

export async function ensureGoogleFontsIfEmpty(): Promise<void> {
	try {
		const [{ value: n }] = await db.select({ value: count() }).from(fonts);
		if (Number(n) > 0) return;

		await db.insert(fonts).values(
			DEFAULT_GOOGLE_FONT_NAMES.map((name, i) => ({
				name,
				type: 'google' as const,
				googleFontFamily: name,
				filePath: null,
				displayOrder: i
			}))
		);
		logger.info('Seeded default Google fonts (fonts table was empty).');
	} catch (error) {
		logger.error('Failed to ensure default Google fonts:', error);
	}
}
