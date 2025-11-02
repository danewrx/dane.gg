<script lang="ts">
	import { onMount } from 'svelte';
	import { getBanner, type BannerConfig } from '$lib/admin/services/bannerService';
	import BannerDisplay from './BannerDisplay.svelte';

	let bannerData = $state<BannerConfig | null>(null);
	let loading = $state(true);

	async function fetchBanner() {
		try {
			const data = await getBanner();
			bannerData = data;
		} catch (error) {
			console.error('Failed to fetch banner:', error);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchBanner();
	});
</script>

{#if !loading && bannerData && bannerData.enabled}
	<BannerDisplay config={bannerData} />
{/if}

