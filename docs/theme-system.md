# Theme system

The public site's entire visual presentation — colors, background, typography, corner
radius, custom CSS, retro overlay effects — is data-driven from the `themes` table
(`backend/src/db/schema.ts`), editable from `Admin → Configuration → Themes`
(`/admin/configuration/themes`). This doc covers the data model, how it becomes CSS in the
browser, and how to create and configure themes.

## How a theme becomes CSS

1. The frontend fetches the active theme from `GET /api/themes/active` (see [resolution
   order](#which-theme-is-active) below).
2. `applyThemeStyles()` (`frontend/src/lib/site/stores/theme.ts`) builds a `<style
   data-theme-vars>` tag containing CSS custom properties scoped to
   `html[data-dane-app="public"]` — e.g. `--theme-accent`, `--theme-bg-image`,
   `--theme-font-scale`. The rest of the site's CSS consumes these variables; it never talks
   to the theme data directly.
3. The theme's `name` is slugified (`themeSlugFromName`: lowercase, spaces→hyphens, strip
   anything non-`[a-z0-9-]`) and set as `document.documentElement.dataset.theme`, i.e.
   `html[data-theme="windows-95"]`. A handful of components/CSS blocks key off specific
   slugs for bespoke per-theme behavior that doesn't fit the variable system — e.g.
   `RainbowText.svelte` special-cases the GeoCities theme, and there's a hidden element in
   the site layout gated on `data-theme="lets-all-love-lain"`. If you rename a theme, anything
   keyed to its old slug stops matching.
4. `customCss` (if set) is injected verbatim as a **separate, later** `<style
   data-theme-custom>` tag, so it can override anything the variables set — see
   [Custom CSS](#custom-css) below.
5. Google Fonts / custom font `<link>`/`@font-face` tags are (re)injected based on
   `fontFamily`/`headingFontFamily` — see [Fonts](#fonts) below.

None of this runs for the admin panel — `applyBrowserSiteThemeToDom()` runs only when
`document.documentElement.dataset.daneApp === 'public'`, so `/admin`, `/login`, `/logout`
always use the neutral admin UI styling regardless of the active site theme.

## Which theme is active

`GET /api/themes/active` resolves in this order (`backend/src/routes/themes.ts`):

1. If **enforcement** is on (`site_theme_enforcement` in `site_config`,
   `{enforced: true, themeId: "..."}`) → that theme if it exists. This is what `Admin →
   Configuration → Themes → Enforce theme` sets; while it's on, the public theme picker is
   disabled and everyone gets the same theme regardless of any saved preference.
2. Otherwise → the theme with `isDefault = true` and `isVisible = true`.
3. Otherwise → the first `isVisible = true` theme by `displayOrder`.

A visitor's saved `selectedTheme` ID overrides the default on the client when it still
matches a visible theme. Enforcement takes precedence but preserves that saved preference
for later use. If the saved theme is no longer available, its stored ID is removed and the
site default is used. If the server returns no theme, the frontend uses `DEFAULT_THEME`.
An unavailable enforced theme falls back to the server's default selection.

Theme selection uses `isDefault`, `isVisible`, and the enforcement configuration. Setting a
new default clears the default flag on the other themes.

## Creating a theme

From `Admin → Configuration → Themes`:

- **Duplicate an existing theme** (recommended starting point) — copies every visual field
  (colors, background, typography, overlays, custom CSS) into a new row so you're tweaking
  something that already looks right, rather than starting from schema defaults.
- **New theme** — starts from the schema's built-in defaults (a dark theme, see
  `DEFAULT_THEME` in `frontend/src/lib/site/stores/theme.ts` for the fallback values used
  before any theme loads).
- Assign it to a **category** (`theme_categories` — purely organizational, groups the picker
  UI, e.g. "Retro", "Editor (Dark)").
- **Set default** makes it what visitors see with no saved preference and no enforcement.
- Toggle **visible** off to keep a theme in the system (e.g. work in progress) without it
  showing in the public picker or being eligible as the default/first-visible fallback.
- **Enforce** (separate action, theme-agnostic toggle) locks every visitor to one theme.

## Field reference

| Group | Fields | Notes |
| --- | --- | --- |
| Colors | `primaryColor`, `secondaryColor`, `accentColor`, `backgroundColor`, `surfaceColor`, `borderColor`, `textPrimary`, `textSecondary`, `textMuted` | Hex/rgba strings, mapped straight to CSS vars |
| Background | `backgroundImage`, `backgroundImageExternal`, `backgroundOverlay`, `backgroundBlur`, `backgroundPosition`, `backgroundSize`, `backgroundAttachment` | `backgroundImageExternal` skips the upload-path rewriting for externally-hosted image URLs |
| Typography | `fontFamily`, `headingFontFamily`, `fontScale` | See [Fonts](#fonts) — these are font *names*, not files |
| Shape | `borderRadius`, `widgetBorderRadius` | `widgetBorderRadius` falls back to `borderRadius` if blank |
| Retro overlay effects | `scanlinesOpacity`, `overlayVignetteOpacity`, `overlayGridOpacity`, `overlayGrainOpacity`, `overlayGlareOpacity`, `overlayDarkenOpacity` | All `0`–`1` opacity strings, layered CRT/print-scan style effects — see the bundled retro themes (Windows 95/XP, Matrix Terminal, GeoCities) in `backend/src/db/seeds/themes.ts` for real examples of combining these |
| Escape hatch | `customCss` | Raw CSS, see below |

## Custom CSS

`customCss` is injected as-is into the page — there's no scoping, sanitization, or
validation beyond what's needed to store it. It loads *after* the variable stylesheet, so the
simplest and safest way to use it is overriding the same `--theme-*` custom properties
(`buildThemeVarsStylesheet` in `theme.ts` has the full variable list) rather than writing
selectors against the site's internal component classes, which aren't a stable API and will
break silently on refactors.

## Fonts

`fontFamily`/`headingFontFamily` are plain strings, not file references — how they resolve
depends on whether they match something in the `fonts` table:

- **Matches a `fonts` row with `type = 'custom'`** (by exact `name`) → the theme gets that
  font's `filePath` injected as an `@font-face` rule. Custom fonts are uploaded from `Admin →
  Configuration → Fonts` (`.woff`/`.woff2`/`.ttf`/`.otf`, 5MB max via `POST /api/fonts`).
- **Otherwise** → treated as a Google Fonts family name and requested from
  `fonts.googleapis.com` at weights 300–700. If it's not a real Google Fonts family, the
  browser just falls back to `sans-serif` — there's no validation against Google's font list.

The site registers a selection of Google Fonts on first run, plus one bundled custom font
(`W95FA`, used by the Windows 95 theme) registered automatically — see
`backend/src/db/ensureBuiltinSiteFont.ts` if you want to bundle another font the same way
instead of requiring an admin to upload it.

## Bundled example themes

`backend/src/db/seeds/themes.ts` contains example themes spanning simple
editor-style palettes (Dracula, Nord, Catppuccin, Tokyo Night, Gruvbox, One Dark/Light,
GitHub Light, Rosé Pine) and elaborate retro/novelty ones (Windows 95, Windows XP, GeoCities,
Matrix Terminal, Cyberpunk Neon) that combine every field above, `customCss`, and in a couple
of cases the slug-based component special-casing mentioned earlier. Use these examples when designing palettes, overlays, and custom CSS for your own themes.
