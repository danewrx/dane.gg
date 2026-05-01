<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		/** Reserve vertical space before the widget mounts (reduces CLS). */
		minHeight?: string;
		/** IntersectionObserver rootMargin (preload slightly before viewport). */
		rootMargin?: string;
	}

	let {
		children,
		minHeight = '120px',
		rootMargin = '180px 0px 320px 0px'
	}: Props = $props();

	let rootEl: HTMLDivElement | undefined = $state();
	let visible = $state(false);

	onMount(() => {
		if (!browser || !rootEl) return;

		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) {
						visible = true;
						io.disconnect();
						return;
					}
				}
			},
			{ root: null, rootMargin, threshold: 0.01 }
		);

		io.observe(rootEl);
		return () => io.disconnect();
	});
</script>

<div
	class="lazy-when-visible"
	class:lazy-when-visible--pending={!visible}
	bind:this={rootEl}
	style:min-height={!visible ? minHeight : undefined}
>
	{#if visible}
		{@render children()}
	{:else}
		<div class="lazy-when-visible__placeholder" aria-hidden="true"></div>
	{/if}
</div>

<style>
	.lazy-when-visible {
		position: relative;
	}

	.lazy-when-visible__placeholder {
		min-height: calc(100% - 16px);
		margin: 8px;
		border-radius: 6px;
		background: color-mix(in srgb, var(--border-color, #3a3a3a) 35%, transparent);
		opacity: 0.4;
		pointer-events: none;
	}
</style>
