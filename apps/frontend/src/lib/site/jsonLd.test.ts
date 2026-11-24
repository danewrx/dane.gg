import { describe, expect, it } from 'vitest';
import {
	blogPostingSchema,
	breadcrumbSchema,
	personSchema,
	serializeJsonLd,
	websiteSchema
} from './jsonLd';

const origin = 'https://dane.gg';

describe('websiteSchema / personSchema', () => {
	it('describe the site and the person with absolute URLs', () => {
		expect(websiteSchema(origin, 'Hello')).toMatchObject({
			'@type': 'WebSite',
			url: 'https://dane.gg/',
			description: 'Hello'
		});
		expect(personSchema(origin, [])).toMatchObject({
			'@type': 'Person',
			name: 'Dane Buchanan',
			url: 'https://dane.gg/'
		});
	});

	it('keeps only http(s) profile links in sameAs', () => {
		const person = personSchema(origin, [
			'https://github.com/dane',
			'http://example.com/me',
			'mailto:me@example.com',
			'0xWALLETADDRESS',
			'javascript:alert(1)'
		]);
		expect(person.sameAs).toEqual(['https://github.com/dane', 'http://example.com/me']);
	});
});

describe('breadcrumbSchema', () => {
	it('numbers the crumbs from 1 and makes each item an absolute URL', () => {
		const schema = breadcrumbSchema(origin, [
			{ name: 'Home', path: '/' },
			{ name: 'Blog', path: '/blog' }
		]);
		expect(schema['@type']).toBe('BreadcrumbList');
		expect(schema.itemListElement).toEqual([
			{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://dane.gg/' },
			{ '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://dane.gg/blog' }
		]);
	});
});

describe('blogPostingSchema', () => {
	const post = {
		slug: 'hello-world',
		title: 'Hello world',
		description: 'A first post',
		publishedAt: '2024-01-10T12:00:00.000Z',
		updatedAt: '2024-02-01T08:30:00.000Z',
		imagePath: '/api/blog/hello-world/og.png?v=1'
	};

	it('maps the post to the BlogPosting fields search engines read', () => {
		expect(blogPostingSchema(origin, post)).toMatchObject({
			'@type': 'BlogPosting',
			headline: 'Hello world',
			description: 'A first post',
			url: 'https://dane.gg/blog/hello-world',
			mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://dane.gg/blog/hello-world' },
			image: 'https://dane.gg/api/blog/hello-world/og.png?v=1',
			datePublished: '2024-01-10T12:00:00.000Z',
			dateModified: '2024-02-01T08:30:00.000Z',
			author: { '@type': 'Person', name: 'Dane Buchanan' }
		});
	});
});

describe('serializeJsonLd', () => {
	it('escapes "<" so post content cannot close the script tag', () => {
		const json = serializeJsonLd({ headline: '</script><script>alert(1)</script>' });
		expect(json).not.toContain('<');
		expect(JSON.parse(json).headline).toBe('</script><script>alert(1)</script>');
	});

	it('serialises arrays too', () => {
		expect(JSON.parse(serializeJsonLd([{ a: 1 }, { b: 2 }]))).toEqual([{ a: 1 }, { b: 2 }]);
	});
});
