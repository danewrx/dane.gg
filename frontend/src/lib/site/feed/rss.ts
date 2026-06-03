import { plainTextExcerpt } from '$lib/site/seo';
import { renderMarkdown } from '$lib/site/utils/renderMarkdown';
import { absolutizeRelativeUrlsInHtml, resolvePublicAssetUrl } from './resolvePublicUrl';
import { escapeXml, wrapCdata } from './xml';

export type RssBlogPost = {
	id: string;
	title: string;
	slug: string;
	content: string;
	thumbnail: string | null;
	publishedAt: string;
	updatedAt: string;
	tags: { id: string; name: string }[];
};

export type RssFeedOptions = {
	origin: string;
	feedUrl: string;
	channelTitle: string;
	channelDescription: string;
	channelLink?: string;
	authorName?: string;
};

const RSS_NAMESPACES =
	'xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/"';

function formatRfc822(dateString: string): string {
	return new Date(dateString).toUTCString();
}

async function buildRssItem(post: RssBlogPost, origin: string, authorName: string): Promise<string> {
	const postUrl = `${origin}/blog/${encodeURIComponent(post.slug)}`;
	const description = escapeXml(plainTextExcerpt(post.content, 300));
	const rawHtml = await renderMarkdown(post.content);
	const contentHtml = absolutizeRelativeUrlsInHtml(rawHtml, origin);
	const pubDate = formatRfc822(post.publishedAt);

	const categories = post.tags
		.map((tag) => `<category>${escapeXml(tag.name)}</category>`)
		.join('\n      ');

	const thumbnailUrl = resolvePublicAssetUrl(post.thumbnail, origin);
	const media =
		thumbnailUrl !== ''
			? `<media:content url="${escapeXml(thumbnailUrl)}" medium="image" />`
			: '';

	return `<item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(authorName)}</author>
      <description>${description}</description>
      <content:encoded>${wrapCdata(contentHtml)}</content:encoded>
      ${categories}
      ${media}
    </item>`;
}

export async function buildRssFeed(posts: RssBlogPost[], options: RssFeedOptions): Promise<string> {
	const {
		origin,
		feedUrl,
		channelTitle,
		channelDescription,
		channelLink = `${origin}/blog`,
		authorName = 'Dane'
	} = options;

	const lastBuildDate =
		posts.length > 0 ? formatRfc822(posts[0].publishedAt) : formatRfc822(new Date().toISOString());

	const items = await Promise.all(posts.map((post) => buildRssItem(post, origin, authorName)));

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" ${RSS_NAMESPACES}>
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channelDescription)}</description>
    <language>en-gb</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <author>${escapeXml(authorName)}</author>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    ${items.join('\n    ')}
  </channel>
</rss>`;
}
