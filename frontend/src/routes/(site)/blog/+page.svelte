<script lang="ts">
	// Blog page
</script>

<svelte:head>
	<title>Blog - dane.gg</title>
	<meta name="description" content="Read Dane's thoughts on software development, design, and technology." />
</svelte:head>

<div class="page-content">
	<h1>Blog</h1>
	<p class="subtitle">Thoughts on development and design</p>
	
	<div class="blog-posts">
		<div class="blog-post">
			<h2>Getting Started with SvelteKit</h2>
			<p class="post-meta">January 15, 2024 • 5 min read</p>
			<p class="post-excerpt">Learn how to build modern web applications with SvelteKit, the official Svelte framework.</p>
			<a href="/blog/getting-started-with-sveltekit" class="read-more">Read More →</a>
		</div>
		
		<div class="blog-post">
			<h2>Building RESTful APIs with Node.js</h2>
			<p class="post-meta">January 10, 2024 • 7 min read</p>
			<p class="post-excerpt">A comprehensive guide to creating robust RESTful APIs using Node.js and Express.</p>
			<a href="/blog/building-restful-apis-nodejs" class="read-more">Read More →</a>
		</div>
		
		<div class="blog-post">
			<h2>Database Design Patterns</h2>
			<p class="post-meta">January 5, 2024 • 6 min read</p>
			<p class="post-excerpt">Essential database design patterns for building scalable web applications.</p>
			<a href="/blog/database-design-patterns" class="read-more">Read More →</a>
		</div>
	</div>
</div>

<style>
	.page-content {
		max-width: 800px;
		margin: 0 auto;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1rem;
		text-align: center;
	}

	.subtitle {
		font-size: 1.2rem;
		color: var(--text-secondary);
		margin-bottom: 2rem;
		text-align: center;
	}

	.blog-posts {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-top: 2rem;
	}

	.blog-post {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 1.5rem;
		transition: all 0.3s ease;
	}

	.blog-post:hover {
		background: var(--bg-hover);
		border-color: var(--accent-color);
		transform: translateY(-2px);
	}

	.blog-post h2 {
		color: var(--accent-color);
		margin-bottom: 0.5rem;
		font-size: 1.4rem;
	}

	.post-meta {
		color: var(--text-muted);
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.post-excerpt {
		color: var(--text-secondary);
		line-height: 1.6;
		margin-bottom: 1rem;
	}

	.read-more {
		color: var(--accent-color);
		text-decoration: none;
		font-weight: 500;
		transition: color 0.2s ease;
	}

	.read-more:hover {
		color: var(--accent-hover);
	}
</style>
