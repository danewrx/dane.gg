<script lang="ts">
	import type { Advert } from '$lib/site/stores/adverts';

	interface Props {
		items: Advert[];
		rotationSeconds?: number;
		alt?: string;
	}

	let { items, rotationSeconds = 8, alt = 'Advertisement' }: Props = $props();

	// Only adverts with an image are displayable.
	const visibleItems = $derived((items ?? []).filter((item) => item?.imageUrl));

	let index = $state(0);

	// Keep the index in range if the list shrinks.
	$effect(() => {
		if (index >= visibleItems.length) {
			index = 0;
		}
	});

	const current = $derived(visibleItems[index]);

	// Rotate between adverts. Only runs when there is more than one to show.
	$effect(() => {
		if (visibleItems.length <= 1) return;

		const intervalMs = Math.max(1, rotationSeconds) * 1000;
		const timer = setInterval(() => {
			index = (index + 1) % visibleItems.length;
		}, intervalMs);

		return () => clearInterval(timer);
	});
</script>

{#if current}
	{#if current.linkUrl}
		<a
			class="advert-banner"
			href={current.linkUrl}
			target="_blank"
			rel="noopener noreferrer nofollow sponsored"
			aria-label={current.title || alt}
		>
			<img src={current.imageUrl} alt={current.title || alt} loading="lazy" decoding="async" />
		</a>
	{:else}
		<div class="advert-banner">
			<img src={current.imageUrl} alt={current.title || alt} loading="lazy" decoding="async" />
		</div>
	{/if}
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
