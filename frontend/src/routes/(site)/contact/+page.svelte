<script lang="ts">
	import { Mail } from 'lucide-svelte';
	import Icon from '@iconify/svelte';
	import TypingHeader from '$lib/shared/components/TypingHeader.svelte';
</script>

<svelte:head>
	<title>Contact - dane.gg</title>
	<meta name="description" content="Get in touch with Dane for collaboration or inquiries." />
</svelte:head>

<div class="page-content">
	<TypingHeader text="Contact" />
	<div class="intro-message">
		<p>I'm always open to connecting, whether it's for collaborations, opportunities, or a friendly chat. You can reach out to me through email or on social media. Below, you'll find the best ways to get in touch. I look forward to hearing from you!</p>
	</div>

	<hr class="section-divider" />
	<div class="email-section">
		<h2>Email</h2>
		<div class="email-item">
			<p class="email-description">If you would like to reach out to me for most things:</p>
			<a href="mailto:me@dane.gg" class="email-link">
				<Mail size={18} />
				<span>me@dane.gg</span>
			</a>
		</div>
		<div class="email-item">
			<p class="email-description">If you would like to discuss anything regarding hiring, freelance work, or anything similar:</p>
			<a href="mailto:biz@dane.gg" class="email-link">
				<Mail size={18} />
				<span>biz@dane.gg</span>
			</a>
		</div>
	</div>

	<hr class="section-divider" />
	<div class="social-section">
		<h2>Social</h2>
		<p class="social-description">If you want to contact me through social media, please do so via the following channels. I am most active here and will likely respond the quickest:</p>
		<div class="social-links">
			<a href="https://x.com" target="_blank" rel="noopener noreferrer" class="social-link">
				<Icon icon="simple-icons:x" width="20" height="20" />
				<span>X (Twitter)</span>
			</a>
			<a href="https://bsky.app" target="_blank" rel="noopener noreferrer" class="social-link">
				<Icon icon="simple-icons:bluesky" width="20" height="20" />
				<span>Bluesky</span>
			</a>
			<a href="https://discord.com" target="_blank" rel="noopener noreferrer" class="social-link">
				<Icon icon="simple-icons:discord" width="20" height="20" />
				<span>Discord</span>
			</a>
		</div>
	</div>

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
		font-size: 1rem;
		line-height: 1.6;
		margin: 0;
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
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 1rem;
	}

	.email-item {
		margin-bottom: 1.5rem;
	}

	.email-description {
		color: var(--text-secondary);
		font-size: 0.95rem;
		margin-bottom: 0.5rem;
		line-height: 1.5;
	}

	.email-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-primary);
		text-decoration: none;
		font-size: 1rem;
		transition: color 0.2s ease;
	}

	.email-link:hover {
		color: var(--accent-color);
	}

	.social-description {
		color: var(--text-secondary);
		font-size: 0.95rem;
		margin-bottom: 1rem;
		line-height: 1.5;
	}

	.social-links {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.social-link {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--text-primary);
		text-decoration: none;
		font-size: 1rem;
		transition: color 0.2s ease;
	}

	.social-link:hover {
		color: var(--accent-color);
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
		font-size: 1rem;
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