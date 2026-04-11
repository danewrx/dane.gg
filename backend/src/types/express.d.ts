import 'express-session';

declare module 'express-session' {
	interface SessionData {
		user?: {
			id: string;
			username: string;
			isAdmin: boolean;
			themePreference?: string;
			accentColor?: string;
		};
	}
}

declare global {
	namespace Express {
		interface Request {
			user?: {
				id: string;
				username: string;
				isAdmin: boolean;
				themePreference?: string;
				accentColor?: string;
				/** Set when authenticated via site API key (`dk_…`) */
				isApiKey?: true;
				/** DB `permissions` value for API keys: full | read | chat | webhooks */
				apiKeyPermissions?: string;
			};
		}
	}
}
