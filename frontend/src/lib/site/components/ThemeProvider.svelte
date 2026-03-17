<script lang="ts">
	import { onMount } from 'svelte';
	import { siteTheme, themeLoading, loadSiteTheme, DEFAULT_THEME } from '$lib/site/stores/theme';

	let theme = $derived($siteTheme ?? DEFAULT_THEME);
	let loading = $derived($themeLoading);

	onMount(async () => {
		await loadSiteTheme();
	});

	function getBgUrlCss(): string {
		if (!theme?.backgroundImage) return 'none';
		const url = theme.backgroundImage.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
		return `url('${url}')`;
	}
</script>

<!-- Background layer -->
<div 
	class="theme-background" 
	class:loading
	style="
		--bg-url: {getBgUrlCss()};
		--bg-overlay: {theme?.backgroundOverlay ?? 'rgba(0, 0, 0, 0.7)'};
		--bg-blur: {theme?.backgroundBlur ?? 0}px;
		--bg-position: {theme?.backgroundPosition ?? 'center center'};
		--bg-size: {theme?.backgroundSize ?? 'cover'};
		--bg-attachment: {theme?.backgroundAttachment ?? 'fixed'};
	"
>
	<div class="bg-image"></div>
	<div class="bg-overlay"></div>
</div>

<style>
	.theme-background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: -1;
		pointer-events: none;
	}

	.bg-image {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-image: var(--bg-url);
		background-position: var(--bg-position);
		background-size: var(--bg-size);
		background-attachment: var(--bg-attachment);
		background-repeat: no-repeat;
		filter: blur(var(--bg-blur));
		transition: all 0.5s ease;
	}

	.bg-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: var(--bg-overlay);
		transition: background 0.5s ease;
	}

	.theme-background.loading .bg-image {
		opacity: 0;
	}

	.theme-background.loading .bg-overlay {
		background: #0a0a0a;
	}
</style>
