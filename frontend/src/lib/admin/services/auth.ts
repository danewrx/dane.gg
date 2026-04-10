import { auth } from '$lib/admin/stores/auth';
import { browser } from '$app/environment';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface LoginCredentials {
	username: string;
	password: string;
	rememberMe?: boolean;
	totpCode?: string;
	backupCode?: string;
}

interface AuthResponse {
	success: boolean;
	message: string;
	user?: {
		id: string;
		username: string;
		isAdmin: boolean;
		themePreference?: string;
		accentColor?: string;
	};
	expiresIn?: string;
	accessToken?: string;
	requiresTOTP?: boolean;
}

class AuthService {
	private initialized: boolean = false;

	private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${API_BASE_URL}${endpoint}`;

		const defaultOptions: RequestInit = {
			headers: {
				'Content-Type': 'application/json',
				...options.headers
			},
			credentials: 'include', // Important for cookies
			...options
		};

		try {
			const response = await fetch(url, defaultOptions);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({
					error: 'Request failed',
					message: `HTTP ${response.status}: ${response.statusText}`
				}));

				// Only log errors for non-401 status codes (401 is expected for unauthenticated users)
				if (response.status !== 401) {
					console.error(`API request failed: ${endpoint}`, response.status, errorData);
				}

				// Create error object with status for processing
				const error = new Error(errorData.message || errorData.error || 'Request failed');
				(error as any).status = response.status;
				(error as any).response = { data: errorData };
				throw error;
			}

			const data = await response.json();
			return data;
		} catch (error) {
			// Only log errors for non-401 status codes
			if ((error as any).status !== 401) {
				console.error(`API request failed: ${endpoint}`, error);
			}
			throw error;
		}
	}

	async login(credentials: LoginCredentials): Promise<AuthResponse> {
		try {
			auth.setLoading(true);
			auth.clearError();

			const url = `${API_BASE_URL}/auth/login`;
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify(credentials)
			});

			// Handle TOTP requirement (status 202)
			if (response.status === 202) {
				const data = await response.json();
				return {
					success: false,
					message: data.message || 'Two-factor authentication required',
					requiresTOTP: true
				};
			}

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({
					error: 'Request failed',
					message: `HTTP ${response.status}: ${response.statusText}`
				}));

				// Create error object with status for processing
				const error = new Error(errorData.message || errorData.error || 'Request failed');
				(error as any).status = response.status;
				(error as any).response = { data: errorData };
				throw error;
			}

			const data = await response.json();

			if (data.success && data.user) {
				auth.setUser(data.user);
				auth.persist(data.user);
			}

			return data;
		} catch (error) {
			let errorMessage = 'Login failed';

			if (error instanceof Error) {
				// Check if it's a structured error with response data
				if ((error as any).response?.data?.message) {
					errorMessage = (error as any).response.data.message;
				} else if (error.message) {
					errorMessage = error.message;
				}
			}

			auth.setError(errorMessage);
			throw error;
		} finally {
			auth.setLoading(false);
		}
	}

	async logout(): Promise<void> {
		try {
			auth.setLoading(true);

			await this.makeRequest('/auth/logout', {
				method: 'POST'
			});
		} catch (error) {
			console.error('Logout error:', error);
			// Continue with logout even if API call fails
		} finally {
			auth.logout();
			auth.clearPersisted();
			auth.setLoading(false);
		}
	}

	async refreshToken(): Promise<AuthResponse> {
		try {
			const response = await this.makeRequest<AuthResponse>('/auth/refresh', {
				method: 'POST',
				body: JSON.stringify({})
			});

			if (response.success && response.user) {
				auth.setUser(response.user);
				auth.persist(response.user);
			}

			return response;
		} catch (error) {
			console.error('Token refresh failed:', error);
			// Only logout if we're actually authenticated
			// Note: We can't easily check auth state here without subscribing
			// This is a fallback, so we'll just clear the persisted data
			auth.logout();
			auth.clearPersisted();
			throw error;
		}
	}

	async verifyToken(): Promise<AuthResponse> {
		try {
			const response = await this.makeRequest<AuthResponse>('/auth/verify', {
				method: 'GET'
			});

			if (response.success && response.user) {
				auth.setUser(response.user);
				auth.persist(response.user);
			}

			return response;
		} catch (error) {
			// Token verification failed - this is normal for unauthenticated users
			auth.logout();
			auth.clearPersisted();
			throw error;
		}
	}

	async getCurrentUser(): Promise<AuthResponse> {
		try {
			const response = await this.makeRequest<AuthResponse>('/auth/me', {
				method: 'GET'
			});

			if (response.success && response.user) {
				auth.setUser(response.user);
				auth.persist(response.user);
			}

			return response;
		} catch (error) {
			// Get current user failed - this is normal for unauthenticated users
			auth.logout();
			auth.clearPersisted();
			throw error;
		}
	}

	async changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
		try {
			auth.setLoading(true);
			auth.clearError();

			const response = await this.makeRequest<AuthResponse>('/auth/change-password', {
				method: 'POST',
				body: JSON.stringify({
					currentPassword,
					newPassword
				})
			});

			return response;
		} catch (error) {
			let errorMessage = 'Password change failed';

			if (error instanceof Error) {
				// Check if it's a structured error with response data
				if ((error as any).response?.data?.message) {
					errorMessage = (error as any).response.data.message;
				} else if (error.message) {
					errorMessage = error.message;
				}
			}

			auth.setError(errorMessage);
			throw error;
		} finally {
			auth.setLoading(false);
		}
	}

	// Check if user is authenticated (client-side)
	async checkAuth(): Promise<boolean> {
		if (!browser) return false;

		try {
			// First try to get from session
			await this.getCurrentUser();
			return true;
		} catch {
			// If session fails, try token verification
			try {
				await this.verifyToken();
				return true;
			} catch {
				// User not authenticated - this is normal for login page
				return false;
			}
		}
	}

	// Initialize authentication on app start
	async init(): Promise<void> {
		if (!browser || this.initialized) return;

		this.initialized = true;
		auth.init();

		// Try to verify authentication silently
		try {
			await this.checkAuth();
		} catch {
			// Auth check failed - this is normal for unauthenticated users
		}
	}
}

export const authService = new AuthService();
