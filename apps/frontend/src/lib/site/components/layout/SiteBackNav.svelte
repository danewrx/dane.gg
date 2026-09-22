<script lang="ts">
	import { ArrowLeft } from 'lucide-svelte';

	interface Props {
		href: string;
		label: string;
		embedded?: boolean;
	}

	let { href, label, embedded = false }: Props = $props();
</script>

<a class="site-back-nav" class:site-back-nav--embedded={embedded} {href}>
	<ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
	<span>{label}</span>
</a>

<style>
	.site-back-nav {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.45rem 0.75rem;
		background: var(--theme-background, var(--bg-secondary, #0a0a0a));
		color: var(--theme-text-primary, var(--text-primary, #ffffff));
		border: 1px solid var(--theme-border, var(--border-color, #ffffff));
		border-radius: 0;
		text-decoration: none;
		font-size: calc(13 * 1em / 14);
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition:
			background 0.2s ease,
			border-color 0.2s ease,
			color 0.2s ease;
		width: fit-content;
		box-sizing: border-box;
	}

	.site-back-nav:hover {
		background: var(--theme-surface, var(--bg-primary, #1a1a1a));
		border-color: var(--theme-accent, var(--accent-color, #6366f1));
		color: var(--theme-accent, var(--accent-color, #6366f1));
	}

	.site-back-nav:focus-visible {
		outline: 2px solid var(--theme-accent, var(--accent-color, #6366f1));
		outline-offset: 2px;
	}

	.site-back-nav :global(svg) {
		flex-shrink: 0;
	}

	.site-back-nav--embedded {
		border: none;
		background: transparent;
		padding: 6px 12px;
		color: var(--theme-text-secondary, var(--text-secondary, #a1a1aa));
	}

	.site-back-nav--embedded:hover {
		color: var(--theme-accent, var(--accent-color, #6366f1));
		background: color-mix(in srgb, var(--theme-accent, var(--accent-color, #6366f1)) 14%, transparent);
		border-color: transparent;
	}

	.site-back-nav--embedded:focus-visible {
		outline-offset: 1px;
	}
</style>
