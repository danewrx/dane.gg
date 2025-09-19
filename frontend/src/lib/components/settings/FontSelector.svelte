<script lang="ts">
	import { fontMode, fontConfigs, setFontMode } from '$lib/stores/font';

	let { class: className = '' } = $props();
</script>

<div class="font-selector" class:className>
	<label class="font-label" for="font-select">
		Font Family
	</label>
	<select 
		id="font-select"
		class="font-select"
		bind:value={$fontMode}
		onchange={(e) => {
			const target = e.target as HTMLSelectElement;
			if (target) {
				setFontMode(target.value as 'w95' | 'system');
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
	}

	.font-label {
		font-size: 11px;
		font-weight: bold;
		color: var(--text-primary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin: 0;
	}

	.font-select {
		/* Classic web 1.0 select styling */
		background: #ffffff;
		border: 2px inset #c0c0c0;
		border-radius: 0;
		padding: 4px 6px;
		font-family: inherit;
		font-size: 11px;
		color: #000000;
		cursor: pointer;
		width: 100%;
		height: 24px;
		box-sizing: border-box;
		
		/* Remove default styling */
		appearance: none;
		-moz-appearance: none;
		-webkit-appearance: none;
		
		/* Custom dropdown arrow */
		background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23000' d='M4 6l4 4 4-4z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 6px center;
		background-size: 12px;
		padding-right: 24px;
	}

	.font-select:focus {
		outline: 2px solid #0000ff;
		outline-offset: 1px;
	}

	.font-select:hover {
		background-color: #f0f0f0;
	}

	.font-select:active {
		border: 2px inset #808080;
	}

	.font-description {
		font-size: 10px;
		color: var(--text-muted);
		font-style: italic;
		margin: 0;
		line-height: 1.2;
	}

	/* Classic Windows 95 select styling for better retro look */
	.font-select option {
		background: #ffffff;
		color: #000000;
		padding: 2px 4px;
		font-family: inherit;
		font-size: 11px;
	}

	/* Responsive adjustments */
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
