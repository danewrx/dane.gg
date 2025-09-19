<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';

	let { children } = $props();

	// Check if we're in admin area
	let isAdmin = $derived($page.url.pathname.startsWith('/admin'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isAdmin}
	<!-- Admin layout is handled by /admin/+layout.svelte -->
	{@render children?.()}
{:else}
	<!-- Public website layout -->
	<div class="public-layout">
		<!-- Public Header -->
		<header class="public-header">
			<nav class="nav-container">
				<div class="nav-brand">
					<a href="/" class="brand-link">
						<span class="brand-icon">🚀</span>
						<span class="brand-text">Dane.gg</span>
					</a>
				</div>
				
				<div class="nav-menu">
					<a href="/" class="nav-link">Home</a>
					<a href="/admin" class="nav-link admin-link">Admin</a>
				</div>
			</nav>
		</header>

		<!-- Main Content -->
		<main class="public-main">
			{@render children?.()}
		</main>

		<!-- Public Footer -->
		<footer class="public-footer">
			<div class="footer-content">
				<div class="footer-section">
					<h3>Dane.gg</h3>
					<p>A full-stack application built with SvelteKit and Express</p>
				</div>
				<div class="footer-section">
					<h4>Admin</h4>
					<ul>
						<li><a href="/admin">Admin Panel</a></li>
					</ul>
				</div>
			</div>
			<div class="footer-bottom">
				<p>&copy; 2024 Dane.gg. All rights reserved.</p>
			</div>
		</footer>
	</div>
{/if}

<style>
	.public-layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.public-header {
		background: white;
		border-bottom: 1px solid #e2e8f0;
		position: sticky;
		top: 0;
		z-index: 50;
	}

	.nav-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 4rem;
	}

	.nav-brand {
		display: flex;
		align-items: center;
	}

	.brand-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: #1e293b;
		font-weight: 700;
		font-size: 1.25rem;
	}

	.brand-icon {
		font-size: 1.5rem;
	}

	.nav-menu {
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	.nav-link {
		color: #64748b;
		text-decoration: none;
		font-weight: 500;
		transition: color 0.2s;
		padding: 0.5rem 0;
	}

	.nav-link:hover {
		color: #1e293b;
	}

	.admin-link {
		background: #3b82f6;
		color: white !important;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		transition: all 0.2s;
	}

	.admin-link:hover {
		background: #2563eb;
		transform: translateY(-1px);
	}

	.public-main {
		flex: 1;
		background: #f8fafc;
	}

	.public-footer {
		background: #1e293b;
		color: white;
		margin-top: auto;
	}

	.footer-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 3rem 1rem 2rem;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 2rem;
	}

	.footer-section h3,
	.footer-section h4 {
		margin: 0 0 1rem 0;
		font-weight: 600;
	}

	.footer-section h3 {
		font-size: 1.25rem;
	}

	.footer-section h4 {
		font-size: 1rem;
		color: #94a3b8;
	}

	.footer-section p {
		margin: 0;
		color: #94a3b8;
		line-height: 1.6;
	}

	.footer-section ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.footer-section li {
		margin-bottom: 0.5rem;
	}

	.footer-section a {
		color: #94a3b8;
		text-decoration: none;
		transition: color 0.2s;
	}

	.footer-section a:hover {
		color: white;
	}

	.footer-bottom {
		border-top: 1px solid #334155;
		padding: 1rem;
		text-align: center;
	}

	.footer-bottom p {
		margin: 0;
		color: #94a3b8;
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.nav-container {
			flex-direction: column;
			height: auto;
			padding: 1rem;
			gap: 1rem;
		}

		.nav-menu {
			flex-wrap: wrap;
			gap: 1rem;
			justify-content: center;
		}

		.footer-content {
			grid-template-columns: 1fr;
			text-align: center;
		}
	}
</style>
