<script lang="ts">
	import { Rss } from 'lucide-svelte';
</script>

<a
	class="blog-rss-dock"
	href="/blog/rss.xml"
	title="Subscribe via RSS"
	data-sveltekit-reload
	aria-label="Subscribe via RSS"
>
	<Rss size={16} aria-hidden="true" />
</a>

<style>
	.blog-rss-dock {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto;
		padding: 0;
		color: var(--text-secondary, #a1a1aa);
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.blog-rss-dock:hover {
		color: var(--accent-color, #6366f1);
	}
</style>
