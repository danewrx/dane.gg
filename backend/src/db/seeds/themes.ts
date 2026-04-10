import { db } from '../index';
import { themes } from '../schema';

/** Default + demo themes for local / CI seed */
export async function seedThemes() {
	console.log('🎨 Seeding themes...');
	return db
		.insert(themes)
		.values([
			{
				name: 'Default',
				description: 'The default site theme with a dark aesthetic and background image',
				isActive: true,
				isDefault: true,
				isVisible: true,

				primaryColor: '#ffffff',
				secondaryColor: '#a1a1aa',
				accentColor: '#6366f1',
				backgroundColor: '#0a0a0a',
				surfaceColor: '#1a1a1a',
				borderColor: '#ffffff',
				textPrimary: '#ffffff',
				textSecondary: '#a1a1aa',
				textMuted: '#71717a',

				backgroundImage: '/assets/img/backgrounds/1.png',
				backgroundImageExternal: false,
				backgroundOverlay: 'rgba(0, 0, 0, 0.7)',
				overlayDarkenOpacity: '0.7',
				backgroundBlur: 0,
				backgroundPosition: 'center center',
				backgroundSize: 'cover',
				backgroundAttachment: 'fixed',

				fontFamily: 'Inter',
				headingFontFamily: 'Inter',
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
			},
			{
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

				backgroundImage: '/assets/img/backgrounds/3.jpg',
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
			},
			{
				name: 'Kawaii Pink',
				description:
					'A cute and cozy theme with soft pinks and warm pastels, perfect for a kawaii aesthetic',
				isActive: false,
				isDefault: false,
				isVisible: true,

				primaryColor: '#5d4037',
				secondaryColor: '#8d6e63',
				accentColor: '#f06292',
				backgroundColor: '#fce4ec',
				surfaceColor: 'rgba(255, 245, 247, 0.95)',
				borderColor: '#f06292',
				textPrimary: '#4e342e',
				textSecondary: '#6d4c41',
				textMuted: '#a1887f',

				backgroundImage: '/assets/img/backgrounds/2.jpg',
				backgroundImageExternal: false,
				backgroundOverlay: 'rgba(0, 0, 0, 0.3)',
				overlayDarkenOpacity: '0.3',
				backgroundBlur: 0,
				backgroundPosition: 'right bottom',
				backgroundSize: 'contain',
				backgroundAttachment: 'fixed',

				fontFamily: 'Quicksand',
				headingFontFamily: 'Comfortaa',
				fontScale: '1',

				borderRadius: '0px',
				widgetBorderRadius: '0px',
				scanlinesOpacity: '0',
				overlayVignetteOpacity: '0',
				overlayGridOpacity: '0',
				overlayGrainOpacity: '0',
				overlayGlareOpacity: '0',
				customCss: `
:root {
  --theme-shell-shadow: 0 2px 14px rgba(0, 0, 0, 0.14);
  --theme-body-line-height: 1.7;
}

/* Kawaii soft shadows and effects */
.card, .surface {
  box-shadow: 0 4px 20px rgba(240, 98, 146, 0.15);
}
.btn {
  box-shadow: 0 3px 10px rgba(240, 98, 146, 0.3);
}
::selection {
  background: #f8bbd0;
  color: #4e342e;
}
`,
				displayOrder: 2
			}
		])
		.returning();
}
