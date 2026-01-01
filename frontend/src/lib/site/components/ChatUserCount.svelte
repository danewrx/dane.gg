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
		color: #90ee90;
		font-size: 14px;
		font-weight: normal;
		font-family: var(--global-font-family, 'W95FA', 'JetBrains Mono', 'Courier New', monospace);
		text-shadow: 
			0 0 4px rgba(144, 238, 144, 0.6),
			0 0 8px rgba(144, 238, 144, 0.4),
			0 0 12px rgba(144, 238, 144, 0.2);
	}

	.user-count-display :global(svg) {
		color: #90ee90;
		stroke-width: 2;
		filter: 
			drop-shadow(0 0 4px rgba(144, 238, 144, 0.6))
			drop-shadow(0 0 8px rgba(144, 238, 144, 0.4));
	}
</style>

