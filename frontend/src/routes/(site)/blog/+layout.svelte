<script lang="ts">
	import BlogRssDock from '$lib/site/components/blog/BlogRssDock.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="blog-section-layout">
	<div class="blog-section-scroll">
		{@render children?.()}
	</div>
	<div class="blog-rss-dock-bar">
		<BlogRssDock />
	</div>
</div>

<style>
	.blog-section-layout {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.blog-section-scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding-bottom: 0.5rem;
	}

	.blog-rss-dock-bar {
		flex-shrink: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 8px 0;
		border-top: 1px solid var(--border-color, #ffffff);
		background: var(--theme-surface, var(--bg-primary));
	}

	:global(.content-area:has(.blog-section-layout)) {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		padding-bottom: 0;
	}

	:global(.content-area:has(.blog-section-layout) > *) {
		flex-shrink: 0;
	}

	:global(.content-area:has(.blog-section-layout) > .blog-section-layout) {
		flex: 1;
		min-height: 0;
		flex-shrink: 1;
	}
</style>
