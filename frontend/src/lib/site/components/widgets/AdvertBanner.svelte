<script lang="ts">
	interface Props {
		imageUrl: string;
		linkUrl?: string;
		alt?: string;
	}

	let { imageUrl, linkUrl = '', alt = 'Advertisement' }: Props = $props();
</script>

{#if linkUrl}
	<a
		class="advert-banner"
		href={linkUrl}
		target="_blank"
		rel="noopener noreferrer nofollow sponsored"
		aria-label={alt}
	>
		<img src={imageUrl} {alt} loading="lazy" decoding="async" />
	</a>
{:else}
	<div class="advert-banner">
		<img src={imageUrl} {alt} loading="lazy" decoding="async" />
	</div>
{/if}

<style>
	.advert-banner {
		display: block;
		width: 100%;
		line-height: 0;
	}

	.advert-banner img {
		display: block;
		width: 100%;
		height: 90px;
		object-fit: cover;
		object-position: center;
	}
</style>
