import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const timeRange = url.searchParams.get('timeRange') || '24h';
		
		// Get auth token from cookies
		const authToken = cookies.get('dane.gg.sid');
		
		if (!authToken) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const backendUrl = `http://localhost:3001/api/stats/dashboard?timeRange=${timeRange}`;
		
		const response = await fetch(backendUrl, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Cookie': `dane.gg.sid=${authToken}`
			}
		});

		if (!response.ok) {
			if (response.status === 401) {
				return json({ error: 'Unauthorized' }, { status: 401 });
			}
			throw new Error(`Backend responded with ${response.status}`);
		}

		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('Error fetching stats from backend:', error);
		return json(
			{ 
				error: 'Internal server error',
				message: 'Failed to fetch statistics'
			}, 
			{ status: 500 }
		);
	}
};
