import { settingsService } from './settings';
import { user } from '$lib/admin/stores/auth';
import { browser } from '$app/environment';
import { get } from 'svelte/store';

class AccentColorService {
	private initialized = false;
	private currentColor = '#3b82f6'; // Default blue

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

		this.initialized = true;
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
			console.error('Failed to load user accent color:', error);
			// Fallback to default color if there's an error
			this.applyAccentColor('#3b82f6');
		}
	}

	/**
	 * Apply accent color to CSS custom properties
	 */
	private applyAccentColor(color: string): void {
		if (!browser) return;

		// Set CSS custom property on document root
		document.documentElement.style.setProperty('--accent-color', color);

		// Calculate proper contrast color for text
		const contrastColor = this.getContrastColor(color);
		document.documentElement.style.setProperty('--accent-color-contrast', contrastColor);

		// Generate lighter/darker variations for different use cases
		const rgb = this.hexToRgb(color);
		if (rgb) {
			// Light variant (for backgrounds)
			const lightRgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`;
			document.documentElement.style.setProperty('--accent-color-light', lightRgba);

			// Medium variant (for borders)
			const mediumRgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
			document.documentElement.style.setProperty('--accent-color-medium', mediumRgba);

			// Dark variant (for hover states)
			const darker = this.darkenColor(color, 0.1);
			document.documentElement.style.setProperty('--accent-color-dark', darker);

			// Contrast color for dark variant (usually white since it's darker)
			const darkContrastColor = this.getContrastColor(darker);
			document.documentElement.style.setProperty('--accent-color-dark-contrast', darkContrastColor);
		}
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
			console.error('Failed to save accent color:', error);
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
		this.currentColor = color;

		// Save to database if user is authenticated
		await this.saveAccentColor(color);
	}

	/**
	 * Get current accent color
	 */
	getCurrentColor(): string {
		return this.currentColor;
	}

	/**
	 * Validate hex color format
	 */
	private isValidHexColor(color: string): boolean {
		const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
		return hexColorRegex.test(color);
	}

	/**
	 * Convert hex color to RGB object
	 */
	private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16)
				}
			: null;
	}

	/**
	 * Darken a hex color by a percentage
	 */
	private darkenColor(hex: string, percent: number): string {
		const rgb = this.hexToRgb(hex);
		if (!rgb) return hex;

		const factor = 1 - percent;
		const r = Math.round(rgb.r * factor);
		const g = Math.round(rgb.g * factor);
		const b = Math.round(rgb.b * factor);

		return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
	}

	/**
	 * Calculate relative luminance of a color (WCAG 2.1 formula)
	 */
	private calculateLuminance(r: number, g: number, b: number): number {
		// Convert RGB to relative luminance
		const rsRGB = r / 255;
		const gsRGB = g / 255;
		const bsRGB = b / 255;

		const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
		const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
		const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

		return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
	}

	/**
	 * Get appropriate contrast color (black or white) for a given background color
	 */
	private getContrastColor(hexColor: string): string {
		const rgb = this.hexToRgb(hexColor);
		if (!rgb) return '#ffffff'; // Default to white if parsing fails

		const luminance = this.calculateLuminance(rgb.r, rgb.g, rgb.b);

		// Use WCAG AA standard threshold
		// Luminance > 0.5 means lighter color, use dark text
		// Luminance <= 0.5 means darker color, use light text
		return luminance > 0.5 ? '#000000' : '#ffffff';
	}
}

export const accentColorService = new AccentColorService();
