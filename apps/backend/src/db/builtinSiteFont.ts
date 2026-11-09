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

/**
 * Fonts shipped in `static/fonts/builtin/` and registered as custom fonts on boot, so they are
 * served from this site (no Google Fonts request). Disk names follow the upload pattern with
 * placeholder timestamp/random parts. `-VF-` in a name marks a variable font (see
 * `customFontFaceWeight` in the frontend theme store).
 */
export const BUNDLED_SITE_FONTS = [
	{ name: BUILTIN_SITE_FONT_NAME, diskFilename: BUILTIN_SITE_FONT_DISK_FILENAME },
	{ name: 'Creepster', diskFilename: 'Creepster-8888888888881-888888881.woff2' },
	{
		name: 'Mountains of Christmas',
		diskFilename: 'Mountains-of-Christmas-8888888888882-888888882.woff2'
	},
	{ name: 'Nunito', diskFilename: 'Nunito-VF-8888888888883-888888883.woff2' }
] as const;

export const bundledFontFilePath = (diskFilename: string) => `/uploads/fonts/${diskFilename}`;

/** Names that uploads may not reuse. */
export const isReservedFontName = (name: string) => BUNDLED_SITE_FONTS.some((f) => f.name === name);

export function isBundledBuiltinSiteFont(font: {
	type: string;
	name: string;
	filePath: string | null;
}): boolean {
	if (font.type !== 'custom') return false;
	const bundled = BUNDLED_SITE_FONTS.find((f) => f.name === font.name);
	if (!bundled) return false;
	if (font.filePath === bundledFontFilePath(bundled.diskFilename)) return true;
	return (
		font.name === BUILTIN_SITE_FONT_NAME &&
		LEGACY_BUILTIN_FONT_PATHS.includes(font.filePath as (typeof LEGACY_BUILTIN_FONT_PATHS)[number])
	);
}
