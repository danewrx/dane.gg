import type { NtfyEventAppearance } from './ntfyPublish';

const PLACEHOLDER_PATTERN = /\{([a-zA-Z]\w*)\}/g;

export type NotificationTemplateVars = Record<string, string | number | undefined | null>;

/** Sample values used when sending a test notification from the admin UI. */
export function testNotificationTemplateVars(): NotificationTemplateVars {
	return {
		time: new Date().toISOString(),
		username: 'testuser',
		ip: '192.0.2.1',
		totp: 'no',
		attemptCount: 3,
		maxAttempts: 5,
		lockoutMinutes: 15,
		error: 'Example connection error (test only)'
	};
}

export function renderNotificationTemplate(
	template: string,
	vars: NotificationTemplateVars
): string {
	return template.replace(PLACEHOLDER_PATTERN, (_, key: string) => {
		const value = vars[key];
		if (value === undefined || value === null) return '';
		return String(value);
	});
}

export function resolveTemplatedAppearance(
	appearance: NtfyEventAppearance,
	vars: NotificationTemplateVars
): { message: string; appearance: NtfyEventAppearance } {
	return {
		message: renderNotificationTemplate(appearance.body, vars),
		appearance: {
			...appearance,
			title: renderNotificationTemplate(appearance.title, vars)
		}
	};
}
