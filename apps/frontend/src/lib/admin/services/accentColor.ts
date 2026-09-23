import { logger } from '$lib/logger';
import {
	accentHasLowContrast,
	buildAccentTokens,
	isDarkModeActive,
	normalizeHex
} from '$lib/admin/theme/color';
import { settingsService } from './settings';
import { auth, user } from '$lib/admin/stores/auth';
import { browser } from '$app/environment';
import { get } from 'svelte/store';
class AccentColorService {
	private initialized = false;
	private currentColor = '#3b82f6';
	private themeObserver: MutationObserver | null = null;

	/**
	 * Initialize accent color service - load user's saved color on app start
	 */
	async init(): Promise<void> {
		if (!browser || this.initialized) return;

		// Listen for auth state changes
		user.subscribe(async (currentUser) => {
			if (currentUser?.id) {
				await this.loadUserAccentColor();
			}
		});

		const currentUser = get(user);
		if (currentUser?.id) {
			void this.loadUserAccentColor();
		} else {
			this.applyAccentColor(this.currentColor);
		}

		this.observeThemeChanges();

		this.initialized = true;
	}

	private observeThemeChanges(): void {
		if (typeof MutationObserver === 'undefined') return;

		this.themeObserver?.disconnect();
		this.themeObserver = new MutationObserver(() => {
			this.applyAccentColor(this.currentColor);
		});

		this.themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});
	}

	/**
	 * Load and apply user's saved accent color from database
	 */
	async loadUserAccentColor(): Promise<void> {
		try {
			const currentUser = get(user);
			if (!currentUser?.id) {
				return;
			}

			// Try to get color from user object first (if just logged in)
			let accentColor = currentUser.accentColor;

			// If not available, fetch from API
			if (!accentColor) {
				accentColor = await settingsService.getAccentColor();
			}

			if (accentColor && this.isValidHexColor(accentColor)) {
				this.applyAccentColor(accentColor);
				this.currentColor = accentColor;
			} else {
				this.applyAccentColor('#3b82f6');
			}
		} catch (error) {
			logger.error('Failed to load user accent color:', error);
			// Fallback to default color if there's an error
			this.applyAccentColor('#3b82f6');
		}
	}

	/**
	 * Apply accent color and derived semantic tokens to CSS custom properties
	 */
	applyAccentColor(color: string): void {
		if (!browser) return;

		const normalized = normalizeHex(color);
		if (!normalized) return;

		const isDark = isDarkModeActive();
		const tokens = buildAccentTokens(normalized, isDark);

		const root = document.documentElement.style;
		root.setProperty('--accent-color', tokens.accent);

		// Filled surfaces (buttons, primary CTAs)
		root.setProperty('--accent-bg', tokens.accentBg);
		root.setProperty('--accent-fg', tokens.accentFg);
		root.setProperty('--accent-bg-hover', tokens.accentBgHover);
		root.setProperty('--accent-fg-hover', tokens.accentFgHover);

		// Text/icons on page backgrounds
		root.setProperty('--accent-on-surface', tokens.accentOnSurface);

		// Muted accent surfaces
		root.setProperty('--accent-muted-bg', tokens.accentMutedBg);
		root.setProperty('--accent-muted-fg', tokens.accentMutedFg);
		root.setProperty('--accent-border', tokens.accentBorder);

		// Legacy aliases (keep existing components working)
		root.setProperty('--accent-color-contrast', tokens.accentFg);
		root.setProperty('--accent-color-light', tokens.accentLight);
		root.setProperty('--accent-color-medium', tokens.accentMedium);
		root.setProperty('--accent-color-dark', tokens.accentBgHover);
		root.setProperty('--accent-color-dark-contrast', tokens.accentFgHover);

		this.currentColor = tokens.accent;
	}

	/**
	 * Save accent color to database for authenticated users
	 */
	async saveAccentColor(color: string): Promise<void> {
		try {
			const currentUser = get(user);
			if (!currentUser?.id) {
				return;
			}

			if (!this.isValidHexColor(color)) {
				throw new Error('Invalid hex color format');
			}

			await settingsService.setAccentColor(color);
		} catch (error) {
			logger.error('Failed to save accent color:', error);
			throw error;
		}
	}

	/**
	 * Set accent color and save to database (unified method)
	 */
	async setAccentColor(color: string): Promise<void> {
		if (!this.isValidHexColor(color)) {
			throw new Error('Invalid hex color format. Must be a 6-digit hex color (e.g., #3b82f6)');
		}

		// Apply color locally first
		this.applyAccentColor(color);

		// Save to database if user is authenticated
		await this.saveAccentColor(color);

		const currentUser = get(user);
		if (currentUser) {
			const accentColor = this.currentColor;
			auth.patchUser({ accentColor });
			auth.persist({ ...currentUser, accentColor });
		}
	}

	/**
	 * Get current accent color
	 */
	getCurrentColor(): string {
		return this.currentColor;
	}

	/**
	 * Whether the accent may be hard to see in the current theme
	 */
	hasLowContrastWarning(color: string = this.currentColor): boolean {
		const normalized = normalizeHex(color);
		if (!normalized) return false;
		return accentHasLowContrast(normalized, isDarkModeActive());
	}

	/**
	 * Validate hex color format
	 */
	private isValidHexColor(color: string): boolean {
		return normalizeHex(color) !== null;
	}
}

export const accentColorService = new AccentColorService();
