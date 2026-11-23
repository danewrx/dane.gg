import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import sharp from 'sharp';
import { logger } from '../utils/logger';
import { loadImageSource } from '../routes/adverts';
import { ConfigService } from './config';
import { loadOgFont } from './ogFonts';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const OG_ASSETS_DIR = path.join(process.cwd(), 'static', 'og');

/** Admin-adjustable look of the cards. */
export interface OgStyle {
	fadeColor: string;
	titleColor: string;
	textColor: string;
	pillColor: string;
	pillTextColor: string;
	font: string;
	titleScale: number;
	headingSize: number;
	textSize: number;
	pillSize: number;
}

export const OG_NUMBER_RANGES: Partial<Record<keyof OgStyle, [number, number]>> = {
	titleScale: [50, 120],
	headingSize: [16, 48],
	textSize: [16, 48],
	pillSize: [16, 48]
};

export const OG_STYLE_DEFAULTS: OgStyle = {
	fadeColor: '#000000',
	titleColor: '#ffffff',
	textColor: '#b3b3b3',
	pillColor: '#ffffff',
	pillTextColor: '#0b1020',
	font: 'W95FA',
	titleScale: 100,
	headingSize: 32,
	textSize: 32,
	pillSize: 32
};

export const OG_STYLE_KEYS: Record<keyof OgStyle, string> = {
	fadeColor: 'og_fade_color',
	titleColor: 'og_title_color',
	textColor: 'og_text_color',
	pillColor: 'og_pill_color',
	pillTextColor: 'og_pill_text_color',
	font: 'og_font',
	titleScale: 'og_title_scale',
	headingSize: 'og_heading_size',
	textSize: 'og_text_size',
	pillSize: 'og_pill_size'
};

const OG_CUSTOM_FONT = 'OgCustom';
const BUNDLED_FONT = 'W95FA';
const fontStack = (font: string) =>
	font === BUNDLED_FONT ? 'W95FA, Nunito' : `${OG_CUSTOM_FONT}, W95FA, Nunito`;
const isHex = (value: unknown): value is string =>
	typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

const hexToRgb = (hex: string) =>
	[1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)).join(',');

export interface OgCardInput {
	eyebrow?: string;
	title: string;
	meta?: string;
	pill?: string;
	coverDataUri?: string | null;
	logoDataUri?: string | null;
	style?: OgStyle;
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
	const { eyebrow, title, meta, metaLines, pill, coverDataUri, logoDataUri } = input;
	const style = input.style ?? OG_STYLE_DEFAULTS;
	const fontFamily = fontStack(style.font);
	const fade = hexToRgb(style.fadeColor);
	const titleSize = Math.round((titleFontSize(title) * style.titleScale) / 100);
	const lineHeight = 1.3;
	const othersHeight =
		(eyebrow ? style.headingSize * lineHeight + 20 : 0) +
		(meta ? style.textSize * lineHeight * (metaLines ?? 1) + 28 : 0) +
		(pill ? style.pillSize * lineHeight + 28 + 40 : 0);
	const titleLines = Math.max(
		1,
		Math.min(3, Math.floor((OG_HEIGHT - 100 - othersHeight) / (titleSize * 1.1)))
	);
	const textWidth = logoDataUri ? 640 : 820;
	const oneLine = {
		maxWidth: textWidth,
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis'
	};
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
					backgroundImage: `linear-gradient(90deg, rgba(${fade},0.94) 0%, rgba(${fade},0.78) 50%, rgba(${fade},0.2) 100%)`
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
			el(
				'img',
				{ position: 'absolute', right: 40, bottom: 0, width: 420, height: 420 },
				undefined,
				{
					src: logoDataUri,
					width: 420,
					height: 420
				}
			)
		);
	}

	const textBlock = el(
		'div',
		{
			position: 'absolute',
			top: 0,
			left: 72,
			height: OG_HEIGHT,
			width: textWidth,
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center'
		},
		[
			eyebrow
				? el(
						'div',
						{
							...oneLine,
							marginBottom: 20,
							fontFamily,
							fontSize: style.headingSize,
							color: style.textColor
						},
						eyebrow
					)
				: null,
			el(
				'div',
				{
					fontFamily,
					fontSize: titleSize,
					lineHeight: 1.1,
					color: style.titleColor,
					lineClamp: titleLines,
					wordBreak: 'break-word',
					textOverflow: 'ellipsis'
				},
				title
			),
			meta
				? el(
						'div',
						{
							...(metaLines ? { lineClamp: metaLines, textOverflow: 'ellipsis' } : oneLine),
							marginTop: 28,
							fontFamily,
							fontSize: style.textSize,
							color: style.textColor
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
							backgroundColor: style.pillColor,
							color: style.pillTextColor,
							fontFamily,
							fontSize: style.pillSize
						},
						// Truncate with "..." when the text is wider than the column (minus padding)
						el(
							'div',
							{
								...oneLine,
								maxWidth: textWidth - 64
							},
							pill
						)
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
	const font = input.style?.font;
	const custom = font && font !== BUNDLED_FONT ? await loadOgFont(font) : null;
	const svg = await satori(buildOgTree(input) as never, {
		width: OG_WIDTH,
		height: OG_HEIGHT,
		fonts: [...(custom ? [{ name: OG_CUSTOM_FONT, data: custom }] : []), ...fonts].map(
			({ name, data }) => ({ name, data, weight: 400, style: 'normal' as const })
		)
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
	slug: string;
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

/** Unsaved values to try out in the admin preview; cards rendered with them are never cached. */
export interface OgOverrides {
	style?: Partial<Record<keyof OgStyle, string | number>>;
	text?: Partial<{ title: string; subtitle: string; pill: string }>;
}

export async function getOgBranding(overrides?: OgOverrides): Promise<{
	background: string | null;
	logo: string | null;
	style: OgStyle;
	version: string;
}> {
	const styleFields = Object.keys(OG_STYLE_KEYS) as (keyof OgStyle)[];
	const [bgPath, logoPath, ...styleValues] = (await Promise.all([
		ConfigService.get(OG_BACKGROUND_KEY),
		ConfigService.get(OG_LOGO_KEY),
		...styleFields.map((field) => ConfigService.get(OG_STYLE_KEYS[field]))
	])) as (string | null)[];
	const style = { ...OG_STYLE_DEFAULTS };
	styleFields.forEach((field, i) => {
		const value = overrides?.style?.[field] ?? styleValues[i];
		const range = OG_NUMBER_RANGES[field];
		if (range) {
			const number = Math.round(Number(value));
			if (value !== null && value !== '' && number >= range[0] && number <= range[1]) {
				(style as Record<string, string | number>)[field] = number;
			}
			return;
		}
		const normalised = value === 'pixel' ? 'W95FA' : value === 'sans' ? 'Nunito' : value;
		if (
			field === 'font'
				? typeof normalised === 'string' && normalised.length <= 100 && normalised
				: isHex(normalised)
		) {
			(style as Record<string, string | number>)[field] = normalised as string;
		}
	});
	return {
		background:
			(bgPath ? await prepareCover(bgPath) : null) ??
			(await fitCover(fs.readFileSync(path.join(OG_ASSETS_DIR, OG_DEFAULT_ASSETS.background)))),
		logo: (logoPath ? await prepareLogo(logoPath) : null) ?? (await getDefaultLogo()),
		style,
		version: `${bgPath ?? ''}|${logoPath ?? ''}|${Object.values(style).join(',')}`
	};
}

export const OG_DEFAULT_TEXT_KEYS = {
	title: 'og_default_title',
	subtitle: 'og_default_subtitle',
	pill: 'og_default_pill'
} as const;

export const OG_DEFAULT_TEXT = {
	title: 'Dane Buchanan',
	subtitle: 'software engineer & freelance designer',
	pill: 'dane.gg'
};

const MAX_CACHED = 100;
const cache = new Map<string, Buffer>();

/** Returns the cached card for `key`, rendering (and caching) it on a miss; previews skip the cache. */
async function cached(key: string, useCache: boolean, render: () => Promise<Buffer>) {
	const hit = useCache ? cache.get(key) : undefined;
	if (hit) return hit;
	const png = await render();
	if (useCache) {
		if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
		cache.set(key, png);
	}
	return png;
}

const formatDate = (date: Date | null) =>
	date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export async function getBlogOgImage(
	post: OgPost,
	tags: string[],
	overrides?: OgOverrides
): Promise<Buffer> {
	const [branding, text] = await Promise.all([getOgBranding(overrides), getDefaultText(overrides)]);
	const key = [
		post.id,
		post.slug,
		post.updatedAt?.getTime(),
		post.thumbnail,
		post.title,
		tags.join(','),
		branding.version,
		text.title,
		text.pill
	].join('|');
	return cached(key, !overrides, async () => {
		const meta = [formatDate(post.publishedAt), ...tags.slice(0, 3)].filter(Boolean).join('  ·  ');
		const cover = await prepareCover(post.thumbnail);
		return renderOgPng({
			eyebrow: text.title,
			title: post.title,
			meta,
			pill: text.pill ? `${text.pill}/blog/${post.slug}` : undefined,
			style: branding.style,
			...(cover
				? { coverDataUri: cover }
				: { coverDataUri: branding.background, logoDataUri: branding.logo })
		});
	});
}

async function getDefaultText(overrides?: OgOverrides) {
	const [title, subtitle, pill] = (await Promise.all(
		Object.values(OG_DEFAULT_TEXT_KEYS).map((key) => ConfigService.get(key))
	)) as (string | null)[];
	return {
		title: overrides?.text?.title ?? title ?? OG_DEFAULT_TEXT.title,
		subtitle: overrides?.text?.subtitle ?? subtitle ?? OG_DEFAULT_TEXT.subtitle,
		pill: overrides?.text?.pill ?? pill ?? OG_DEFAULT_TEXT.pill
	};
}

export async function getDefaultOgImage(overrides?: OgOverrides): Promise<Buffer> {
	const branding = await getOgBranding(overrides);
	const text = await getDefaultText(overrides);
	const key = ['default', text.title, text.subtitle, text.pill, branding.version].join('|');
	return cached(key, !overrides, () =>
		renderOgPng({
			title: text.title,
			meta: text.subtitle,
			pill: text.pill,
			coverDataUri: branding.background,
			logoDataUri: branding.logo,
			style: branding.style
		})
	);
}

const OG_PAGES: Record<string, { name: string; description: string }> = {
	'/about': {
		name: 'About',
		description: "Hi, I'm Dane! I'm a software engineer & freelance designer from Preston, UK."
	},
	'/contact': {
		name: 'Contact',
		description: 'Get in touch with me for collaboration or inquiries.'
	},
	'/projects': {
		name: 'Projects',
		description: 'Explore my portfolio of software, design, and other random projects.'
	},
	'/blog': {
		name: 'Blog',
		description:
			'Read my latest blog posts about software, design, and other random stuff I feel like writing about.'
	}
};

export async function getPageOgImage(
	pagePath: string,
	overrides?: OgOverrides
): Promise<Buffer | null> {
	const page = OG_PAGES[pagePath];
	if (!page) return null;

	const [branding, text] = await Promise.all([getOgBranding(overrides), getDefaultText(overrides)]);
	const key = ['page', pagePath, branding.version, text.title, text.pill].join('|');
	return cached(key, !overrides, () =>
		renderOgPng({
			eyebrow: text.title,
			title: page.name,
			meta: page.description,
			metaLines: 3,
			pill: text.pill ? `${text.pill}${pagePath}` : undefined,
			coverDataUri: branding.background,
			logoDataUri: branding.logo,
			style: branding.style
		})
	);
}
