import type { InferInsertModel } from 'drizzle-orm';
import { BUILTIN_SITE_FONT_NAME } from './builtinSiteFont';
import { themes } from './schema';

/**
 * Canonical "Default" site theme inserted when the database has no themes yet.
 * Kept in sync with what we seed for local/CI; seed demo themes are separate.
 */
export const BUILTIN_DEFAULT_THEME_INSERT = {
	name: 'Default',
	description: 'The default site theme with a dark aesthetic and background image',
	isActive: true,
	isDefault: true,
	isVisible: true,

	primaryColor: '#ffffff',
	secondaryColor: '#a1a1aa',
	accentColor: '#33FF33',
	backgroundColor: '#0a0a0a',
	surfaceColor: '#1a1a1a',
	borderColor: '#ffffff',
	textPrimary: '#ffffff',
	textSecondary: '#a1a1aa',
	textMuted: '#71717a',

	backgroundImage: '/assets/themes/default/backgrounds/1.png',
	backgroundImageExternal: false,
	backgroundOverlay: 'rgba(0, 0, 0, 0.7)',
	overlayDarkenOpacity: '0.7',
	backgroundBlur: 0,
	backgroundPosition: 'center center',
	backgroundSize: 'cover',
	backgroundAttachment: 'fixed',

	fontFamily: BUILTIN_SITE_FONT_NAME,
	headingFontFamily: BUILTIN_SITE_FONT_NAME,
	fontScale: '1',

	borderRadius: '0px',
	widgetBorderRadius: '0px',
	customCss: null,
	scanlinesOpacity: '1',
	overlayVignetteOpacity: '0',
	overlayGridOpacity: '0',
	overlayGrainOpacity: '0',
	overlayGlareOpacity: '0',
	displayOrder: 0
} satisfies InferInsertModel<typeof themes>;
