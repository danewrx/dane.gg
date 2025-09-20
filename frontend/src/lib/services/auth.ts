import { auth } from '$lib/stores/auth';
import { browser } from '$app/environment';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    username: string;
    isAdmin: boolean;
  };
  expiresIn?: string;
  accessToken?: string;
}

interface ApiError {
  error: string;
  message: string;
  retryAfter?: string;
}

class AuthService {
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
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
      console.log(`Making API request to: ${url}`);
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API request failed: ${endpoint}`, response.status, errorText);
        throw new Error(`Request failed with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`API response from ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      auth.setLoading(true);
      auth.clearError();

      const response = await this.makeRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      if (response.success && response.user) {
        auth.setUser(response.user);
        auth.persist(response.user);
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
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
      console.error('Token verification failed:', error);
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
      console.error('Get current user failed:', error);
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
      const errorMessage = error instanceof Error ? error.message : 'Password change failed';
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
    } catch (error) {
      console.log('Session check failed, trying token verification...');
      // If session fails, try token verification
      try {
        await this.verifyToken();
        return true;
      } catch (tokenError) {
        console.log('Token verification also failed, user not authenticated');
        return false;
      }
    }
  }

  // Initialize authentication on app start
  async init(): Promise<void> {
    if (!browser) return;

    console.log('Initializing auth service...');
    auth.init();

    // Try to verify authentication
    try {
      console.log('Checking auth...');
      const isAuth = await this.checkAuth();
      console.log('Auth check completed, authenticated:', isAuth);
    } catch (error) {
      console.error('Auth initialization failed:', error);
      // Don't throw error, just log it - this allows the app to continue
    }
  }
}

export const authService = new AuthService();
