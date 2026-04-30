<script lang="ts">
	import { adminPageTitle } from '$lib/site/pageTitle';
	import { onMount } from 'svelte';
	import { loadSiteConfig } from '$lib/site/stores/siteConfig';

	onMount(() => {
		loadSiteConfig();
	});
</script>

<svelte:head>
	<title>{adminPageTitle('Site settings')}</title>
</svelte:head>

<!-- This page content is now handled by the layout -->
<!-- The layout will show the settings cards and handle the panel display -->

<!-- All styles are now handled by the layout -->
