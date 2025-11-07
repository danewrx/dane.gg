<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { marked } from 'marked';
	import { ArrowLeft } from 'lucide-svelte';
	import BorderedBox from '$lib/site/components/ui/BorderedBox.svelte';

	interface BlogPost {
		id: string;
		title: string;
		slug: string;
		content: string;
		thumbnail: string | null;
		publishedAt: string;
		createdAt: string;
		updatedAt: string;
		tags: { id: string; name: string }[];
	}

	let slug = $derived($page.params.slug);
	let post = $state<BlogPost | null>(null);
	let loading = $state(true);
	let error = $state('');

	let contentHtml = $derived.by(() => {
		if (!post) return '';
		try {
			return marked(post.content);
		} catch (err) {
			console.error('Error parsing markdown:', err);
			return '<p>Error rendering content</p>';
		}
	});

	onMount(async () => {
		await loadPost();
	});

	async function loadPost() {
		try {
			loading = true;
			error = '';
			const response = await fetch(`/api/blog/${slug}`);
			
			if (!response.ok) {
				if (response.status === 404) {
					error = 'Blog post not found';
				} else {
					throw new Error('Failed to load blog post');
				}
				return;
			}

			const result = await response.json();
			post = result.data;
		} catch (err) {
			console.error('Error loading blog post:', err);
			error = 'Failed to load blog post';
		} finally {
			loading = false;
		}
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function estimateReadTime(content: string): number {
		const wordsPerMinute = 200;
		const wordCount = content.trim().split(/\s+/).length;
		const readTime = Math.ceil(wordCount / wordsPerMinute);
		return readTime;
	}

	function goBack() {
		goto('/blog');
	}
</script>

<svelte:head>
	{#if post}
		<title>{post.title} - dane.gg</title>
		<meta name="description" content={post.content.substring(0, 160)} />
	{:else}
		<title>Blog Post - dane.gg</title>
	{/if}
</svelte:head>

<div class="blog-post-page">
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading post...</p>
		</div>
	{:else if error}
		<BorderedBox padding="16px" dynamicHeight={true}>
			<div class="error-state">
				<p class="error-message">{error}</p>
				<button class="back-button" onclick={goBack}>
					<ArrowLeft size={18} />
					Back to Blog
				</button>
			</div>
		</BorderedBox>
	{:else if post}
		<button class="back-link" onclick={goBack}>
			<ArrowLeft size={18} />
			Back to Blog
		</button>

		<article class="blog-post">
			<h1 class="post-title">{post.title}</h1>
			
			<div class="post-meta">
				<span class="meta-item">
					<time>{formatDate(post.publishedAt)}</time>
				</span>
				{#if post.updatedAt && post.updatedAt !== post.createdAt}
					<span class="meta-separator">•</span>
					<span class="meta-item">Edited: {formatDate(post.updatedAt)}</span>
				{/if}
				<span class="meta-separator">•</span>
				<span class="meta-item">{estimateReadTime(post.content)} min read</span>
			</div>

			<div class="post-content">
				{@html contentHtml}
			</div>

			{#if post.tags.length > 0}
				<div class="post-tags">
					{#each post.tags as tag}
						<span class="tag">{tag.name}</span>
					{/each}
				</div>
			{/if}
		</article>
	{/if}
</div>

<style>
	.blog-post-page {
		max-width: 900px;
		margin: 0 auto;
		padding: 0 20px;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		margin-top: 24px;
		margin-bottom: 5px;
		background: transparent;
		border: 2px solid var(--border-color, #ffffff);
		border-radius: 0;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.back-link:hover {
		background: var(--bg-secondary, #2d2d2d);
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-color, #6366f1);
	}

	.loading,
	.error-state {
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

	.loading p {
		color: var(--text-secondary, #a1a1aa);
		margin: 0;
	}

	.error-message {
		color: #ef4444;
		font-size: 16px;
		margin: 0 0 20px 0;
	}

	.blog-post {
		padding: 20px 0 40px 0;
	}

	.post-title {
		color: var(--text-primary, #ffffff);
		font-size: 36px;
		font-weight: 700;
		line-height: 1.2;
		margin: 0 0 16px 0;
		font-family: inherit;
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 32px;
		color: var(--text-muted, #9ca3af);
		font-size: 14px;
	}

	.meta-item {
		display: inline-flex;
		align-items: center;
	}

	.meta-separator {
		color: var(--text-muted, #6b7280);
	}

	.post-content {
		color: var(--text-primary, #ffffff);
		line-height: 1.8;
		font-size: 16px;
		margin-bottom: 32px;
	}

	/* Markdown content styling */
	.post-content :global(p) {
		margin: 1.2em 0;
		color: var(--text-primary, #ffffff);
	}

	.post-content :global(h1),
	.post-content :global(h2),
	.post-content :global(h3),
	.post-content :global(h4),
	.post-content :global(h5),
	.post-content :global(h6) {
		color: var(--text-primary, #ffffff);
		font-weight: 600;
		margin: 1.5em 0 0.5em;
		line-height: 1.3;
	}

	.post-content :global(h1) { font-size: 2em; }
	.post-content :global(h2) { font-size: 1.6em; }
	.post-content :global(h3) { font-size: 1.3em; }

	.post-content :global(a) {
		color: #6366f1;
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.post-content :global(a:hover) {
		color: #818cf8;
		text-decoration: underline;
	}

	.post-content :global(strong) {
		font-weight: 600;
	}

	.post-content :global(em) {
		font-style: italic;
	}

	.post-content :global(code) {
		background: var(--bg-tertiary, #2a2a2a);
		padding: 2px 6px;
		border-radius: 3px;
		font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
		font-size: 0.9em;
	}

	.post-content :global(pre) {
		background: var(--bg-tertiary, #2a2a2a);
		padding: 16px;
		border-radius: 6px;
		overflow-x: auto;
		margin: 1.5em 0;
	}

	.post-content :global(pre code) {
		background: none;
		padding: 0;
	}

	.post-content :global(ul),
	.post-content :global(ol) {
		margin: 1em 0;
		padding-left: 2em;
	}

	.post-content :global(li) {
		margin: 0.5em 0;
	}

	.post-content :global(blockquote) {
		border-left: 3px solid var(--accent-color, #6366f1);
		padding-left: 1.5em;
		margin: 1.5em 0;
		color: var(--text-secondary, #b0b0b0);
		font-style: italic;
	}

	.post-content :global(img) {
		max-width: 100%;
		height: auto;
		display: block;
		margin: 2em 0;
		border-radius: 4px;
	}

	.post-content :global(hr) {
		border: none;
		border-top: 1px solid var(--border-color, #3a3a3a);
		margin: 2em 0;
	}

	.post-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding-top: 24px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.tag {
		padding: 6px 12px;
		background: var(--bg-tertiary, #2a2a2a);
		border-radius: 4px;
		font-size: 13px;
		color: var(--text-secondary, #b0b0b0);
	}

	@media (max-width: 768px) {
		.blog-post-page {
			padding: 0 16px;
		}

		.blog-post {
			padding: 24px 0;
		}

		.post-title {
			font-size: 28px;
		}

		.post-meta {
			font-size: 13px;
		}

		.post-content {
			font-size: 15px;
		}

		.post-content :global(h1) {
			font-size: 1.6em;
		}

		.post-content :global(h2) {
			font-size: 1.4em;
		}

		.post-content :global(h3) {
			font-size: 1.2em;
		}
	}
</style>

