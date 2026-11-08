import { browser } from '$app/environment';
import { logger } from '$lib/logger';
import { setAdminFontStack } from '$lib/site/stores/font';
import { settingsService } from './settings';

export const DEFAULT_ADMIN_FONT = 'Ubuntu';
const CACHE_KEY = 'adminFont';
const LINK_ID = 'admin-google-font';

export interface AdminFontSetting {
	adminFont: string;
	useSystemFont: boolean;
}

/** Inject the Google Fonts stylesheet */
function loadGoogleFont(name: string): void {
	document.getElementById(LINK_ID)?.remove();
	const link = document.createElement('link');
	link.id = LINK_ID;
	link.rel = 'stylesheet';
	link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@300;400;500;600;700&display=swap`;
	document.head.appendChild(link);
}

export function applyAdminFont({ adminFont, useSystemFont }: AdminFontSetting): void {
	if (!browser) return;
	if (useSystemFont) {
		document.getElementById(LINK_ID)?.remove();
		setAdminFontStack(null);
	} else {
		loadGoogleFont(adminFont);
		setAdminFontStack(`'${adminFont.replace(/['\\]/g, '')}', sans-serif`);
	}
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify({ adminFont, useSystemFont }));
	} catch {
		// storage unavailable
	}
}

/** Apply the cached choice instantly, then saved one from server. */
export async function initAdminFont(): Promise<void> {
	if (!browser) return;
	try {
		const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
		if (cached && typeof cached.adminFont === 'string') applyAdminFont(cached);
		else applyAdminFont({ adminFont: DEFAULT_ADMIN_FONT, useSystemFont: false });
	} catch {
		applyAdminFont({ adminFont: DEFAULT_ADMIN_FONT, useSystemFont: false });
	}
	try {
		const saved = await settingsService.getAdminFont();
		applyAdminFont({ adminFont: saved.adminFont, useSystemFont: saved.useSystemFont });
	} catch (error) {
		logger.error('Failed to load admin font:', error);
	}
}

export async function saveAdminFont(setting: AdminFontSetting): Promise<void> {
	applyAdminFont(setting);
	await settingsService.setAdminFont(setting.adminFont, setting.useSystemFont);
}
