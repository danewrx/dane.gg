export type JsonLd = Record<string, unknown>;

export const SITE_NAME = 'dane.gg';
export const SITE_PERSON = {
	name: 'Dane Buchanan',
	jobTitle: 'Software Engineer & Freelance Designer'
};

const SCHEMA_CONTEXT = 'https://schema.org';

export function websiteSchema(origin: string, description: string): JsonLd {
	return {
		'@context': SCHEMA_CONTEXT,
		'@type': 'WebSite',
		name: SITE_NAME,
		url: `${origin}/`,
		description,
		inLanguage: 'en-GB'
	};
}

export function personSchema(origin: string, sameAs: string[]): JsonLd {
	return {
		'@context': SCHEMA_CONTEXT,
		'@type': 'Person',
		name: SITE_PERSON.name,
		jobTitle: SITE_PERSON.jobTitle,
		url: `${origin}/`,
		sameAs: sameAs.filter((url) => /^https?:\/\//i.test(url))
	};
}

export function breadcrumbSchema(origin: string, crumbs: { name: string; path: string }[]): JsonLd {
	return {
		'@context': SCHEMA_CONTEXT,
		'@type': 'BreadcrumbList',
		itemListElement: crumbs.map((crumb, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: crumb.name,
			item: `${origin}${crumb.path}`
		}))
	};
}

export function blogPostingSchema(
	origin: string,
	post: {
		slug: string;
		title: string;
		description: string;
		publishedAt: string;
		updatedAt: string;
		imagePath: string;
	}
): JsonLd {
	const url = `${origin}/blog/${post.slug}`;
	return {
		'@context': SCHEMA_CONTEXT,
		'@type': 'BlogPosting',
		headline: post.title,
		description: post.description,
		url,
		mainEntityOfPage: { '@type': 'WebPage', '@id': url },
		image: new URL(post.imagePath, origin).href,
		datePublished: new Date(post.publishedAt).toISOString(),
		dateModified: new Date(post.updatedAt).toISOString(),
		author: { '@type': 'Person', name: SITE_PERSON.name, url: `${origin}/` },
		publisher: { '@type': 'Person', name: SITE_PERSON.name, url: `${origin}/` }
	};
}

export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
	return JSON.stringify(data).replace(/</g, '\\u003c');
}
