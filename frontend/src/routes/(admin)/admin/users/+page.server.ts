import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated and is admin
	if (!locals.user || !locals.isAuthenticated) {
		throw redirect(302, '/login?redirect=/admin/users');
	}

	if (!locals.user.isAdmin) {
		throw redirect(302, '/admin');
	}

	return {
		user: locals.user
	};
};

