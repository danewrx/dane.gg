export const THEME_CSS_VARIABLES_REFERENCE = `:root {
  /* === Palette (set in theme editor) === */
  --theme-primary: #ffffff;
  --theme-secondary: #a1a1aa;
  --theme-accent: #6366f1;
  --theme-background: #0a0a0a;
  --theme-surface: #1a1a1a;
  --theme-border: #ffffff;
  --theme-text-primary: #ffffff;
  --theme-text-secondary: #a1a1aa;
  --theme-text-muted: #71717a;

  /* === Background image layer === */
  --theme-bg-image: none;
  --theme-bg-overlay: rgba(0, 0, 0, 0.5);
  --theme-bg-blur: 0px;
  --theme-bg-position: center center;
  --theme-bg-size: cover;
  --theme-bg-attachment: fixed;

  /* === Typography === */
  --theme-font-family: 'Inter', sans-serif;
  --theme-heading-font: 'Inter', sans-serif;
  --theme-font-scale: 1;
  --theme-body-line-height: 1.65;

  /* === Border radius === */
  --theme-border-radius: 8px;
  --theme-widget-border-radius: 8px;

  /* === Shell / layout (defaults in app.css) === */
  --theme-shell-border-width: 2px;
  --theme-widget-border-width: 2px;
  --theme-shell-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  --theme-content-max-width: 900px;

  /* === Full-screen overlays (0–1; also in Screen overlays) === */
  --theme-scanlines-opacity: 1;
  --theme-overlay-vignette-opacity: 0;
  --theme-overlay-grid-opacity: 0;
  --theme-overlay-grain-opacity: 0;
  --theme-overlay-glare-opacity: 0;

  /* === Markdown code blocks (grey box opposes text tone) === */
  --theme-code-tone: dark;
  --theme-code-foreground: #f0f0f0;
  --theme-code-background: #2a2a2a;
  --theme-code-inline-background: #333333;
  --theme-code-border: #444444;

  /* === Status colors (pastels; tone follows surface) === */
  --theme-surface-tone: dark;
  --status-ok: #90ee90;
  --status-down: #ffb6c1;
  --status-warn: #fde68a;
  --status-pending: #e5e7eb;
  --status-neutral: #d1d5db;
  --status-loading: #fcd34d;

  /* === Legacy aliases (app.css; often map to theme tokens) === */
  --bg-primary: var(--theme-surface, #000000);
  --bg-secondary: var(--theme-background, #0a0a0a);
  --bg-container: rgba(20, 20, 20, 0.9);
  --text-primary: var(--theme-text-primary, #ffffff);
  --text-secondary: var(--theme-text-secondary, #a1a1aa);
  --text-muted: var(--theme-text-muted, #888888);
  --border-primary: var(--theme-border, #333333);
  --border-accent: var(--theme-accent, #6366f1);
  --scanline-color: rgba(255, 255, 255, 0.03);
  --glow-color: rgba(99, 102, 241, 0.3);

  /* === Font stacks (body vs ASCII art) === */
  --global-font-family: 'W95FA', 'JetBrains Mono', monospace;
  --ascii-font-family: 'JetBrains Mono', monospace;
}`;
