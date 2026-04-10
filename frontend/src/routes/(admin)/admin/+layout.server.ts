import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies: _cookies }) => {
	// The user data is already set in hooks.server.ts
	// This load function can be used for additional server-side data fetching
	// if needed for the admin layout

	return {
		user: locals.user || null,
		isAuthenticated: !!locals.user
	};
};
