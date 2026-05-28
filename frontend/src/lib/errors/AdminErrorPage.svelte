<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { ModeWatcher } from 'mode-watcher';
	import { accentColorService } from '$lib/admin/services/accentColor';
	import '$lib/admin/theme/admin-accent.css';

	type ErrorContent = {
		title: string;
		description: string;
		hint?: string;
	};

	const fallbackContent: ErrorContent = {
		title: 'Something went wrong',
		description: 'An unexpected error occurred while loading this page.',
		hint: 'Try refreshing the page, then return to the admin dashboard if the issue persists.'
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
			hint: 'Sign in to the admin panel and try again.'
		},
		403: {
			title: 'Forbidden',
			description: 'You do not have permission to view this page.',
			hint: 'Contact another administrator if you believe you should have access.'
		},
		404: {
			title: 'Page not found',
			description: 'The page you requested does not exist or has moved.',
			hint: 'Use the buttons below to return to the admin dashboard.'
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

	onMount(() => {
		void accentColorService.init();
	});
</script>

<ModeWatcher track={true} />

<main class="admin-error-shell" role="alert" aria-live="polite">
	<section class="admin-error-card">
		<div class="error-ascii-wrap">
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
		</div>
		<p class="status">Error {$page.status}</p>
		<h1>{content.title}</h1>
		<p class="description">{content.description}</p>
		{#if content.hint}
			<p class="hint">{content.hint}</p>
		{/if}
		<div class="actions">
			<a href="/admin" class="back-link">Back to admin</a>
			<a href="/" class="secondary-link">Go to public site</a>
		</div>
		{#if technicalMessage && technicalMessage !== content.description}
			<details class="technical-details">
				<summary>Technical details</summary>
				<pre>{technicalMessage}</pre>
			</details>
		{/if}
	</section>
</main>

<style>
	:global(:root) {
		--bg-primary: #1a1a1a;
		--bg-secondary: #2d2d2d;
		--bg-tertiary: #3a3a3a;
		--text-primary: #ffffff;
		--text-secondary: #a1a1aa;
		--border-color: #404040;
		--accent-color: #3b82f6;
		--accent-bg: #3b82f6;
		--accent-fg: #ffffff;
		--accent-bg-hover: #2563eb;
		--accent-fg-hover: #ffffff;
		--accent-on-surface: #3b82f6;
		--accent-muted-bg: rgba(59, 130, 246, 0.1);
		--accent-muted-fg: #3b82f6;
		--accent-border: rgba(59, 130, 246, 0.45);
		--accent-color-light: rgba(59, 130, 246, 0.1);
		--accent-color-contrast: #ffffff;
	}

	:global(html:not(.dark)) {
		--bg-primary: #ffffff;
		--bg-secondary: #f8fafc;
		--bg-tertiary: #f1f5f9;
		--text-primary: #1f2937;
		--text-secondary: #6b7280;
		--border-color: #e5e7eb;
	}

	.admin-error-shell {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 32px;
		background-color: var(--bg-primary, #14161b);
		background-image:
			linear-gradient(
				color-mix(in srgb, var(--border-color, #404040) 45%, transparent) 1px,
				transparent 1px
			),
			linear-gradient(
				90deg,
				color-mix(in srgb, var(--border-color, #404040) 45%, transparent) 1px,
				transparent 1px
			),
			linear-gradient(
				to bottom right,
				color-mix(in srgb, var(--accent-on-surface, var(--accent-color, #3b82f6)) 14%, var(--bg-primary, #1a1a1a)),
				var(--bg-primary, #1a1a1a) 48%,
				color-mix(in srgb, var(--accent-on-surface, var(--accent-color, #3b82f6)) 7%, var(--bg-secondary, #2d2d2d))
			);
		background-size:
			28px 28px,
			28px 28px,
			100% 100%;
		color: var(--text-primary, #ffffff);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.admin-error-card {
		width: min(100%, 560px);
		background: var(--bg-secondary, #20242c);
		border: 1px solid color-mix(in srgb, var(--border-color, #404040) 75%, transparent);
		border-radius: 14px;
		padding: 26px 24px;
		box-shadow:
			0 16px 40px rgba(0, 0, 0, 0.35),
			0 0 0 1px rgba(255, 255, 255, 0.03) inset;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.error-ascii-wrap {
		container-type: inline-size;
		width: 100%;
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
		overflow: hidden;
	}

	.error-ascii {
		margin: 0;
		padding: 0;
		width: max-content;
		max-width: 100%;
		/* Art is visually heavier on the left; nudge right for optical centering */
		transform: translateX(0.45em);
		white-space: pre;
		line-height: 1;
		font-family: var(--ascii-font-family, 'JetBrains Mono', 'Courier New', monospace);
		font-size: clamp(7px, 1.65cqi, 9.5px);
		color: color-mix(
			in srgb,
			var(--accent-on-surface, var(--accent-color, #3b82f6)) 48%,
			var(--text-secondary, #a1a1aa) 52%
		);
		text-shadow:
			0 0 6px color-mix(in srgb, var(--accent-on-surface, var(--accent-color, #3b82f6)) 32%, transparent),
			0 0 14px color-mix(in srgb, var(--accent-on-surface, var(--accent-color, #3b82f6)) 18%, transparent);
		transition:
			color 0.25s ease,
			text-shadow 0.25s ease;
	}

	.status,
	h1,
	.description,
	.hint {
		width: 100%;
		max-width: 36rem;
	}

	.status {
		margin: 0 0 8px 0;
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		font-weight: 700;
		color: var(--accent-on-surface, var(--accent-color, #3b82f6));
	}

	h1 {
		margin: 0.25rem 0 0;
		font-size: clamp(1.5rem, 2.8vw, 2rem);
		line-height: 1.2;
		color: var(--text-primary, #ffffff);
	}

	.description {
		margin: 12px 0 0;
		color: var(--text-primary, #ffffff);
		line-height: 1.55;
		font-size: 0.98rem;
	}

	.hint {
		margin: 0.7rem 0 0;
		color: var(--text-secondary, #c7d0da);
		line-height: 1.55;
		font-size: 0.92rem;
	}

	.technical-details {
		margin-top: 1rem;
		width: 100%;
		max-width: 36rem;
		text-align: center;
	}

	.technical-details summary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		cursor: pointer;
		list-style: none;
		padding: 0.4rem 0.85rem;
		border-radius: 6px;
		border: 1px solid color-mix(in srgb, var(--border-color, #404040) 75%, transparent);
		background: color-mix(in srgb, var(--bg-tertiary, #3a3a3a) 55%, transparent);
		color: var(--text-secondary, #a1a1aa);
		font-size: 0.85rem;
		font-weight: 500;
		transition:
			color 0.2s ease,
			border-color 0.2s ease,
			background 0.2s ease;
	}

	.technical-details summary::-webkit-details-marker {
		display: none;
	}

	.technical-details summary::after {
		content: '▸';
		font-size: 0.7rem;
		opacity: 0.75;
		transition: transform 0.2s ease;
	}

	.technical-details[open] summary::after {
		transform: rotate(90deg);
	}

	.technical-details summary:hover,
	.technical-details[open] summary {
		color: var(--accent-muted-fg, var(--accent-on-surface, #3b82f6));
		border-color: var(--accent-border, color-mix(in srgb, var(--accent-on-surface, #3b82f6) 45%, transparent));
		background: var(--accent-muted-bg, color-mix(in srgb, var(--accent-on-surface, #3b82f6) 10%, transparent));
	}

	.technical-details[open] summary {
		margin-bottom: 0.65rem;
	}

	.technical-details pre {
		margin: 0;
		padding: 0.75rem 1rem;
		text-align: left;
		white-space: pre-wrap;
		word-break: break-word;
		font-family: var(--ascii-font-family, 'JetBrains Mono', 'Courier New', monospace);
		font-size: 0.8rem;
		line-height: 1.45;
		color: var(--text-secondary, #a1a1aa);
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid color-mix(in srgb, var(--border-color, #404040) 65%, transparent);
		border-radius: 8px;
	}

	.actions {
		margin-top: 18px;
		width: 100%;
		max-width: 36rem;
		display: flex;
		justify-content: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		padding: 0.5rem 0.8rem;
		border-radius: 6px;
		border: 1px solid var(--accent-border, color-mix(in srgb, var(--accent-on-surface, #3b82f6) 70%, transparent));
		background: var(--accent-muted-bg, color-mix(in srgb, var(--accent-on-surface, #3b82f6) 14%, transparent));
		color: var(--accent-muted-fg, var(--accent-on-surface, #3b82f6));
		text-decoration: none;
		font-weight: 600;
		transition: all 0.2s ease;
	}

	.back-link:hover {
		background: var(--accent-bg, var(--accent-color, #3b82f6));
		border-color: var(--accent-bg, var(--accent-color, #3b82f6));
		color: var(--accent-fg, #ffffff);
		transform: translateY(-1px);
	}

	.secondary-link {
		display: inline-flex;
		align-items: center;
		padding: 0.5rem 0.8rem;
		border-radius: 6px;
		border: 1px solid color-mix(in srgb, var(--border-color, #4b5563) 75%, transparent);
		background: color-mix(in srgb, var(--bg-tertiary, #2b313b) 60%, transparent);
		color: var(--text-secondary, #c7d0da);
		text-decoration: none;
		font-weight: 600;
		transition: all 0.2s ease;
	}

	.secondary-link:hover {
		border-color: var(--accent-border, color-mix(in srgb, var(--accent-on-surface, #3b82f6) 45%, transparent));
		color: var(--accent-muted-fg, var(--accent-on-surface, #3b82f6));
		background: var(--accent-muted-bg, color-mix(in srgb, var(--accent-on-surface, #3b82f6) 10%, transparent));
		transform: translateY(-1px);
	}

	@media (max-width: 640px) {
		.admin-error-shell {
			padding: 16px;
		}
		.admin-error-card {
			padding: 16px;
		}
		.actions {
			flex-direction: column;
		}
		.back-link,
		.secondary-link {
			justify-content: center;
		}
	}
</style>
