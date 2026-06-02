import { ConfigService } from './config';
import {
	mergeNtfyAppearance,
	NTFY_APPEARANCE_OPTIONAL_DEFAULTS,
	type NtfyEventAppearance
} from './ntfyPublish';

export const NTFY_SETTINGS_KEY = 'ntfy_settings';

export type AdminLoginFailedMode = 'lockout' | 'each' | 'off';

export type { NtfyEventAppearance };

function createAppearance(
	title: string,
	body: string,
	priority: number,
	tags: string[]
): NtfyEventAppearance {
	return {
		title,
		body,
		priority,
		tags,
		...NTFY_APPEARANCE_OPTIONAL_DEFAULTS
	};
}

export interface NotificationSettings {
	adminLogin: {
		successEnabled: boolean;
		failedMode: AdminLoginFailedMode;
		success: NtfyEventAppearance;
		lockout: NtfyEventAppearance;
		failed: NtfyEventAppearance;
	};
	twitter: {
		enabled: boolean;
		failure: NtfyEventAppearance;
		restored: NtfyEventAppearance;
	};
	test: NtfyEventAppearance;
}

const DEFAULT_APPEARANCE = {
	adminLoginSuccess: createAppearance(
		'Admin login',
		'User {username} signed in to the admin panel.\n2FA: {totp}\nIP: {ip}\nTime: {time}',
		3,
		['white_check_mark', 'security', 'auth', 'admin']
	),
	adminLoginLockout: createAppearance(
		'Admin login lockout',
		'IP {ip} was locked out after {attemptCount} failed admin login attempts.\nUsername: {username}\nLockout: {lockoutMinutes} minutes.\nTime: {time}',
		4,
		['warning', 'security', 'auth', 'admin']
	),
	adminLoginFailed: createAppearance(
		'Admin login failed',
		'Failed admin login attempt {attemptCount}/{maxAttempts}.\nUsername: {username}\nIP: {ip}\nTime: {time}',
		3,
		['warning', 'security', 'auth', 'admin']
	),
	twitterFailure: createAppearance(
		'Twitter API connection failed',
		'Twitter API connection failed: {error}\n\nTime: {time}',
		4,
		['warning', 'twitter', 'api']
	),
	twitterRestored: createAppearance(
		'Twitter API connection restored',
		'Twitter API connection has been restored.\n\nTime: {time}',
		2,
		['white_check_mark', 'twitter', 'api']
	),
	test: createAppearance(
		'Test notification',
		'Test notification from dane.gg admin\nTime: {time}',
		3,
		['test', 'admin']
	)
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
	adminLogin: {
		successEnabled: true,
		failedMode: 'lockout',
		success: DEFAULT_APPEARANCE.adminLoginSuccess,
		lockout: DEFAULT_APPEARANCE.adminLoginLockout,
		failed: DEFAULT_APPEARANCE.adminLoginFailed
	},
	twitter: {
		enabled: true,
		failure: DEFAULT_APPEARANCE.twitterFailure,
		restored: DEFAULT_APPEARANCE.twitterRestored
	},
	test: DEFAULT_APPEARANCE.test
};

let cachedSettings: NotificationSettings | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 30_000;

function envFailedMode(): AdminLoginFailedMode {
	const raw = (process.env.ADMIN_LOGIN_NOTIFY_FAILED || 'lockout').trim().toLowerCase();
	if (raw === 'each' || raw === 'off') return raw;
	return 'lockout';
}

function sanitizeAppearance(input: unknown, fallback: NtfyEventAppearance): NtfyEventAppearance {
	return mergeNtfyAppearance(fallback, input);
}

export function validateNotificationSettings(input: unknown): NotificationSettings {
	const raw = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
	const adminRaw =
		raw.adminLogin && typeof raw.adminLogin === 'object'
			? (raw.adminLogin as Record<string, unknown>)
			: {};
	const twitterRaw =
		raw.twitter && typeof raw.twitter === 'object' ? (raw.twitter as Record<string, unknown>) : {};

	let failedMode: AdminLoginFailedMode = DEFAULT_NOTIFICATION_SETTINGS.adminLogin.failedMode;
	if (typeof adminRaw.failedMode === 'string') {
		const mode = adminRaw.failedMode.trim().toLowerCase();
		if (mode === 'lockout' || mode === 'each' || mode === 'off') failedMode = mode;
	}

	return {
		adminLogin: {
			successEnabled:
				typeof adminRaw.successEnabled === 'boolean'
					? adminRaw.successEnabled
					: DEFAULT_NOTIFICATION_SETTINGS.adminLogin.successEnabled,
			failedMode,
			success: sanitizeAppearance(adminRaw.success, DEFAULT_NOTIFICATION_SETTINGS.adminLogin.success),
			lockout: sanitizeAppearance(
				adminRaw.lockout,
				DEFAULT_NOTIFICATION_SETTINGS.adminLogin.lockout
			),
			failed: sanitizeAppearance(adminRaw.failed, DEFAULT_NOTIFICATION_SETTINGS.adminLogin.failed)
		},
		twitter: {
			enabled:
				typeof twitterRaw.enabled === 'boolean'
					? twitterRaw.enabled
					: DEFAULT_NOTIFICATION_SETTINGS.twitter.enabled,
			failure: sanitizeAppearance(twitterRaw.failure, DEFAULT_NOTIFICATION_SETTINGS.twitter.failure),
			restored: sanitizeAppearance(twitterRaw.restored, DEFAULT_NOTIFICATION_SETTINGS.twitter.restored)
		},
		test: sanitizeAppearance(raw.test, DEFAULT_NOTIFICATION_SETTINGS.test)
	};
}

export function invalidateNotificationSettingsCache(): void {
	cachedSettings = null;
	cacheExpiry = 0;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
	if (cachedSettings && Date.now() < cacheExpiry) {
		return cachedSettings;
	}

	const stored = await ConfigService.get(NTFY_SETTINGS_KEY);
	let settings: NotificationSettings;

	if (stored && typeof stored === 'object') {
		settings = validateNotificationSettings(stored);
	} else {
		settings = {
			...DEFAULT_NOTIFICATION_SETTINGS,
			adminLogin: {
				...DEFAULT_NOTIFICATION_SETTINGS.adminLogin,
				failedMode: envFailedMode()
			}
		};
	}

	cachedSettings = settings;
	cacheExpiry = Date.now() + CACHE_TTL_MS;
	return settings;
}
