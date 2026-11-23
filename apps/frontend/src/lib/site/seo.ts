import { publicPageTitle } from '$lib/site/pageTitle';

export const DEFAULT_OG_IMAGE_PATH = '/api/blog/og-default.png';

export type PageSeoMap = Record<string, { name: string; description: string }>;

export type StaticRouteSeo = { title: string; description: string; name: string };

export function getStaticRouteSeo(
	pathname: string,
	pageSeo: PageSeoMap | null | undefined
): StaticRouteSeo | null {
	const page = pageSeo?.[pathname];
	if (!page) return null;
	return {
		name: page.name,
		title: pathname === '/' ? page.name : publicPageTitle(page.name),
		description: page.description
	};
}

export function plainTextExcerpt(markdown: string, maxLength: number): string {
	const s = markdown
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`[^`]*`/g, ' ')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/[#*_~>|]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return s.length <= maxLength ? s : `${s.slice(0, maxLength - 1).trim()}…`;
}
