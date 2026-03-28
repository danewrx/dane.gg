<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getBanner, type BannerConfig } from '$lib/admin/services/bannerService';
	import { SITE_CONFIG_UPDATED_EVENT } from '$lib/site/stores/siteConfig';
	import { subscribeSiteConfigBroadcast } from '$lib/shared/utils/siteConfigLiveSync';
	import BannerDisplay from './BannerDisplay.svelte';

	const BANNER_POLL_MS = 25_000;

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
		void fetchBanner();

		if (!browser) return;

		const refresh = () => void fetchBanner();

		const pollId = setInterval(refresh, BANNER_POLL_MS);

		const onVisible = () => {
			if (document.visibilityState === 'visible') refresh();
		};
		document.addEventListener('visibilitychange', onVisible);

		window.addEventListener(SITE_CONFIG_UPDATED_EVENT, refresh);
		const unsubscribeBc = subscribeSiteConfigBroadcast(refresh);

		return () => {
			clearInterval(pollId);
			document.removeEventListener('visibilitychange', onVisible);
			window.removeEventListener(SITE_CONFIG_UPDATED_EVENT, refresh);
			unsubscribeBc();
		};
	});
</script>

{#if !loading && bannerData && bannerData.enabled}
	<BannerDisplay config={bannerData} />
{/if}

