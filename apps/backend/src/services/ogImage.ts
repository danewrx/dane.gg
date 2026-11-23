import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import sharp from 'sharp';
import { logger } from '../utils/logger';
import { loadImageSource } from '../routes/adverts';
import { ConfigService } from './config';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const OG_ASSETS_DIR = path.join(process.cwd(), 'static', 'og');
const BASE_FONT = 'W95FA, Nunito';

export interface OgCardInput {
	title: string;
	meta?: string;
	pill?: string;
	coverDataUri?: string | null;
	logoDataUri?: string | null;
}

export function titleFontSize(title: string): number {
	const length = title.length;
	if (length <= 24) return 96;
	if (length <= 48) return 80;
	if (length <= 72) return 64;
	return 48;
}

const dataUri = (file: string, mime: string) =>
	`data:${mime};base64,${fs.readFileSync(path.join(OG_ASSETS_DIR, file)).toString('base64')}`;

type Node = { type: string; props: Record<string, unknown> };
const el = (
	type: string,
	style: Record<string, unknown>,
	children?: unknown,
	extra = {}
): Node => ({
	type,
	props: { style, children, ...extra }
});

export function buildOgTree(input: OgCardInput): Node {
	const { title, meta, pill, coverDataUri, logoDataUri } = input;
	const absolute = { position: 'absolute', top: 0, left: 0, width: OG_WIDTH, height: OG_HEIGHT };

	const background: Node[] = coverDataUri
		? [
				el('img', { ...absolute, objectFit: 'cover' }, undefined, {
					src: coverDataUri,
					width: OG_WIDTH,
					height: OG_HEIGHT
				}),
				el('div', {
					...absolute,
					backgroundImage:
						'linear-gradient(90deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.78) 50%, rgba(0,0,0,0.2) 100%)'
				})
			]
		: [
				el('div', {
					...absolute,
					backgroundImage:
						'radial-gradient(circle at 82% 45%, rgba(167,139,250,0.4) 0%, rgba(167,139,250,0) 55%), linear-gradient(135deg, #0b1020 0%, #1a1240 55%, #3b1d5e 100%)'
				})
			];
	if (logoDataUri) {
		background.push(
			el('img', { position: 'absolute', right: 40, bottom: 0, width: 420, height: 420 }, undefined, {
				src: logoDataUri,
				width: 420,
				height: 420
			})
		);
	}

	const textBlock = el(
		'div',
		{
			position: 'absolute',
			top: 0,
			left: 72,
			height: OG_HEIGHT,
			width: logoDataUri ? 640 : 820,
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center'
		},
		[
			el(
				'div',
				{
					fontFamily: BASE_FONT,
					fontSize: titleFontSize(title),
					lineHeight: 1.1,
					color: '#ffffff',
					lineClamp: 3,
					textOverflow: 'ellipsis'
				},
				title
			),
			meta
				? el(
						'div',
						{
							display: 'flex',
							marginTop: 28,
							fontFamily: BASE_FONT,
							fontSize: 32,
							color: '#b3b3b3'
						},
						meta
					)
				: null,
			pill
				? el(
						'div',
						{
							display: 'flex',
							alignSelf: 'flex-start',
							marginTop: 40,
							padding: '14px 32px',
							borderRadius: 999,
							backgroundColor: '#ffffff',
							color: '#0b1020',
							fontFamily: BASE_FONT,
							fontSize: 32
						},
						pill
					)
				: null
		].filter(Boolean)
	);

	return el(
		'div',
		{
			display: 'flex',
			position: 'relative',
			width: OG_WIDTH,
			height: OG_HEIGHT,
			backgroundColor: '#0b1020'
		},
		[...background, textBlock]
	);
}

let assets: Promise<{ fonts: { name: string; data: Buffer }[]; lain: string }> | null = null;

export const getDefaultLogo = async () => (await loadAssets()).lain;

function loadAssets() {
	assets ??= (async () => {
		const wasm = fs.readFileSync(
			createRequire(import.meta.url).resolve('@resvg/resvg-wasm/index_bg.wasm')
		);
		await initWasm(wasm);
		return {
			fonts: ['W95FA', 'Nunito'].map((name) => ({
				name,
				data: fs.readFileSync(path.join(OG_ASSETS_DIR, `${name}.ttf`))
			})),
			lain: dataUri('lain.png', 'image/png')
		};
	})().catch((error) => {
		assets = null;
		throw error;
	});
	return assets;
}

export async function renderOgPng(input: OgCardInput): Promise<Buffer> {
	const { fonts } = await loadAssets();
	const svg = await satori(buildOgTree(input) as never, {
		width: OG_WIDTH,
		height: OG_HEIGHT,
		fonts: fonts.map(({ name, data }) => ({ name, data, weight: 400, style: 'normal' as const }))
	});
	return Buffer.from(
		new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng()
	);
}

async function prepareCover(source: string | null): Promise<string | null> {
	if (!source) return null;
	try {
		const input = await loadImageSource(source);
		return await fitCover(input);
	} catch (error) {
		logger.warn('OG image: could not use cover image, using the default background:', error);
		return null;
	}
}

async function fitCover(input: Buffer): Promise<string> {
	const jpeg = await sharp(input)
		.resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'attention' })
		.jpeg({ quality: 82 })
		.toBuffer();
	return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

export interface OgPost {
	id: string;
	title: string;
	thumbnail: string | null;
	publishedAt: Date | null;
	updatedAt: Date | null;
}

async function prepareLogo(source: string): Promise<string | null> {
	try {
		const png = await sharp(await loadImageSource(source))
			.resize(420, 420, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
			.png()
			.toBuffer();
		return `data:image/png;base64,${png.toString('base64')}`;
	} catch (error) {
		logger.warn('OG image: could not use the configured logo, using the default:', error);
		return null;
	}
}

export const OG_DEFAULT_ASSETS: Record<string, string> = {
	background: 'background.jpg',
	logo: 'lain.png'
};

export const OG_BACKGROUND_KEY = 'og_background_image';
export const OG_LOGO_KEY = 'og_logo_image';

export async function getOgBranding(): Promise<{
	background: string | null;
	logo: string | null;
	version: string;
}> {
	const [bgPath, logoPath] = (await Promise.all([
		ConfigService.get(OG_BACKGROUND_KEY),
		ConfigService.get(OG_LOGO_KEY)
	])) as (string | null)[];
	return {
		background:
			(bgPath ? await prepareCover(bgPath) : null) ??
			(await fitCover(fs.readFileSync(path.join(OG_ASSETS_DIR, OG_DEFAULT_ASSETS.background)))),
		logo: (logoPath ? await prepareLogo(logoPath) : null) ?? (await getDefaultLogo()),
		version: `${bgPath ?? ''}|${logoPath ?? ''}`
	};
}

const MAX_CACHED = 100;
const cache = new Map<string, Buffer>();

const formatDate = (date: Date | null) =>
	date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export async function getBlogOgImage(post: OgPost, tags: string[]): Promise<Buffer> {
	const branding = await getOgBranding();
	const key = [
		post.id,
		post.updatedAt?.getTime(),
		post.thumbnail,
		post.title,
		tags.join(','),
		branding.version
	].join('|');
	const cached = cache.get(key);
	if (cached) return cached;

	const meta = [formatDate(post.publishedAt), ...tags.slice(0, 3)].filter(Boolean).join('  ·  ');
	const cover = await prepareCover(post.thumbnail);
	const png = await renderOgPng({
		title: post.title,
		meta,
		...(cover
			? { coverDataUri: cover }
			: { coverDataUri: branding.background, logoDataUri: branding.logo })
	});

	if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
	cache.set(key, png);
	return png;
}
