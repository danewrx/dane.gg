<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>dane.gg - Software Engineer & Designer</title>
	<meta name="description" content="Hi, I'm Dane! I'm a software engineer & freelance designer from Manchester, UK." />
</svelte:head>

<!-- Public website layout -->
<div class="main-container">
	<div class="content-window">
		<div class="content-area">
			{@render children?.()}
		</div>
	</div>
</div>

<style>
	:global(html) {
		background-image: url('/assets/img/backgrounds/1.png') !important;
		background-size: cover !important;
		background-position: center !important;
		background-repeat: no-repeat !important;
		background-attachment: fixed !important;
	}
	
	:global(body) {
		background-image: url('/assets/img/backgrounds/1.png') !important;
		background-size: cover !important;
		background-position: center !important;
		background-repeat: no-repeat !important;
		background-attachment: fixed !important;
	}
</style>

