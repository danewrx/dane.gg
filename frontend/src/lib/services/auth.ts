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
      const response = await fetch(url, defaultOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }

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
      if (auth.get().isAuthenticated) {
        auth.logout();
        auth.clearPersisted();
      }
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
      // If session fails, try token verification
      try {
        await this.verifyToken();
        return true;
      } catch (tokenError) {
        return false;
      }
    }
  }

  // Initialize authentication on app start
  async init(): Promise<void> {
    if (!browser) return;

    auth.init();

    // Try to verify authentication
    try {
      await this.checkAuth();
    } catch (error) {
      console.error('Auth initialization failed:', error);
    }
  }
}

export const authService = new AuthService();
