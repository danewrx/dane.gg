<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Lock } from 'lucide-svelte';
	import { get } from 'svelte/store';
	import { siteConfig } from '$lib/site/stores/siteConfig';
	import {
		WEB_NEKO_DISABLED,
		WEB_NEKO_GRID_OPTIONS,
		getStoredWebNekoType,
		setStoredWebNekoType,
		webNekoStillUrl,
		type WebNekoGridOption
	} from '$lib/site/oneko/variants';

	let selectedId = $state<string>('white');
	let nekoEnforced = $state(false);
	let expanded = $state(false);
	let collapsedVisible = $state(10);

	const totalGridOptions = WEB_NEKO_GRID_OPTIONS.length;
	const showExpandToggle = $derived(totalGridOptions > collapsedVisible);

	const visibleGridOptions = $derived.by(() => {
		const all = WEB_NEKO_GRID_OPTIONS;
		if (expanded || all.length <= collapsedVisible) return all;

		const inFirstRows = all.slice(0, collapsedVisible).some((o) => o.id === selectedId);
		if (inFirstRows) return all.slice(0, collapsedVisible);

		const noneOpt = all.find((o) => o.id === WEB_NEKO_DISABLED);
		const selOpt = all.find((o) => o.id === selectedId);
		if (!selOpt) return all.slice(0, collapsedVisible);

		const out: WebNekoGridOption[] = [];
		if (noneOpt) out.push(noneOpt);
		out.push(selOpt);
		for (const o of all) {
			if (out.length >= collapsedVisible) break;
			if (o.id === WEB_NEKO_DISABLED || o.id === selectedId) continue;
			out.push(o);
		}
		return out;
	});

	function updateCollapsedVisible() {
		if (!browser) return;
		let cols = 5;
		if (matchMedia('(max-width: 380px)').matches) cols = 3;
		else if (matchMedia('(max-width: 520px)').matches) cols = 4;
		collapsedVisible = cols * 2;
	}

	onMount(() => {
		if (!browser) return;
		updateCollapsedVisible();
		selectedId = getStoredWebNekoType();
		nekoEnforced = Boolean(get(siteConfig).enforce_web_neko);
		const unsub = siteConfig.subscribe((c) => {
			nekoEnforced = Boolean(c.enforce_web_neko);
			selectedId = getStoredWebNekoType();
		});

		window.addEventListener('resize', updateCollapsedVisible);
		return () => {
			unsub();
			window.removeEventListener('resize', updateCollapsedVisible);
		};
	});

	function selectVariant(v: WebNekoGridOption) {
		if (nekoEnforced) return;
		if (v.id === selectedId) return;
		selectedId = v.id;
		setStoredWebNekoType(v.id);
	}
</script>

<div class="oneko-picker">
	<div class="oneko-stack">
		<div class="oneko-body" class:oneko-body--locked={nekoEnforced}>
			<div class="oneko-grid" role="group" aria-label="Web Neko variants">
				{#each visibleGridOptions as v (v.id)}
					<button
						type="button"
						class="oneko-option"
						class:oneko-option--active={selectedId === v.id}
						disabled={nekoEnforced}
						onclick={() => selectVariant(v)}
						aria-pressed={selectedId === v.id}
						aria-label={v.id === WEB_NEKO_DISABLED
							? 'Turn off Web Neko'
							: `Use ${v.label} Web Neko`}
					>
						<span class="thumb-wrap" class:thumb-wrap--none={v.id === WEB_NEKO_DISABLED}>
							{#if v.id === WEB_NEKO_DISABLED}
								<span class="thumb-none" aria-hidden="true">×</span>
							{:else}
								<img
									src={webNekoStillUrl(v.id)}
									alt=""
									class="thumb"
									draggable="false"
									loading="lazy"
								/>
							{/if}
						</span>
						<span class="label">{v.label}</span>
					</button>
				{/each}
			</div>
			{#if showExpandToggle}
				<button
					type="button"
					class="oneko-expand"
					aria-expanded={expanded}
					disabled={nekoEnforced}
					onclick={() => (expanded = !expanded)}
				>
					{expanded ? 'Show less' : 'Show more'}
				</button>
			{/if}
		</div>
		{#if nekoEnforced}
			<div class="oneko-locked-overlay" role="status" aria-live="polite">
				<div class="oneko-locked-plate">
					<Lock size={16} aria-hidden="true" />
					<span>Neko locked</span>
				</div>
				<p class="oneko-locked-subtext">The Neko picker has been disabled.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.oneko-picker {
		width: 100%;
		min-width: 0;
	}

	.oneko-stack {
		position: relative;
		width: 100%;
		min-width: 0;
	}

	.oneko-locked-overlay {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 12px;
		pointer-events: none;
		box-sizing: border-box;
	}

	.oneko-locked-plate {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin: 0;
		padding: 0;
		border: none;
		background: none;
		color: var(--theme-text-secondary, #a1a1aa);
		font-family: var(--global-font-family, 'W95FA', 'JetBrains Mono', 'Courier New', monospace);
		font-size: 13px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		text-shadow:
			0 0 12px var(--theme-background, #0a0a0a),
			0 1px 2px var(--theme-background, #0a0a0a);
		cursor: default;
	}

	.oneko-locked-plate :global(svg) {
		flex-shrink: 0;
		color: inherit;
		opacity: 0.95;
	}

	.oneko-locked-plate span {
		line-height: 1.2;
	}

	.oneko-locked-subtext {
		margin: 0;
		max-width: 22rem;
		font-size: 11px;
		line-height: 1.4;
		color: var(--theme-text-muted, #71717a);
		text-align: center;
		text-shadow:
			0 0 10px var(--theme-background, #0a0a0a),
			0 1px 2px var(--theme-background, #0a0a0a);
	}

	.oneko-body {
		width: 100%;
		min-width: 0;
		transition:
			filter 0.2s ease,
			opacity 0.2s ease;
	}

	.oneko-body--locked {
		filter: blur(5px);
		opacity: 0.72;
		pointer-events: none;
		user-select: none;
	}

	.oneko-grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 4px 3px;
		width: 100%;
	}

	.oneko-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 3px 1px 4px;
		margin: 0;
		border: 1px solid color-mix(in srgb, var(--theme-border, #ffffff) 55%, transparent);
		border-radius: 0;
		background: var(--theme-background, #0a0a0a);
		color: var(--theme-text-muted, #a1a1aa);
		cursor: pointer;
		font-family: var(--global-font-family, 'W95FA', 'JetBrains Mono', 'Courier New', monospace);
		font-size: 7px;
		font-weight: 500;
		text-transform: none;
		letter-spacing: 0;
		line-height: 1.15;
		transition:
			border-color 0.12s ease,
			background 0.12s ease,
			color 0.12s ease;
		min-width: 0;
		box-sizing: border-box;
	}

	.oneko-option:hover {
		border-color: var(--theme-accent, #90ee90);
		background: color-mix(
			in srgb,
			var(--theme-background, #0a0a0a) 88%,
			var(--theme-accent, #90ee90) 12%
		);
		color: var(--theme-text-primary, #e4e4e7);
	}

	.oneko-option--active {
		border-color: var(--theme-accent, #90ee90);
		color: var(--theme-accent, #90ee90);
		box-shadow: 0 0 5px color-mix(in srgb, var(--theme-accent, #90ee90) 28%, transparent);
	}

	.oneko-option:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.oneko-expand:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.thumb-wrap {
		width: 28px;
		height: 28px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, #7ec8e3 22%, var(--theme-surface, #1a1a1a) 78%);
		border: 1px solid color-mix(in srgb, var(--theme-border, #fff) 18%, transparent);
		overflow: hidden;
	}

	.thumb-wrap--none {
		background: color-mix(in srgb, var(--theme-surface, #1a1a1a) 90%, transparent);
	}

	.thumb-none {
		font-size: 14px;
		line-height: 1;
		font-weight: 400;
		color: var(--theme-text-muted, #71717a);
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

	.label {
		display: block;
		width: 100%;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: 0 1px;
		text-align: center;
	}

	@media (max-width: 520px) {
		.oneko-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	@media (max-width: 480px) {
		.oneko-locked-plate {
			font-size: 12px;
		}
	}

	@media (max-width: 380px) {
		.oneko-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.thumb-wrap {
			width: 26px;
			height: 26px;
		}
	}

	.oneko-expand {
		display: block;
		margin: 6px auto 0;
		padding: 4px 8px;
		border: 1px solid color-mix(in srgb, var(--theme-border, #ffffff) 45%, transparent);
		border-radius: 0;
		background: color-mix(in srgb, var(--theme-surface, #1a1a1a) 70%, transparent);
		color: var(--theme-accent, #90ee90);
		font-family: var(--global-font-family, 'W95FA', 'JetBrains Mono', 'Courier New', monospace);
		font-size: 8px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		cursor: pointer;
		transition:
			border-color 0.12s ease,
			background 0.12s ease,
			color 0.12s ease;
	}

	.oneko-expand:hover {
		border-color: var(--theme-accent, #90ee90);
		background: color-mix(
			in srgb,
			var(--theme-background, #0a0a0a) 82%,
			var(--theme-accent, #90ee90) 18%
		);
	}
</style>
