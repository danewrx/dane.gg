<svelte:head>
	<title>Admin Panel - Dane.gg</title>
</svelte:head>

<div class="container">
	<h1>Admin Panel</h1>
	<p>This is the admin area.</p>
	<a href="/" class="public-link">Back to Public Site</a>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		text-align: center;
	}

	h1 {
		font-size: 2.5rem;
		margin-bottom: 1rem;
		color: #1e293b;
	}

	p {
		font-size: 1.25rem;
		color: #64748b;
		margin-bottom: 2rem;
	}

	.public-link {
		display: inline-block;
		background: #10b981;
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 600;
		transition: background 0.2s;
	}

	.public-link:hover {
		background: #059669;
	}
</style>
