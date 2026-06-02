/** Matches backend ntfy publish appearance — https://docs.ntfy.sh/publish/ */
export interface NtfyEventAppearance {
	enabled: boolean;
	title: string;
	body: string;
	priority: number;
	tags: string[];
	markdown: boolean;
	click: string;
	icon: string;
}

export type AdminLoginFailedMode = 'lockout' | 'each' | 'off';

export interface NotificationSettings {
	adminLogin: {
		failedMode: AdminLoginFailedMode;
		success: NtfyEventAppearance;
		lockout: NtfyEventAppearance;
		failed: NtfyEventAppearance;
	};
	twitter: {
		failure: NtfyEventAppearance;
		restored: NtfyEventAppearance;
	};
	test: NtfyEventAppearance;
}
