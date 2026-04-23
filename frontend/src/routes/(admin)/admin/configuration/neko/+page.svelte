<script lang="ts">
	import { logger } from '$lib/logger';

	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { Cat, Lock, Save, Loader2 } from 'lucide-svelte';
	import { siteConfig, loadSiteConfig } from '$lib/site/stores/siteConfig';
	import { toast } from 'svelte-sonner';
	import { notifySiteConfigConsumers } from '$lib/shared/utils/siteConfigLiveSync';
	import Toggle from '$lib/admin/components/ui/Toggle.svelte';
	import {
		WEB_NEKO_DISABLED,
		WEB_NEKO_GRID_OPTIONS,
		normalizeDefaultWebNekoTypeForServer,
		syncWebNekoInjectedGlobalsFromSiteConfig,
		webNekoStillUrl,
		type WebNekoGridOption
	} from '$lib/site/oneko/variants';

	let savedDefault = $state<string>('white');
	let pendingDefault = $state<string>('white');
	let savedEnforced = $state<string>('white');
	let pendingEnforced = $state<string>('white');
	let savedEnforceToggle = $state(false);
	let pendingEnforceToggle = $state(false);
	let isSavingDefault = $state(false);
	let isSavingLock = $state(false);

	const defaultDirty = $derived(pendingDefault !== savedDefault);
	const enforcedSelectionDirty = $derived(pendingEnforced !== savedEnforced);
	const lockDirty = $derived(pendingEnforceToggle !== savedEnforceToggle || enforcedSelectionDirty);

	$effect(() => {
		if (!pendingEnforceToggle) {
			pendingEnforced = savedEnforced;
		}
	});

	function syncFromConfig(c: import('$lib/site/stores/siteConfig').SiteConfig) {
		const n = normalizeDefaultWebNekoTypeForServer(c.default_web_neko_type);
		savedDefault = n;
		pendingDefault = n;
		const e = normalizeDefaultWebNekoTypeForServer(
			c.enforced_web_neko_type ?? c.default_web_neko_type
		);
		savedEnforced = e;
		pendingEnforced = e;
		savedEnforceToggle = Boolean(c.enforce_web_neko);
		pendingEnforceToggle = savedEnforceToggle;
	}

	onMount(() => {
		const unsub = siteConfig.subscribe(syncFromConfig);
		return unsub;
	});

	function applyNekoLiveFromStore() {
		syncWebNekoInjectedGlobalsFromSiteConfig();
		const w = window as Window & { daneRestartWebNeko?: () => void };
		if (typeof w.daneRestartWebNeko === 'function') w.daneRestartWebNeko();
	}

	function selectDefault(opt: WebNekoGridOption) {
		pendingDefault = opt.id;
	}

	function selectEnforced(opt: WebNekoGridOption) {
		pendingEnforced = opt.id;
	}

	async function putConfig(key: string, value: unknown, dataType: string) {
		const response = await fetch(`/api/config/${key}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ value, dataType })
		});
		if (!response.ok) {
			const data = await response.json().catch(() => ({}));
			throw new Error(data.error || `Failed to update ${key}`);
		}
	}

	async function saveDefaultSettings() {
		if (!defaultDirty) return;
		isSavingDefault = true;
		try {
			await putConfig(
				'default_web_neko_type',
				normalizeDefaultWebNekoTypeForServer(pendingDefault),
				'string'
			);
			await loadSiteConfig();
			notifySiteConfigConsumers();
			syncFromConfig(get(siteConfig));
			applyNekoLiveFromStore();
			toast.success('Default Neko saved');
		} catch (e) {
			logger.error(e);
			toast.error('Failed to save default', {
				description: e instanceof Error ? e.message : 'Try again'
			});
		} finally {
			isSavingDefault = false;
		}
	}

	async function saveNekoLockSettings() {
		if (!lockDirty) return;
		isSavingLock = true;
		try {
			if (pendingEnforced !== savedEnforced) {
				await putConfig(
					'enforced_web_neko_type',
					normalizeDefaultWebNekoTypeForServer(pendingEnforced),
					'string'
				);
			}
			if (pendingEnforceToggle !== savedEnforceToggle) {
				await putConfig('enforce_web_neko', pendingEnforceToggle, 'boolean');
			}
			await loadSiteConfig();
			notifySiteConfigConsumers();
			syncFromConfig(get(siteConfig));
			applyNekoLiveFromStore();
			toast.success(
				pendingEnforceToggle
					? 'All visitors will see the selected Neko. The picker is disabled on the site.'
					: 'Neko lock is off. Visitors can choose a skin again.'
			);
		} catch (e) {
			logger.error(e);
			toast.error('Failed to save Neko lock', {
				description: e instanceof Error ? e.message : 'Try again'
			});
		} finally {
			isSavingLock = false;
		}
	}
</script>

<div class="neko-admin">
	<div class="page-head">
		<Cat size={22} class="neko-page-icon" aria-hidden="true" />
		<div>
			<h2 class="page-title">Web Neko</h2>
			<p class="page-desc">
				Art and script from <a href="https://webneko.net/" target="_blank" rel="noopener noreferrer"
					>webneko.net</a
				>. Optional site-wide lock is below; further down, set the default for new visitors and for
				anyone without a saved choice while the lock is off.
			</p>
		</div>
	</div>

	<section class="neko-enforcement-panel" aria-labelledby="neko-enforcement-heading">
		<div class="neko-enforcement-header">
			<Lock size={18} class="neko-enforcement-icon" aria-hidden="true" />
			<h2 id="neko-enforcement-heading" class="neko-enforcement-title">Site-wide Neko lock</h2>
		</div>
		<p class="neko-enforcement-desc">
			When enabled, every visitor sees the Neko skin you choose below and cannot change it from the
			site settings panel. When disabled, returning visitors keep their personal pick (stored in the
			browser).
		</p>
		<div class="neko-enforcement-controls">
			<Toggle
				bind:checked={pendingEnforceToggle}
				label="Enforce a single Neko skin for all visitors"
			/>
			{#if pendingEnforceToggle}
				<div class="enforcement-grid-wrap">
					<p class="enforcement-grid-label" id="neko-enforced-grid-label">Neko skin for everyone</p>
					<div
						class="neko-grid neko-grid--enforcement"
						role="group"
						aria-labelledby="neko-enforced-grid-label"
					>
						{#each WEB_NEKO_GRID_OPTIONS as opt (opt.id)}
							<button
								type="button"
								class="neko-cell"
								class:neko-cell--pending={pendingEnforced === opt.id}
								class:neko-cell--saved={savedEnforced === opt.id && !enforcedSelectionDirty}
								onclick={() => selectEnforced(opt)}
								aria-pressed={pendingEnforced === opt.id}
								aria-label={opt.id === WEB_NEKO_DISABLED
									? 'Locked: no Neko'
									: `Locked: ${opt.label}`}
							>
								<span class="thumb-wrap" class:thumb-wrap--none={opt.id === WEB_NEKO_DISABLED}>
									{#if opt.id === WEB_NEKO_DISABLED}
										<span class="thumb-none" aria-hidden="true">×</span>
									{:else}
										<img
											src={webNekoStillUrl(opt.id)}
											alt=""
											class="thumb"
											draggable="false"
											loading="lazy"
										/>
									{/if}
								</span>
								<span class="cell-label">{opt.label}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
			<button
				type="button"
				class="btn-enforcement-save"
				disabled={isSavingLock || !lockDirty}
				onclick={saveNekoLockSettings}
			>
				{#if isSavingLock}
					<Loader2 size={18} class="spin" aria-hidden="true" />
				{:else}
					<Save size={18} aria-hidden="true" />
				{/if}
				Save lock settings
			</button>
		</div>
	</section>

	<section class="neko-default-block" aria-labelledby="neko-default-heading">
		<h3 id="neko-default-heading" class="default-block-title">Default for new visitors</h3>
		<p class="default-block-desc">
			Used when someone has no personal choice yet, and as the server fallback while Neko lock is
			off.
		</p>
		<div class="neko-grid" role="group" aria-label="Default Web Neko skin">
			{#each WEB_NEKO_GRID_OPTIONS as opt (opt.id)}
				<button
					type="button"
					class="neko-cell"
					class:neko-cell--pending={pendingDefault === opt.id}
					class:neko-cell--saved={savedDefault === opt.id && !defaultDirty}
					onclick={() => selectDefault(opt)}
					aria-pressed={pendingDefault === opt.id}
					aria-label={opt.id === WEB_NEKO_DISABLED ? 'Default: no Neko' : `Default: ${opt.label}`}
				>
					<span class="thumb-wrap" class:thumb-wrap--none={opt.id === WEB_NEKO_DISABLED}>
						{#if opt.id === WEB_NEKO_DISABLED}
							<span class="thumb-none" aria-hidden="true">×</span>
						{:else}
							<img
								src={webNekoStillUrl(opt.id)}
								alt=""
								class="thumb"
								draggable="false"
								loading="lazy"
							/>
						{/if}
					</span>
					<span class="cell-label">{opt.label}</span>
				</button>
			{/each}
		</div>
		<button
			type="button"
			class="btn-save-default"
			disabled={isSavingDefault || !defaultDirty}
			onclick={saveDefaultSettings}
		>
			{#if isSavingDefault}
				<Loader2 size={18} class="spin" aria-hidden="true" />
			{:else}
				<Save size={18} aria-hidden="true" />
			{/if}
			Save default
		</button>
	</section>
</div>

<style>
	.neko-admin {
		width: 100%;
		box-sizing: border-box;
	}

	.page-head {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		margin-bottom: 24px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	:global(.neko-page-icon) {
		flex-shrink: 0;
		color: var(--accent-color, #6366f1);
		margin-top: 2px;
	}

	.page-title {
		margin: 0 0 6px 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary, #fff);
	}

	.page-desc {
		margin: 0;
		font-size: 13px;
		line-height: 1.5;
		color: var(--text-secondary, #a1a1aa);
	}

	.page-desc a {
		color: var(--accent-color, #6366f1);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.neko-default-block {
		margin-bottom: 28px;
	}

	.default-block-title {
		margin: 0 0 6px 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #fff);
	}

	.default-block-desc {
		margin: 0 0 14px 0;
		font-size: 13px;
		line-height: 1.5;
		color: var(--text-secondary, #a1a1aa);
		max-width: 52rem;
	}

	.neko-enforcement-panel {
		margin-bottom: 28px;
		padding: 18px 20px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
	}

	.neko-enforcement-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}

	.neko-enforcement-panel :global(.neko-enforcement-icon) {
		color: var(--accent-color, #ef4444);
		flex-shrink: 0;
	}

	.neko-enforcement-title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.neko-enforcement-desc {
		margin: 0 0 16px 0;
		font-size: 13px;
		line-height: 1.55;
		color: var(--text-secondary, #a1a1aa);
	}

	.neko-enforcement-controls {
		display: flex;
		flex-direction: column;
		gap: 16px;
		align-items: flex-start;
	}

	.neko-enforcement-controls :global(.toggle-wrapper) {
		width: 100%;
		align-items: flex-start;
	}

	.enforcement-grid-wrap {
		width: 100%;
	}

	.enforcement-grid-label {
		margin: 0 0 8px 0;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary, #a1a1aa);
	}

	.neko-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
		gap: 10px;
		width: 100%;
	}

	.neko-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 10px 6px;
		margin: 0;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		background: var(--bg-secondary, #2d2d2d);
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		font-size: 11px;
		font-weight: 500;
		line-height: 1.2;
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			color 0.15s ease,
			box-shadow 0.15s ease;
		min-width: 0;
		box-sizing: border-box;
	}

	.neko-cell:hover {
		border-color: var(--border-color-hover, #4a4a4a);
		color: var(--text-primary, #fff);
	}

	.neko-cell--pending {
		border-color: var(--accent-color, #6366f1);
		color: var(--text-primary, #fff);
		box-shadow: 0 0 0 1px var(--accent-color, #6366f1);
	}

	.neko-cell--saved:not(.neko-cell--pending) {
		border-color: color-mix(
			in srgb,
			var(--accent-color, #6366f1) 45%,
			var(--border-color, #3a3a3a)
		);
	}

	.thumb-wrap {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, #7ec8e3 18%, var(--bg-tertiary, #3a3a3a) 82%);
		border-radius: 6px;
		border: 1px solid color-mix(in srgb, var(--border-color, #fff) 12%, transparent);
		overflow: hidden;
	}

	.thumb-wrap--none {
		background: var(--bg-tertiary, #3a3a3a);
	}

	.thumb-none {
		font-size: 22px;
		line-height: 1;
		color: var(--text-muted, #6b7280);
		user-select: none;
	}

	.thumb {
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		object-fit: contain;
		image-rendering: pixelated;
		image-rendering: crisp-edges;
	}

	.cell-label {
		display: block;
		width: 100%;
		text-align: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: 0 2px;
	}

	.btn-save-default {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: 18px;
		padding: 10px 18px;
		border: none;
		border-radius: 6px;
		background: var(--accent-color, #6366f1);
		color: #ffffff;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-save-default:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-save-default :global(.spin) {
		animation: spin 0.8s linear infinite;
	}

	.btn-enforcement-save {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		border: none;
		border-radius: 6px;
		background: var(--accent-color, #ef4444);
		color: #ffffff;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-enforcement-save:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-enforcement-save :global(.spin) {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
