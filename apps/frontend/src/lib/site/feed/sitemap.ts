import { escapeXml } from './xml';

export type SitemapUrl = {
	loc: string;
	lastmod?: string;
	changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
	priority?: number;
};

function formatLastmod(dateString: string): string {
	const d = new Date(dateString);
	if (Number.isNaN(d.getTime())) return '';
	return d.toISOString().slice(0, 10);
}

function renderUrlEntry(entry: SitemapUrl): string {
	const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
	const changefreq = entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : '';
	const priority =
		entry.priority === undefined ? '' : `\n    <priority>${entry.priority.toFixed(1)}</priority>`;

	return `  <url>
    <loc>${escapeXml(entry.loc)}</loc>${lastmod}${changefreq}${priority}
  </url>`;
}

export function buildSitemap(urls: SitemapUrl[]): string {
	const body = urls.map(renderUrlEntry).join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

export function sitemapPaths(pageSeo: Record<string, unknown> | null | undefined): string[] {
	const paths = Object.keys(pageSeo ?? {});
	return paths.length > 0 ? paths : ['/'];
}

export function buildStaticSitemapUrls(origin: string, paths: string[]): SitemapUrl[] {
	return paths.map((path) => ({
		loc: path === '/' ? `${origin}/` : `${origin}${path}`,
		changefreq: path === '/blog' ? 'daily' : 'monthly',
		priority: path === '/' ? 1 : 0.8
	}));
}

export type SitemapBlogPost = {
	slug: string;
	updatedAt: string;
};

export function buildBlogPostSitemapUrls(origin: string, posts: SitemapBlogPost[]): SitemapUrl[] {
	return posts.map((post) => ({
		loc: `${origin}/blog/${encodeURIComponent(post.slug)}`,
		lastmod: formatLastmod(post.updatedAt),
		changefreq: 'weekly' as const,
		priority: 0.6
	}));
}

export type SitemapProjectCategory = {
	id: string;
};

export function buildProjectCategorySitemapUrls(
	origin: string,
	categories: SitemapProjectCategory[]
): SitemapUrl[] {
	return categories.map((category) => ({
		loc: `${origin}/projects/${encodeURIComponent(category.id)}`,
		changefreq: 'monthly' as const,
		priority: 0.7
	}));
}
