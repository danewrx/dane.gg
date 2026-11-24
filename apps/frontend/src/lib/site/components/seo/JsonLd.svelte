<script lang="ts">
	import { serializeJsonLd, type JsonLd } from '$lib/site/jsonLd';

	let { data }: { data: JsonLd | JsonLd[] } = $props();
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${serializeJsonLd(data)}</` + 'script>'}
</svelte:head>
