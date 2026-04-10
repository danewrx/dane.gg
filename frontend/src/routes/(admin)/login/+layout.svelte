<script lang="ts">
	// Admin login layout - completely independent from public site
	import { Toaster } from 'svelte-sonner';
	import { browser } from '$app/environment';

	// Detect device theme preference
	let deviceTheme: 'light' | 'dark' = 'dark';

	if (browser) {
		// Check if user prefers light mode
		if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
			deviceTheme = 'light';
		}

		// Listen for theme changes
		window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
			deviceTheme = e.matches ? 'light' : 'dark';
		});
	}
</script>

<slot />

<!-- Toast notifications -->
<Toaster
	position="top-right"
	richColors
	closeButton
	expand={false}
	visibleToasts={5}
	theme={deviceTheme}
	toastOptions={{
		duration: 4000,
		classes: {
			toast: 'toast-custom',
			title: 'toast-title-custom',
			description: 'toast-description-custom',
			success: 'toast-success-custom',
			error: 'toast-error-custom',
			info: 'toast-info-custom'
		}
	}}
/>

<style>
	/* Admin login section styling - completely independent */
	:global(html) {
		background: #1a1a1a;
	}

	:global(body) {
		background: #1a1a1a;
		margin: 0;
		padding: 0;
		min-height: 100vh;
	}

	/* Light theme for devices with light preference */
	@media (prefers-color-scheme: light) {
		:global(html) {
			background: #f8fafc !important;
		}

		:global(body) {
			background: #f8fafc !important;
		}
	}

	/* Custom toast styling */
	:global(.toast-custom) {
		border-radius: 12px !important;
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1) !important;
	}

	:global(.toast-success-custom) {
		background: linear-gradient(
			135deg,
			rgba(34, 197, 94, 0.95) 0%,
			rgba(22, 163, 74, 0.95) 100%
		) !important;
		color: white !important;
	}

	:global(.toast-error-custom) {
		background: linear-gradient(
			135deg,
			rgba(239, 68, 68, 0.95) 0%,
			rgba(220, 38, 38, 0.95) 100%
		) !important;
		color: white !important;
	}

	:global(.toast-info-custom) {
		background: linear-gradient(
			135deg,
			rgba(59, 130, 246, 0.95) 0%,
			rgba(37, 99, 235, 0.95) 100%
		) !important;
		color: white !important;
	}

	:global(.toast-title-custom) {
		font-weight: 600 !important;
		font-size: 0.9rem !important;
	}

	:global(.toast-description-custom) {
		font-size: 0.8rem !important;
		opacity: 0.9 !important;
	}
</style>
