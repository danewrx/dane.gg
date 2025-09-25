import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		// Pre-fetch music data on the server/during SSR
		const response = await fetch('/api/widgets/nowplaying');
		
		if (response.ok) {
			const musicData = await response.json();
			return {
				musicData
			};
		}
		
		// If fetch fails, return null so component can handle it
		return {
			musicData: null
		};
	} catch (error) {
		console.error('Error pre-loading music data:', error);
		return {
			musicData: null
		};
	}
};
