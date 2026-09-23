import { logger } from '../../utils/logger';
import { ensureBuiltinSiteFont } from '../ensureBuiltinSiteFont';
import { ensureGoogleFontsIfEmpty } from '../ensureGoogleFonts';

export async function seedFonts() {
	logger.info('Seeding fonts...');
	await ensureGoogleFontsIfEmpty();
	await ensureBuiltinSiteFont();
}
