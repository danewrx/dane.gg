<script lang="ts">
	import { page } from '$app/stores';
	import PublicErrorPage from '$lib/errors/PublicErrorPage.svelte';
	import AdminErrorPage from '$lib/errors/AdminErrorPage.svelte';
	const isAdminPath = $derived(
		$page.url.pathname.startsWith('/admin') ||
			$page.url.pathname.startsWith('/login') ||
			$page.url.pathname.startsWith('/logout')
	);
</script>

<svelte:head>
	<title>{$page.status} - Error</title>
</svelte:head>

{#if isAdminPath}
	<AdminErrorPage />
{:else}
	<PublicErrorPage />
{/if}
