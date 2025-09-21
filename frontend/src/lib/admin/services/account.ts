import { auth } from '$lib/admin/stores/auth';
import { get } from 'svelte/store';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface UpdateUsernameRequest {
  newUsername: string;
  currentPassword: string;
}

interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface AccountResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    username: string;
    isAdmin: boolean;
  };
}

class AccountService {
  private async makeRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data as T;
    } catch (error) {
      console.error('Account API request failed:', endpoint, error);
      throw error;
    }
  }

  /**
   * Update user's username
   */
  async updateUsername(request: UpdateUsernameRequest): Promise<AccountResponse> {
    try {
      const response = await this.makeRequest<AccountResponse>('/auth/update-username', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      // Update the auth store with new user data
      if (response.success && response.user) {
        auth.setUser(response.user);
      }

      return response;
    } catch (error) {
      console.error('Update username failed:', error);
      throw error;
    }
  }

  /**
   * Update user's password
   */
  async updatePassword(request: UpdatePasswordRequest): Promise<AccountResponse> {
    try {
      const response = await this.makeRequest<AccountResponse>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      return response;
    } catch (error) {
      console.error('Update password failed:', error);
      throw error;
    }
  }

  /**
   * Check username availability
   */
  async checkUsernameAvailability(username: string): Promise<{
    available: boolean;
    reason?: 'taken' | 'invalid_format' | 'current_username';
    message: string;
  }> {
    try {
      const response = await this.makeRequest<{
        available: boolean;
        reason?: 'taken' | 'invalid_format' | 'current_username';
        message: string;
      }>('/auth/check-username', {
        method: 'POST',
        body: JSON.stringify({ username })
      });

      return response;
    } catch (error) {
      console.error('Check username availability failed:', error);
      return {
        available: false,
        reason: 'taken',
        message: 'Unable to check username availability'
      };
    }
  }

  /**
   * Get current user account information
   */
  async getAccountInfo(): Promise<{
    id: string;
    username: string;
    isAdmin: boolean;
    themePreference?: string;
    accentColor?: string;
  } | null> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        user: {
          id: string;
          username: string;
          isAdmin: boolean;
          themePreference?: string;
          accentColor?: string;
        };
      }>('/auth/me', {
        method: 'GET'
      });

      if (response.success && response.user) {
        return response.user;
      }

      return null;
    } catch (error) {
      console.error('Get account info failed:', error);
      return null;
    }
  }

  /**
   * Validate username format
   */
  validateUsername(username: string): { isValid: boolean; message?: string } {
    if (!username || typeof username !== 'string') {
      return { isValid: false, message: 'Username is required' };
    }

    if (username.length < 3) {
      return { isValid: false, message: 'Username must be at least 3 characters' };
    }

    if (username.length > 20) {
      return { isValid: false, message: 'Username must be no more than 20 characters' };
    }

    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      return { 
        isValid: false, 
        message: 'Username can only contain letters, numbers, underscores, and hyphens' 
      };
    }

    return { isValid: true };
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): { isValid: boolean; message?: string } {
    if (!password || typeof password !== 'string') {
      return { isValid: false, message: 'Password is required' };
    }

    if (password.length < 6) {
      return { isValid: false, message: 'Password must be at least 6 characters' };
    }

    if (password.length > 128) {
      return { isValid: false, message: 'Password must be no more than 128 characters' };
    }

    return { isValid: true };
  }

  /**
   * Check password strength and return feedback
   */
  getPasswordStrength(password: string): {
    score: number; // 0-4
    feedback: string;
    color: string;
  } {
    if (!password) {
      return { score: 0, feedback: 'Enter a password', color: '#6b7280' };
    }

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[^a-zA-Z0-9]/.test(password)
    };

    // Calculate score
    if (checks.length) score++;
    if (checks.lowercase) score++;
    if (checks.uppercase) score++;
    if (checks.numbers) score++;
    if (checks.symbols) score++;

    // Determine feedback and color
    if (score <= 1) {
      return { score, feedback: 'Very weak', color: '#ef4444' };
    } else if (score === 2) {
      return { score, feedback: 'Weak', color: '#f97316' };
    } else if (score === 3) {
      return { score, feedback: 'Fair', color: '#eab308' };
    } else if (score === 4) {
      return { score, feedback: 'Good', color: '#22c55e' };
    } else {
      return { score, feedback: 'Strong', color: '#059669' };
    }
  }
}

// Export singleton instance
export const accountService = new AccountService();
