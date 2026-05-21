import { eq } from 'drizzle-orm';
import type { InferInsertModel } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { BUILTIN_DEFAULT_THEME_INSERT } from '../builtinDefaultTheme';
import { BUILTIN_SITE_FONT_NAME } from '../builtinSiteFont';
import { db } from '../index';
import { themes } from '../schema';

const CYBERPUNK_NEON_THEME_INSERT = {
	name: 'Cyberpunk Neon',
	description:
		'A futuristic cyberpunk theme with neon cyan and magenta accents, inspired by rainy neo-noir cityscapes',
	isActive: false,
	isDefault: false,
	isVisible: true,

	primaryColor: '#e0f7ff',
	secondaryColor: '#00d4ff',
	accentColor: '#ff0080',
	backgroundColor: '#0a0a12',
	surfaceColor: 'rgba(20, 20, 35, 0.9)',
	borderColor: '#00ffff',
	textPrimary: '#e0f7ff',
	textSecondary: '#00d4ff',
	textMuted: '#6080a0',

				backgroundImage: '/assets/img/backgrounds/2.jpg',
				backgroundImageExternal: false,
				backgroundOverlay: 'rgba(0, 0, 0, 0.6)',
				overlayDarkenOpacity: '0.6',
				backgroundBlur: 0,
				backgroundPosition: 'center center',
				backgroundSize: 'cover',
				backgroundAttachment: 'fixed',

				fontFamily: 'Rajdhani',
				headingFontFamily: 'Orbitron',
	fontScale: '1',

	borderRadius: '0px',
	widgetBorderRadius: '0px',
	scanlinesOpacity: '0.85',
	overlayVignetteOpacity: '0',
	overlayGridOpacity: '0',
	overlayGrainOpacity: '0',
	overlayGlareOpacity: '0',
	customCss: `
:root {
  --theme-shell-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  --theme-content-max-width: 1000px;
}

/* Cyberpunk glow effects */
.nav-link:hover, .btn:hover {
  text-shadow: 0 0 10px #00d4ff, 0 0 20px #00d4ff;
}
.card, .surface {
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.15), inset 0 0 30px rgba(0, 212, 255, 0.03);
}
`,
	displayOrder: 1
} satisfies InferInsertModel<typeof themes>;

const WINDOWS_XP_BLISS_THEME_INSERT = {
	name: 'Windows XP',
	description:
		'Classic Windows XP Luna chrome with the bliss wallpaper',
	isActive: false,
	isDefault: false,
	isVisible: true,

	primaryColor: '#ffffff',
	secondaryColor: '#0a246a',
	accentColor: '#0054e3',
	backgroundColor: '#ece9d8',
	surfaceColor: 'rgba(236, 233, 216, 0.94)',
	borderColor: '#0054e3',
	textPrimary: '#000000',
	textSecondary: '#0a246a',
	textMuted: '#5a5a5a',

	backgroundImage: '/assets/img/backgrounds/3.jpg',
	backgroundImageExternal: false,
	backgroundOverlay: 'rgba(255, 255, 255, 0.08)',
	overlayDarkenOpacity: '0.1',
	backgroundBlur: 0,
	backgroundPosition: 'center center',
	backgroundSize: 'cover',
	backgroundAttachment: 'fixed',

	fontFamily: 'Open Sans',
	headingFontFamily: 'Open Sans',
	fontScale: '1',

	borderRadius: '8px',
	widgetBorderRadius: '6px',
	scanlinesOpacity: '1',
	overlayVignetteOpacity: '0',
	overlayGridOpacity: '0',
	overlayGrainOpacity: '0',
	overlayGlareOpacity: '0',
	customCss: `
:root {
  --theme-shell-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  --theme-content-max-width: 1000px;
  --theme-shell-border-width: 2px;
  --theme-widget-border-width: 1px;
  --global-font-family: 'Open Sans', 'Tahoma', 'Segoe UI', system-ui, sans-serif;
  --ascii-font-family: 'Consolas', 'Courier New', monospace;
}

.content-window {
  border-color: #0054e3;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.content-area {
  background: var(--theme-background, #ece9d8);
}

.header {
  border-bottom-color: #0054e3;
}

.nav-link {
  color: var(--theme-text-secondary, #0a246a);
  text-decoration: underline;
}

.nav-link:hover,
.nav-link.active {
  color: #000080;
}

.nav-link.active::after {
  background: #0054e3;
}

.bordered-box {
  border-color: #0054e3;
  background: linear-gradient(180deg, #ffffff 0%, #ece9d8 4%, #ece9d8 100%);
  box-shadow:
    inset 1px 1px 0 #ffffff,
    inset -1px -1px 0 #808080,
    1px 1px 2px rgba(0, 0, 0, 0.2);
}

/* Discord "I'm ONLINE" widget — thicker outer frame vs 1px Luna widgets */
.bordered-box.discord-widget {
  --theme-widget-border-width: 4px;
}

.bordered-box .bordered-box-header {
  position: relative;
  padding: 0;
  min-height: 27px;
  margin: 0 -12px;
  background: linear-gradient(180deg, #0997ff 0%, #0053ee 45%, #0054e3 100%);
  border: 1px solid #003399;
  border-bottom: none;
  border-radius: 5px 5px 0 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
  overflow: hidden;
}

.bordered-box .header-text {
  position: relative;
  background: transparent;
  color: #ffffff !important;
  padding: 5px 10px;
  margin: 0 0 4px 0;
  border: none;
  border-radius: 0;
  box-shadow: none;
  min-height: 27px;
  box-sizing: border-box;
}

/* Reserve space for decorative min / max / close (non-functional) */
.bordered-box .header-right-wrapper {
  margin-right: 72px;
}

.bordered-box .header-divider {
  display: none;
}

/* Luna title-bar controls — single SVG sprite (aligned; − □ × icons) */
.bordered-box .bordered-box-header::after {
  content: '';
  position: absolute;
  right: 3px;
  top: 3px;
  width: 69px;
  height: 21px;
  border: none;
  border-radius: 0;
  pointer-events: none;
  z-index: 2;
  background: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2269%22%20height%3D%2221%22%20viewBox%3D%220%200%2069%2021%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22b%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%236db3ff%22%2F%3E%3Cstop%20offset%3D%22.45%22%20stop-color%3D%22%234589e0%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%232566c8%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22r%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23f5a8a8%22%2F%3E%3Cstop%20offset%3D%22.4%22%20stop-color%3D%22%23e57373%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23d32f2f%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20x%3D%22.5%22%20y%3D%22.5%22%20width%3D%2220%22%20height%3D%2220%22%20rx%3D%222.5%22%20fill%3D%22url(%23b)%22%20stroke%3D%22%23003c74%22%2F%3E%3Crect%20x%3D%226%22%20y%3D%2213.5%22%20width%3D%229%22%20height%3D%222.5%22%20rx%3D%22.5%22%20fill%3D%22%23fff%22%2F%3E%3Crect%20x%3D%2224.5%22%20y%3D%22.5%22%20width%3D%2220%22%20height%3D%2220%22%20rx%3D%222.5%22%20fill%3D%22url(%23b)%22%20stroke%3D%22%23003c74%22%2F%3E%3Crect%20x%3D%2230.5%22%20y%3D%226.5%22%20width%3D%228%22%20height%3D%228%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.2%22%2F%3E%3Crect%20x%3D%2248.5%22%20y%3D%22.5%22%20width%3D%2220%22%20height%3D%2220%22%20rx%3D%222.5%22%20fill%3D%22url(%23r)%22%20stroke%3D%22%238b0000%22%2F%3E%3Cpath%20d%3D%22M54.5%207.5l8.5%208.5M63%207.5l-8.5%208.5%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.6%22%20stroke-linecap%3D%22round%22%2F%3E%3C/svg%3E")
    center / 69px 21px no-repeat;
}

@media (max-width: 768px) {
  .bordered-box .bordered-box-header {
    margin-left: -10px;
    margin-right: -10px;
  }
}

@media (max-width: 480px) {
  .bordered-box .bordered-box-header {
    margin-left: -6px;
    margin-right: -6px;
  }
}

.bordered-box:hover {
  background: linear-gradient(180deg, #ffffff 0%, #f5f3ea 4%, #ece9d8 100%);
}

::selection {
  background: #316ac5;
  color: #ffffff;
}

/* Light Luna panels: use dark scanlines so the effect reads on beige */
.scanlines {
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.06) 2px,
    rgba(0, 0, 0, 0.06) 4px
  );
}
`,
	displayOrder: 2
} satisfies InferInsertModel<typeof themes>;

const WINDOWS_95_THEME_INSERT = {
	name: 'Windows 95',
	description: 'Classic Windows 95 chrome with the teal cloud wallpaper and W95FA',
	isActive: false,
	isDefault: false,
	isVisible: true,

	primaryColor: '#ffffff',
	secondaryColor: '#000080',
	accentColor: '#000080',
	backgroundColor: '#c0c0c0',
	surfaceColor: 'rgba(192, 192, 192, 0.96)',
	borderColor: '#000000',
	textPrimary: '#000000',
	textSecondary: '#000080',
	textMuted: '#404040',

	backgroundImage: '/assets/img/backgrounds/4.webp',
	backgroundImageExternal: false,
	backgroundOverlay: 'rgba(0, 0, 0, 0.12)',
	overlayDarkenOpacity: '0.12',
	backgroundBlur: 0,
	backgroundPosition: 'center center',
	backgroundSize: 'cover',
	backgroundAttachment: 'fixed',

	fontFamily: BUILTIN_SITE_FONT_NAME,
	headingFontFamily: BUILTIN_SITE_FONT_NAME,
	fontScale: '1',

	borderRadius: '0px',
	widgetBorderRadius: '0px',
	scanlinesOpacity: '1',
	overlayVignetteOpacity: '0',
	overlayGridOpacity: '0',
	overlayGrainOpacity: '0',
	overlayGlareOpacity: '0',
	customCss: `
:root {
  --theme-shell-shadow: 4px 4px 0 rgba(0, 0, 0, 0.35);
  --theme-content-max-width: 1000px;
  --theme-shell-border-width: 2px;
  --theme-widget-border-width: 2px;
  --global-font-family: 'W95FA', 'MS Sans Serif', 'Tahoma', system-ui, sans-serif;
  --ascii-font-family: 'JetBrains Mono', 'Courier New', monospace;
}

.content-window {
  border: 2px solid #000000;
  background: #c0c0c0;
  box-shadow: none;
}

.content-area {
  background: var(--theme-background, #c0c0c0);
}

/* W95FA is proportional — keep header ASCII on monospace */
.header .ascii-box pre {
  font-family: 'JetBrains Mono', 'Courier New', monospace !important;
}

.header {
  border-bottom: 2px solid #808080;
}

.nav-link {
  color: var(--theme-text-secondary, #000080);
  text-decoration: underline;
}

.nav-link:hover,
.nav-link.active {
  color: #0000ff;
}

.nav-link.active::after {
  background: #000080;
}

.bordered-box {
  border: 2px solid;
  border-color: #dfdfdf #000000 #000000 #dfdfdf;
  background: #c0c0c0;
  border-radius: 0;
  box-shadow: none;
}

.bordered-box .bordered-box-header {
  position: relative;
  padding: 0;
  min-height: 20px;
  margin: 0 -12px;
  /* Win95 active caption: solid navy (gradient title bars are Win98+) */
  background: #000080;
  border: none;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
}

.bordered-box .header-text {
  position: relative;
  background: transparent;
  color: #ffffff !important;
  padding: 2px 6px;
  margin: 0;
  border: none;
  border-radius: 0;
  box-shadow: none;
  min-height: 20px;
  line-height: 16px;
  box-sizing: border-box;
}

.bordered-box .header-right-wrapper {
  margin-right: 54px;
}

.bordered-box .header-divider {
  display: none;
}

/* Caption buttons ~14×13px (classic Win95 proportions) */
.bordered-box .bordered-box-header::after {
  content: '';
  position: absolute;
  right: 2px;
  top: 3px;
  width: 50px;
  height: 14px;
  border: none;
  border-radius: 0;
  pointer-events: none;
  z-index: 2;
  background: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2250%22%20height%3D%2214%22%20viewBox%3D%220%200%2050%2014%22%3E%3Cg%20fill%3D%22%23c0c0c0%22%20stroke%3D%22%23000%22%20stroke-width%3D%221%22%3E%3Crect%20x%3D%22.5%22%20y%3D%22.5%22%20width%3D%2214%22%20height%3D%2213%22%2F%3E%3Crect%20x%3D%2217.5%22%20y%3D%22.5%22%20width%3D%2214%22%20height%3D%2213%22%2F%3E%3Crect%20x%3D%2234.5%22%20y%3D%22.5%22%20width%3D%2214%22%20height%3D%2213%22%2F%3E%3C%2Fg%3E%3Cpath%20d%3D%22M1%201h13M1%201v12M14%2013H1M14%201v12%22%20stroke%3D%22%23fff%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M18%201h13M18%201v12M31%2013H18M31%201v12%22%20stroke%3D%22%23fff%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M35%201h13M35%201v12M48%2013H35M48%201v12%22%20stroke%3D%22%23fff%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M35%2013H48M48%201H35%22%20stroke%3D%22%23808080%22%20fill%3D%22none%22%2F%3E%3Crect%20x%3D%224%22%20y%3D%229%22%20width%3D%227%22%20height%3D%222%22%20fill%3D%22%23000%22%2F%3E%3Crect%20x%3D%2221%22%20y%3D%224%22%20width%3D%227%22%20height%3D%226%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%221%22%2F%3E%3Cpath%20d%3D%22M39%204l7%207M46%204l-7%207%22%20stroke%3D%22%23000%22%20stroke-width%3D%221.1%22%20stroke-linecap%3D%22square%22%2F%3E%3C%2Fsvg%3E")
    center / 50px 14px no-repeat;
}

@media (max-width: 768px) {
  .bordered-box .bordered-box-header {
    margin-left: -10px;
    margin-right: -10px;
  }
}

@media (max-width: 480px) {
  .bordered-box .bordered-box-header {
    margin-left: -6px;
    margin-right: -6px;
  }
}

.bordered-box:hover {
  background: #c0c0c0;
}

::selection {
  background: #000080;
  color: #ffffff;
}

.scanlines {
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.05) 2px,
    rgba(0, 0, 0, 0.05) 4px
  );
}
`,
	displayOrder: 3
} satisfies InferInsertModel<typeof themes>;

/** Bundled themes inserted by full seed (after clear) or partial seed when missing. */
export const ALL_SEED_THEMES = [
	BUILTIN_DEFAULT_THEME_INSERT,
	CYBERPUNK_NEON_THEME_INSERT,
	WINDOWS_XP_BLISS_THEME_INSERT,
	WINDOWS_95_THEME_INSERT
] as const satisfies readonly InferInsertModel<typeof themes>[];

const RETIRED_THEME_NAMES = ['Kawaii Pink'] as const;

async function removeRetiredThemes(): Promise<void> {
	for (const name of RETIRED_THEME_NAMES) {
		const removed = await db.delete(themes).where(eq(themes.name, name)).returning({ id: themes.id });
		if (removed.length > 0) {
			logger.info(`Removed retired theme: ${name}`);
		}
	}
}

async function applyBundledThemeToDb(theme: InferInsertModel<typeof themes>) {
	const rows = await db
		.update(themes)
		.set({ ...theme, updatedAt: new Date() })
		.where(eq(themes.name, theme.name))
		.returning();

	if (rows.length > 0) {
		logger.info(`Updated theme: ${theme.name}`);
		return rows[0];
	}

	return null;
}

async function seedThemeIfMissing(theme: InferInsertModel<typeof themes>) {
	const [existing] = await db
		.select({ id: themes.id })
		.from(themes)
		.where(eq(themes.name, theme.name))
		.limit(1);

	if (existing) {
		logger.info(`Theme "${theme.name}" already exists — skipped.`);
		return null;
	}

	const [inserted] = await db.insert(themes).values(theme).returning();
	logger.info(`Inserted theme: ${theme.name}`);
	return inserted;
}

/** Overwrite bundled themes in the DB from seed definitions (by name). */
export async function refreshBundledThemes() {
	logger.info('Refreshing bundled themes...');
	await removeRetiredThemes();

	const updated = [];
	for (const theme of ALL_SEED_THEMES) {
		const row = await applyBundledThemeToDb(theme);
		if (row) {
			updated.push(row);
		} else {
			logger.info(`Theme "${theme.name}" not found — skipped refresh.`);
		}
	}
	return updated;
}

/** Insert any bundled theme that is not already present (safe on existing DBs). */
export async function seedThemesIfMissing() {
	logger.info('Seeding missing themes...');
	await removeRetiredThemes();

	const inserted = [];
	for (const theme of ALL_SEED_THEMES) {
		const row = await seedThemeIfMissing(theme);
		if (row) inserted.push(row);
	}
	return inserted;
}

/** Insert all bundled themes (use only when `themes` table was cleared). */
export async function seedThemes() {
	logger.info('Seeding themes...');
	return db.insert(themes).values([...ALL_SEED_THEMES]).returning();
}

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const forceAll = argv.includes('--all');
	const refresh = argv.includes('--refresh');

	const run = refresh
		? refreshBundledThemes()
		: forceAll
			? seedThemes()
			: seedThemesIfMissing();

	run
		.then(() => process.exit(0))
		.catch((error) => {
			logger.error('Theme seed failed:', error);
			process.exit(1);
		});
}
