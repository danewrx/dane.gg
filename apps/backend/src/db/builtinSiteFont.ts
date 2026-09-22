/** Display name in admin / theme editor (matches `fonts.name` and theme `fontFamily`). */
export const BUILTIN_SITE_FONT_NAME = 'W95FA';

/**
 * On-disk name under `static/uploads/fonts/`, same pattern as dashboard uploads
 * (`{sanitizedBase}-{timestamp}-{random}.woff2`).
 */
export const BUILTIN_SITE_FONT_DISK_FILENAME = 'W95FA-8888888888888-888888888.woff2';

/** Public URL (served by `GET /uploads/fonts/...` like uploaded custom fonts). */
export const BUILTIN_SITE_FONT_FILE_PATH = `/uploads/fonts/${BUILTIN_SITE_FONT_DISK_FILENAME}`;

const LEGACY_BUILTIN_FONT_PATHS = [
	'/api/fonts/bundle/w95a/w95fa.woff2',
	'/fonts/w95a/w95fa.woff2'
] as const;

export function isBundledBuiltinSiteFont(font: {
	type: string;
	name: string;
	filePath: string | null;
}): boolean {
	if (font.type !== 'custom' || font.name !== BUILTIN_SITE_FONT_NAME) return false;
	if (font.filePath === BUILTIN_SITE_FONT_FILE_PATH) return true;
	return LEGACY_BUILTIN_FONT_PATHS.includes(font.filePath as (typeof LEGACY_BUILTIN_FONT_PATHS)[number]);
}
