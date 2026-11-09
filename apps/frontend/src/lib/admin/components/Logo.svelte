<script lang="ts">
	interface Props {
		animate?: boolean;
		hat?: 'santa' | 'witch' | null;
	}

	let { animate = false, hat = null }: Props = $props();

	const HATS = {
		santa: {
			rows: 6,
			art: `⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀<span class="hat-red">⣠⣾⣿⣿⣿⣿⣦⣄</span>⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀<span class="hat-red">⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣷⡄</span>⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀<span class="hat-red">⢀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⠻⣿⣆</span>⠀⠀⠀⠀
⠀⠀⠀⠀⠀<span class="hat-red">⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇</span>⠀⠀<span class="hat-red">⠈</span><span class="hat-white">⢹⣴⣦⡄</span>⠀
⠀⠀⠀⠀<span class="hat-white">⣸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇</span>⠀⠀⠀<span class="hat-white">⢻⣿⣿⡟</span>⠀
⠀⠀⣠<span class="hat-white">⡿⠛⢉⠁</span>⠀⢄⢻⣿⠀⠀<span class="hat-white">⠉⡙⣿</span>⢤⡀⠀⠀<span class="hat-white">⠈⠁</span>⠀⠀
⠀⡜⢱⣇⠀⣧⢣⡀⠀⡀⢻⡇⠀⡄⢰⣿⣷⡌⣢⡀⠀⠀⠀⠀
⠀⠇⡎⡿⣆⠹⣷⡹⣄⠙⣽⣿⢸⣧⣼⣿⣿⣿⣶⣼⣆⠀⠀⠀
⣷⡇⣷⡇⢹⢳⡽⣿⡽⣷⡜⣿⣾⢸⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀
⣿⡇⡿⣿⠀⠣⠹⣾⣿⣮⠿⣞⣿⢸⣿⣛⢿⣿⡟⠯⠉⠙⠛⠓
⣿⣇⣷⠙⡇⠀⠁⠀⠉⣽⣷⣾⢿⢸⣿⠀⢸⣿⢿⠀⠀⠀⠀⠀
⡟⢿⣿⣷⣾⣆⠀⠀⠘⠘⠿⠛⢸⣼⣿⢖⣼⣿⠘⡆⠀⠀⠀⠀
⠃⢸⣿⣿⡘⠋⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⣿⣿⡆⠇⠀⠀⠀⠀
⠀⢸⡿⣿⣇⠀⠈⠀⠤⠀⠀⢀⣿⣿⣿⣿⣿⣿⣧⢸⠀⠀⠀⠀
⠀⠈⡇⣿⣿⣷⣤⣀⠀⣀⠔⠋⣿⣿⣿⣿⣿⡟⣿⡞⡄⠀⠀⠀
⠀⠀⢿⢸⣿⣿⣿⣿⣿⡇⠀⢠⣿⡏⢿⣿⣿⡇⢸⣇⠇⠀⠀⠀
⠀⠀⢸⡏⣿⣿⣿⠟⠋⣀⠠⣾⣿⠡⠀⢉⢟⠷⢼⣿⣿⠀⠀⠀
⠀⠀⠈⣷⡏⡱⠁⠀⠊⠀⠀⣿⣏⣀⡠⢣⠃⠀⠀⢹⣿⡄⠀⠀
⠀⠀⠘⢼⣿⠀⢠⣤⣀⠉⣹⡿⠀⠁⠀⡸⠀⠀⠀⠈⣿⡇⠀⠀`
		},
		witch: {
			rows: 7,
			art: `⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀<span class="hat-purple">⢀⣤⣶⣶⣤⣄</span>⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀<span class="hat-purple">⣴⣿⣿⣿⣿⠟⠛⠓</span>⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀<span class="hat-purple">⣼⣿⣿⣿⣿⠁</span>⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀<span class="hat-purple">⢰⣿⣿⣿⣿⡇</span>⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀<span class="hat-orange">⢠⣿⣿⣿⣿⣿⣇</span>⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀<span class="hat-orange">⣾⣿⣿⣿⣿⣿⣿</span>⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
<span class="hat-purple">⣤⣤⣶⣶⣶⣾⣿⣿⣿⣿⣿⣿⣿⣷⣶⣶⣶⣤⣤⡄</span>⠀⠀⠀⠀
⠀⠀<span class="hat-purple">⣩⡛⠉⢉⠉⠉⢍⢻⣿⠉⠉⠉⡙⣿⢭</span>⡀⠀⠀⠀⠀⠀⠀
⠀⡜⢱⣇⠀⣧⢣⡀⠀⡀⢻⡇⠀⡄⢰⣿⣷⡌⣢⡀⠀⠀⠀⠀
⠀⠇⡎⡿⣆⠹⣷⡹⣄⠙⣽⣿⢸⣧⣼⣿⣿⣿⣶⣼⣆⠀⠀⠀
⣷⡇⣷⡇⢹⢳⡽⣿⡽⣷⡜⣿⣾⢸⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀
⣿⡇⡿⣿⠀⠣⠹⣾⣿⣮⠿⣞⣿⢸⣿⣛⢿⣿⡟⠯⠉⠙⠛⠓
⣿⣇⣷⠙⡇⠀⠁⠀⠉⣽⣷⣾⢿⢸⣿⠀⢸⣿⢿⠀⠀⠀⠀⠀
⡟⢿⣿⣷⣾⣆⠀⠀⠘⠘⠿⠛⢸⣼⣿⢖⣼⣿⠘⡆⠀⠀⠀⠀
⠃⢸⣿⣿⡘⠋⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⣿⣿⡆⠇⠀⠀⠀⠀
⠀⢸⡿⣿⣇⠀⠈⠀⠤⠀⠀⢀⣿⣿⣿⣿⣿⣿⣧⢸⠀⠀⠀⠀
⠀⠈⡇⣿⣿⣷⣤⣀⠀⣀⠔⠋⣿⣿⣿⣿⣿⡟⣿⡞⡄⠀⠀⠀
⠀⠀⢿⢸⣿⣿⣿⣿⣿⡇⠀⢠⣿⡏⢿⣿⣿⡇⢸⣇⠇⠀⠀⠀
⠀⠀⢸⡏⣿⣿⣿⠟⠋⣀⠠⣾⣿⠡⠀⢉⢟⠷⢼⣿⣿⠀⠀⠀
⠀⠀⠈⣷⡏⡱⠁⠀⠊⠀⠀⣿⣏⣀⡠⢣⠃⠀⠀⢹⣿⡄⠀⠀
⠀⠀⠘⢼⣿⠀⢠⣤⣀⠉⣹⡿⠀⠁⠀⡸⠀⠀⠀⠈⣿⡇⠀⠀`
		}
	};

	const hatInfo = $derived(hat ? HATS[hat] : null);
	// Blank rows as tall as the hat, so the text stays level with the face
	const hatSpacer = $derived(hatInfo ? Array(hatInfo.rows).fill('\u2800').join('\n') : '');

	let logoElement: HTMLDivElement;
</script>

<div class="brand-logo" bind:this={logoElement} class:animated={animate}>
	<div class="logo-container">
		<div class="art-ascii">
			{#if hatInfo}
				<pre class="ascii-art">{@html hatInfo.art}</pre>
			{:else}
			<pre class="ascii-art">
⠀⠀⠀⠀⢀⡠⠤⠔⢲⢶⡖⠒⠤⢄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⣠⡚⠁⢀⠀⠀⢄⢻⣿⠀⠀⠀⡙⣷⢤⡀⠀⠀⠀⠀⠀⠀
⠀⡜⢱⣇⠀⣧⢣⡀⠀⡀⢻⡇⠀⡄⢰⣿⣷⡌⣢⡀⠀⠀⠀⠀
⠀⸇⡎⡿⣆⠹⣷⡹⣄⠙⣽⣿⢸⣧⣼⣿⣿⣿⣶⣼⣆⠀⠀⠀
⣷⡇⣷⡇⢹⢳⡽⣿⡽⣷⡜⣿⣾⢸⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀
⣿⡇⡿⣿⠀⠣⠹⣾⣿⣮⠿⣞⣿⢸⣿⣛⢿⣿⡟⠯⠉⠙⠛⠓
⣿⣇⣷⠙⡇⠀⠁⠀⠉⣽⣷⣾⢿⢸⣿⠀⢸⣿⢿⠀⠀⠀⠀⠀
⡟⢿⣿⣷⣾⣆⠀⠀⠘⠘⠿⠛⢸⣼⣿⢖⣼⣿⠘⡆⠀⠀⠀⠀
⠃⢸⣿⣿⡘⠋⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⣿⣿⡆⠇⠀⠀⠀⠀
⠀⢸⡿⣿⣇⠀⠈⠀⠤⠀⠀⢀⣿⣿⣿⣿⣿⣿⣧⢸⠀⠀⠀⠀
⠀⠈⡇⣿⣿⣷⣤⣀⠀⣀⠔⠋⣿⣿⣿⣿⣿⡟⣿⡞⡄⠀⠀⠀
⠀⠀⢿⢸⣿⣿⣿⣿⣿⡇⠀⢠⣿⡏⢿⣿⣿⡇⢸⣇⠇⠀⠀⠀
⠀⠀⢸⡏⣿⣿⣿⠟⠋⣀⠠⣾⣿⠡⠀⢉⢟⠷⢼⣿⣿⠀⠀⠀
⠀⠀⠈⣷⡏⡱⠁⠀⠊⠀⠀⣿⣏⣀⡠⢣⠃⠀⠀⢹⣿⡄⠀⠀
⠀⠀⠘⢼⣿⠀⢠⣤⣀⠉⣹⡿⠀⠁⠀⡸⠀⠀⠀⠈⣿⡇⠀⠀
      </pre>
			{/if}
		</div>
		<div class="text-logo">
			{#if hatInfo}
				<pre class="ascii-art" aria-hidden="true">{hatSpacer}</pre>
			{/if}
			<pre class="ascii-text">
     _
    | |
  __| | __ _ _ __   ___
 / _` |/ _` | '_ \ / _ \
| (_| | (_| | | | |  __/
 \__,_|\__,_|_| |_|\___|
      </pre>
		</div>
	</div>
</div>

<style>
	.brand-logo {
		margin-bottom: 1rem;
	}

	.logo-container {
		display: grid;
		grid-template-columns: 45% 55%;
		justify-content: center;
		align-items: center;
		gap: 1.5rem;
		width: fit-content;
		margin: 0 auto;
	}

	.art-ascii {
		text-align: right;
	}

	.text-logo {
		text-align: left;
	}

	.ascii-art,
	.ascii-text {
		color: #6b7280;
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
		line-height: 1;
		margin: 0;
		padding: 0;
		opacity: 1;
		transform: translateY(0);
		white-space: pre;
	}

	.ascii-art {
		font-size: 8px;
		text-align: right;
	}

	.ascii-art :global(.hat-red) {
		color: #e63946;
	}

	.ascii-art :global(.hat-white) {
		color: #ffffff;
	}

	.ascii-art :global(.hat-purple) {
		color: #9664dc;
	}

	.ascii-art :global(.hat-orange) {
		color: #ff8a3d;
	}

	.ascii-text {
		font-size: 12px;
		text-align: left;
	}

	.brand-logo.animated .ascii-art,
	.brand-logo.animated .ascii-text {
		animation: softColorCycle 10s ease-in-out infinite;
	}

	@keyframes softColorCycle {
		0% {
			color: #ffd5d5;
		}
		20% {
			color: #c9ffd7;
		}
		40% {
			color: #c6e4ff;
		}
		60% {
			color: #d7c8ff;
		}
		80% {
			color: #ffcbcb;
		}
		100% {
			color: #ffd5d5;
		}
	}

	@media (max-width: 480px) {
		.logo-container {
			gap: 0.6rem;
		}

		.ascii-art {
			font-size: 6px;
		}

		.ascii-text {
			font-size: 9px;
		}
	}

	/* Light theme for devices with light preference - must be at the end to override */
	@media (prefers-color-scheme: light) {
		.ascii-art,
		.ascii-text {
			color: #64748b !important;
		}

		.brand-logo.animated .ascii-art,
		.brand-logo.animated .ascii-text {
			animation: softColorCycleLight 10s ease-in-out infinite !important;
		}
	}

	@keyframes softColorCycleLight {
		0% {
			color: #d97706;
		}
		20% {
			color: #059669;
		}
		40% {
			color: #0284c7;
		}
		60% {
			color: #7c3aed;
		}
		80% {
			color: #dc2626;
		}
		100% {
			color: #d97706;
		}
	}
</style>
