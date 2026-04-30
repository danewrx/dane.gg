<script lang="ts">
	import { logger } from '$lib/logger';
	import { publicPageTitle } from '$lib/site/pageTitle';

	import { onMount } from 'svelte';
	import { Mail } from 'lucide-svelte';
	import Icon from '@iconify/svelte';
	import TypingHeader from '$lib/shared/components/TypingHeader.svelte';
	import { marked } from 'marked';

	let taglineContent = $state('');
	let loadingTagline = $state(true);
	let contactEmails = $state<{ id: string; description: string; email: string }[]>([]);
	let loadingEmails = $state(true);
	let emailsHeader = $state('');
	let loadingEmailsHeader = $state(true);
	let socialLinks = $state<
		{
			id: string;
			name: string;
			url: string;
			iconType: string;
			iconName?: string;
			iconText?: string;
			svgUrl?: string;
		}[]
	>([]);
	let socialHeader = $state('');
	let loadingSocial = $state(true);

	onMount(async () => {
		await Promise.all([loadTagline(), loadContactEmails(), loadEmailsHeader(), loadSocialLinks()]);
	});

	async function loadTagline() {
		try {
			loadingTagline = true;
			const response = await fetch('/api/contact/settings/tagline');

			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data?.value) {
					taglineContent = await marked.parse(result.data.value);
				} else {
					taglineContent = '';
				}
			}
		} catch (error) {
			logger.error('Error loading contact tagline:', error);
			taglineContent = '';
		} finally {
			loadingTagline = false;
		}
	}

	async function loadContactEmails() {
		try {
			loadingEmails = true;
			const response = await fetch('/api/contact/emails');

			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data) {
					contactEmails = result.data;
				} else {
					contactEmails = [];
				}
			}
		} catch (error) {
			logger.error('Error loading contact emails:', error);
			contactEmails = [];
		} finally {
			loadingEmails = false;
		}
	}

	async function loadEmailsHeader() {
		try {
			loadingEmailsHeader = true;
			const response = await fetch('/api/contact/settings/emails_header');

			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data?.value) {
					emailsHeader = result.data.value;
				}
			}
		} catch (error) {
			logger.error('Error loading emails header:', error);
		} finally {
			loadingEmailsHeader = false;
		}
	}

	async function loadSocialLinks() {
		try {
			loadingSocial = true;

			// Fetch link IDs and header
			const [linksConfigResponse, headerResponse, allLinksResponse] = await Promise.all([
				fetch('/api/contact/settings/social_links'),
				fetch('/api/contact/settings/social_header'),
				fetch('/api/social-links')
			]);

			// Get link IDs
			let selectedLinkIds: string[] = [];
			if (linksConfigResponse.ok) {
				const linksConfigData = await linksConfigResponse.json();
				if (linksConfigData.success && linksConfigData.data?.value) {
					try {
						selectedLinkIds = JSON.parse(linksConfigData.data.value);
					} catch {
						selectedLinkIds = [];
					}
				}
			}

			// Get header text
			if (headerResponse.ok) {
				const headerData = await headerResponse.json();
				if (headerData.success && headerData.data?.value) {
					socialHeader = headerData.data.value;
				}
			}

			if (allLinksResponse.ok && selectedLinkIds.length > 0) {
				const allLinksData = await allLinksResponse.json();
				if (allLinksData.success && allLinksData.data) {
					const allLinks = allLinksData.data;
					// Maintain order from selectedLinkIds
					socialLinks = selectedLinkIds
						.map((id) => allLinks.find((link: any) => link.id === id))
						.filter((link): link is any => link !== undefined);
				}
			}
		} catch (error) {
			logger.error('Error loading social links:', error);
			socialLinks = [];
		} finally {
			loadingSocial = false;
		}
	}
</script>

<svelte:head>
	<title>{publicPageTitle('Contact')}</title>
	<meta name="description" content="Get in touch with Dane for collaboration or inquiries." />
</svelte:head>

<div class="page-content">
	<TypingHeader text="Contact" />
	<div class="intro-message">
		{#if loadingTagline}
			<p>Loading...</p>
		{:else if taglineContent}
			<div class="tagline-content">
				{@html taglineContent}
			</div>
		{:else}
			<p>No tagline content is available.</p>
		{/if}
	</div>

	<hr class="section-divider" />
	<div class="email-section">
		{#if !loadingEmailsHeader && emailsHeader}
			<h2>{emailsHeader}</h2>
		{:else if !loadingEmailsHeader}
			<h2>Email</h2>
		{/if}
		{#if loadingEmails}
			<p>Loading emails...</p>
		{:else if contactEmails.length === 0}
			<p class="no-data">No email addresses are available.</p>
		{:else}
			{#each contactEmails as email (email.id)}
				<div class="email-item">
					<p class="email-description">{email.description}</p>
					<a href="mailto:{email.email}" class="email-link">
						<Mail size={18} />
						<span>{email.email}</span>
					</a>
				</div>
			{/each}
		{/if}
	</div>

	{#if !loadingSocial && socialLinks.length > 0}
		<hr class="section-divider" />
		<div class="social-section">
			<h2>Social</h2>
			{#if socialHeader}
				<p class="social-description">{socialHeader}</p>
			{/if}
			<div class="social-links">
				{#each socialLinks as link (link.id)}
					<a href={link.url} target="_blank" rel="noopener noreferrer" class="social-link">
						{#if link.iconType === 'custom-text' && link.iconText}
							<span class="text-icon">{link.iconText}</span>
						{:else if link.iconType === 'svg-url' && link.svgUrl}
							<img src={link.svgUrl} alt={link.name} class="svg-icon" />
						{:else if link.iconType === 'coreui-brand' && link.iconName}
							<Icon icon={`cib:${link.iconName.replace('cb-', '')}`} width="20" height="20" />
						{:else}
							<Icon icon="simple-icons:link" width="20" height="20" />
						{/if}
						<span>{link.name}</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<div class="footer-section">
		<div class="character-container">
			<img src="/assets/img/misc/miku.gif" alt="Hatsune Miku" class="character-image" />
		</div>
		<div class="closing-message">
			<p>Thank you for visiting my website!</p>
		</div>
	</div>
</div>

<style>
	.page-content {
		width: 100%;
		padding: 0 0.5rem 2rem 0.5rem;
		position: relative;
	}

	.intro-message {
		text-align: center;
		margin-bottom: 2rem;
	}

	.intro-message p {
		color: var(--text-primary);
		font-size: calc(1 * 16 * 1em / 14);
		line-height: 1.6;
		margin: 0;
	}

	.tagline-content {
		color: var(--text-primary);
		font-size: calc(1 * 16 * 1em / 14);
		line-height: 1.6;
	}

	.tagline-content :global(p) {
		margin-bottom: 1rem;
	}

	.tagline-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.section-divider {
		border: none;
		border-top: 1px solid var(--border-color);
		margin: 2rem 0;
	}

	.email-section,
	.social-section {
		margin-bottom: 2rem;
	}

	.email-section h2,
	.social-section h2 {
		color: var(--text-primary);
		font-size: calc(1.5 * 16 * 1em / 14);
		font-weight: 700;
		margin-bottom: 1rem;
	}

	.email-item {
		margin-bottom: 1.5rem;
	}

	.email-description {
		color: var(--text-secondary);
		font-size: calc(0.95 * 16 * 1em / 14);
		margin-bottom: 0.5rem;
		line-height: 1.5;
	}

	.no-data {
		color: var(--text-secondary);
		text-align: center;
		padding: 2rem 0;
		margin: 0;
	}

	.email-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-primary);
		text-decoration: none;
		font-size: calc(1 * 16 * 1em / 14);
		transition: color 0.2s ease;
	}

	.email-link:hover {
		color: var(--accent-color);
	}

	.social-description {
		color: var(--text-secondary);
		font-size: calc(0.95 * 16 * 1em / 14);
		margin-bottom: 1rem;
		line-height: 1.5;
	}

	.social-links {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding-top: 0.5rem;
	}

	.social-link {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--text-primary);
		text-decoration: none;
		font-size: calc(1 * 16 * 1em / 14);
		transition: color 0.2s ease;
	}

	.social-link:hover {
		color: var(--accent-color);
	}

	.text-icon {
		font-size: calc(18 * 1em / 14);
		line-height: 1;
	}

	.svg-icon {
		width: 20px;
		height: 20px;
		object-fit: contain;
	}

	.footer-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		margin-top: 3rem;
		padding-bottom: 2rem;
		position: relative;
	}

	.character-container {
		margin-bottom: 1rem;
	}

	.character-image {
		display: block;
		margin: 0 auto;
	}

	.closing-message {
		text-align: center;
	}

	.closing-message p {
		color: var(--text-primary);
		font-size: calc(1 * 16 * 1em / 14);
		margin: 0;
	}

	.character-image {
		width: 120px;
		height: auto;
		image-rendering: pixelated;
		image-rendering: -moz-crisp-edges;
		image-rendering: crisp-edges;
	}

	@media (max-width: 768px) {
		.character-image {
			width: 100px;
		}
	}
</style>
