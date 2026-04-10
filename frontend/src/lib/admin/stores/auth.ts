import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
	id: string;
	username: string;
	isAdmin: boolean;
	themePreference?: string;
	accentColor?: string;
}

export interface AuthState {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
}

// Create the auth store
function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		isAuthenticated: false,
		isLoading: true,
		error: null
	});

	return {
		subscribe,

		// Set user data
		setUser: (user: User | null) => {
			update((state) => ({
				...state,
				user,
				isAuthenticated: !!user,
				isLoading: false,
				error: null
			}));
		},

		// Set loading state
		setLoading: (isLoading: boolean) => {
			update((state) => ({ ...state, isLoading }));
		},

		// Set error
		setError: (error: string | null) => {
			update((state) => ({ ...state, error, isLoading: false }));
		},

		// Clear error
		clearError: () => {
			update((state) => ({ ...state, error: null }));
		},

		// Logout
		logout: () => {
			update((state) => ({
				user: null,
				isAuthenticated: false,
				isLoading: false,
				error: null
			}));
		},

		// Initialize from session storage
		init: () => {
			if (browser) {
				try {
					const stored = localStorage.getItem('auth');
					if (stored) {
						const { user, timestamp } = JSON.parse(stored);
						// Check if stored data is less than 24 hours old
						if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
							update((state) => ({
								...state,
								user,
								isAuthenticated: !!user,
								isLoading: false
							}));
						} else {
							// Clear expired data
							localStorage.removeItem('auth');
							update((state) => ({ ...state, isLoading: false }));
						}
					} else {
						update((state) => ({ ...state, isLoading: false }));
					}
				} catch (error) {
					console.error('Error initializing auth store:', error);
					localStorage.removeItem('auth');
					update((state) => ({ ...state, isLoading: false }));
				}
			}
		},

		// Persist to session storage
		persist: (user: User) => {
			if (browser) {
				try {
					localStorage.setItem(
						'auth',
						JSON.stringify({
							user,
							timestamp: Date.now()
						})
					);
				} catch (error) {
					console.error('Error persisting auth data:', error);
				}
			}
		},

		// Clear persisted data
		clearPersisted: () => {
			if (browser) {
				localStorage.removeItem('auth');
			}
		}
	};
}

export const auth = createAuthStore();

// Derived stores
export const user = derived(auth, ($auth) => $auth.user);
export const isAuthenticated = derived(auth, ($auth) => $auth.isAuthenticated);
export const isLoading = derived(auth, ($auth) => $auth.isLoading);
export const error = derived(auth, ($auth) => $auth.error);
