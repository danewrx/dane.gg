<script lang="ts">
	import { logger } from '$lib/logger';
	import { publicPageTitle } from '$lib/site/pageTitle';

	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { Calendar, Rss } from 'lucide-svelte';
	import TypingHeader from '$lib/shared/components/TypingHeader.svelte';
	import RainbowText from '$lib/site/components/RainbowText.svelte';

	interface BlogPost {
		id: string;
		title: string;
		slug: string;
		content: string;
		thumbnail: string | null;
		publishedAt: string;
		tags: { id: string; name: string }[];
	}

	const POSTS_PER_BATCH = 8;

	let allPosts = $state<BlogPost[]>([]);
	let visiblePosts = $state<BlogPost[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state('');
	let hasMore = $state(true);
	let loadMoreTrigger = $state<HTMLDivElement | null>(null);
	let observer: IntersectionObserver | null = null;

	onMount(async () => {
		await loadAllPosts();
	});

	onDestroy(() => {
		if (observer) {
			observer.disconnect();
		}
	});

	async function loadAllPosts() {
		try {
			loading = true;
			error = '';
			const response = await fetch('/api/blog');

			if (!response.ok) {
				throw new Error('Failed to load blog posts');
			}

			const result = await response.json();
			allPosts = result.data || [];

			// Load initial batch
			visiblePosts = allPosts.slice(0, POSTS_PER_BATCH);
			hasMore = visiblePosts.length < allPosts.length;
		} catch (err) {
			logger.error('Error loading blog posts:', err);
			error = 'Failed to load blog posts';
		} finally {
			loading = false;
		}
	}

	function loadMorePosts() {
		if (loadingMore || !hasMore) return;

		loadingMore = true;

		setTimeout(() => {
			const currentCount = visiblePosts.length;
			const nextBatch = allPosts.slice(currentCount, currentCount + POSTS_PER_BATCH);

			if (nextBatch.length > 0) {
				visiblePosts = [...visiblePosts, ...nextBatch];
				hasMore = visiblePosts.length < allPosts.length;
			} else {
				hasMore = false;
			}

			loadingMore = false;
		}, 300);
	}

	$effect(() => {
		if (!loadMoreTrigger) return;

		if (typeof IntersectionObserver === 'undefined') return;

		observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry.isIntersecting && hasMore && !loadingMore) {
					loadMorePosts();
				}
			},
			{
				rootMargin: '200px' // Start loading 200px before reaching trigger
			}
		);

		observer.observe(loadMoreTrigger);

		return () => {
			if (observer) {
				observer.disconnect();
			}
		};
	});

	function viewPost(slug: string) {
		goto(`/blog/${slug}`);
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function getThumbnailUrl(path: string | null): string {
		if (!path) return '';
		// If it's external URL, just return it
		if (path.startsWith('http://') || path.startsWith('https://')) {
			return path;
		}
		// If starts with /uploads/, serve through the API
		if (path.startsWith('/uploads/')) {
			const filename = path.replace('/uploads/', '');
			return `/api/upload/file/${filename}`;
		}
		return path;
	}
</script>

<svelte:head>
	<title>{publicPageTitle('Blog')}</title>
</svelte:head>

<div class="blog-page">
	<div class="blog-header">
		<TypingHeader text="Blog" />
		<a class="rss-link" href="/blog/rss.xml" title="Subscribe via RSS" data-sveltekit-reload>
			<Rss size={18} aria-hidden="true" />
			<span>RSS Feed</span>
		</a>
	</div>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading all posts</p>
		</div>
	{:else if error}
		<div class="error-message">
			<p>{error}</p>
		</div>
	{:else if visiblePosts.length === 0}
		<div class="empty-state">
			<p>No blog posts yet. Check back soon!</p>
		</div>
	{:else}
		<div class="posts-masonry">
			{#each visiblePosts as post (post.id)}
				<article class="post-card">
					{#if post.thumbnail}
						<div class="post-thumbnail">
							<img src={getThumbnailUrl(post.thumbnail)} alt={post.title} />
						</div>
					{/if}
					<div class="post-content">
						<button class="post-title" onclick={() => viewPost(post.slug)}>
							<RainbowText text={post.title} />
						</button>
						<div class="post-date">
							<Calendar size={14} />
							<span>{formatDate(post.publishedAt)}</span>
						</div>
						{#if post.tags.length > 0}
							<div class="post-tags">
								{#each post.tags as tag}
									<span class="tag">{tag.name}</span>
								{/each}
							</div>
						{/if}
						<button class="read-more" onclick={() => viewPost(post.slug)}> Read more → </button>
					</div>
				</article>
			{/each}
		</div>

		{#if hasMore || loadingMore}
			<div class="load-more-trigger" bind:this={loadMoreTrigger}>
				{#if loadingMore}
					<div class="loading-more">
						<div class="spinner-small"></div>
						<p>Loading more posts...</p>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.blog-page {
		max-width: 1200px;
		margin: 0 auto;
	}

	.blog-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 16px;
		margin-bottom: 8px;
	}

	.rss-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border: 1px solid var(--border-color, #ffffff);
		color: var(--text-secondary, #a1a1aa);
		text-decoration: none;
		font-size: 0.875rem;
		transition: color 0.2s ease, border-color 0.2s ease;
	}

	.rss-link:hover {
		color: var(--accent-color, #6366f1);
		border-color: var(--accent-color, #6366f1);
	}

	.loading,
	.error-message,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 64px 24px;
		text-align: center;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--border-color, #3a3a3a);
		border-top: 3px solid var(--accent-color, #6366f1);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.loading p,
	.error-message p,
	.empty-state p {
		color: var(--text-secondary, #a1a1aa);
		margin: 0;
	}

	.posts-masonry {
		column-count: 2;
		column-gap: 20px;
	}

	.post-card {
		background: var(--bg-secondary, #1a1a1a);
		border: 2px solid var(--border-color, #ffffff);
		border-radius: 0;
		overflow: hidden;
		margin-bottom: 20px;
		break-inside: avoid;
		display: inline-block;
		width: 100%;
	}

	.post-thumbnail {
		width: 100%;
		min-height: 200px;
		overflow: hidden;
		background: var(--bg-tertiary, #3a3a3a);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.post-thumbnail img {
		width: 100%;
		height: auto;
		object-fit: contain;
		display: block;
	}

	.post-content {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.post-title {
		color: var(--text-primary, #ffffff);
		font-size: calc(20 * 1em / 14);
		font-weight: 600;
		margin: 0;
		line-height: 1.3;
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		cursor: pointer;
		transition: color 0.2s ease;
	}

	.post-title:hover {
		color: var(--accent-color, #6366f1);
	}

	.post-date {
		color: var(--text-muted, #9ca3af);
		font-size: calc(13 * 1em / 14);
		margin: 0;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.post-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 8px 0;
		padding-top: 12px;
		border-top: 1px solid var(--theme-border, var(--border-color, #4a4a4a));
	}

	/* .tag colors — global rules in app.css (--theme-code-* + data-theme-code-tone) */

	.read-more {
		margin-top: auto;
		padding: 0;
		background: none;
		border: none;
		color: var(--text-primary, #ffffff);
		font-size: calc(14 * 1em / 14);
		text-align: left;
		cursor: pointer;
		transition: color 0.2s ease;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.read-more:hover {
		color: var(--accent-color, #6366f1);
	}

	.load-more-trigger {
		width: 100%;
		height: 100px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 20px;
	}

	.loading-more {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
	}

	.spinner-small {
		width: 24px;
		height: 24px;
		border: 2px solid var(--border-color, #3a3a3a);
		border-top: 2px solid var(--accent-color, #6366f1);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.loading-more p {
		color: var(--text-secondary, #9ca3af);
		font-size: calc(14 * 1em / 14);
		margin: 0;
	}

	@media (max-width: 900px) {
		.posts-masonry {
			column-count: 1;
		}
	}

	@media (max-width: 480px) {
		.post-card {
			margin-bottom: 16px;
		}

		.post-content {
			padding: 16px;
		}

		.post-title {
			font-size: calc(18 * 1em / 14);
		}

		.post-date {
			font-size: calc(12 * 1em / 14);
		}

		.post-tags .tag {
			font-size: calc(11 * 1em / 14);
			padding: 5px 10px;
		}

		.read-more {
			font-size: calc(13 * 1em / 14);
		}
	}
</style>
