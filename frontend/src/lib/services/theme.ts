import { setMode } from 'mode-watcher';
import { settingsService } from './settings';
import { user } from '$lib/stores/auth';
import { browser } from '$app/environment';
import { get } from 'svelte/store';

class ThemeService {
  private initialized = false;

  /**
   * Initialize theme service - load user's saved theme on app start
   */
  async init(): Promise<void> {
    if (!browser || this.initialized) return;

    console.log('Initializing theme service...');
    
    // Listen for auth state changes
    user.subscribe(async (currentUser) => {
      if (currentUser?.id) {
        await this.loadUserTheme();
      }
    });

    this.initialized = true;
  }

  /**
   * Load and apply user's saved theme preference from database
   */
  async loadUserTheme(): Promise<void> {
    try {
      const currentUser = get(user);
      if (!currentUser?.id) {
        console.log('No authenticated user, skipping theme load');
        return;
      }

      console.log('Loading user theme preference...');
      
      // Try to get theme from user object first (if just logged in)
      let themePreference = currentUser.themePreference;
      
      // If not available, fetch from API
      if (!themePreference) {
        themePreference = await settingsService.getThemePreference();
      }

      if (themePreference && ['light', 'dark', 'system'].includes(themePreference)) {
        console.log('Applying user theme preference:', themePreference);
        setMode(themePreference as 'light' | 'dark' | 'system');
      } else {
        console.log('No valid theme preference found, using system default');
        setMode('system');
      }
    } catch (error) {
      console.error('Failed to load user theme:', error);
      // Fallback to system theme if there's an error
      setMode('system');
    }
  }

  /**
   * Save theme preference to database for authenticated users
   */
  async saveTheme(themePreference: string): Promise<void> {
    try {
      const currentUser = get(user);
      if (!currentUser?.id) {
        console.log('No authenticated user, theme will only be saved locally');
        return;
      }

      console.log('Saving theme preference to database:', themePreference);
      await settingsService.setThemePreference(themePreference);
      console.log('Theme preference saved successfully');
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      throw error;
    }
  }

  /**
   * Set theme and save to database (unified method)
   */
  async setTheme(themePreference: string): Promise<void> {
    if (!['light', 'dark', 'system'].includes(themePreference)) {
      throw new Error('Invalid theme preference. Must be: light, dark, or system');
    }

    // Apply theme locally first
    setMode(themePreference as 'light' | 'dark' | 'system');

    // Save to database if user is authenticated
    await this.saveTheme(themePreference);
  }
}

export const themeService = new ThemeService();
