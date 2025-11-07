<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Calendar } from 'lucide-svelte';

	interface BlogPost {
		id: string;
		title: string;
		slug: string;
		content: string;
		thumbnail: string | null;
		publishedAt: string;
		tags: { id: string; name: string }[];
	}

	let posts = $state<BlogPost[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		await loadPosts();
	});

	async function loadPosts() {
		try {
			loading = true;
			error = '';
			const response = await fetch('/api/blog');
			
			if (!response.ok) {
				throw new Error('Failed to load blog posts');
			}

			const result = await response.json();
			posts = result.data || [];
		} catch (err) {
			console.error('Error loading blog posts:', err);
			error = 'Failed to load blog posts';
		} finally {
			loading = false;
		}
	}

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

	function truncateContent(content: string, maxLength: number = 200): string {
		const plainText = content
			.replace(/#{1,6}\s/g, '')
			.replace(/\*\*(.+?)\*\*/g, '$1')
			.replace(/\*(.+?)\*/g, '$1')
			.replace(/\[(.+?)\]\(.+?\)/g, '$1')
			.replace(/`(.+?)`/g, '$1')
			.replace(/\n/g, ' ')   
			.trim();

		if (plainText.length <= maxLength) return plainText;
		return plainText.substring(0, maxLength) + '...';
	}
</script>

<svelte:head>
	<title>Blog - dane.gg</title>
	<meta name="description" content="Read my latest blog posts about software development, design, and technology." />
</svelte:head>

<div class="blog-page">
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading all posts</p>
		</div>
	{:else if error}
		<div class="error-message">
			<p>{error}</p>
		</div>
	{:else if posts.length === 0}
		<div class="empty-state">
			<p>No blog posts yet. Check back soon!</p>
		</div>
	{:else}
		<div class="posts-masonry">
			{#each posts as post (post.id)}
				<article class="post-card">
					{#if post.thumbnail}
						<div class="post-thumbnail">
							<img src={post.thumbnail} alt={post.title} />
						</div>
					{/if}
					<div class="post-content">
						<button class="post-title" onclick={() => viewPost(post.slug)}>
							{post.title}
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
						<button class="read-more" onclick={() => viewPost(post.slug)}>
							Read more →
						</button>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>

<style>
	.blog-page {
		max-width: 1200px;
		margin: 0 auto;
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
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
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
		font-size: 20px;
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
		font-size: 13px;
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
		border-top: 1px solid var(--border-color, #4a4a4a);
	}

	.tag {
		padding: 6px 12px;
		background: var(--bg-tertiary, #2a2a2a);
		border-radius: 0;
		font-size: 12px;
		color: var(--text-secondary, #d1d5db);
		border: 1px solid var(--border-color, #4a4a4a);
	}

	.read-more {
		margin-top: auto;
		padding: 0;
		background: none;
		border: none;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
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
			font-size: 18px;
		}

		.post-date {
			font-size: 12px;
		}

		.tag {
			font-size: 11px;
			padding: 5px 10px;
		}

		.read-more {
			font-size: 13px;
		}
	}
</style>
