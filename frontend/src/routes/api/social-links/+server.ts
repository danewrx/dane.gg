import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export const GET: RequestHandler = async () => {
  try {
    console.log('API: Fetching social links from backend...');
    console.log('Backend URL:', BACKEND_URL);
    
    const response = await fetch(`${BACKEND_URL}/api/social-links`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Backend response status:', response.status);
    console.log('Backend response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText);
      throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    return json(data);
  } catch (error) {
    console.error('SvelteKit API Error fetching social links:', error);
    return json({ 
      success: false, 
      error: 'Failed to fetch social links',
      data: []
    }, { status: 500 });
  }
};
