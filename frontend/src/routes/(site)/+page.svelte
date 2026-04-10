<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import DiscordStatus from '$lib/site/components/widgets/DiscordStatus.svelte';
	import MusicWidget from '$lib/site/components/widgets/MusicWidget.svelte';
	import TweetWidget from '$lib/site/components/widgets/TweetWidget.svelte';
	import LinksWidget from '$lib/site/components/widgets/LinksWidget.svelte';
	import ButtonBanner from '$lib/site/components/widgets/ButtonBanner.svelte';
	import MyButtonWidget from '$lib/site/components/widgets/MyButtonWidget.svelte';
	import BorderedBox from '$lib/site/components/ui/BorderedBox.svelte';
	import ServiceStatus from '$lib/site/components/widgets/ServiceStatus.svelte';
	import SiteStats from '$lib/site/components/widgets/SiteStats.svelte';
	import Chat from '$lib/site/components/Chat.svelte';
	import ChatUserCount from '$lib/site/components/ChatUserCount.svelte';
	import { Radio } from 'lucide-svelte';
	import { marked } from 'marked';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let musicData: any = $state(data.musicData);
	let tweetData: any = $state(data.tweetData);
	let overallStatus = $state('UNKNOWN');
	let userCount = $state(0);

	const musicHeaderText = $derived(musicData?.nowPlaying ? 'Now Playing' : 'Recently Played');
	const tweetHeaderText = $derived('Status');

	let aboutMeContent = $state('');
	let loadingAboutMe = $state(true);

	interface BlogPost {
		id: string;
		title: string;
		slug: string;
		publishedAt: string;
	}

	let recentPosts = $state<BlogPost[]>([]);
	let loadingPosts = $state(true);

	onMount(async () => {
		await Promise.all([loadRecentPosts(), loadAboutMe()]);
	});

	async function loadAboutMe() {
		try {
			loadingAboutMe = true;
			const response = await fetch('/api/config/homepage_about_me');

			if (response.ok) {
				const result = await response.json();
				if (result.data?.value) {
					// Parse markdown to HTML
					aboutMeContent = await marked.parse(result.data.value);
				} else {
					aboutMeContent = '';
				}
			}
		} catch (err) {
			console.error('Error loading about me:', err);
			aboutMeContent = '';
		} finally {
			loadingAboutMe = false;
		}
	}

	async function loadRecentPosts() {
		try {
			loadingPosts = true;
			const response = await fetch('/api/blog');

			if (response.ok) {
				const result = await response.json();
				recentPosts = (result.data || []).slice(0, 4);
			}
		} catch (err) {
			console.error('Error loading recent posts:', err);
		} finally {
			loadingPosts = false;
		}
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function viewPost(slug: string) {
		goto(`/blog/${slug}`);
	}
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

				<BorderedBox
					padding="8px 16px"
					className="tweet-widget tweet-bordered-box"
					showHeader={true}
					headerText={tweetHeaderText}
					contentPadding={true}
				>
					<TweetWidget bind:tweetData />
				</BorderedBox>

				<BorderedBox
					padding="8px 16px"
					className="music-widget"
					showHeader={true}
					headerText={musicHeaderText}
					contentPadding={true}
					contentBottomPadding={true}
				>
					<svelte:fragment slot="header-icon">
						{#if musicData?.nowPlaying}
							<Radio size={16} class="status-icon playing" />
						{:else}
							<div class="status-icon offline"></div>
						{/if}
					</svelte:fragment>
					<MusicWidget bind:musicData />
				</BorderedBox>

				<BorderedBox
					padding="8px 16px"
					className="links-widget"
					showHeader={true}
					headerText="Links"
					dynamicHeight={true}
				>
					<LinksWidget />
				</BorderedBox>

				<ButtonBanner />

				<BorderedBox
					padding="0 16px"
					className="my-button-widget"
					showHeader={true}
					headerText="My Button"
					dynamicHeight={true}
				>
					<MyButtonWidget />
				</BorderedBox>

				<BorderedBox
					padding="8px 16px"
					className="site-stats-widget"
					showHeader={true}
					headerText="Site Stats"
					contentPadding={true}
				>
					<SiteStats />
				</BorderedBox>
			</div>
		</div>

		<!-- Right Column (70%) -->
		<div class="right-column">
			<div class="widgets-section">
				<BorderedBox
					padding="8px 16px"
					className="about-section"
					showHeader={true}
					headerText="About Me"
					dynamicHeight={true}
					contentPadding={true}
				>
					{#if loadingAboutMe}
						<div class="about-me-loading">
							<p>Loading...</p>
						</div>
					{:else if aboutMeContent}
						<div class="about-me-content">
							{@html aboutMeContent}
						</div>
					{:else}
						<div class="about-me-empty">
							<p>No data is available.</p>
						</div>
					{/if}
				</BorderedBox>

				<BorderedBox
					padding="8px 16px"
					className="recent-posts-section"
					showHeader={true}
					headerText="Recent posts"
					dynamicHeight={true}
					contentPadding={true}
				>
					<div class="recent-posts-content">
						{#if loadingPosts}
							<p class="recent-posts-empty">Loading...</p>
						{:else if recentPosts.length === 0}
							<p class="recent-posts-empty">There are currently no posts</p>
						{:else}
							{#each recentPosts as post}
								<button class="recent-post-item" onclick={() => viewPost(post.slug)}>
									<span class="post-date">{formatDate(post.publishedAt)}</span> :: {post.title}
								</button>
							{/each}
						{/if}
					</div>
				</BorderedBox>

				<BorderedBox
					padding="8px 16px"
					className="service-status-section"
					showHeader={true}
					headerText="Systems status:"
					subheading={overallStatus}
					subheadingSemanticStatus={true}
					dynamicHeight={true}
					contentPadding={true}
				>
					<ServiceStatus bind:overallStatus />
				</BorderedBox>

				{#if browser}
					<BorderedBox
						padding="8px 16px"
						className="chat-section"
						showHeader={true}
						headerText="Chat"
						dynamicHeight={true}
						contentPadding={true}
					>
						<ChatUserCount slot="header-right" count={userCount} />
						<Chat bind:userCount />
					</BorderedBox>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.home-content {
		max-width: 1200px;
		margin: 16px auto 0 auto;
	}

	.two-column-layout {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
	}

	.left-column {
		flex: 0 0 35%;
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

	:global(.recent-posts-section) {
		margin-top: var(--spacing-md, 16px);
	}

	:global(.service-status-section) {
		margin-top: var(--spacing-md, 16px);
	}

	:global(.chat-section) {
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
		color: var(--theme-accent, #22c55e);
		width: 16px;
		height: 16px;
		filter: drop-shadow(0 0 8px var(--theme-accent, #22c55e))
			drop-shadow(0 0 16px var(--theme-accent, #22c55e));
		animation: pulse-glow 2s ease-in-out infinite;
	}

	@keyframes pulse-glow {
		0%,
		100% {
			filter: drop-shadow(0 0 8px var(--theme-accent, #22c55e))
				drop-shadow(0 0 16px var(--theme-accent, #22c55e));
		}
		50% {
			filter: drop-shadow(0 0 12px var(--theme-accent, #22c55e))
				drop-shadow(0 0 24px var(--theme-accent, #22c55e));
		}
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
		font-size: calc(1.8 * 16 * 1em / 14);
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

	.about-me-content {
		color: var(--text-primary);
		font-size: calc(14 * 1em / 14);
		line-height: 1.6;
	}

	.about-me-content :global(p) {
		color: var(--text-primary);
		margin-bottom: 12px;
		line-height: 1.6;
		font-size: calc(14 * 1em / 14);
	}

	.about-me-content :global(ul) {
		margin: 0;
		padding-left: 20px;
		list-style-type: disc;
	}

	.about-me-content :global(li) {
		color: var(--text-primary);
		margin-bottom: 4px;
		line-height: 1.3;
		font-size: calc(14 * 1em / 14);
	}

	.about-me-content :global(a) {
		color: var(--accent-color);
		text-decoration: underline;
	}

	.about-me-content :global(a:hover) {
		color: var(--accent-color-light);
	}

	.about-me-content :global(strong),
	.about-me-content :global(b) {
		font-weight: 700;
	}

	.about-me-loading,
	.about-me-empty {
		color: var(--text-secondary, #a1a1aa);
		font-size: calc(14 * 1em / 14);
		text-align: center;
		padding: 2rem 0;
	}

	.about-me-empty p {
		margin: 0;
	}

	:global(.about-section p) {
		color: var(--text-primary);
		margin-bottom: 12px;
		line-height: 1.6;
		font-size: calc(14 * 1em / 14);
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
		font-size: calc(14 * 1em / 14);
	}

	:global(.about-section a) {
		color: var(--accent-color);
		text-decoration: underline;
	}

	:global(.about-section a:hover) {
		color: var(--accent-color-light);
	}

	/* Recent Posts section styling */
	.recent-posts-content {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-top: 12px;
		padding-bottom: 12px;
	}

	.recent-post-item {
		background: none;
		border: none;
		padding: 0;
		color: var(--text-primary, #ffffff);
		font-size: calc(14 * 1em / 14);
		text-align: left;
		cursor: pointer;
		transition: color 0.2s ease;
		font-family: inherit;
		line-height: 1.5;
	}

	.recent-post-item:hover {
		color: var(--accent-color, #6366f1);
	}

	.recent-post-item .post-date {
		font-weight: 700;
	}

	.recent-posts-empty {
		color: var(--text-secondary, #9ca3af);
		font-size: calc(14 * 1em / 14);
		margin: 0;
		text-align: left;
		padding-top: 12px;
		padding-bottom: 12px;
	}

	:global(button),
	:global(a),
	:global(input),
	:global(select),
	:global(textarea),
	:global([role='button']) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(button:hover),
	:global(a:hover),
	:global(input:hover),
	:global(select:hover),
	:global(textarea:hover),
	:global([role='button']:hover) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(button:focus),
	:global(a:focus),
	:global(input:focus),
	:global(select:focus),
	:global(textarea:focus),
	:global([role='button']:focus) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(button:active),
	:global(a:active),
	:global(input:active),
	:global(select:active),
	:global(textarea:active),
	:global([role='button']:active) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(.site-stats-widget) {
		margin-top: var(--spacing-md, 16px);
	}

	:global(.discord-widget),
	:global(.tweet-widget),
	:global(.music-widget),
	:global(.links-widget),
	:global(.my-button-widget),
	:global(.about-section),
	:global(.recent-posts-section) {
		box-shadow: none !important;
		outline: none !important;
		transition: none !important;
	}

	:global(.discord-widget:hover),
	:global(.tweet-widget:hover),
	:global(.music-widget:hover),
	:global(.links-widget:hover),
	:global(.my-button-widget:hover),
	:global(.about-section:hover),
	:global(.recent-posts-section:hover) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(.discord-widget:focus),
	:global(.tweet-widget:focus),
	:global(.music-widget:focus),
	:global(.links-widget:focus),
	:global(.my-button-widget:focus),
	:global(.about-section:focus),
	:global(.recent-posts-section:focus) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(.discord-widget *),
	:global(.tweet-widget *),
	:global(.music-widget *),
	:global(.links-widget *),
	:global(.my-button-widget *),
	:global(.about-section *),
	:global(.recent-posts-section *) {
		box-shadow: none !important;
		outline: none !important;
		transition: none !important;
	}

	:global(.discord-widget *:hover),
	:global(.tweet-widget *:hover),
	:global(.music-widget *:hover),
	:global(.links-widget *:hover),
	:global(.my-button-widget *:hover),
	:global(.about-section *:hover),
	:global(.recent-posts-section *:hover) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(.discord-widget *:focus),
	:global(.tweet-widget *:focus),
	:global(.music-widget *:focus),
	:global(.links-widget *:focus),
	:global(.my-button-widget *:focus),
	:global(.about-section *:focus),
	:global(.recent-posts-section *:focus) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(.discord-widget *:active),
	:global(.tweet-widget *:active),
	:global(.music-widget *:active),
	:global(.links-widget *:active),
	:global(.my-button-widget *:active),
	:global(.about-section *:active),
	:global(.recent-posts-section *:active) {
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

		/* About Me section mobile styling */
		:global(.about-section .bordered-box-content) {
			padding: 12px !important;
		}

		:global(.about-section p),
		.about-me-content :global(p) {
			font-size: calc(13 * 1em / 14);
			margin-bottom: 10px;
		}

		:global(.about-section li),
		.about-me-content :global(li) {
			font-size: calc(13 * 1em / 14);
			margin-bottom: 3px;
			line-height: 1.3;
		}
	}

	@media (max-width: 480px) {
	}
</style>
