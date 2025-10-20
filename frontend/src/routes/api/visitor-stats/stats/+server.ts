import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const timeRange = url.searchParams.get('timeRange') || '24h';
		
		// Get auth token from cookies
		const authToken = cookies.get('auth_token');
		
		if (!authToken) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const response = await fetch(`${BACKEND_URL}/api/stats/request-logs?timeRange=${timeRange}&limit=${limit}`, {
			headers: {
				'Authorization': `Bearer ${authToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (response.status === 401) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!response.ok) {
			throw new Error(`Backend responded with ${response.status}`);
		}

		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('Error fetching stats:', error);
		return json({ error: 'Failed to fetch stats' }, { status: 500 });
	}
};
