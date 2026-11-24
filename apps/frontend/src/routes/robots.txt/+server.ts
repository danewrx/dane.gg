import { buildRobotsTxt } from '$lib/site/feed/robots';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) =>
	new Response(buildRobotsTxt(url.origin), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
