<script lang="ts">
	import { page } from '$app/stores';
	import { DEFAULT_OG_IMAGE_PATH, imageMimeType } from '$lib/site/seo';

	type OgType = 'website' | 'article';

	let {
		title,
		description,
		imagePathOrUrl = null as string | null,
		imageAlt = null as string | null,
		imageIsGenerated = true,
		ogType = 'website' as OgType,
		publishedTime = null as string | null,
		modifiedTime = null as string | null
	}: {
		title: string;
		description: string;
		imagePathOrUrl?: string | null;
		imageAlt?: string | null;
		imageIsGenerated?: boolean;
		ogType?: OgType;
		publishedTime?: string | null;
		modifiedTime?: string | null;
	} = $props();

	const pageUrl = $derived(`${$page.url.origin}${$page.url.pathname}`);

	const twitterSite = $derived($page.data.twitterHandle as string | null | undefined);

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
	{#if imageMimeType(ogImage)}
		<meta property="og:image:type" content={imageMimeType(ogImage)} />
	{/if}
	{#if imageIsGenerated}
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
	{/if}
	{#if imageAlt}
		<meta property="og:image:alt" content={imageAlt} />
		<meta name="twitter:image:alt" content={imageAlt} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	{#if twitterSite}
		<meta name="twitter:site" content={twitterSite} />
	{/if}
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
