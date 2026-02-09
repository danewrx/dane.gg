<script lang="ts">
	import { Users } from 'lucide-svelte';
	
	let { count = 0 }: { count?: number } = $props();
</script>

{#if count > 0}
	<div class="user-count-display">
		<Users size={14} />
		<span>{count}</span>
	</div>
{/if}

<style>
	.user-count-display {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--theme-accent, #90ee90);
		font-size: 14px;
		font-weight: normal;
		font-family: var(--global-font-family, 'W95FA', 'JetBrains Mono', 'Courier New', monospace);
		text-shadow: 
			0 0 10px var(--theme-accent, #90ee90),
			0 0 20px var(--theme-accent, #90ee90),
			0 0 30px var(--theme-accent, #90ee90);
	}

	.user-count-display :global(svg) {
		color: var(--theme-accent, #90ee90);
		stroke-width: 2;
		filter: drop-shadow(0 0 8px var(--theme-accent, #90ee90)) drop-shadow(0 0 16px var(--theme-accent, #90ee90));
	}
</style>

