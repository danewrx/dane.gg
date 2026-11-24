import { ConfigService } from './config';

export const PAGE_SEO_KEY = 'page_seo';

export interface PageSeo {
	name: string;
	description: string;
}

export const DEFAULT_PAGE_SEO: Record<string, PageSeo> = {
	'/': {
		name: 'dane.gg (丹恩)',
		description: "Hi, I'm Dane! I'm a software engineer & freelance designer from Preston, UK."
	},
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

const text = (value: unknown, max: number) =>
	typeof value === 'string' ? value.trim().slice(0, max) : '';

const EXTRA_PATH = /^\/[a-z0-9_-]+(\/[a-z0-9_-]+)*$/i;
const MAX_EXTRA_PAGES = 50;

export function mergePageSeo(stored: unknown): Record<string, PageSeo> {
	const saved = (stored && typeof stored === 'object' ? stored : {}) as Record<
		string,
		Partial<PageSeo> | undefined
	>;
	const merged: Record<string, PageSeo> = Object.fromEntries(
		Object.entries(DEFAULT_PAGE_SEO).map(([path, defaults]) => [
			path,
			{
				name: text(saved[path]?.name, 60) || defaults.name,
				description: text(saved[path]?.description, 300) || defaults.description
			}
		])
	);

	let extras = 0;
	for (const [path, value] of Object.entries(saved)) {
		if (path in merged || !EXTRA_PATH.test(path) || extras >= MAX_EXTRA_PAGES) continue;
		const name = text(value?.name, 60);
		if (!name) continue;
		merged[path] = { name, description: text(value?.description, 300) || merged['/'].description };
		extras++;
	}
	return merged;
}

export async function getPageSeo(): Promise<Record<string, PageSeo>> {
	return mergePageSeo(await ConfigService.get(PAGE_SEO_KEY));
}
