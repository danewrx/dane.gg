<script>
	import { onMount } from 'svelte';

	let health = null;
	let loading = true;
	let error = '';

	onMount(async () => {
		try {
			const response = await fetch('/api/health');
			if (response.ok) {
				health = await response.json();
			} else {
				error = 'Failed to fetch health status';
			}
		} catch (err) {
			error = 'Failed to connect to API';
			console.error(err);
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Dane.gg - Full Stack App</title>
</svelte:head>

<div class="container">
	<h1>Welcome to Dane.gg</h1>
	<p>A full-stack application with SvelteKit frontend and Express backend</p>

	{#if loading}
		<p>Loading...</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if health}
		<div class="health-section">
			<h2>API Status</h2>
			<div class="status-card">
				<p><strong>Status:</strong> <span class="status-ok">{health.status}</span></p>
				<p><strong>Timestamp:</strong> {new Date(health.timestamp).toLocaleString()}</p>
				<p><strong>Uptime:</strong> {Math.round(health.uptime)} seconds</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	.health-section {
		margin-top: 2rem;
	}

	.status-card {
		border: 1px solid #ccc;
		padding: 1.5rem;
		border-radius: 8px;
		background: #f9f9f9;
	}

	.status-ok {
		color: #22c55e;
		font-weight: bold;
	}

	.error {
		color: #ef4444;
		background: #fef2f2;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #fecaca;
	}
</style>
