<script lang="ts">
	import { browser } from '$app/environment';
	import { Palette, Lock } from 'lucide-svelte';
	import { fly, fade } from 'svelte/transition';
	import FontSelector from './FontSelector.svelte';
	import WeatherControls from './WeatherControls.svelte';
	import ThemeSwitcherWindow from './ThemeSwitcherWindow.svelte';
	import ChatNotificationControl from '$lib/site/components/settings/ChatNotificationControl.svelte';
	import OnekoPicker from '$lib/site/components/settings/OnekoPicker.svelte';
	import { themeEnforcement } from '$lib/site/stores/theme';

	let { isOpen = false, onClose }: { isOpen?: boolean; onClose?: () => void } = $props();
	let themeWindowOpen = $state(false);

	const SLIDE_MS = 300;
	const slideDistance = 300;
	const motionReduced =
		browser && typeof matchMedia !== 'undefined'
			? matchMedia('(prefers-reduced-motion: reduce)').matches
			: false;
	const panelFly = {
		x: slideDistance,
		duration: motionReduced ? 0 : SLIDE_MS,
		opacity: 1
	};
	const backdropFade = { duration: motionReduced ? 0 : SLIDE_MS };

	function handleClose() {
		onClose?.();
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			handleClose();
		}
	}

	function openThemeWindow() {
		themeWindowOpen = true;
	}
</script>

<!-- Theme Switcher Window -->
<ThemeSwitcherWindow bind:isOpen={themeWindowOpen} />

<svelte:window onkeydown={handleWindowKeydown} />

<!-- Settings Panel (one element per {#if} so Svelte runs enter/leave transitions) -->
{#if isOpen}
	<div
		class="settings-backdrop"
		transition:fade={backdropFade}
		onclick={handleClose}
		role="presentation"
	></div>
{/if}
{#if isOpen}
	<div
		class="settings-panel"
		transition:fly={panelFly}
		role="dialog"
		aria-modal="true"
		aria-label="Site settings"
	>
	<div class="settings-content">
		<div class="settings-section">
			<h3>Theme</h3>
			<button
				type="button"
				class="theme-button"
				class:theme-button--locked={$themeEnforcement.enforced}
				disabled={$themeEnforcement.enforced}
				onclick={openThemeWindow}
				aria-disabled={$themeEnforcement.enforced}
				title={$themeEnforcement.enforced
					? 'The site administrator has locked the theme for all visitors.'
					: undefined}
			>
				{#if $themeEnforcement.enforced}
					<Lock size={16} aria-hidden="true" />
					<span>Theme locked</span>
				{:else}
					<Palette size={16} aria-hidden="true" />
					<span>Change Theme</span>
				{/if}
			</button>
			{#if $themeEnforcement.enforced}
				<p class="theme-button-subtext">The theme picker has been disabled.</p>
			{/if}
		</div>

		<div class="settings-section">
			<h3>Font</h3>
			<FontSelector />
		</div>

		<div class="settings-section">
			<h3>Weather Effects</h3>
			<WeatherControls />
		</div>

		<div class="settings-section">
			<h3>Neko</h3>
			<OnekoPicker />
		</div>

		<div class="settings-section">
			<h3>Chat</h3>
			<ChatNotificationControl />
		</div>
	</div>
	</div>
{/if}

<style>
	.settings-backdrop {
		position: fixed;
		inset: 0;
		background: transparent;
		z-index: 1000;
		cursor: pointer;
	}

	.settings-panel {
		position: fixed;
		bottom: max(12px, env(safe-area-inset-bottom, 0px));
		right: 0;
		width: min(280px, calc(100vw - 12px - env(safe-area-inset-right, 0px)));
		max-height: min(calc(100vh - 80px), calc(100dvh - 80px));
		min-width: 0;
		box-sizing: border-box;
		background: var(--theme-surface, #1a1a1a);
		border: 2px solid var(--theme-border, #ffffff);
		border-right: none;
		border-radius: 0;
		box-shadow:
			-4px 0 12px rgba(0, 0, 0, 0.5),
			0 0 30px var(--theme-accent, #90ee90);
		z-index: 1001;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		will-change: transform;
	}

	.settings-content {
		padding: 16px;
		background: var(--theme-surface, #1a1a1a);
		overflow-y: auto;
		overflow-x: hidden;
		flex: 1;
		min-width: 0;
		-webkit-overflow-scrolling: touch;
	}

	/* Scrollbar styling */
	.settings-content::-webkit-scrollbar {
		width: 8px;
	}

	.settings-content::-webkit-scrollbar-track {
		background: var(--theme-background, #0a0a0a);
	}

	.settings-content::-webkit-scrollbar-thumb {
		background: var(--theme-border, #ffffff);
		border: 1px solid var(--theme-background, #0a0a0a);
	}

	.settings-content::-webkit-scrollbar-thumb:hover {
		background: var(--theme-accent, #90ee90);
	}

	.settings-section {
		margin-bottom: 20px;
	}

	.settings-section:last-child {
		margin-bottom: 0;
	}

	.settings-section h3 {
		margin: 0 0 12px 0;
		color: var(--theme-text-primary, #ffffff);
		font-size: 12px;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.theme-button {
		width: 100%;
		padding: 12px 16px;
		background: var(--theme-background, #0a0a0a);
		border: 2px solid var(--theme-border, #ffffff);
		color: var(--theme-text-primary, #ffffff);
		font-size: 13px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		transition: all 0.2s ease;
		font-family: var(--global-font-family, 'W95FA', 'JetBrains Mono', 'Courier New', monospace);
	}

	.theme-button:hover {
		background: var(--theme-accent, #90ee90);
		border-color: var(--theme-accent, #90ee90);
		color: var(--theme-background, #0a0a0a);
		box-shadow:
			0 0 15px var(--theme-accent, #90ee90),
			0 0 30px var(--theme-accent, #90ee90);
		transform: translateY(-2px);
	}

	.theme-button:active {
		transform: translateY(0);
	}

	.theme-button:disabled,
	.theme-button.theme-button--locked {
		opacity: 0.5;
		cursor: not-allowed;
		color: var(--theme-text-muted, #71717a);
		background: var(--theme-surface, #1a1a1a);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.theme-button:disabled:hover,
	.theme-button.theme-button--locked:hover {
		transform: none;
		box-shadow: none;
		background: var(--theme-surface, #1a1a1a);
		border-color: rgba(255, 255, 255, 0.2);
		color: var(--theme-text-muted, #71717a);
	}

	.theme-button-subtext {
		margin: 8px 0 0 0;
		font-size: 11px;
		line-height: 1.4;
		color: var(--theme-text-muted, #71717a);
		text-align: left;
	}

	/* Responsive design */
	@media (max-width: 480px) {
		.settings-panel {
			bottom: max(8px, env(safe-area-inset-bottom, 0px));
			width: min(280px, calc(100vw - 10px - env(safe-area-inset-right, 0px)));
			max-height: min(calc(100vh - 56px), calc(100dvh - 56px));
		}

		.settings-content {
			padding: 12px;
		}

		.settings-section h3 {
			font-size: 11px;
		}

		.theme-button {
			padding: 10px 12px;
			font-size: 12px;
		}
	}

	@media (max-width: 360px) {
		.settings-content {
			padding: 10px;
		}

		.settings-section {
			margin-bottom: 16px;
		}
	}
</style>
