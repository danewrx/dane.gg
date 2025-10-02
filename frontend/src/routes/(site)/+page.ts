import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		// Pre-fetch both music and tweet data on the server/during SSR
		const [musicResponse, tweetResponse] = await Promise.all([
			fetch('/api/widgets/nowplaying'),
			fetch('/api/widgets/latest-tweet')
		]);
		
		const musicData = musicResponse.ok ? await musicResponse.json() : null;
		const tweetData = tweetResponse.ok ? await tweetResponse.json() : null;
		
		return {
			musicData,
			tweetData
		};
	} catch (error) {
		console.error('Error pre-loading widget data:', error);
		return {
			musicData: null,
			tweetData: null
		};
	}
};
