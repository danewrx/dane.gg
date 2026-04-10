import { browser } from '$app/environment';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ThemeResponse {
	success: boolean;
	message: string;
	themePreference: string;
}

interface AccentColorResponse {
	success: boolean;
	message: string;
	accentColor: string;
}

interface AdminSettingsResponse {
	success: boolean;
	message: string;
	settings: {
		maintenance_mode: boolean;
		registration_enabled: boolean;
		site_title: string;
		[key: string]: any;
	};
}

class SettingsService {
	private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${API_BASE_URL}${endpoint}`;

		const defaultOptions: RequestInit = {
			headers: {
				'Content-Type': 'application/json',
				...options.headers
			},
			credentials: 'include',
			...options
		};

		try {
			const response = await fetch(url, defaultOptions);

			if (!response.ok) {
				const errorText = await response.text();
				console.error(`Settings API request failed: ${endpoint}`, response.status, errorText);

				// Try to parse the error response to extract user-friendly message
				let errorMessage = `Request failed with status ${response.status}`;
				try {
					const errorData = JSON.parse(errorText);
					if (errorData.message) {
						errorMessage = errorData.message;
					} else if (errorData.error) {
						errorMessage = errorData.error;
					}
				} catch {
					// If JSON parsing fails, use the raw error text
					errorMessage = errorText;
				}

				const error = new Error(errorMessage);
				(error as any).status = response.status;
				(error as any).response = { data: JSON.parse(errorText) };
				throw error;
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.error(`Settings API request failed: ${endpoint}`, error);
			throw error;
		}
	}

	/** JSON request to the admin API (e.g. TOTP routes under `/totp/*`). */
	requestJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		return this.makeRequest<T>(endpoint, options);
	}

	// Theme preference methods
	async getThemePreference(): Promise<string> {
		try {
			const response = await this.makeRequest<ThemeResponse>('/settings/theme', {
				method: 'GET'
			});

			return response.themePreference || 'system';
		} catch (error) {
			console.error('Get theme preference failed:', error);
			return 'system';
		}
	}

	async setThemePreference(themePreference: string): Promise<ThemeResponse> {
		try {
			const response = await this.makeRequest<ThemeResponse>('/settings/theme', {
				method: 'POST',
				body: JSON.stringify({ themePreference })
			});

			return response;
		} catch (error) {
			console.error('Set theme preference failed:', error);
			throw error;
		}
	}

	// Accent color methods
	async getAccentColor(): Promise<string> {
		try {
			const response = await this.makeRequest<AccentColorResponse>('/settings/accent-color', {
				method: 'GET'
			});

			return response.accentColor || '#3b82f6';
		} catch (error) {
			console.error('Get accent color failed:', error);
			return '#3b82f6';
		}
	}

	async setAccentColor(accentColor: string): Promise<AccentColorResponse> {
		try {
			const response = await this.makeRequest<AccentColorResponse>('/settings/accent-color', {
				method: 'POST',
				body: JSON.stringify({ accentColor })
			});

			return response;
		} catch (error) {
			console.error('Set accent color failed:', error);
			throw error;
		}
	}

	// Admin settings methods
	async getAdminSettings(): Promise<AdminSettingsResponse['settings']> {
		try {
			const response = await this.makeRequest<AdminSettingsResponse>('/settings/admin', {
				method: 'GET'
			});

			return response.settings;
		} catch (error) {
			console.error('Get admin settings failed:', error);
			throw error;
		}
	}

	async updateAdminSettings(settings: Record<string, any>): Promise<AdminSettingsResponse> {
		try {
			const response = await this.makeRequest<AdminSettingsResponse>('/settings/admin', {
				method: 'POST',
				body: JSON.stringify({ settings })
			});

			return response;
		} catch (error) {
			console.error('Update admin settings failed:', error);
			throw error;
		}
	}
}

export const settingsService = new SettingsService();
