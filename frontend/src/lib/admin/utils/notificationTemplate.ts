const PLACEHOLDER_PATTERN = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g;

export type NotificationTemplateVars = Record<string, string | number | undefined | null>;

export function renderNotificationTemplate(
	template: string,
	vars: NotificationTemplateVars
): string {
	return template.replace(PLACEHOLDER_PATTERN, (_, key: string) => {
		const value = vars[key];
		if (value === undefined || value === null) return `{${key}}`;
		return String(value);
	});
}

export const PREVIEW_VAR_SAMPLES: Record<string, string> = {
	username: 'testuser',
	ip: '192.0.2.1',
	totp: 'no',
	attemptCount: '3',
	maxAttempts: '5',
	lockoutMinutes: '15',
	error: 'Example connection error',
	time: '2026-06-02T12:00:00.000Z'
};

export function buildPreviewVars(placeholders: string[]): Record<string, string> {
	const vars: Record<string, string> = { time: new Date().toISOString() };
	for (const key of placeholders) {
		vars[key] = PREVIEW_VAR_SAMPLES[key] ?? key;
	}
	return vars;
}
