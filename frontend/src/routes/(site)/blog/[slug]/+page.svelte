<script lang="ts">
	import { logger } from '$lib/logger';
	import OpenGraphTags from '$lib/site/components/seo/OpenGraphTags.svelte';
	import { plainTextExcerpt } from '$lib/site/seo';
	import { publicPageTitle } from '$lib/site/pageTitle';

	import { navigating } from '$app/stores';
	import { goto } from '$app/navigation';
	import { marked } from 'marked';
	import BorderedBox from '$lib/site/components/ui/BorderedBox.svelte';
	import SiteBackNav from '$lib/site/components/layout/SiteBackNav.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let post = $derived(data.post);
	let navigation = $derived(data.navigation);

	const errorMessage = $derived(
		data.loadError === 'not_found'
			? 'Blog post not found'
			: data.loadError === 'server'
				? 'Failed to load blog post'
				: ''
	);

	const showNavigating = $derived(
		Boolean($navigating?.to?.url?.pathname?.startsWith('/blog/'))
	);

	let contentHtml = $derived.by(() => {
		if (!post) return '';
		try {
			return marked(post.content);
		} catch (err) {
			logger.error('Error parsing markdown:', err);
			return '<p>Error rendering content</p>';
		}
	});

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

	function getThumbnailUrl(path: string | null): string {
		if (!path) return '';
		// If it's an external URL, just return it
		if (path.startsWith('http://') || path.startsWith('https://')) {
			return path;
		}
		// If it starts with /uploads/, serve through the API
		if (path.startsWith('/uploads/')) {
			const filename = path.replace('/uploads/', '');
			return `/api/upload/file/${filename}`;
		}
		return path;
	}
</script>

<svelte:head>
	{#if post}
		<title>{publicPageTitle(post.title)}</title>
	{:else}
		<title>{publicPageTitle('Blog post')}</title>
	{/if}
</svelte:head>
{#if post}
	<OpenGraphTags
		title={publicPageTitle(post.title)}
		description={plainTextExcerpt(post.content, 160)}
		imagePathOrUrl={post.thumbnail ? getThumbnailUrl(post.thumbnail) : null}
		ogType="article"
		publishedTime={new Date(post.publishedAt).toISOString()}
		modifiedTime={new Date(post.updatedAt).toISOString()}
	/>
{/if}

<div class="blog-post-page">
	{#if showNavigating}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading post...</p>
		</div>
	{:else if data.loadError}
		<BorderedBox padding="16px" dynamicHeight={true}>
			<div class="error-state">
				<p class="error-message">{errorMessage}</p>
				<SiteBackNav href="/blog" label="Back to Blog" />
			</div>
		</BorderedBox>
	{:else if post}
		<div class="blog-post-toolbar">
			<SiteBackNav href="/blog" label="Back to Blog" />
		</div>

		<article class="blog-post">
			{#if post.thumbnail}
				<div class="post-cover-image">
					<img src={getThumbnailUrl(post.thumbnail)} alt={post.title} />
				</div>
			{/if}
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

		{#if navigation && (navigation.previous || navigation.next)}
			{@const prev = navigation.previous}
			{@const next = navigation.next}
			<nav class="post-navigation">
				<div class="nav-left">
					{#if prev}
						<button onclick={() => goto(`/blog/${prev.slug}`)} class="nav-link nav-previous">
							← {prev.title}
						</button>
					{/if}
				</div>
				<div class="nav-right">
					{#if next}
						<button onclick={() => goto(`/blog/${next.slug}`)} class="nav-link nav-next">
							{next.title} →
						</button>
					{/if}
				</div>
			</nav>
		{/if}
	{/if}
</div>

<style>
	.blog-post-page {
		max-width: 900px;
		margin: 0 auto;
		padding: 0 0.5rem 2rem 0.5rem;
	}

	.blog-post-toolbar {
		margin-top: 8px;
		margin-bottom: 20px;
	}

	.loading,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
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

	.loading p {
		color: var(--text-secondary, #a1a1aa);
		margin: 0;
	}

	.error-message {
		color: var(--theme-accent, #ef4444);
		font-size: calc(16 * 1em / 14);
		margin: 0 0 20px 0;
	}

	.blog-post {
		padding: 20px 0 40px 0;
	}

	.post-cover-image {
		width: 100%;
		margin-bottom: 32px;
		overflow: hidden;
		border-radius: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-tertiary, #2a2a2a);
		max-height: 400px;
	}

	.post-cover-image img {
		width: 100%;
		height: auto;
		max-height: 400px;
		display: block;
		object-fit: contain;
		object-position: center;
	}

	.post-title {
		color: var(--text-primary, #ffffff);
		font-size: calc(36 * 1em / 14);
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
		font-size: calc(14 * 1em / 14);
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
		font-size: calc(16 * 1em / 14);
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

	.post-content :global(h1) {
		font-size: 2em;
	}
	.post-content :global(h2) {
		font-size: 1.6em;
	}
	.post-content :global(h3) {
		font-size: 1.3em;
	}
	.post-content :global(h4) {
		font-size: 1.15em;
	}
	.post-content :global(h5) {
		font-size: 1.05em;
	}
	.post-content :global(h6) {
		font-size: 1em;
	}

	.post-content :global(a) {
		color: var(--theme-accent, #6366f1);
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.post-content :global(a:hover) {
		color: var(--theme-accent, #818cf8);
		opacity: 0.8;
		text-decoration: underline;
	}

	.post-content :global(strong) {
		font-weight: 600;
	}

	.post-content :global(em) {
		font-style: italic;
	}

	/* Fenced / inline code — global rules in app.css (--theme-code-* + data-theme-code-tone) */

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
		border-top: 1px solid var(--theme-border, var(--border-color, #3a3a3a));
	}

	/* .tag colors — global rules in app.css (--theme-code-* + data-theme-code-tone) */
	.post-tags .tag {
		font-size: calc(13 * 1em / 14);
	}

	.post-navigation {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 48px;
		padding-top: 32px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.nav-left {
		flex: 1;
		text-align: left;
	}

	.nav-right {
		flex: 1;
		text-align: right;
	}

	.nav-link {
		background: none;
		border: none;
		padding: 0;
		color: var(--text-primary, #ffffff);
		text-decoration: none;
		font-size: calc(16 * 1em / 14);
		cursor: pointer;
		transition: color 0.2s ease;
		font-family: inherit;
	}

	.nav-link:hover {
		color: var(--accent-color, #6366f1);
	}

	.nav-previous {
		text-align: left;
	}

	.nav-next {
		text-align: right;
	}

	@media (max-width: 768px) {
		.blog-post-page {
			padding: 0 16px;
		}

		.blog-post {
			padding: 24px 0;
		}

		.post-title {
			font-size: calc(28 * 1em / 14);
		}

		.post-meta {
			font-size: calc(13 * 1em / 14);
		}

		.post-content {
			font-size: calc(15 * 1em / 14);
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

		.post-navigation {
			flex-direction: column;
			gap: 16px;
			margin-top: 32px;
			padding-top: 24px;
		}

		.nav-left,
		.nav-right {
			flex: none;
		}

		.nav-left {
			text-align: left;
		}

		.nav-right {
			text-align: left;
		}

		.nav-link {
			font-size: calc(14 * 1em / 14);
		}

		.nav-next {
			text-align: left;
		}
	}
</style>
