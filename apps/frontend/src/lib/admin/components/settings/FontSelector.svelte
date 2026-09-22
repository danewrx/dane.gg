<script lang="ts">
	import { fontMode, fontConfigs, setFontMode } from '$lib/site/stores/font';

	let { class: className = '' } = $props();
</script>

<div class="font-selector" class:className>
	<label class="font-label" for="font-select"> Font </label>
	<select
		id="font-select"
		class="font-select"
		bind:value={$fontMode}
		onchange={(e) => {
			const target = e.target as HTMLSelectElement;
			if (target) {
				setFontMode(target.value as 'theme' | 'system');
			}
		}}
	>
		{#each Object.entries(fontConfigs) as [key, config]}
			<option value={key}>
				{config.name}
			</option>
		{/each}
	</select>
	<div class="font-description">
		{fontConfigs[$fontMode].description}
	</div>
</div>

<style>
	.font-selector {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.font-label {
		font-size: 11px;
		font-weight: bold;
		color: var(--theme-text-primary, #ffffff);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin: 0;
	}

	.font-select {
		background: var(--theme-background, #0a0a0a);
		border: 2px solid var(--theme-border, #ffffff);
		border-radius: 0;
		padding: 4px 6px;
		font-family: inherit;
		font-size: 11px;
		color: var(--theme-text-primary, #ffffff);
		cursor: pointer;
		width: 100%;
		height: 24px;
		box-sizing: border-box;

		appearance: none;
		-moz-appearance: none;
		-webkit-appearance: none;

		background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23ffffff' d='M4 6l4 4 4-4z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 6px center;
		background-size: 12px;
		padding-right: 24px;
	}

	.font-select:focus {
		outline: 2px solid var(--theme-accent, #90ee90);
		outline-offset: 1px;
	}

	.font-select:hover {
		background-color: color-mix(
			in srgb,
			var(--theme-background, #0a0a0a) 90%,
			var(--theme-accent, #90ee90) 10%
		);
	}

	.font-select:active {
		border-color: var(--theme-accent, #90ee90);
	}

	.font-description {
		font-size: 10px;
		color: var(--theme-text-muted, #71717a);
		font-style: italic;
		margin: 0;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}

	.font-select option {
		background: var(--theme-background, #0a0a0a);
		color: var(--theme-text-primary, #ffffff);
		padding: 2px 4px;
		font-family: inherit;
		font-size: 11px;
	}

	@media (max-width: 480px) {
		.font-select {
			font-size: 10px;
			height: 22px;
			padding: 3px 5px;
		}

		.font-label {
			font-size: 10px;
		}

		.font-description {
			font-size: 9px;
		}
	}
</style>
