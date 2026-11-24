import { publicPageTitle } from '$lib/site/pageTitle';
import { nameFromPath, STATIC_ROUTE_PATHS } from '$lib/site/routes';

export const DEFAULT_OG_IMAGE_PATH = '/api/blog/og-default.png';

export type PageSeoMap = Record<string, { name: string; description: string }>;

export type StaticRouteSeo = { title: string; description: string; name: string };

export function getStaticRouteSeo(
	pathname: string,
	pageSeo: PageSeoMap | null | undefined
): StaticRouteSeo | null {
	if (!pageSeo) return null;
	const page =
		pageSeo[pathname] ??
		(STATIC_ROUTE_PATHS.includes(pathname)
			? { name: nameFromPath(pathname), description: pageSeo['/']?.description ?? '' }
			: null);
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

/**
 * The description and image for a blog post's search and social previews: the author's own
 * overrides when set, otherwise the start of the post and its generated card.
 */
export function blogPostSeo(post: {
	slug: string;
	content: string;
	updatedAt: string;
	seoDescription?: string | null;
	ogImage?: string | null;
}): { description: string; imagePath: string; imageIsGenerated: boolean } {
	const customImage = post.ogImage?.trim();
	return {
		description: post.seoDescription?.trim() || plainTextExcerpt(post.content, 160),
		imagePath: customImage
			? customImage.replace(/^\/uploads\//, '/api/upload/file/')
			: `/api/blog/${post.slug}/og.png?v=${new Date(post.updatedAt).getTime()}`,
		imageIsGenerated: !customImage
	};
}
