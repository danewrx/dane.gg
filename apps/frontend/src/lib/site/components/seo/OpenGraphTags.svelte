<script lang="ts">
	import { page } from '$app/stores';
	import { DEFAULT_OG_IMAGE_PATH } from '$lib/site/seo';

	type OgType = 'website' | 'article';

	let {
		title,
		description,
		imagePathOrUrl = null as string | null,
		ogType = 'website' as OgType,
		publishedTime = null as string | null,
		modifiedTime = null as string | null
	}: {
		title: string;
		description: string;
		imagePathOrUrl?: string | null;
		ogType?: OgType;
		publishedTime?: string | null;
		modifiedTime?: string | null;
	} = $props();

	const pageUrl = $derived(`${$page.url.origin}${$page.url.pathname}`);

	const ogImage = $derived.by(() => {
		const raw = imagePathOrUrl?.trim();
		if (!raw) return new URL(DEFAULT_OG_IMAGE_PATH, $page.url.origin).href;
		if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
		return new URL(raw, $page.url.origin).href;
	});
</script>

<svelte:head>
	<meta name="description" content={description} />
	<meta property="og:site_name" content="dane.gg" />
	<meta property="og:locale" content="en_GB" />
	<meta property="og:type" content={ogType} />
	<meta property="og:url" content={pageUrl} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImage} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
	{#if ogType === 'article' && publishedTime}
		<meta property="article:published_time" content={publishedTime} />
	{/if}
	{#if ogType === 'article' && modifiedTime}
		<meta property="article:modified_time" content={modifiedTime} />
	{/if}
</svelte:head>
