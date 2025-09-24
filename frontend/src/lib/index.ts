// place files you want to import through the `$lib` alias in this folder.

// Re-export commonly used components and services for convenience

// Admin exports
export { authService } from './admin/services/auth';
export { themeService } from './admin/services/theme';
export { accentColorService } from './admin/services/accentColor';
export { settingsService } from './admin/services/settings';
export { accountService } from './admin/services/account';
export { TotpService } from './admin/services/totp';
export { user } from './admin/stores/auth';
export { adminNavigation } from './admin/config/navigation';
export { default as Logo } from './admin/components/Logo.svelte';

// Site exports  
export { default as Header } from './site/components/layout/Header.svelte';
export { default as LoadingSpinner } from './site/components/ui/LoadingSpinner.svelte';

// Shared exports
export { default as TabsExample } from './shared/components/ui/Tabs.example.svelte';

// Toast notifications - now using svelte-sonner
// import { toast } from 'svelte-sonner';
