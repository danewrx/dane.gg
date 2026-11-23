import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { fonts } from '../db/schema';
import { logger } from '../utils/logger';

const FONTS_DIR = path.join(process.cwd(), 'static', 'uploads', 'fonts');
// An old Safari UA makes Google Fonts answer with a single full .ttf rather than split woff2 files.
const LEGACY_UA =
	'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; en-us) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1';

const MAX_CACHED_FONTS = 20;
const cache = new Map<string, Buffer>();

async function toSatoriFont(data: Buffer, ext: string): Promise<Buffer> {
	if (ext !== '.woff2') return data;
	const { decompress } = createRequire(import.meta.url)('wawoff2');
	return Buffer.from(await decompress(data));
}

async function loadGoogleFont(family: string): Promise<Buffer> {
	if (!/^[\w ]{1,80}$/.test(family)) throw new Error('Invalid Google font name');
	const css = await (
		await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}`, {
			headers: { 'User-Agent': LEGACY_UA },
			signal: AbortSignal.timeout(10_000)
		})
	).text();
	const url = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)?.[1];
	if (!url) throw new Error('Google Fonts returned no font file');
	const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
	if (!response.ok) throw new Error(`Font download failed (${response.status})`);
	return toSatoriFont(
		Buffer.from(await response.arrayBuffer()),
		path.extname(new URL(url).pathname)
	);
}

async function loadFontFile(filePath: string): Promise<Buffer> {
	const file = path.join(FONTS_DIR, path.basename(filePath));
	return toSatoriFont(fs.readFileSync(file), path.extname(file).toLowerCase());
}

export async function loadOgFont(name: string): Promise<Buffer | null> {
	const hit = cache.get(name);
	if (hit) return hit;
	try {
		const [font] = await db.select().from(fonts).where(eq(fonts.name, name)).limit(1);
		if (!font) return null;
		const data =
			font.type === 'google' && font.googleFontFamily
				? await loadGoogleFont(font.googleFontFamily)
				: font.filePath
					? await loadFontFile(font.filePath)
					: null;
		if (!data) return null;
		if (cache.size >= MAX_CACHED_FONTS) cache.delete(cache.keys().next().value as string);
		cache.set(name, data);
		return data;
	} catch (error) {
		logger.warn(`OG image: could not load font "${name}", using the default:`, error);
		return null;
	}
}
