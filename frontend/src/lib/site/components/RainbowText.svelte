<script lang="ts">
	import { isGeoCitiesTheme } from '$lib/site/stores/theme';

	interface Props {
		text: string;
		class?: string;
	}

	let { text, class: className = '' }: Props = $props();

	const chars = $derived([...text]);
</script>

{#if $isGeoCitiesTheme}
	<span class="geo-rainbow-text {className}">
		{#each chars as char, i (i)}
			<span class="geo-rainbow-char" style="--i: {i}">{char === ' ' ? '\u00a0' : char}</span>
		{/each}
	</span>
{:else}
	<span class={className}>{text}</span>
{/if}
