/** Query flag: real site runs in admin iframe and accepts theme updates over postMessage */
export const THEME_PREVIEW_SEARCH_PARAM = 'themePreview';

export const THEME_PREVIEW_MSG_APPLY = 'THEME_PREVIEW_APPLY' as const;
export const THEME_PREVIEW_MSG_READY = 'THEME_PREVIEW_READY' as const;

export type ThemePreviewApplyMessage = {
	type: typeof THEME_PREVIEW_MSG_APPLY;
	theme: import('$lib/site/stores/theme').SiteTheme;
};

export type ThemePreviewReadyMessage = {
	type: typeof THEME_PREVIEW_MSG_READY;
};
