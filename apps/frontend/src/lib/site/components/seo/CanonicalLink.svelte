<script lang="ts">
	import { page } from '$app/stores';

	const href = $derived(`${$page.url.origin}${$page.url.pathname}`);
</script>

<svelte:head>
	<link rel="canonical" href={href} />
</svelte:head>
