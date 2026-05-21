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

				backgroundImage: '/assets/themes/cyberpunk-neon/backgrounds/2.jpg',
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

	backgroundImage: '/assets/themes/windows-xp/backgrounds/3.jpg',
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

/* Music widget — Now Playing / Recently Played status icons */
.home-content .bordered-box.music-widget .status-icon.offline {
  width: 16px;
  height: 16px;
  min-width: 16px;
  border-radius: 0;
  background-color: transparent !important;
  background: url('/assets/themes/windows-xp/misc/notplaying.png') no-repeat center / contain;
  image-rendering: auto;
}

.home-content .bordered-box.music-widget .status-icon.playing {
  width: 16px;
  height: 16px;
  min-width: 16px;
  color: transparent !important;
  background: url('/assets/themes/windows-xp/misc/playing.png') no-repeat center / contain;
  image-rendering: auto;
  animation: none !important;
  filter: none !important;
}

.home-content .bordered-box.music-widget .status-icon.playing svg {
  display: none !important;
}

/* Character Map — match Luna widget chrome */
.emoji-picker {
  border: 1px solid #0054e3;
  border-radius: 6px 6px 0 0;
  box-shadow:
    inset 1px 1px 0 #ffffff,
    inset -1px -1px 0 #808080,
    1px 1px 2px rgba(0, 0, 0, 0.2);
}

.emoji-picker .win95-titlebar {
  background: linear-gradient(180deg, #0997ff 0%, #0053ee 45%, #0054e3 100%);
  color: #ffffff;
  border-bottom: 1px solid #003399;
  border-top: none;
}

.emoji-picker .titlebar-button {
  border: 1px solid #003399;
  background: linear-gradient(180deg, #3c8cfd 0%, #2459d3 100%);
  color: #ffffff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.emoji-picker .titlebar-button:hover:not(:disabled) {
  background: linear-gradient(180deg, #5a9cff 0%, #3168e0 100%);
}

.emoji-picker .win95-tabs {
  background: var(--theme-background);
  border-bottom: 1px solid #aca899;
}

.emoji-picker .win95-tab {
  border: 1px solid #aca899;
  background: linear-gradient(180deg, #ffffff 0%, #ece9d8 100%);
  color: var(--theme-text-primary);
  box-shadow: none;
}

.emoji-picker .win95-tab.active {
  border-bottom-color: var(--theme-background);
  background: var(--theme-background);
}

.emoji-picker .win95-content {
  background: #ffffff;
  border: 1px inset #aca899;
}

.emoji-picker .win95-grid,
.emoji-picker .win95-char-button {
  background: #ffffff;
  border-color: #aca899;
  color: var(--theme-text-primary);
  box-shadow: none;
}

.emoji-picker .win95-char-button:hover {
  background: #316ac5;
  color: #ffffff;
  border-color: #316ac5;
}

.emoji-picker .win95-statusbar {
  background: linear-gradient(180deg, #ece9d8 0%, #d6d3ce 100%);
  color: var(--theme-text-primary);
  border-top: 1px solid #aca899;
}

.emoji-picker .category-heading {
  color: var(--theme-text-muted);
  border-bottom-color: #aca899;
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

	backgroundImage: '/assets/themes/windows-95/backgrounds/4.webp',
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

/* Music widget — Now Playing / Recently Played status icons */
.home-content .bordered-box.music-widget .status-icon.offline {
  width: 16px;
  height: 16px;
  min-width: 16px;
  border-radius: 0;
  background-color: transparent !important;
  background: url('/assets/themes/windows-95/misc/notplaying.webp') no-repeat center / contain;
  image-rendering: pixelated;
}

.home-content .bordered-box.music-widget .status-icon.playing {
  width: 16px;
  height: 16px;
  min-width: 16px;
  color: transparent !important;
  background: url('/assets/themes/windows-95/misc/playing.webp') no-repeat center / contain;
  image-rendering: pixelated;
  animation: none !important;
  filter: none !important;
}

.home-content .bordered-box.music-widget .status-icon.playing svg {
  display: none !important;
}

/* Character Map — classic Win95 chrome */
.emoji-picker {
  border: 2px solid;
  border-color: #dfdfdf #000000 #000000 #dfdfdf;
  border-radius: 0;
  box-shadow: none;
}

.emoji-picker .win95-titlebar {
  background: #000080;
  color: #ffffff;
  border-bottom: none;
}

.emoji-picker .titlebar-button {
  border: 1px solid #000000;
  background: #c0c0c0;
  color: #000000;
  box-shadow: none;
}

.emoji-picker .titlebar-button:hover:not(:disabled) {
  background: #dfdfdf;
}

.emoji-picker .win95-tabs,
.emoji-picker .win95-statusbar {
  background: #c0c0c0;
  border-color: #808080;
}

.emoji-picker .win95-tab {
  background: #c0c0c0;
  border: 1px outset #c0c0c0;
  color: #000000;
}

.emoji-picker .win95-tab.active {
  background: #c0c0c0;
  border: 1px inset #c0c0c0;
}

.emoji-picker .win95-content {
  background: #ffffff;
  border: 2px inset #c0c0c0;
}

.emoji-picker .win95-grid,
.emoji-picker .win95-char-button {
  background: #ffffff;
  border: 1px solid #c0c0c0;
  color: #000000;
  box-shadow: none;
}

.emoji-picker .win95-char-button:hover {
  background: #000080;
  color: #ffffff;
  border-color: #000080;
}

.emoji-picker .category-heading {
  color: #000000;
  border-bottom-color: #808080;
}
`,
	displayOrder: 3
} satisfies InferInsertModel<typeof themes>;

const GEOCITIES_THEME_INSERT = {
	name: 'GeoCities',
	description:
		'Late-90s personal homepage — tiled fractal wallpaper, GifCities stickers, teal/green/amber accents',
	isActive: false,
	isDefault: false,
	isVisible: true,

	primaryColor: '#d8f2e8',
	secondaryColor: '#7ad4e8',
	accentColor: '#e8a857',
	backgroundColor: '#000000',
	surfaceColor: 'rgba(14, 22, 20, 0.82)',
	borderColor: '#5a9a7a',
	textPrimary: '#d8f2e8',
	textSecondary: '#7ad4e8',
	textMuted: '#8aa89a',

	backgroundImage: '/assets/themes/geocities/backgrounds/5.gif',
	backgroundImageExternal: false,
	backgroundOverlay: 'rgba(0, 0, 0, 0)',
	overlayDarkenOpacity: '0',
	backgroundBlur: 0,
	backgroundPosition: 'top left',
	backgroundSize: 'auto',
	backgroundAttachment: 'fixed',

	fontFamily: 'Comic Neue',
	headingFontFamily: 'Comic Neue',
	fontScale: '1.05',

	borderRadius: '0px',
	widgetBorderRadius: '0px',
	scanlinesOpacity: '0',
	overlayVignetteOpacity: '0',
	overlayGridOpacity: '0',
	overlayGrainOpacity: '0',
	overlayGlareOpacity: '0',
	customCss: `
	html[data-theme="geocities"] {
	--geo-panel: rgba(14, 22, 20, 0.82);
	--geo-panel-raised: #1a2824;
	--geo-teal: #5a9a7a;
	--geo-cyan: #7ad4e8;
	--geo-mint: #d8f2e8;
	--geo-purple: #9b8ac4;
	--geo-amber: #e8a857;
	--geo-indigo: #2a2040;
	--theme-shell-shadow: 4px 4px 0 rgba(0, 0, 0, 0.85);
	--theme-content-max-width: 1000px;
	--theme-shell-border-width: 3px;
	--theme-widget-border-width: 2px;
	--global-font-family: 'Comic Neue', 'Comic Sans MS', 'Chalkboard SE', cursive, sans-serif;
	--ascii-font-family: 'JetBrains Mono', 'Courier New', monospace;
	}

	/* Tiled fractal wallpaper (ThemeProvider defaults to no-repeat) */
	html[data-theme="geocities"] .bg-image {
	background-repeat: repeat !important;
	background-size: auto !important;
	}

	/* Decorative GIFs from https://gifcities.org (Internet Archive GeoCities mirror) — self-hosted under /assets/themes/geocities/misc/ */

	html[data-theme="geocities"] .content-window {
	position: relative;
	border: 3px ridge var(--geo-teal, #5a9a7a);
	background: var(--geo-panel, rgba(14, 22, 20, 0.82));
	backdrop-filter: none;
	box-shadow:
	  4px 4px 0 rgba(0, 0, 0, 0.85),
	  0 0 24px rgba(90, 154, 122, 0.12);
	}

	html[data-theme="geocities"] .content-area {
	background: var(--geo-panel, rgba(14, 22, 20, 0.82));
	padding-bottom: 5.5rem !important;
	}

	/* Site footer strip (GeoCities “legal” bar) */
	html[data-theme="geocities"] .content-area::after {
	content: 'Last updated: May 2026 · Best viewed at 800×600 · Netscape / IE · ♪ no MIDI autoplay ♪ · Y2K OK';
	display: block;
	margin-top: 2rem;
	padding: 10px 12px;
	border-top: 2px ridge var(--geo-teal, #5a9a7a);
	background: rgba(0, 0, 0, 0.65);
	color: var(--geo-cyan, #7ad4e8);
	font-family: 'Courier New', Courier, monospace;
	font-size: 0.68rem;
	line-height: 1.5;
	text-align: center;
	letter-spacing: 0.04em;
	}

	html[data-theme="geocities"] .header {
	position: relative;
	padding-bottom: 12px;
	margin-bottom: 8px;
	border-bottom: 2px double var(--geo-teal, #5a9a7a);
	}

	html[data-theme="geocities"] .ascii-container {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	margin: 0 auto 12px !important;
	padding: 10px 28px 12px;
	max-width: 100%;
	border: 2px ridge var(--geo-teal, #5a9a7a);
	background: rgba(0, 0, 0, 0.5);
	box-shadow:
	  inset 1px 1px 0 rgba(122, 212, 232, 0.15),
	  4px 4px 0 rgba(0, 0, 0, 0.5);
	}

	html[data-theme="geocities"] .ascii-container::before {
	content: '★ Welcome to my homepage ★';
	display: block;
	width: 100%;
	margin-bottom: 10px;
	text-align: center;
	font-family: var(--global-font-family);
	font-size: clamp(0.75rem, 2.5vw, 0.95rem);
	font-weight: bold;
	line-height: 1.3;
	color: var(--geo-amber, #e8a857);
	text-transform: uppercase;
	letter-spacing: 0.12em;
	text-shadow:
	  1px 1px 0 #000000,
	  0 0 12px rgba(232, 168, 87, 0.35);
	}

	@media (prefers-reduced-motion: no-preference) {
	html[data-theme="geocities"] .ascii-container::before {
	  animation: geo-welcome-pulse 2.5s step-end infinite;
	}
	}

	@keyframes geo-welcome-pulse {
	50% {
	  opacity: 0.55;
	}
	}

	html[data-theme="geocities"] .ascii-link {
	display: flex;
	flex-direction: column;
	align-items: center;
	}

	html[data-theme="geocities"] .ascii-box {
	position: relative;
	}

	html[data-theme="geocities"] .ascii-box::before,
	html[data-theme="geocities"] .ascii-box::after {
	content: '';
	position: absolute;
	top: 50%;
	width: 22px;
	height: 22px;
	transform: translateY(-50%);
	background: url('/assets/themes/geocities/misc/header-sparkle.gif') no-repeat center / contain;
	image-rendering: pixelated;
	mix-blend-mode: lighten;
	pointer-events: none;
	opacity: 0.75;
	}

	html[data-theme="geocities"] .ascii-box::before {
	left: -30px;
	}

	html[data-theme="geocities"] .ascii-box::after {
	right: -30px;
	}

	html[data-theme="geocities"] .ascii-link::after {
	content: '';
	display: block;
	width: 88px;
	height: 31px;
	margin-top: 10px;
	background: url('/assets/themes/geocities/misc/under-construction.gif') no-repeat center / contain;
	image-rendering: pixelated;
	mix-blend-mode: lighten;
	opacity: 0.95;
	}

	html[data-theme="geocities"] .header .ascii-box pre {
	font-family: 'JetBrains Mono', 'Courier New', monospace !important;
	animation: geo-ascii-colors 14s ease-in-out infinite !important;
	}

	@keyframes geo-ascii-colors {
	0%,
	100% {
	  color: var(--geo-mint, #d8f2e8);
	}
	33% {
	  color: var(--geo-cyan, #7ad4e8);
	}
	66% {
	  color: var(--geo-amber, #e8a857);
	}
	}

	html[data-theme="geocities"] .header .ascii-link:hover .ascii-box pre {
	color: var(--geo-amber, #e8a857) !important;
	}

	html[data-theme="geocities"] .header .nav {
	margin-top: 16px !important;
	padding-top: 10px;
	border-top: 1px dashed var(--geo-purple, #9b8ac4);
	}

	html[data-theme="geocities"] .header .nav-list {
	justify-content: center;
	gap: 14px 22px;
	}

	html[data-theme="geocities"] .header .nav-link {
	font-family: var(--global-font-family) !important;
	}

	html[data-theme="geocities"] .nav-link {
	color: var(--geo-cyan, #7ad4e8);
	text-decoration: underline;
	font-weight: bold;
	}

	html[data-theme="geocities"] .nav-link:visited {
	color: var(--geo-purple, #9b8ac4);
	}

	html[data-theme="geocities"] .nav-link:hover,
	html[data-theme="geocities"] .nav-link.active {
	color: var(--geo-amber, #e8a857);
	background-color: rgba(232, 168, 87, 0.15);
	}

	html[data-theme="geocities"] .nav-link.active::after {
	background: var(--geo-teal, #5a9a7a);
	}

	html[data-theme="geocities"] .nav .nav-link::before {
	content: '';
	display: inline-block;
	width: 16px;
	height: 16px;
	margin-right: 5px;
	vertical-align: -2px;
	background-repeat: no-repeat;
	background-position: center;
	background-size: contain;
	image-rendering: pixelated;
	opacity: 0.9;
	}

	html[data-theme="geocities"] .nav-link[href='/']::before {
	background-image: url('/assets/themes/geocities/misc/nav-home.gif');
	}

	html[data-theme="geocities"] .nav-link[href='/about']::before {
	background-image: url('/assets/themes/geocities/misc/nav-about.gif');
	}

	html[data-theme="geocities"] .nav-link[href='/projects']::before {
	background-image: url('/assets/themes/geocities/misc/nav-projects.gif');
	}

	html[data-theme="geocities"] .nav-link[href='/blog']::before {
	background-image: url('/assets/themes/geocities/misc/nav-blog.gif');
	}

	html[data-theme="geocities"] .nav-link[href='/contact']::before {
	background-image: url('/assets/themes/geocities/misc/mail-icon.gif');
	}

	@media (prefers-reduced-motion: no-preference) {
	html[data-theme="geocities"] .nav-link.active {
	  animation: geo-nav-blink 1.1s step-end infinite;
	}
	}

	@keyframes geo-nav-blink {
	50% {
	  opacity: 0.35;
	}
	}

	html[data-theme="geocities"] .banner-container {
	position: relative;
	border: 2px solid var(--geo-teal, #5a9a7a);
	background: rgba(0, 0, 0, 0.75) !important;
	color: #00ff66 !important;
	font-weight: bold;
	min-height: 2.5rem;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	font-size: 0.9em;
	}

	html[data-theme="geocities"] .banner-container::before {
	content: '';
	position: absolute;
	left: 6px;
	top: 50%;
	width: 120px;
	height: 36px;
	transform: translateY(-50%);
	background: url('/assets/themes/geocities/misc/welcome.gif') no-repeat left center / contain;
	image-rendering: pixelated;
	pointer-events: none;
	opacity: 0.35;
	z-index: 0;
	}

	html[data-theme="geocities"] .banner-container .banner-content {
	position: relative;
	z-index: 1;
	}

	html[data-theme="geocities"] .banner-side-label {
	font-family: var(--global-font-family);
	}

	html[data-theme="geocities"] .banner-side-label::before {
	content: '← webring ';
	color: var(--geo-purple, #9b8ac4);
	font-style: normal;
	font-weight: bold;
	}

	html[data-theme="geocities"] .banner-side-text {
	background: none !important;
	background-size: unset !important;
	-webkit-background-clip: unset !important;
	background-clip: unset !important;
	-webkit-text-fill-color: var(--geo-cyan, #7ad4e8) !important;
	color: var(--geo-cyan, #7ad4e8) !important;
	font-family: var(--global-font-family);
	font-weight: bold;
	font-style: italic;
	text-decoration: underline;
	animation: none !important;
	}

	html[data-theme="geocities"] .banner-side-arrow {
	color: var(--geo-amber, #e8a857) !important;
	opacity: 0.85 !important;
	animation: none !important;
	}

	html[data-theme="geocities"] .banner-side-arrow::after {
	content: ' →';
	color: var(--geo-purple, #9b8ac4);
	}

	html[data-theme="geocities"] .typing-header {
	position: relative;
	background: #000000 !important;
	border: 2px solid var(--geo-teal, #5a9a7a) !important;
	border-radius: 0 !important;
	font-family: var(--global-font-family) !important;
	}

	html[data-theme="geocities"] .typing-header .typing-text,
	html[data-theme="geocities"] .typing-header .cursor {
	color: var(--geo-cyan, #7ad4e8) !important;
	font-family: inherit !important;
	text-shadow: 0 0 8px rgba(122, 212, 232, 0.45);
	}

	html[data-theme="geocities"] .blog-page .typing-header::after {
	content: '';
	position: absolute;
	right: 10px;
	top: 50%;
	width: 36px;
	height: 22px;
	transform: translateY(-50%);
	background: url('/assets/themes/geocities/misc/new.gif') no-repeat center / contain;
	image-rendering: pixelated;
	mix-blend-mode: lighten;
	pointer-events: none;
	opacity: 0.9;
	}

	/* Contact page panels */
	html[data-theme="geocities"] .page-content:has(.email-section) .intro-message,
	html[data-theme="geocities"] .page-content:has(.email-section) .email-section,
	html[data-theme="geocities"] .page-content:has(.email-section) .social-section {
	background: var(--geo-panel-raised, #1a2824) !important;
	color: var(--geo-mint, #d8f2e8) !important;
	border: 2px ridge var(--geo-teal, #5a9a7a);
	padding: 14px 16px !important;
	margin-bottom: 16px;
	box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.5);
	}

	html[data-theme="geocities"] .page-content:has(.email-section) .intro-message :is(p, li, a),
	html[data-theme="geocities"] .page-content:has(.email-section) .email-section :is(p, a, span),
	html[data-theme="geocities"] .page-content:has(.email-section) .social-section :is(p, a) {
	color: var(--geo-cyan, #7ad4e8) !important;
	}

	html[data-theme="geocities"] .page-content:has(.email-section) .intro-message :is(a:hover, a:focus-visible),
	html[data-theme="geocities"] .page-content:has(.email-section) .email-section a:hover,
	html[data-theme="geocities"] .page-content:has(.email-section) .social-section a:hover {
	color: #ff00ff !important;
	}

	html[data-theme="geocities"] .page-content:has(.email-section) .email-link {
	font-weight: bold;
	text-decoration: underline;
	}

	html[data-theme="geocities"] .page-content:has(.email-section) .section-divider {
	height: 4px;
	border: none;
	background: linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff);
	margin: 1.25em 0;
	}

	/* Blog index: panel cards (matches projects / site palette) */
	html[data-theme="geocities"] .blog-page .post-card {
	background: var(--geo-panel-raised, #1a2824) !important;
	border: 2px ridge var(--geo-teal, #5a9a7a) !important;
	box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.5);
	}

	html[data-theme="geocities"] .blog-page .post-card:hover {
	background: #223830 !important;
	border-color: var(--geo-cyan, #7ad4e8) !important;
	box-shadow: 4px 4px 0 rgba(122, 212, 232, 0.15);
	}

	html[data-theme="geocities"] .blog-page .post-card .post-content {
	color: var(--geo-mint, #d8f2e8);
	}

	/* Rolling rainbow titles (per-character spans from RainbowText.svelte) */
	html[data-theme="geocities"] .blog-page .post-title,
	html[data-theme="geocities"] .blog-post-page .post-title,
	html[data-theme="geocities"] .page-content:has(.category-section) .project-title,
	html[data-theme="geocities"] .category-hero + .page-content .project-title {
	font-family: var(--global-font-family) !important;
	font-weight: bold !important;
	text-decoration: underline;
	}

	html[data-theme="geocities"] .blog-post-page .post-title {
	text-transform: uppercase;
	letter-spacing: 0.04em;
	}

	html[data-theme="geocities"] .blog-page .post-title .geo-rainbow-text,
	html[data-theme="geocities"] .blog-post-page .post-title .geo-rainbow-text,
	html[data-theme="geocities"] .page-content:has(.category-section) .project-title .geo-rainbow-text,
	html[data-theme="geocities"] .category-hero + .page-content .project-title .geo-rainbow-text {
	display: inline;
	text-decoration: inherit;
	}

	html[data-theme="geocities"] .blog-page .geo-rainbow-char,
	html[data-theme="geocities"] .blog-post-page .geo-rainbow-char,
	html[data-theme="geocities"] .page-content:has(.category-section) .geo-rainbow-char,
	html[data-theme="geocities"] .category-hero + .page-content .geo-rainbow-char {
	display: inline;
	font: inherit;
	font-weight: inherit;
	text-decoration: inherit;
	text-shadow: 1px 1px 0 #000000;
	}

	@media (prefers-reduced-motion: no-preference) {
	html[data-theme="geocities"] .blog-page .geo-rainbow-char,
	html[data-theme="geocities"] .blog-post-page .geo-rainbow-char,
	html[data-theme="geocities"] .page-content:has(.category-section) .geo-rainbow-char,
	html[data-theme="geocities"] .category-hero + .page-content .geo-rainbow-char {
	  animation: geo-rainbow-cycle 2.5s linear infinite;
	  animation-delay: calc(var(--i, 0) * -0.12s);
	}
	}

	html[data-theme="geocities"] .blog-page .post-title:hover .geo-rainbow-char,
	html[data-theme="geocities"] .blog-post-page .post-title:hover .geo-rainbow-char,
	html[data-theme="geocities"] .page-content:has(.category-section) .project-title:hover .geo-rainbow-char,
	html[data-theme="geocities"] .category-hero + .page-content .project-title:hover .geo-rainbow-char {
	animation-play-state: paused;
	color: #ff00ff !important;
	text-shadow:
	  1px 1px 0 #000000,
	  0 0 10px rgba(255, 0, 255, 0.55);
	}

	html[data-theme="geocities"] .blog-page .post-date {
	color: var(--geo-mint, #d8f2e8) !important;
	opacity: 0.85;
	}

	html[data-theme="geocities"] .blog-page .read-more {
	color: var(--geo-cyan, #7ad4e8) !important;
	font-weight: bold;
	text-decoration: underline;
	}

	html[data-theme="geocities"] .blog-page .read-more:hover {
	color: #ff00ff !important;
	}

	/* Blog post detail */
	html[data-theme="geocities"] .blog-post-page::before {
	content: '★ Now reading ★';
	display: block;
	margin-bottom: 14px;
	padding: 8px 10px;
	text-align: center;
	font-family: var(--global-font-family);
	font-size: 0.85rem;
	font-weight: bold;
	color: var(--geo-amber, #e8a857);
	text-transform: uppercase;
	letter-spacing: 0.1em;
	border: 2px dashed var(--geo-purple, #9b8ac4);
	background: rgba(0, 0, 0, 0.45);
	}

	html[data-theme="geocities"] .blog-post-page .blog-post {
	background: var(--geo-panel-raised, #1a2824) !important;
	border: 2px ridge var(--geo-teal, #5a9a7a) !important;
	padding: 1.25rem 1.5rem !important;
	margin-bottom: 1.5rem;
	box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.5);
	}

	html[data-theme="geocities"] .blog-post-page .post-meta {
	color: var(--geo-mint, #d8f2e8) !important;
	border-bottom: 1px dashed var(--geo-teal, #5a9a7a);
	padding-bottom: 1rem;
	}

	html[data-theme="geocities"] .blog-post-page .post-meta .meta-item,
	html[data-theme="geocities"] .blog-post-page .post-meta .meta-separator {
	color: var(--geo-mint, #d8f2e8) !important;
	}

	html[data-theme="geocities"] .blog-post-page .post-content {
	color: var(--geo-mint, #d8f2e8) !important;
	}

	html[data-theme="geocities"] .blog-post-page .post-content :global(p),
	html[data-theme="geocities"] .blog-post-page .post-content :global(li) {
	color: var(--geo-mint, #d8f2e8) !important;
	}

	html[data-theme="geocities"] .blog-post-page .post-content :global(h1),
	html[data-theme="geocities"] .blog-post-page .post-content :global(h2),
	html[data-theme="geocities"] .blog-post-page .post-content :global(h3),
	html[data-theme="geocities"] .blog-post-page .post-content :global(h4) {
	font-family: 'Times New Roman', Times, serif !important;
	color: var(--geo-amber, #e8a857) !important;
	text-shadow: 1px 1px 0 #000000;
	}

	html[data-theme="geocities"] .blog-post-page .post-content :global(a) {
	color: var(--geo-cyan, #7ad4e8) !important;
	font-weight: bold;
	text-decoration: underline;
	}

	html[data-theme="geocities"] .blog-post-page .post-content :global(a:hover) {
	color: #ff00ff !important;
	}

	html[data-theme="geocities"] .blog-post-page .post-navigation {
	border-top-color: var(--geo-teal, #5a9a7a) !important;
	}

	html[data-theme="geocities"] .blog-post-page .post-navigation .nav-link {
	color: var(--geo-cyan, #7ad4e8) !important;
	font-family: var(--global-font-family) !important;
	font-weight: bold !important;
	text-decoration: underline;
	border: 2px ridge var(--geo-teal, #5a9a7a) !important;
	background: rgba(0, 0, 0, 0.35) !important;
	padding: 6px 12px !important;
	border-radius: 0 !important;
	}

	html[data-theme="geocities"] .blog-post-page .post-navigation .nav-link:hover {
	color: #ff00ff !important;
	border-color: var(--geo-purple, #9b8ac4) !important;
	background: rgba(42, 64, 56, 0.9) !important;
	}

	html[data-theme="geocities"] .blog-post-page .blog-post-toolbar .site-back-nav {
	color: var(--geo-cyan, #7ad4e8) !important;
	font-family: var(--global-font-family) !important;
	font-weight: bold;
	text-decoration: underline;
	}

	/* About page */
	html[data-theme="geocities"] .page-content:has(.about-section)::before {
	content: '★ All about yours truly ★';
	display: block;
	margin-bottom: 14px;
	padding: 8px 10px;
	text-align: center;
	font-family: var(--global-font-family);
	font-size: 0.85rem;
	font-weight: bold;
	color: var(--geo-amber, #e8a857);
	text-transform: uppercase;
	letter-spacing: 0.1em;
	border: 2px dashed var(--geo-purple, #9b8ac4);
	background: rgba(0, 0, 0, 0.45);
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .section-title {
	display: inline-block;
	margin: 0 0 12px;
	padding: 5px 10px;
	background: var(--geo-indigo, #2a2040);
	color: var(--geo-amber, #e8a857) !important;
	border: 2px ridge var(--geo-teal, #5a9a7a);
	font-family: var(--global-font-family) !important;
	font-size: 1rem !important;
	font-weight: bold !important;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	text-shadow: 1px 1px 0 #000000;
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .section-subtitle {
	color: var(--geo-mint, #d8f2e8) !important;
	font-style: italic;
	font-family: var(--global-font-family);
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .about-section {
	background: var(--geo-panel-raised, #1a2824) !important;
	color: var(--geo-mint, #d8f2e8);
	border: 2px ridge var(--geo-teal, #5a9a7a);
	padding: 14px 16px !important;
	margin-bottom: 20px;
	box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.5);
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .bio-content,
	html[data-theme="geocities"] .page-content:has(.about-section) .bio-content :is(p, li, dd, dt) {
	color: var(--geo-mint, #d8f2e8) !important;
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .skills-section {
	background: rgba(0, 0, 0, 0.45);
	border: 2px ridge var(--geo-teal, #5a9a7a);
	padding: 14px 16px !important;
	margin-bottom: 20px;
	box-shadow: inset 1px 1px 0 rgba(122, 212, 232, 0.12);
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .skill-card {
	background: var(--geo-panel-raised, #1a2824) !important;
	border: 1px solid var(--geo-teal, #5a9a7a);
	padding: 10px 12px;
	margin-bottom: 10px;
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .skill-category {
	color: var(--geo-cyan, #7ad4e8) !important;
	font-family: var(--global-font-family);
	text-transform: uppercase;
	font-size: 0.9em;
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .skill-name {
	color: var(--geo-mint, #d8f2e8) !important;
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .skill-bar {
	background: #000000 !important;
	border: 1px ridge var(--geo-teal, #5a9a7a);
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .certifications-section {
	background: var(--geo-panel-raised, #1a2824) !important;
	color: var(--geo-mint, #d8f2e8);
	border: 2px ridge var(--geo-teal, #5a9a7a);
	padding: 14px 16px !important;
	margin-bottom: 16px;
	box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.5);
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .certification-card {
	background: rgba(0, 0, 0, 0.35) !important;
	border: 2px ridge var(--geo-teal, #5a9a7a);
	color: var(--geo-mint, #d8f2e8) !important;
	box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.35);
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .certification-card:hover {
	border-color: var(--geo-cyan, #7ad4e8);
	background: rgba(42, 64, 56, 0.6) !important;
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .cert-name {
	color: var(--geo-cyan, #7ad4e8) !important;
	font-family: var(--global-font-family);
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .cert-meta {
	color: var(--geo-mint, #d8f2e8) !important;
	opacity: 0.85;
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .carousel-nav {
	background: rgba(0, 0, 0, 0.35) !important;
	border: 2px ridge var(--geo-teal, #5a9a7a) !important;
	color: var(--geo-cyan, #7ad4e8) !important;
	border-radius: 0 !important;
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .carousel-nav:hover:not(:disabled) {
	color: #ff00ff !important;
	border-color: var(--geo-purple, #9b8ac4) !important;
	background: rgba(42, 64, 56, 0.9) !important;
	}

	html[data-theme="geocities"] .page-content:has(.about-section) .carousel-nav:disabled {
	opacity: 0.45;
	}

	/* Projects index + category detail */
	html[data-theme="geocities"] .page-content:has(.category-section)::before,
	html[data-theme="geocities"] .category-hero + .page-content::before {
	content: '★ Cool projects — click to view! ★';
	display: block;
	margin-bottom: 14px;
	padding: 8px 10px;
	text-align: center;
	font-family: var(--global-font-family);
	font-size: 0.85rem;
	font-weight: bold;
	color: var(--geo-amber, #e8a857);
	text-transform: uppercase;
	letter-spacing: 0.1em;
	border: 2px dashed var(--geo-purple, #9b8ac4);
	background: rgba(0, 0, 0, 0.45);
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .category-section {
	margin-bottom: 2rem;
	padding-bottom: 0.5rem;
	border-bottom: 1px dashed var(--geo-teal, #5a9a7a);
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .category-header {
	border-bottom: 2px solid var(--geo-purple, #9b8ac4) !important;
	margin-bottom: 1rem;
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .category-title {
	font-family: 'Times New Roman', Times, serif !important;
	color: var(--geo-amber, #e8a857) !important;
	text-shadow: 1px 1px 0 #000000;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	}

	@media (prefers-reduced-motion: no-preference) {
	html[data-theme="geocities"] .page-content:has(.category-section) .category-title,
	html[data-theme="geocities"] .category-hero .typing-text {
	  animation: geo-category-blink 2.2s step-end infinite;
	}
	}

	@keyframes geo-category-blink {
	0%,
	100% {
	  color: var(--geo-amber, #e8a857);
	}
	50% {
	  color: var(--geo-cyan, #7ad4e8);
	}
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .view-all-link,
	html[data-theme="geocities"] .category-hero + .page-content .view-all-link {
	color: var(--geo-cyan, #7ad4e8) !important;
	font-weight: bold;
	text-decoration: underline;
	font-family: var(--global-font-family);
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .view-all-link:hover,
	html[data-theme="geocities"] .category-hero + .page-content .view-all-link:hover {
	color: #ff00ff !important;
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .project-card,
	html[data-theme="geocities"] .category-hero + .page-content .project-card {
	background: var(--geo-panel-raised, #1a2824) !important;
	border: 2px ridge var(--geo-teal, #5a9a7a) !important;
	box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.5);
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .project-card:hover,
	html[data-theme="geocities"] .category-hero + .page-content .project-card:hover {
	background: #223830 !important;
	border-color: var(--geo-cyan, #7ad4e8) !important;
	box-shadow: 4px 4px 0 rgba(122, 212, 232, 0.15);
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .project-description,
	html[data-theme="geocities"] .category-hero + .page-content .project-description {
	color: var(--geo-mint, #d8f2e8) !important;
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .project-description :is(a, strong),
	html[data-theme="geocities"] .category-hero + .page-content .project-description :is(a, strong) {
	color: var(--geo-cyan, #7ad4e8) !important;
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .status-text,
	html[data-theme="geocities"] .category-hero + .page-content .status-text {
	color: var(--geo-mint, #d8f2e8) !important;
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .project-actions,
	html[data-theme="geocities"] .category-hero + .page-content .project-actions {
	border-top-color: var(--geo-teal, #5a9a7a) !important;
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .project-link,
	html[data-theme="geocities"] .page-content:has(.category-section) .repo-link,
	html[data-theme="geocities"] .category-hero + .page-content .project-link,
	html[data-theme="geocities"] .category-hero + .page-content .repo-link {
	color: var(--geo-cyan, #7ad4e8) !important;
	font-weight: bold;
	text-decoration: underline;
	font-family: var(--global-font-family);
	border: 2px ridge var(--geo-teal, #5a9a7a);
	background: rgba(0, 0, 0, 0.35);
	padding: 4px 8px;
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .project-link:hover,
	html[data-theme="geocities"] .page-content:has(.category-section) .repo-link:hover,
	html[data-theme="geocities"] .category-hero + .page-content .project-link:hover,
	html[data-theme="geocities"] .category-hero + .page-content .repo-link:hover {
	color: #ff00ff !important;
	background: rgba(42, 64, 56, 0.9);
	border-color: var(--geo-purple, #9b8ac4);
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .project-status,
	html[data-theme="geocities"] .category-hero + .page-content .project-status {
	background: rgba(0, 0, 0, 0.4) !important;
	border: 1px ridge var(--geo-teal, #5a9a7a) !important;
	}

	/* Project tags: dance on card hover only */
	html[data-theme="geocities"] .page-content:has(.category-section) .project-tags .tag,
	html[data-theme="geocities"] .category-hero + .page-content .project-tags .tag {
	font-family: var(--global-font-family) !important;
	font-weight: bold !important;
	border-width: 2px !important;
	border-style: outset !important;
	box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.25);
	}

	@media (prefers-reduced-motion: no-preference) {
	html[data-theme="geocities"] .page-content:has(.category-section) .project-card:hover .project-tags .tag,
	html[data-theme="geocities"] .category-hero + .page-content .project-card:hover .project-tags .tag {
	  animation: geo-tag-dance 1.4s ease-in-out infinite;
	  transform-origin: center center;
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .project-card:hover .project-tags .tag:nth-child(2n),
	html[data-theme="geocities"] .category-hero + .page-content .project-card:hover .project-tags .tag:nth-child(2n) {
	  animation-delay: 0.1s;
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .project-card:hover .project-tags .tag:nth-child(3n),
	html[data-theme="geocities"] .category-hero + .page-content .project-card:hover .project-tags .tag:nth-child(3n) {
	  animation-delay: 0.2s;
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .project-tags .tag:hover,
	html[data-theme="geocities"] .category-hero + .page-content .project-tags .tag:hover {
	  animation-play-state: paused;
	  transform: scale(1.06);
	}
	}

	@keyframes geo-tag-dance {
	0%,
	100% {
	  transform: translateY(0) rotate(-2deg);
	}
	50% {
	  transform: translateY(-2px) rotate(2deg);
	}
	}

	@keyframes geo-rainbow-cycle {
	0% {
	  color: #ff0000;
	}
	16.66% {
	  color: #ff8800;
	}
	33.33% {
	  color: #ffff00;
	}
	50% {
	  color: #00ff00;
	}
	66.66% {
	  color: #00ffff;
	}
	83.33% {
	  color: #ff00ff;
	}
	100% {
	  color: #ff0000;
	}
	}

	html[data-theme="geocities"] .category-hero .site-back-nav {
	color: var(--geo-cyan, #7ad4e8) !important;
	font-family: var(--global-font-family);
	font-weight: bold;
	text-decoration: underline;
	}

	/* Homepage widgets: alternating table rows */
	html[data-theme="geocities"] .home-content .card-slot:nth-child(odd) .bordered-box {
	background: var(--geo-panel-raised, #1a2824);
	}

	html[data-theme="geocities"] .home-content .card-slot:nth-child(even) .bordered-box {
	background: #223830;
	}

	html[data-theme="geocities"] .home-content .card-slot:nth-child(even) .bordered-box:hover {
	background: #2a4540;
	}

	html[data-theme="geocities"] .post-content :is(h1, h2),
	html[data-theme="geocities"] .about-me-content :is(h1, h2),
	html[data-theme="geocities"] .project-description :is(h1, h2),
	html[data-theme="geocities"] .bio-content :is(h1, h2) {
	font-family: 'Times New Roman', Times, serif;
	color: var(--geo-amber, #e8a857);
	text-shadow: 1px 1px 0 #000000;
	}

	html[data-theme="geocities"] .post-content a,
	html[data-theme="geocities"] .about-me-content a,
	html[data-theme="geocities"] .project-description a,
	html[data-theme="geocities"] .bio-content a {
	color: var(--geo-cyan, #7ad4e8);
	font-weight: bold;
	text-decoration: underline;
	}

	html[data-theme="geocities"] .post-content a:visited,
	html[data-theme="geocities"] .about-me-content a:visited,
	html[data-theme="geocities"] .project-description a:visited,
	html[data-theme="geocities"] .bio-content a:visited {
	color: var(--geo-purple, #9b8ac4);
	}

	html[data-theme="geocities"] .button-banner {
	border: 2px dashed var(--geo-purple, #9b8ac4);
	background: rgba(0, 0, 0, 0.6) !important;
	padding: 12px !important;
	}

	html[data-theme="geocities"] .button-banner .button-row {
	align-items: center;
	}

	html[data-theme="geocities"] .button-banner .button-link img,
	html[data-theme="geocities"] .button-banner .button-image img {
	display: block;
	width: 88px;
	height: 31px;
	object-fit: contain;
	image-rendering: pixelated;
	}

	html[data-theme="geocities"] .site-stats {
	position: relative;
	font-family: 'Courier New', Courier, monospace !important;
	color: var(--geo-cyan, #7ad4e8) !important;
	border: 2px inset var(--geo-teal, #5a9a7a) !important;
	background: #000000 !important;
	padding: 28px 12px 8px !important;
	border-radius: 0 !important;
	gap: 4px !important;
	}

	html[data-theme="geocities"] .site-stats::before {
	content: '';
	position: absolute;
	top: 4px;
	left: 50%;
	transform: translateX(-50%);
	width: 96px;
	height: 16px;
	background: url('/assets/themes/geocities/misc/counter.gif') no-repeat center / contain;
	image-rendering: pixelated;
	pointer-events: none;
	}

	/* Homepage widget headers — decorative GIF (see --geo-widget-header-gif per widget) */
	html[data-theme="geocities"] .home-content .bordered-box:is(
	  .music-widget,
	  .tweet-widget,
	  .links-widget,
	  .my-button-widget,
	  .site-stats-widget,
	  .about-section,
	  .recent-posts-section,
	  .service-status-section,
	  .chat-section
	) .bordered-box-header {
	position: relative;
	overflow: hidden;
	min-height: 30px;
	background: var(--geo-indigo, #2a2040);
	}

	html[data-theme="geocities"] .home-content .bordered-box:is(
	  .music-widget,
	  .tweet-widget,
	  .links-widget,
	  .my-button-widget,
	  .site-stats-widget,
	  .about-section,
	  .recent-posts-section,
	  .service-status-section
	) .bordered-box-header::before {
	content: '';
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: var(--geo-widget-header-gif-width, 96px);
	background: var(--geo-widget-header-gif) no-repeat right 8px center /
	  var(--geo-widget-header-gif-size, contain);
	image-rendering: pixelated;
	mix-blend-mode: lighten;
	opacity: var(--geo-widget-header-gif-opacity, 0.92);
	pointer-events: none;
	z-index: 0;
	}

	html[data-theme="geocities"] .home-content .bordered-box:is(
	  .music-widget,
	  .tweet-widget,
	  .links-widget,
	  .my-button-widget,
	  .site-stats-widget,
	  .about-section,
	  .recent-posts-section,
	  .service-status-section,
	  .chat-section
	) .bordered-box-header .header-text,
	html[data-theme="geocities"] .home-content .bordered-box:is(
	  .music-widget,
	  .tweet-widget,
	  .links-widget,
	  .my-button-widget,
	  .site-stats-widget,
	  .about-section,
	  .recent-posts-section,
	  .service-status-section,
	  .chat-section
	) .bordered-box-header .header-right-wrapper,
	html[data-theme="geocities"] .home-content .bordered-box:is(
	  .music-widget,
	  .tweet-widget,
	  .links-widget,
	  .my-button-widget,
	  .site-stats-widget,
	  .about-section,
	  .recent-posts-section,
	  .service-status-section,
	  .chat-section
	) .bordered-box-header .header-divider {
	position: relative;
	z-index: 1;
	}

	html[data-theme="geocities"] .home-content .bordered-box:is(
	  .music-widget,
	  .tweet-widget,
	  .links-widget,
	  .my-button-widget,
	  .site-stats-widget,
	  .about-section,
	  .recent-posts-section,
	  .service-status-section
	) .bordered-box-header .header-text {
	background: transparent !important;
	border: none !important;
	box-shadow: none !important;
	padding-right: var(--geo-widget-header-pad-right, 100px) !important;
	}

	html[data-theme="geocities"] .home-content .bordered-box.chat-section .bordered-box-header .header-text {
	padding-right: 8px !important;
	}

	html[data-theme="geocities"] .home-content .bordered-box.chat-section .bordered-box-header .header-right-wrapper {
	position: relative;
	display: flex;
	align-items: center;
	min-height: 26px;
	padding-left: calc(var(--geo-widget-header-gif-width, 48px) + 6px);
	gap: 6px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.chat-section .bordered-box-header .header-right-wrapper::before {
	content: '';
	position: absolute;
	left: 0;
	top: 50%;
	width: var(--geo-widget-header-gif-width, 48px);
	height: 100%;
	max-height: 28px;
	transform: translateY(-50%);
	background: var(--geo-widget-header-gif) no-repeat left center /
	  var(--geo-widget-header-gif-size, contain);
	image-rendering: pixelated;
	mix-blend-mode: lighten;
	opacity: var(--geo-widget-header-gif-opacity, 0.92);
	pointer-events: none;
	z-index: 0;
	}

	html[data-theme="geocities"] .home-content .bordered-box.chat-section .bordered-box-header .user-count-display {
	position: relative;
	z-index: 1;
	}

	html[data-theme="geocities"] .home-content .bordered-box.music-widget .bordered-box-header {
	--geo-widget-header-gif: url('/assets/themes/geocities/misc/widget-music.gif');
	--geo-widget-header-gif-width: 100px;
	--geo-widget-header-gif-size: auto 28px;
	--geo-widget-header-pad-right: 106px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.music-widget .status-icon.offline {
	width: 16px;
	height: 16px;
	min-width: 16px;
	border-radius: 0;
	background-color: transparent !important;
	background: url('/assets/themes/geocities/misc/music-off.gif') no-repeat center / contain;
	image-rendering: pixelated;
	mix-blend-mode: lighten;
	}

	html[data-theme="geocities"] .home-content .bordered-box.music-widget .status-icon.playing {
	width: 16px;
	height: 16px;
	min-width: 16px;
	color: transparent !important;
	background: url('/assets/themes/geocities/misc/music-playing.gif') no-repeat center / contain;
	image-rendering: pixelated;
	mix-blend-mode: lighten;
	animation: none !important;
	filter: none !important;
	}

	html[data-theme="geocities"] .home-content .bordered-box.music-widget .status-icon.playing svg {
	display: none !important;
	}

	html[data-theme="geocities"] .home-content .bordered-box.tweet-widget .bordered-box-header {
	--geo-widget-header-gif: url('/assets/themes/geocities/misc/widget-status.gif');
	--geo-widget-header-gif-width: 58px;
	--geo-widget-header-pad-right: 64px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.links-widget .bordered-box-header {
	--geo-widget-header-gif: url('/assets/themes/geocities/misc/widget-links.gif');
	--geo-widget-header-gif-width: 76px;
	--geo-widget-header-gif-size: auto 28px;
	--geo-widget-header-pad-right: 82px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.my-button-widget .bordered-box-header {
	--geo-widget-header-gif: url('/assets/themes/geocities/misc/widget-button.gif');
	--geo-widget-header-gif-width: 92px;
	--geo-widget-header-pad-right: 98px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.site-stats-widget .bordered-box-header {
	--geo-widget-header-gif: url('/assets/themes/geocities/misc/widget-stats.gif');
	--geo-widget-header-gif-width: 120px;
	--geo-widget-header-gif-size: auto 22px;
	--geo-widget-header-pad-right: 126px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.about-section .bordered-box-header {
	--geo-widget-header-gif: url('/assets/themes/geocities/misc/widget-about.gif');
	--geo-widget-header-gif-width: 44px;
	--geo-widget-header-gif-size: auto 26px;
	--geo-widget-header-pad-right: 50px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.recent-posts-section .bordered-box-header {
	--geo-widget-header-gif: url('/assets/themes/geocities/misc/widget-blog.gif');
	--geo-widget-header-gif-width: 36px;
	--geo-widget-header-pad-right: 42px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.service-status-section .bordered-box-header {
	--geo-widget-header-gif: url('/assets/themes/geocities/misc/widget-systems.gif');
	--geo-widget-header-gif-width: 100px;
	--geo-widget-header-gif-size: auto 26px;
	--geo-widget-header-pad-right: 106px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.chat-section .bordered-box-header,
	html[data-theme="geocities"] .home-content .bordered-box.chat-section .bordered-box-header .header-right-wrapper {
	--geo-widget-header-gif: url('/assets/themes/geocities/misc/widget-chat.gif');
	--geo-widget-header-gif-width: 48px;
	}

	@media (max-width: 520px) {
	html[data-theme="geocities"] .home-content .bordered-box:is(
	  .music-widget,
	  .tweet-widget,
	  .links-widget,
	  .my-button-widget,
	  .site-stats-widget,
	  .about-section,
	  .recent-posts-section,
	  .service-status-section
	) .bordered-box-header::before {
	  width: var(--geo-widget-header-gif-width-mobile, calc(var(--geo-widget-header-gif-width, 96px) * 0.72));
	  background-position: right 4px center;
	  background-size: var(
	    --geo-widget-header-gif-size-mobile,
	    var(--geo-widget-header-gif-size, contain)
	  );
	  opacity: 0.88;
	}

	html[data-theme="geocities"] .home-content .bordered-box:is(
	  .music-widget,
	  .tweet-widget,
	  .links-widget,
	  .my-button-widget,
	  .site-stats-widget,
	  .about-section,
	  .recent-posts-section,
	  .service-status-section
	) .bordered-box-header .header-text {
	  padding-right: var(
	    --geo-widget-header-pad-right-mobile,
	    calc(var(--geo-widget-header-pad-right, 100px) * 0.72)
	  ) !important;
	}

	html[data-theme="geocities"] .home-content .bordered-box.music-widget .bordered-box-header {
	  --geo-widget-header-gif-width-mobile: 72px;
	  --geo-widget-header-gif-size-mobile: auto 24px;
	  --geo-widget-header-pad-right-mobile: 78px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.tweet-widget .bordered-box-header {
	  --geo-widget-header-gif-width-mobile: 44px;
	  --geo-widget-header-pad-right-mobile: 50px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.links-widget .bordered-box-header {
	  --geo-widget-header-gif-width-mobile: 58px;
	  --geo-widget-header-gif-size-mobile: auto 24px;
	  --geo-widget-header-pad-right-mobile: 64px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.site-stats-widget .bordered-box-header {
	  --geo-widget-header-gif-width-mobile: 88px;
	  --geo-widget-header-gif-size-mobile: auto 20px;
	  --geo-widget-header-pad-right-mobile: 94px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.about-section .bordered-box-header {
	  --geo-widget-header-gif-width-mobile: 36px;
	  --geo-widget-header-gif-size-mobile: auto 22px;
	  --geo-widget-header-pad-right-mobile: 42px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.recent-posts-section .bordered-box-header {
	  --geo-widget-header-gif-width-mobile: 30px;
	  --geo-widget-header-pad-right-mobile: 36px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.service-status-section .bordered-box-header {
	  --geo-widget-header-gif-width-mobile: 72px;
	  --geo-widget-header-gif-size-mobile: auto 22px;
	  --geo-widget-header-pad-right-mobile: 78px;
	}

	html[data-theme="geocities"] .home-content .bordered-box.chat-section .bordered-box-header .header-right-wrapper {
	  --geo-widget-header-gif-width: 40px;
	  padding-left: calc(40px + 4px);
	}

	html[data-theme="geocities"] .home-content .bordered-box.chat-section .bordered-box-header .header-right-wrapper::before {
	  max-height: 24px;
	}
	}

	html[data-theme="geocities"] .site-stats .stat-line {
	background: transparent !important;
	border-radius: 0 !important;
	padding: 2px 0 !important;
	}

	html[data-theme="geocities"] .site-stats .stat-label {
	color: var(--geo-amber, #e8a857) !important;
	text-transform: uppercase;
	font-size: 0.72em !important;
	letter-spacing: 0.06em;
	text-shadow: none !important;
	}

	html[data-theme="geocities"] .site-stats .stat-value {
	color: var(--geo-cyan, #7ad4e8) !important;
	font-variant-numeric: tabular-nums;
	text-shadow: 0 0 6px rgba(122, 212, 232, 0.5) !important;
	}

	html[data-theme="geocities"] .bordered-box {
	border: 2px ridge var(--geo-teal, #5a9a7a);
	background: var(--geo-panel-raised, #1a2824);
	border-radius: 0;
	box-shadow:
	  inset 1px 1px 0 rgba(122, 212, 232, 0.2),
	  inset -1px -1px 0 rgba(0, 0, 0, 0.5);
	}

	html[data-theme="geocities"] .bordered-box .bordered-box-header {
	margin: 0 -12px;
	padding: 0;
	min-height: 24px;
	background: var(--geo-indigo, #2a2040);
	border: 1px solid var(--geo-purple, #9b8ac4);
	border-radius: 0;
	}

	html[data-theme="geocities"] .bordered-box .header-text {
	background: var(--geo-indigo, #2a2040);
	color: var(--geo-amber, #e8a857) !important;
	padding: 4px 8px;
	margin: 0;
	border: 1px ridge var(--geo-teal, #5a9a7a);
	border-radius: 0;
	box-shadow: none;
	font-weight: bold;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	text-shadow: 1px 1px 0 #000000;
	}

	html[data-theme="geocities"] .bordered-box .header-divider {
	background: var(--geo-purple, #9b8ac4);
	}

	html[data-theme="geocities"] .bordered-box:hover {
	background: #223830;
	}

	html[data-theme="geocities"] .post-tags {
	border-top-color: var(--geo-teal, #5a9a7a);
	}

	html[data-theme="geocities"] .post-content hr,
	html[data-theme="geocities"] .about-me-content hr,
	html[data-theme="geocities"] .bio-content hr,
	html[data-theme="geocities"] .project-description hr {
	border: none;
	height: 3px;
	background: linear-gradient(
	  90deg,
	  #5a9a7a,
	  #7ad4e8,
	  #9b8ac4,
	  #e8a857,
	  #6bcf8a,
	  #5ec4b0,
	  #7ad4e8
	);
	margin: 1.5em 0;
	}

	html[data-theme="geocities"] ::selection {
	background: rgba(90, 154, 122, 0.55);
	color: #f0fff8;
	}

	html[data-theme="geocities"] .scanlines {
	opacity: 0 !important;
	}

	@media (max-width: 640px) {
	html[data-theme="geocities"] .ascii-container {
	  padding: 8px 14px 10px;
	}

	html[data-theme="geocities"] .ascii-container::before {
	  font-size: 0.7rem;
	  letter-spacing: 0.06em;
	}

	html[data-theme="geocities"] .ascii-box::before,
	html[data-theme="geocities"] .ascii-box::after {
	  display: none;
	}

	html[data-theme="geocities"] .ascii-link::after {
	  width: 88px;
	  height: 31px;
	}

	html[data-theme="geocities"] .header .nav-list {
	  gap: 10px 14px;
	  padding-left: 0;
	  justify-content: center;
	}
	}

	@media (prefers-reduced-motion: reduce) {
	html[data-theme="geocities"] .nav-link.active {
	  animation: none !important;
	}

	html[data-theme="geocities"] .header .ascii-box pre {
	  animation: none !important;
	  color: var(--geo-mint, #d8f2e8) !important;
	}

	html[data-theme="geocities"] .ascii-container::before {
	  animation: none !important;
	  opacity: 1 !important;
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .project-tags .tag,
	html[data-theme="geocities"] .category-hero + .page-content .project-tags .tag {
	  animation: none !important;
	}

	html[data-theme="geocities"] .page-content:has(.category-section) .category-title,
	html[data-theme="geocities"] .category-hero .typing-text {
	  animation: none !important;
	  color: var(--geo-amber, #e8a857) !important;
	}

	html[data-theme="geocities"] .blog-page .geo-rainbow-char,
	html[data-theme="geocities"] .blog-post-page .geo-rainbow-char,
	html[data-theme="geocities"] .page-content:has(.category-section) .geo-rainbow-char,
	html[data-theme="geocities"] .category-hero + .page-content .geo-rainbow-char {
	  animation: none !important;
	}

	html[data-theme="geocities"] .geo-rainbow-char:nth-child(8n + 1) {
	  color: #ff0000;
	}
	html[data-theme="geocities"] .geo-rainbow-char:nth-child(8n + 2) {
	  color: #ff8800;
	}
	html[data-theme="geocities"] .geo-rainbow-char:nth-child(8n + 3) {
	  color: #ffff00;
	}
	html[data-theme="geocities"] .geo-rainbow-char:nth-child(8n + 4) {
	  color: #00ff00;
	}
	html[data-theme="geocities"] .geo-rainbow-char:nth-child(8n + 5) {
	  color: #00ffff;
	}
	html[data-theme="geocities"] .geo-rainbow-char:nth-child(8n + 6) {
	  color: #0080ff;
	}
	html[data-theme="geocities"] .geo-rainbow-char:nth-child(8n + 7) {
	  color: #ff00ff;
	}
	html[data-theme="geocities"] .geo-rainbow-char:nth-child(8n) {
	  color: #ff4444;
	}
	}

	/* Character Map — GeoCities panel chrome */
	html[data-theme="geocities"] .emoji-picker {
	border: 2px ridge var(--geo-teal, #5a9a7a);
	border-radius: 0;
	box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.5);
	font-family: var(--global-font-family);
	}

	html[data-theme="geocities"] .emoji-picker .win95-titlebar {
	background: var(--geo-indigo, #2a2040);
	color: var(--geo-amber, #e8a857);
	border-bottom: 1px ridge var(--geo-teal, #5a9a7a);
	}

	html[data-theme="geocities"] .emoji-picker .titlebar-button {
	border: 1px ridge var(--geo-teal, #5a9a7a);
	background: var(--geo-panel-raised, #1a2824);
	color: var(--geo-cyan, #7ad4e8);
	box-shadow: none;
	}

	html[data-theme="geocities"] .emoji-picker .titlebar-button:hover:not(:disabled) {
	color: #ff00ff;
	border-color: var(--geo-purple, #9b8ac4);
	}

	html[data-theme="geocities"] .emoji-picker .win95-tabs {
	background: var(--geo-panel-raised, #1a2824);
	border-bottom: 1px dashed var(--geo-teal, #5a9a7a);
	}

	html[data-theme="geocities"] .emoji-picker .win95-tab {
	background: rgba(0, 0, 0, 0.35);
	border: 1px ridge var(--geo-teal, #5a9a7a);
	color: var(--geo-mint, #d8f2e8);
	box-shadow: none;
	}

	html[data-theme="geocities"] .emoji-picker .win95-tab.active {
	background: var(--geo-panel, rgba(14, 22, 20, 0.82));
	border-color: var(--geo-cyan, #7ad4e8);
	color: var(--geo-cyan, #7ad4e8);
	}

	html[data-theme="geocities"] .emoji-picker .win95-content {
	background: rgba(0, 0, 0, 0.35);
	border: 1px ridge var(--geo-teal, #5a9a7a);
	}

	html[data-theme="geocities"] .emoji-picker .win95-grid,
	html[data-theme="geocities"] .emoji-picker .win95-char-button {
	background: transparent;
	border: 1px solid var(--geo-teal, #5a9a7a);
	color: var(--geo-mint, #d8f2e8);
	box-shadow: none;
	}

	html[data-theme="geocities"] .emoji-picker .win95-char-button:hover {
	background: rgba(42, 64, 56, 0.8);
	border-color: var(--geo-cyan, #7ad4e8);
	color: #ff00ff;
	}

	html[data-theme="geocities"] .emoji-picker .category-heading {
	color: var(--geo-amber, #e8a857);
	border-bottom-color: var(--geo-teal, #5a9a7a);
	}

	html[data-theme="geocities"] .emoji-picker .win95-statusbar {
	background: var(--geo-indigo, #2a2040);
	color: var(--geo-mint, #d8f2e8);
	border-top: 1px ridge var(--geo-teal, #5a9a7a);
	}
	}
`,
	displayOrder: 4
} satisfies InferInsertModel<typeof themes>;

/** Bundled themes inserted by full seed (after clear) or partial seed when missing. */
export const ALL_SEED_THEMES = [
	BUILTIN_DEFAULT_THEME_INSERT,
	CYBERPUNK_NEON_THEME_INSERT,
	WINDOWS_XP_BLISS_THEME_INSERT,
	WINDOWS_95_THEME_INSERT,
	GEOCITIES_THEME_INSERT
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
