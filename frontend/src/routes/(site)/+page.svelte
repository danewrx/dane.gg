<script lang="ts">
	import DiscordStatus from '$lib/site/components/widgets/DiscordStatus.svelte';
	import MusicWidget from '$lib/site/components/widgets/MusicWidget.svelte';
	import TweetWidget from '$lib/site/components/widgets/TweetWidget.svelte';
	import LinksWidget from '$lib/site/components/widgets/LinksWidget.svelte';
	import BorderedBox from '$lib/site/components/ui/BorderedBox.svelte';
	import { Radio, Twitter } from 'lucide-svelte';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	let musicData: any = $state(data.musicData);
	let tweetData: any = $state(data.tweetData);
	
	const musicHeaderText = $derived(musicData?.nowPlaying ? 'Now Playing' : 'Recently Played');
	const tweetHeaderText = $derived('Status');
</script>

<svelte:head>
	<title>dane.gg - Software Engineer & Designer</title>
</svelte:head>

<div class="home-content">
	<!-- Two Column Layout -->
	<div class="two-column-layout">
		<!-- Left Column (30%) -->
		<div class="left-column">
			<div class="widgets-section">
				<BorderedBox padding="16px" className="discord-widget" contentPadding={true}>
					<DiscordStatus />
				</BorderedBox>

				<BorderedBox padding="8px 16px" className="tweet-widget tweet-bordered-box" showHeader={true} headerText={tweetHeaderText} contentPadding={true}>
					<TweetWidget bind:tweetData />
				</BorderedBox>
				
				<BorderedBox padding="8px 16px" className="music-widget" showHeader={true} headerText={musicHeaderText} contentPadding={true} contentBottomPadding={true}>
					<svelte:fragment slot="header-icon">
						{#if musicData?.nowPlaying}
							<Radio size={16} class="status-icon playing" />
						{:else}
							<div class="status-icon offline"></div>
						{/if}
					</svelte:fragment>
					<MusicWidget bind:musicData />
				</BorderedBox>
				
				<BorderedBox padding="8px 16px" className="links-widget" showHeader={true} headerText="Links" dynamicHeight={true}>
					<LinksWidget />
				</BorderedBox>
			</div>
		</div>
		
		<!-- Right Column (70%) -->
		<div class="right-column">
			<BorderedBox padding="24px" className="intro-section">
				<h2>Welcome to my digital space</h2>
				<p>I'm a software engineer and designer passionate about creating beautiful, functional web applications and user experiences.</p>
				
				<div class="feature-cards">
					<BorderedBox padding="16px" className="feature-card" contentPadding={true}>
						<h3>Development</h3>
						<p>Full-stack web development with modern technologies and best practices.</p>
					</BorderedBox>
					
					<BorderedBox padding="16px" className="feature-card">
						<h3>Design</h3>
						<p>User-centered design focusing on usability and aesthetic excellence.</p>
					</BorderedBox>
					
					<BorderedBox padding="16px" className="feature-card">
						<h3>Innovation</h3>
						<p>Always exploring new technologies and creative solutions to complex problems.</p>
					</BorderedBox>
				</div>
			</BorderedBox>
		</div>
	</div>
</div>

<style>
	.home-content {
		max-width: 1200px;
		margin: 0 auto;
	}


	.two-column-layout {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
	}

	.left-column {
		flex: 0 0 30%;
		min-width: 0;
	}

	.right-column {
		flex: 1;
		min-width: 0;
	}

	.widgets-section {
		margin-bottom: 0;
	}

	:global(.discord-widget) {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		min-height: 64px;
	}

	:global(.music-widget) {
		display: flex;
		flex-direction: column;
		min-height: 80px;
		margin-top: var(--spacing-md, 16px);
	}

	:global(.tweet-widget) {
		display: flex;
		flex-direction: column;
		min-height: 80px;
		margin-top: var(--spacing-md, 16px);
	}

	:global(.links-widget) {
		display: flex;
		flex-direction: column;
		min-height: 120px;
		margin-top: var(--spacing-md, 16px);
	}

	:global(.links-widget .bordered-box) {
		transition: none !important;
	}

	:global(.links-widget .bordered-box:hover) {
		background: var(--background-color) !important;
		box-shadow: none !important;
	}

	:global(.links-widget *) {
		box-shadow: none !important;
		outline: none !important;
		transition: none !important;
	}

	:global(.links-widget *:hover) {
		box-shadow: none !important;
		outline: none !important;
		background: transparent !important;
	}

	:global(.links-widget *:focus) {
		box-shadow: none !important;
		outline: none !important;
		background: transparent !important;
	}
	
	/* Status icon styles */
	:global(.status-icon) {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	:global(.status-icon.playing) {
		color: #22c55e;
		width: 16px;
		height: 16px;
	}

	:global(.status-icon.offline) {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background-color: #6b7280;
	}

	:global(.status-icon.twitter) {
		color: #1da1f2;
		width: 16px;
		height: 16px;
	}

	:global(.intro-section) {
		text-align: left;
	}

	:global(.intro-section h2) {
		color: var(--text-primary);
		margin-bottom: 1rem;
		font-size: 1.8rem;
	}

	:global(.intro-section p) {
		color: var(--text-secondary);
		margin-bottom: 1rem;
		line-height: 1.6;
	}

	.feature-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-top: 2rem;
	}

	:global(.feature-card) {
		transition: all 0.3s ease;
	}

	:global(.feature-card:hover) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px var(--shadow);
	}

	:global(.feature-card h3) {
		color: var(--accent-color);
		margin-bottom: 0.5rem;
		font-size: 1.2rem;
	}

	:global(.feature-card p) {
		color: var(--text-secondary);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	@media (max-width: 768px) {
		.two-column-layout {
			flex-direction: column;
			gap: 1.5rem;
		}
		
		.left-column {
			flex: none;
			width: 100%;
		}
		
		.right-column {
			flex: none;
			width: 100%;
		}
		
		:global(.discord-widget) {
			justify-content: flex-start;
		}
		
		.feature-cards {
			grid-template-columns: 1fr;
		}
	}
</style>
