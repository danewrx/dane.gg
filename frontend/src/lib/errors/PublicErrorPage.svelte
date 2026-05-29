<script lang="ts">
	import { page } from '$app/stores';
	import Header from '$lib/site/components/layout/Header.svelte';
	import ThemeProvider from '$lib/site/components/ThemeProvider.svelte';
	import SiteAdminShortcut from '$lib/site/components/layout/SiteAdminShortcut.svelte';
	import SettingsIcon from '$lib/admin/components/settings/SettingsIcon.svelte';
	import SettingsPanel from '$lib/admin/components/settings/SettingsPanel.svelte';

	type ErrorContent = {
		title: string;
		description: string;
		hint?: string;
	};

	const fallbackContent: ErrorContent = {
		title: 'Something went wrong',
		description: 'An unexpected error occurred while loading this page.',
		hint: 'Try refreshing the page, then go back home if the issue persists.'
	};

	const statusContent: Record<number, ErrorContent> = {
		400: {
			title: 'Bad request',
			description: 'The request could not be understood by the server.',
			hint: 'Please check the URL and try again.'
		},
		401: {
			title: 'Unauthorized',
			description: 'You need to sign in to access this page.',
			hint: 'If you expected access, verify your session and retry.'
		},
		403: {
			title: 'Forbidden',
			description: 'You do not have permission to view this page.',
			hint: 'Contact the site administrator if this seems incorrect.'
		},
		404: {
			title: 'Page not found',
			description: 'The page you requested does not exist or has moved.',
			hint: 'Use the navigation below to get back on track.'
		},
		429: {
			title: 'Too many requests',
			description: 'You are being rate limited right now.',
			hint: 'Wait a moment and try again.'
		},
		500: {
			title: 'Server error',
			description: 'The server hit an unexpected problem.',
			hint: 'Please try again in a few moments.'
		},
		502: {
			title: 'Bad gateway',
			description: 'An upstream service returned an invalid response.',
			hint: 'Please try again shortly.'
		},
		503: {
			title: 'Service unavailable',
			description: 'The service is temporarily unavailable.',
			hint: 'Please retry in a few minutes.'
		},
		504: {
			title: 'Gateway timeout',
			description: 'A dependent service timed out.',
			hint: 'Please try again.'
		}
	};

	const content = $derived(statusContent[$page.status] ?? fallbackContent);
	const technicalMessage = $derived(
		typeof $page.error?.message === 'string' ? $page.error.message : null
	);
	let settingsOpen = $state(false);

	function handleSettingsToggle() {
		settingsOpen = !settingsOpen;
	}

	function handleSettingsClose() {
		settingsOpen = false;
	}
</script>

<div class="main-container dark-theme">
	<ThemeProvider />

	<div class="content-window">
		<div class="content-area">
			<Header />

			<section class="error-shell" role="alert" aria-live="polite">
				<pre class="error-ascii" aria-hidden="true">
⣤⡶⠛⣉⣋⠛⠻⣿⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⡟⠀⣾⣿⣿⣿⠀⢻⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⣷⡀⣘⡿⣷⠟⢀⣼⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠿⠟⠿⣽⡇⢰⣟⡃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⣤⣤⣴⡦⠀
⠀⠀⠀⣸⣇⣸⣯⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣠⣤⣤⣤⣤⣦⣤⣤⣄⣀⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡾⠋⣡⣤⣧⡈⠹⡗
⠀⠀⠀⣷⡏⠀⢹⣷⠀⠀⠀⠀⢀⣠⣴⣾⣿⠿⠶⠞⢛⣫⣭⣭⣝⣽⣿⣿⣿⣿⣻⡛⢦⣄⡀⠀⠀⠀⠀⠀⠀⢨⣅⠀⣿⣾⣟⡿⠀⣹
⠀⠀⠀⠓⠛⠷⠟⠿⠀⠀⣤⣾⣿⠷⠛⠁⠀⣠⣴⣾⠿⠛⠛⠿⠛⠉⠉⠉⠙⠋⠙⠛⠷⣮⣳⣆⡀⠀⠀⠀⠀⠀⠉⢿⡯⠟⠛⢁⣠⡟
⠀⠀⠀⠀⠀⠀⠀⠀⣤⣾⡿⠋⠀⠀⠀⣰⣾⠿⠋⠀⠀⠀⠀⠀⠀⠀⠂⠀⠀⠙⣦⠀⠀⠀⠙⢮⡿⣄⠀⠀⠀⠀⣤⣾⠁⣴⢾⡿⠟⠀
⠀⠀⠀⠀⠀⠀⢀⣼⣷⠏⠀⠤⠈⢀⣾⡿⠋⠀⠀⠀⠀⢸⡃⠀⠈⠀⡀⠀⠠⠀⠸⣇⠀⠀⠀⠀⢻⣞⢧⡀⠀⢸⡷⠛⢶⣿⡛⠀⠀⠀
⠀⠀⠀⠀⠀⢀⣾⣳⠏⠀⢀⠂⢀⣿⡟⠀⢀⡄⠀⠀⢀⣿⠀⠀⠀⢰⠇⠀⠐⠀⠀⣿⡀⠀⠀⢳⡀⠹⣏⣷⠀⢚⣷⣀⣤⡿⠁⠀⠀⠀
⠀⠀⠀⠀⠀⢸⣿⡟⠀⢈⠀⠀⣼⡟⠀⠀⣇⠀⠰⠚⢛⡯⠁⠐⠀⢸⠆⠀⠈⠀⠀⢹⡏⠑⠀⠈⣷⠀⢹⣟⡇⠀⠉⠉⠁⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⣿⣿⠃⠀⢂⠀⢠⣿⠁⠀⠐⣿⠀⠀⠀⣾⡇⠀⠐⠀⣹⠆⠃⠈⠀⢠⡞⣷⠀⠀⠀⢿⡀⠈⣿⣿⠄⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣿⣿⠀⡀⠂⠄⣸⡿⠀⠀⢈⣿⠀⠀⠀⣿⣗⠀⢀⠀⣽⡆⠁⠀⠀⢰⣏⣿⡃⠀⠀⢸⡇⠀⣻⣽⣧⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢸⡏⣟⠀⠠⢁⠢⢸⡏⠀⠁⢈⣷⠀⠀⠐⣿⣿⠀⠀⠀⣿⡇⣶⠀⠀⢸⣧⣟⣇⠀⠀⣿⡇⢠⡜⣧⢿⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣸⣷⣏⠀⣷⠛⠀⣿⡇⠀⠀⢈⣿⣀⣠⣴⣿⣿⣻⣤⡴⣿⣧⡿⣤⢦⣾⣷⣿⣿⣶⣶⣿⡇⠈⣿⡹⣯⣇⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣽⣽⠃⢰⡏⠁⣸⣿⡇⠀⡀⠠⣿⣿⣿⣿⣿⣿⣿⣍⠁⠀⠀⠀⠀⠀⣹⣿⣿⣷⣬⡽⢿⡇⠀⣹⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⣼⣿⡟⠀⣾⠃⢀⣾⣿⣿⠀⡁⠀⣿⠀⢻⣿⣿⣾⣿⣿⠀⠀⠀⠄⠀⠀⢸⣿⣿⣿⣿⠇⣿⠀⣷⣿⣿⡏⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⣿⣹⠀⢰⣿⠀⢨⣟⡿⣽⡆⠀⡀⢿⡀⠈⠻⠾⣽⠟⠃⠀⠀⠀⠀⡁⠀⠀⠙⠛⠋⠁⡘⣷⠀⢿⣿⣽⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⣿⣿⠀⢸⡿⡀⠈⡿⣷⢸⡇⢻⡄⢺⡅⠐⢄⢠⠀⢀⠀⠈⠀⠈⠀⠀⠈⠀⠄⢂⠂⡑⠀⣿⠆⣻⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⣿⣽⡆⠘⣿⣷⡀⢱⠻⣦⣟⠸⣇⠼⣇⠈⠄⠠⠈⠀⡀⠄⠀⠄⠀⠄⢀⠁⠠⠀⠀⣀⣴⡟⠡⣿⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠈⢳⣹⣆⡹⣶⢋⡔⢣⢜⣻⣎⣿⢀⢿⣄⣀⠀⠁⠀⠀⠀⠀⠀⡄⠀⠀⣀⣠⣤⡶⣿⡏⢄⣷⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢹⣯⢻⣯⣷⣬⣃⢾⡣⢿⣞⣧⢚⣿⠛⠻⠿⢶⣶⣶⣶⣶⣾⢿⣛⠻⣭⣓⣶⣿⡇⢎⣿⣿⣿⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠘⢻⣿⣬⣿⣿⣿⣿⣾⡿⣯⢿⣏⣿⡌⠱⢌⠆⡆⣌⣩⠳⠙⢷⣾⣿⣻⢿⣿⣾⣙⢾⣿⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⡨⢒⣹⣿⣿⣿⣿⡿⢃⣽⣿⡿⣿⣞⣷⠯⠶⡼⣴⣤⣤⣤⣤⠾⣿⣿⣿⡿⣯⣿⣼⣿⣿⡾⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⣀⡀⢠⡾⢿⣯⣿⣿⣧⣸⣿⣯⣿⠁⠀⠉⠉⠀⢀⣀⣀⣀⣠⣀⠀⠀⠙⢿⣶⣟⣿⣿⣾⣶⣟⣁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
				</pre>
				<p class="status">Error {$page.status}</p>
				<h1>{content.title}</h1>
				<p class="description">{content.description}</p>
				{#if content.hint}
					<p class="hint">{content.hint}</p>
				{/if}

				<div class="actions">
		<a href="/" data-sveltekit-preload-data="hover">Return home</a>
				</div>

				{#if technicalMessage && technicalMessage !== content.description}
					<details>
						<summary>Technical details</summary>
						<pre>{technicalMessage}</pre>
					</details>
				{/if}
			</section>
		</div>
	</div>

	<SiteAdminShortcut />
	<SettingsIcon isOpen={settingsOpen} on:toggle={handleSettingsToggle} />
	<SettingsPanel isOpen={settingsOpen} onClose={handleSettingsClose} />
</div>

<style>
	.main-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		position: relative;
	}

	.content-window {
		background: var(--theme-surface, rgba(45, 45, 45, 0.95));
		border: var(--theme-shell-border-width, 2px) solid var(--theme-border, #ffffff);
		border-radius: var(--theme-border-radius, 0);
		width: 90%;
		max-width: var(--theme-content-max-width, 900px);
		height: 90vh;
		max-height: 1100px;
		box-shadow: var(--theme-shell-shadow, 0 4px 20px rgba(0, 0, 0, 0.3));
		backdrop-filter: blur(10px);
		position: relative;
		overflow: hidden;
	}

	.content-area {
		background: var(--theme-surface, #1a1a1a);
		height: 100%;
		padding: 1rem 1rem 2rem 1rem;
		overflow-y: auto;
		color: var(--theme-text-primary, #ffffff);
		line-height: var(--theme-body-line-height, 1.65);
	}

	.error-shell {
		margin: 2rem auto;
		max-width: 800px;
		padding: 0.4rem 0.25rem 0.25rem;
		background: transparent;
		border: none;
		box-shadow: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.error-ascii {
		margin: 0 0 1rem 0;
		padding: 0;
		max-width: 100%;
		overflow-x: auto;
		overflow-y: hidden;
		white-space: pre;
		line-height: 1;
		font-family: var(--ascii-font-family, 'JetBrains Mono', 'Courier New', monospace);
		font-size: clamp(8px, 0.95vw, 12px);
		color: var(--theme-text-secondary, #a1a1aa);
		text-shadow:
			0 0 6px color-mix(in srgb, var(--theme-text-primary, #ffffff) 30%, transparent),
			0 0 16px color-mix(in srgb, var(--theme-accent, #6366f1) 25%, transparent);
	}

	.status {
		margin: 0 0 0.5rem 0;
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--theme-accent, #6366f1);
	}

	h1 {
		margin: 0 0 0.6rem 0;
		font-size: clamp(1.35rem, 2.5vw, 2rem);
		line-height: 1.2;
	}

	.description {
		margin: 0;
		color: var(--theme-text-primary, #ffffff);
	}

	.hint {
		margin: 0.7rem 0 0;
		color: var(--theme-text-secondary, #a1a1aa);
	}

	.actions {
		margin-top: 1.2rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		justify-content: center;
	}

	.actions a {
		padding: 0.35rem 0.7rem;
		border: 1px solid color-mix(in srgb, var(--theme-border, #ffffff) 35%, transparent);
		border-radius: 6px;
		color: var(--theme-text-primary, #ffffff);
		text-decoration: none;
		background: color-mix(in srgb, var(--theme-surface, #1a1a1a) 35%, transparent);
		transition: all 0.2s ease;
	}

	.actions a:hover {
		color: var(--theme-background, #0a0a0a);
		background: var(--theme-accent, #6366f1);
		border-color: var(--theme-accent, #6366f1);
	}

	details {
		margin-top: 1rem;
		border-top: 1px dashed color-mix(in srgb, var(--theme-border, #ffffff) 45%, transparent);
		padding-top: 0.8rem;
		width: min(100%, 700px);
		text-align: left;
	}

	summary {
		cursor: pointer;
		color: var(--theme-text-secondary, #a1a1aa);
	}

	pre {
		margin: 0.6rem 0 0;
		white-space: pre-wrap;
		word-break: break-word;
		font-family: var(--ascii-font-family, 'JetBrains Mono', 'Courier New', monospace);
		font-size: 0.8rem;
		color: var(--theme-text-secondary, #a1a1aa);
	}

	@media (max-width: 768px) {
		.main-container {
			padding: 10px;
		}

		.content-window {
			height: 95vh;
			min-height: 600px;
		}
	}
</style>
