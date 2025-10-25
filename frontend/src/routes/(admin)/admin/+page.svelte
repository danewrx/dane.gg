<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		goto('/admin/stats', { replaceState: true });
	});
</script>

<svelte:head>
	<title>Admin Dashboard - dane.gg</title>
</svelte:head>

<div class="redirect-container">
	<div class="loading-spinner"></div>
	<p>Redirecting to statistics...</p>
</div>

<style>
	.redirect-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 50vh;
		text-align: center;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #3a3a3a;
		border-top: 3px solid #6366f1;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	p {
		color: #a1a1aa;
		font-size: 16px;
		margin: 0;
	}
</style>