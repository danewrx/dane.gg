<script lang="ts">
	import { onMount } from 'svelte';
	import { siteConfig, loadSiteConfig } from '$lib/site/stores/siteConfig';

	onMount(() => {
		loadSiteConfig();
	});
</script>

<svelte:head>
	<title>Site Settings - dane.gg Admin</title>
</svelte:head>

<!-- This page content is now handled by the layout -->
<!-- The layout will show the settings cards and handle the panel display -->

<!-- All styles are now handled by the layout -->
