import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const trackingData = await request.json();
		
		// Forward tracking data to backend
		const response = await fetch(`${BACKEND_URL}/api/health`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`Backend responded with ${response.status}`);
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error tracking page view:', error);
		return json({ error: 'Failed to track page view' }, { status: 500 });
	}
};
