<script lang="ts">
	import { page } from '$app/stores';
	import Logo from '$lib/admin/components/Logo.svelte';

	const navigation = [
		{ name: 'Home', path: '/' },
		{ name: 'About', path: '/about' },
		{ name: 'Projects', path: '/projects' },
		{ name: 'Blog', path: '/blog' },
		{ name: 'Contact', path: '/contact' }
	];

	// Check if a link is active
	function isActive(path: string): boolean {
		if (path === '/') {
			return $page.url.pathname === '/';
		}
		return $page.url.pathname.startsWith(path);
	}
</script>

<header class="header">
	<div class="ascii-container">
		<a
			href="/"
			class="ascii-link"
			aria-label="Go to homepage"
			data-sveltekit-preload-data="hover"
		>
			<div class="ascii-box" aria-hidden="true">
				<Logo animate={true} />
			</div>
		</a>
	</div>

	<nav class="nav">
		<div class="nav-container">
			<ul id="dane-neko-nav-home" class="nav-list">
				{#each navigation as item}
					<li class="nav-item">
						<a
							href={item.path}
							class="nav-link"
							class:active={isActive(item.path)}
							data-sveltekit-preload-data="hover"
						>
							{item.name}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</nav>
</header>

<style>
	.header {
		text-align: left;
		margin-bottom: 16px;
		padding-bottom: 10px;
		border-bottom: 2px solid var(--theme-border, var(--text-primary));
	}

	.ascii-container {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		flex-wrap: nowrap;
		margin-bottom: -20px;
		padding: 0;
	}

	.ascii-link {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		text-decoration: none;
		padding: 0;
		outline: none;
		box-shadow: none;
		display: inline-block;
	}

	.ascii-link:hover,
	.ascii-link:focus,
	.ascii-link:active {
		outline: none;
		box-shadow: none;
	}

	.ascii-link:hover .ascii-box :global(.ascii-art),
	.ascii-link:hover .ascii-box :global(.ascii-text) {
		color: var(--accent-color) !important;
		text-shadow:
			0 0 8px color-mix(in srgb, var(--theme-accent, #c6e4ff) 70%, transparent),
			0 0 18px color-mix(in srgb, var(--theme-accent, #c6e4ff) 45%, transparent) !important;
		animation: none !important;
		transition:
			color 0.3s ease,
			text-shadow 0.3s ease;
	}

	.ascii-box {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		margin: 0 auto;
		transform: translateX(4px);
	}

	.ascii-box :global(.brand-logo) {
		margin: 0;
	}

	.ascii-box :global(.logo-container) {
		gap: 0.8rem;
	}

	.ascii-box :global(.ascii-art) {
		color: var(--theme-text-primary) !important;
		font-family: var(--ascii-font-family) !important;
		font-size: clamp(calc(6px * var(--theme-font-scale, 1)), 0.85vw, calc(11px * var(--theme-font-scale, 1)));
		text-shadow:
			0 0 6px color-mix(in srgb, var(--theme-text-primary, #ffd5d5) 35%, transparent),
			0 0 14px color-mix(in srgb, var(--theme-accent, #c6e4ff) 25%, transparent);
		transition:
			color 0.3s ease,
			text-shadow 0.3s ease;
	}

	.ascii-box :global(.ascii-text) {
		color: var(--theme-text-primary) !important;
		font-family: var(--ascii-font-family) !important;
		font-size: clamp(
			calc(8px * var(--theme-font-scale, 1)),
			1vw,
			calc(15px * var(--theme-font-scale, 1))
		);
		text-shadow:
			0 0 7px color-mix(in srgb, var(--theme-text-primary, #ffd5d5) 40%, transparent),
			0 0 18px color-mix(in srgb, var(--theme-accent, #c6e4ff) 30%, transparent);
		transition:
			color 0.3s ease,
			text-shadow 0.3s ease;
	}


	.ascii-box :global(.brand-logo.animated .ascii-art),
	.ascii-box :global(.brand-logo.animated .ascii-text) {
		animation: softColorCycleTheme 10s ease-in-out infinite !important;
	}

	@keyframes softColorCycleTheme {
		0% {
			color: var(--theme-text-primary, #ffd5d5);
			text-shadow:
				0 0 6px color-mix(in srgb, var(--theme-text-primary, #ffd5d5) 45%, transparent),
				0 0 14px color-mix(in srgb, var(--theme-accent, #c6e4ff) 25%, transparent);
		}
		25% {
			color: var(--theme-accent, #c6e4ff);
			text-shadow:
				0 0 8px color-mix(in srgb, var(--theme-accent, #c6e4ff) 60%, transparent),
				0 0 20px color-mix(in srgb, var(--theme-accent, #c6e4ff) 35%, transparent);
		}
		50% {
			color: var(--theme-secondary, #d7c8ff);
			text-shadow:
				0 0 8px color-mix(in srgb, var(--theme-secondary, #d7c8ff) 58%, transparent),
				0 0 20px color-mix(in srgb, var(--theme-accent, #c6e4ff) 28%, transparent);
		}
		75% {
			color: var(--theme-accent, #c6e4ff);
			text-shadow:
				0 0 8px color-mix(in srgb, var(--theme-accent, #c6e4ff) 60%, transparent),
				0 0 20px color-mix(in srgb, var(--theme-accent, #c6e4ff) 35%, transparent);
		}
		100% {
			color: var(--theme-text-primary, #ffd5d5);
			text-shadow:
				0 0 6px color-mix(in srgb, var(--theme-text-primary, #ffd5d5) 45%, transparent),
				0 0 14px color-mix(in srgb, var(--theme-accent, #c6e4ff) 25%, transparent);
		}
	}

	.nav {
		margin-top: 20px;
	}

	.nav-container {
		width: 100%;
		max-width: 100%;
		min-width: 0;
	}

	.nav-list {
		display: flex;
		list-style: none;
		margin: 0;
		padding: 0;
		padding-left: 6px;
		gap: 20px;
		flex-wrap: wrap;
		justify-content: flex-start;
	}

	.nav-item {
		margin: 0;
	}

	.nav-link {
		background: none;
		border: none;
		color: var(--theme-text-primary, var(--text-primary));
		font-size: calc(14 * 1em / 14);
		cursor: pointer;
		padding: 5px 0;
		text-decoration: none;
		transition: all 0.2s ease;
		position: relative;
		display: inline-block;
	}

	.nav-link:hover {
		color: var(--accent-color);
		transform: translateY(-1px);
	}

	.nav-link.active {
		background: none !important;
		border: none !important;
		color: var(--accent-color);
		font-weight: 600;
	}

	.nav-link.active::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--accent-color);
		animation: slideIn 0.3s ease;
	}

	@keyframes slideIn {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.ascii-box {
			transform: translateX(2px);
		}

		.ascii-box :global(.logo-container) {
			gap: 0.45rem;
		}

		.ascii-box :global(.ascii-art) {
			font-size: clamp(calc(4px * var(--theme-font-scale, 1)), 1.7vw, calc(8px * var(--theme-font-scale, 1)));
		}

		.ascii-box :global(.ascii-text) {
			font-size: clamp(calc(6px * var(--theme-font-scale, 1)), 2vw, calc(11px * var(--theme-font-scale, 1)));
		}

		.nav-container {
			overflow-x: auto;
			overflow-y: hidden;
			-webkit-overflow-scrolling: touch;
			overscroll-behavior-x: contain;
			scrollbar-width: thin;
		}

		.nav-container::-webkit-scrollbar {
			height: 4px;
		}

		.nav-container::-webkit-scrollbar-thumb {
			background: color-mix(in srgb, var(--theme-border, #fff) 35%, transparent);
			border-radius: 4px;
		}

		.nav-list {
			justify-content: flex-start;
			flex-wrap: nowrap;
			gap: clamp(8px, 2.5vw, 14px);
			padding-bottom: 4px;
			width: max-content;
			min-width: 100%;
		}

		.nav-link {
			font-size: calc(12 * 1em / 14);
			white-space: nowrap;
			flex-shrink: 0;
		}
	}

	@media (max-width: 380px) {
		.nav-list {
			gap: 6px;
		}

		.nav-link {
			font-size: calc(11 * 1em / 14);
		}
	}
</style>
