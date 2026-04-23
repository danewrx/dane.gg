import { env } from '$env/dynamic/private';

const API_BASE_URL = env.VITE_API_URL || 'http://backend:3001/api';

export const load = async ({ fetch }: { fetch: typeof globalThis.fetch }) => {
	const [musicResult, tweetResult] = await Promise.allSettled([
		fetch(`${API_BASE_URL}/widgets/nowplaying`),
		fetch(`${API_BASE_URL}/widgets/latest-tweet`)
	]);

	let musicData: unknown = null;
	let tweetData: unknown = null;

	if (musicResult.status === 'fulfilled' && musicResult.value.ok) {
		musicData = await musicResult.value.json();
	}

	if (tweetResult.status === 'fulfilled' && tweetResult.value.ok) {
		tweetData = await tweetResult.value.json();
	}

	return {
		musicData,
		tweetData
	};
};
