import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const body = `# allow crawling everything by default
User-agent: *
Disallow:

Sitemap: ${url.origin}/sitemap.xml
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
