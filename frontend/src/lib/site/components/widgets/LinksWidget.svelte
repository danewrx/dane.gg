<script lang="ts">
	import { logger } from '$lib/logger';

	import { onMount, onDestroy } from 'svelte';
	import Icon from '@iconify/svelte';
	import { sanitizeSvgInlineMarkup } from '@repo/shared/utils/sanitizeSvgInline';
	import {
		getIconRenderInfo,
		isLikelyLucideMisstoredAsCoreUi,
		stripCoreUIBrandPrefix
	} from '$lib/site/utils/iconHelper';

	interface SocialLink {
		id: string;
		name: string;
		url: string;
		linkType?: 'link' | 'copy';
		iconType: 'coreui-brand' | 'lucide' | 'svg-url' | 'svg-inline' | 'custom-text';
		iconName?: string;
		iconText?: string;
		svgUrl?: string;
		svgInline?: string | null;
		displayOrder: number;
		isActive: boolean;
	}

	let socialLinks: SocialLink[] = $state([]);
	let isLoading = $state(true);

	onMount(async () => {
		try {
			const response = await fetch('/api/social-links');

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();

			if (data.success && data.data) {
				socialLinks = data.data;
			}
		} catch (error) {
			logger.error('Error loading social links:', error);
		} finally {
			isLoading = false;
		}
	});

	// Copy-to-clipboard feedback. The tooltip is portaled to <body> and
	// positioned with fixed coordinates so it floats above the widget's
	// bordered container instead of being clipped inside it.
	let copiedText = $state('');
	let copyFailed = $state(false);
	let tooltipVisible = $state(false);
	let tooltipX = $state(0);
	let tooltipY = $state(0);
	let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

	onDestroy(() => clearTimeout(copyResetTimer));

	/** Move an element to <body> so no ancestor overflow/transform clips it. */
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}

	async function handleLinkClick(link: SocialLink, trigger: HTMLElement) {
		if (link.linkType === 'copy') {
			copiedText = link.url;
			try {
				await navigator.clipboard.writeText(link.url);
				copyFailed = false;
			} catch (error) {
				logger.error('Clipboard write failed:', error);
				copyFailed = true;
			}
			const rect = trigger.getBoundingClientRect();
			tooltipX = rect.left + rect.width / 2;
			tooltipY = rect.top;
			tooltipVisible = true;
			clearTimeout(copyResetTimer);
			copyResetTimer = setTimeout(() => (tooltipVisible = false), 2000);
			return;
		}
		window.open(link.url, '_blank', 'noopener,noreferrer');
	}
</script>

{#if isLoading}
	<div class="links-container">
		<div class="loading">
			<div class="loading-spinner"></div>
		</div>
	</div>
{:else if socialLinks.length > 0}
	<div class="links-container">
		<div class="links-grid">
			{#each socialLinks as link}
				<button
					class="link-item"
					onclick={(e) => handleLinkClick(link, e.currentTarget)}
					aria-label={link.linkType === 'copy' ? `Copy ${link.name} to clipboard` : link.name}
					title={link.name}
				>
					{#if link.iconType === 'custom-text' && link.iconText}
						<span class="text-icon custom-text">{link.iconText}</span>
					{:else if link.iconType === 'svg-url' && link.svgUrl}
						<img src={link.svgUrl} alt={link.name} class="svg-icon" />
					{:else if link.iconType === 'svg-inline' && link.svgInline}
						{@const widgetSvg = sanitizeSvgInlineMarkup(link.svgInline)}
						{#if widgetSvg}
							<span class="svg-inline-host" aria-hidden="true">{@html widgetSvg}</span>
						{:else}
							<Icon icon="simple-icons:link" class="iconify-icon" />
						{/if}
					{:else if link.iconType === 'lucide' && link.iconName}
						{@const lucideInfo = getIconRenderInfo(link.iconName)}
						{#if lucideInfo.type === 'component' && lucideInfo.component}
							{@const LucideIcon = lucideInfo.component}
							<LucideIcon size={16} class="links-lucide" strokeWidth={2} />
						{:else}
							<Icon icon="simple-icons:link" class="iconify-icon" />
						{/if}
					{:else if link.iconType === 'coreui-brand' && link.iconName}
						{@const coreUiSlug = stripCoreUIBrandPrefix(link.iconName)}
						{#if isLikelyLucideMisstoredAsCoreUi(link.iconName)}
							{@const misInfo = getIconRenderInfo(coreUiSlug)}
							{#if misInfo.type === 'component' && misInfo.component}
								{@const LucideMis = misInfo.component}
								<LucideMis size={16} class="links-lucide" strokeWidth={2} />
							{:else}
								<Icon icon="simple-icons:link" class="iconify-icon" />
							{/if}
						{:else}
							<Icon icon={`cib:${coreUiSlug}`} class="iconify-icon" />
						{/if}
					{/if}
				</button>
			{/each}
		</div>
	</div>
{:else}
	<div class="links-container">
		<div class="no-links-message">
			<p>There are currently no links</p>
		</div>
	</div>
{/if}

{#if tooltipVisible}
	<span
		use:portal
		class="copy-tooltip"
		role="status"
		style="left: {tooltipX}px; top: {tooltipY}px;"
	>
		<strong class="copy-tooltip-text">{copiedText}</strong>
		<em class="copy-tooltip-label">{copyFailed ? '(copy failed)' : '(copied)'}</em>
	</span>
{/if}

<style>
	:global(*) {
		box-shadow: none !important;
		outline: none !important;
		transition: none !important;
	}

	:global(*:hover) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:focus) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:active) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:focus-visible) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:focus-within) {
		box-shadow: none !important;
		outline: none !important;
	}
	.links-container {
		width: 100%;
		padding: 0;
		box-sizing: border-box;
	}

	.loading {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20px;
	}

	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--theme-border, #374151);
		border-top: 2px solid var(--theme-accent, #6366f1);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.no-links-message {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20px;
		text-align: center;
	}

	.no-links-message p {
		color: var(--text-secondary, #9ca3af);
		font-size: calc(14 * 1em / 14);
		font-weight: 400;
		margin: 0;
		opacity: 0.8;
	}

	.links-grid {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 4px;
		width: 100%;
		margin: 0;
		padding: 12px 8px;
		box-sizing: border-box;
		grid-auto-rows: min-content;
	}

	.link-item {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 24px;
		background: transparent !important;
		border: none !important;
		border-radius: 2px;
		color: var(--text-primary, #ffffff);
		cursor: pointer;
		padding: 0;
		margin: 0;
		font-size: calc(8 * 1em / 14);
		font-weight: 500;
		box-shadow: none !important;
		outline: none !important;
		transition: none !important;
		box-sizing: border-box;
		min-height: 24px;
	}

	.link-item:hover {
		color: var(--accent-color, #3b82f6) !important;
		transform: translateY(-1px);
		background: transparent !important;
		box-shadow: none !important;
		outline: none !important;
		border: none !important;
	}

	.link-item:active {
		transform: translateY(0);
		background: transparent !important;
		box-shadow: none !important;
		outline: none !important;
	}

	.link-item:focus {
		outline: none !important;
		box-shadow: none !important;
		background: transparent !important;
		border: none !important;
	}

	.link-item:focus-visible {
		outline: none !important;
		box-shadow: none !important;
		background: transparent !important;
	}

	.link-item:focus-within {
		outline: none !important;
		box-shadow: none !important;
		background: transparent !important;
	}

	.copy-tooltip {
		/* Portaled to <body>; left/top come from the clicked button's rect and
		   the transform centres it horizontally and lifts it above the button. */
		position: fixed;
		transform: translate(-50%, calc(-100% - 8px));
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		background: var(--bg-secondary, #1f2937);
		color: var(--text-primary, #ffffff);
		border: 1px solid var(--accent-color, #3b82f6);
		border-radius: 4px;
		padding: 6px 10px;
		/* Fixed size: the trigger button's em-based font is tiny. */
		font-size: 13px;
		line-height: 1.3;
		z-index: 9999;
		pointer-events: none;
	}

	.copy-tooltip-text {
		font-weight: 700;
		white-space: nowrap;
		max-width: 260px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.copy-tooltip-label {
		font-style: italic;
		font-weight: 400;
		font-size: 11px;
		color: var(--text-secondary, #9ca3af);
		white-space: nowrap;
	}

	.text-icon {
		font-size: calc(11 * 1em / 14);
		font-weight: 600;
		text-align: center;
		line-height: 1;
	}

	.text-icon.custom-text {
		font-weight: 600;
		font-size: calc(0.7 * 16 * 1em / 14);
		background: transparent;
		color: var(--text-primary, #ffffff);
		border: 1px solid var(--text-primary, #ffffff);
		border-radius: 2px;
		padding: 2px 4px;
		min-width: 16px;
		min-height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.svg-icon {
		object-fit: contain;
		filter: var(--icon-filter, none);
		width: 16px;
		height: 16px;
	}

	.svg-inline-host {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 0;
	}

	.svg-inline-host :global(svg) {
		width: 16px;
		height: 16px;
		display: block;
	}

	:global(.link-item svg) {
		width: 16px;
		height: 16px;
	}

	.link-item:has(.text-icon) {
		font-family: var(--font-family, 'Inter', sans-serif);
	}

	/* Maintain 8 links per row on all screen sizes */
	@media (max-width: 1024px) {
		.links-grid {
			gap: 3px;
			--gap-height: 3px;
		}
	}

	@media (max-width: 768px) {
		.links-grid {
			gap: 2px;
			padding: 10px 6px;
			--base-padding: 20px;
			--icon-height: 24px;
			--gap-height: 2px;
		}

		.link-item {
			height: 24px;
			font-size: calc(9 * 1em / 14);
		}

		.text-icon {
			font-size: calc(8 * 1em / 14);
		}

		.svg-icon,
		:global(.link-item svg) {
			width: 16px;
			height: 16px;
		}
	}

	@media (max-width: 480px) {
		.links-grid {
			gap: 2px;
			padding: 8px 4px;
			--base-padding: 16px;
			--icon-height: 24px;
			--gap-height: 2px;
		}

		.link-item {
			height: 24px;
			font-size: calc(9 * 1em / 14);
		}

		.text-icon {
			font-size: calc(8 * 1em / 14);
		}

		.svg-icon,
		:global(.link-item svg) {
			width: 16px;
			height: 16px;
		}
	}
</style>
