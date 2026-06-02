/** Matches backend ntfy publish appearance — https://docs.ntfy.sh/publish/ */
export interface NtfyEventAppearance {
	title: string;
	priority: number;
	tags: string[];
	markdown: boolean;
	click: string;
	icon: string;
}

export type AdminLoginFailedMode = 'lockout' | 'each' | 'off';

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
