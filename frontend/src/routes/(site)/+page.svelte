<script lang="ts">
	import DiscordStatus from '$lib/site/components/widgets/DiscordStatus.svelte';
	import MusicWidget from '$lib/site/components/widgets/MusicWidget.svelte';
	import TweetWidget from '$lib/site/components/widgets/TweetWidget.svelte';
	import LinksWidget from '$lib/site/components/widgets/LinksWidget.svelte';
	import ButtonBanner from '$lib/site/components/widgets/ButtonBanner.svelte';
	import MyButtonWidget from '$lib/site/components/widgets/MyButtonWidget.svelte';
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
				
				<ButtonBanner />
				
				<BorderedBox padding="0 16px" className="my-button-widget" showHeader={true} headerText="My Button" dynamicHeight={true}>
					<MyButtonWidget />
				</BorderedBox>
			</div>
		</div>
		
		<!-- Right Column (70%) -->
		<div class="right-column">
			<BorderedBox padding="8px 16px" className="about-section" showHeader={true} headerText="About Me" dynamicHeight={true} contentPadding={true}>
				<p>Hi, I'm Dane! I'm a software engineer & freelance designer. You can read my full, more professional bio <a href="/about" target="_blank">here</a>!</p>
				<p><b>Some quick facts about me:</b></p>
				<ul>
					<li>I'm from Manchester in the UK.</li>
					<li>I currently work full-time as a software engineer @ a UK-based Azure Expert MSP</li>
					<li>My main languages are <span style="color: #9179E4;">C#</span>, <span style="color: #F1E05A;">JavaScript</span> & <span style="color: #3178C6;">TypeScript</span>.</li>
					<li>I first started coding at age 13, learning <span style="color: #9179E4;">Visual Basic (VB .NET)</span>.</li>
					<li>In my free time, I design for and run a small clothing brand called Partial Spaces.</li>
					<li>I'm a big fan of the old early 2000s internet and technology.</li>
					<li>I like cats!</li>
					<li>I don't like coffee.</li>
				</ul>
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

	/* About Me section styling */
	:global(.about-section .bordered-box-content) {
		padding: 16px !important;
	}

	:global(.about-section p) {
		color: var(--text-primary);
		margin-bottom: 12px;
		line-height: 1.6;
		font-size: 14px;
	}

	:global(.about-section ul) {
		margin: 0;
		padding-left: 20px;
		list-style-type: disc;
	}

	:global(.about-section li) {
		color: var(--text-primary);
		margin-bottom: 4px;
		line-height: 1.3;
		font-size: 14px;
	}

	:global(.about-section a) {
		color: var(--accent-color);
		text-decoration: underline;
	}

	:global(.about-section a:hover) {
		color: var(--accent-color-light);
	}

	/* Remove green glow effects from specific interactive elements only */
	:global(button),
	:global(a),
	:global(input),
	:global(select),
	:global(textarea),
	:global([role="button"]) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(button:hover),
	:global(a:hover),
	:global(input:hover),
	:global(select:hover),
	:global(textarea:hover),
	:global([role="button"]:hover) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(button:focus),
	:global(a:focus),
	:global(input:focus),
	:global(select:focus),
	:global(textarea:focus),
	:global([role="button"]:focus) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(button:active),
	:global(a:active),
	:global(input:active),
	:global(select:active),
	:global(textarea:active),
	:global([role="button"]:active) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(.discord-widget),
	:global(.tweet-widget),
	:global(.music-widget),
	:global(.links-widget),
	:global(.my-button-widget),
	:global(.about-section) {
		box-shadow: none !important;
		outline: none !important;
		transition: none !important;
	}

	:global(.discord-widget:hover),
	:global(.tweet-widget:hover),
	:global(.music-widget:hover),
	:global(.links-widget:hover),
	:global(.my-button-widget:hover),
	:global(.about-section:hover) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(.discord-widget:focus),
	:global(.tweet-widget:focus),
	:global(.music-widget:focus),
	:global(.links-widget:focus),
	:global(.my-button-widget:focus),
	:global(.about-section:focus) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(.discord-widget *),
	:global(.tweet-widget *),
	:global(.music-widget *),
	:global(.links-widget *),
	:global(.my-button-widget *),
	:global(.about-section *) {
		box-shadow: none !important;
		outline: none !important;
		transition: none !important;
	}

	:global(.discord-widget *:hover),
	:global(.tweet-widget *:hover),
	:global(.music-widget *:hover),
	:global(.links-widget *:hover),
	:global(.my-button-widget *:hover),
	:global(.about-section *:hover) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(.discord-widget *:focus),
	:global(.tweet-widget *:focus),
	:global(.music-widget *:focus),
	:global(.links-widget *:focus),
	:global(.my-button-widget *:focus),
	:global(.about-section *:focus) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(.discord-widget *:active),
	:global(.tweet-widget *:active),
	:global(.music-widget *:active),
	:global(.links-widget *:active),
	:global(.my-button-widget *:active),
	:global(.about-section *:active) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(.bordered-box) {
		box-shadow: none !important;
		outline: none !important;
		transition: none !important;
	}

	:global(.bordered-box:hover) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(.bordered-box:focus) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(.bordered-box *) {
		box-shadow: none !important;
		outline: none !important;
		transition: none !important;
	}

	:global(.bordered-box *:hover) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(.bordered-box *:focus) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(.bordered-box *:active) {
		box-shadow: none !important;
		outline: none !important;
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


		/* About Me section mobile styling */
		:global(.about-section .bordered-box-content) {
			padding: 12px !important;
		}

		:global(.about-section p) {
			font-size: 13px;
			margin-bottom: 10px;
		}

		:global(.about-section li) {
			font-size: 13px;
			margin-bottom: 3px;
			line-height: 1.3;
		}

	}

	@media (max-width: 480px) {
	}
</style>
