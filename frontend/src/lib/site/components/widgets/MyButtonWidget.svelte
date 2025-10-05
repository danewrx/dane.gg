<script lang="ts">
	import { Copy, ChevronDown, ChevronRight } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let isExpanded = $state(false);
	let copyButtonRef: HTMLButtonElement;

	const buttonCode = `<a href="https://dane.gg"><img src="https://dane.gg/assets/img/buttons/1.gif" alt="dane.gg" width="88" height="31"></a>`;

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(buttonCode);
			toast.success('Code copied to clipboard!');
		} catch (err) {
			// Fallback for older browsers
			const textArea = document.createElement('textarea');
			textArea.value = buttonCode;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);
			toast.success('Code copied to clipboard!');
		}
	}

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}
</script>

<div class="my-button-widget">
	<div class="button-content">
		<div class="button-image">
			<img 
				src="/assets/img/buttons/svelte.gif" 
				alt="dane.gg button" 
				width="88" 
				height="31"
			/>
		</div>
		
		<div class="code-section">
			<div class="code-block">
				<pre><code>{buttonCode}</code></pre>
			</div>
			<button 
				class="copy-button" 
				onclick={copyCode}
				title="Copy code to clipboard"
			>
				<Copy size={16} />
			</button>
		</div>
	</div>
	
	<div class="hotlink-section">
		<button class="hotlink-toggle" onclick={toggleExpanded}>
			<span>DO hotlink my button <span class="question-mark" class:bold={isExpanded}>[?]</span></span>
		</button>
		
		{#if isExpanded}
			<div class="hotlink-explanation">
				<p>I have endless bandwidth on my site & I want to be able to change my button any time I want, without having to ask people to change it.</p>
			</div>
		{/if}
	</div>
</div>

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
	.my-button-widget {
		display: flex;
		flex-direction: column;
		gap: 0;
		width: 100%;
		box-sizing: border-box;
		overflow: hidden;
		padding: 4px 12px;
	}

	.button-content {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		width: 100%;
		box-sizing: border-box;
	}

	.button-image {
		flex-shrink: 0;
		height: 31px;
		display: flex;
		align-items: center;
	}

	.button-image img {
		display: block;
		border-radius: 0;
	}

	.code-section {
		flex: 1;
		display: flex;
		gap: 0;
		align-items: flex-start;
		height: 31px;
		min-width: 0;
	}

	.code-block {
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 4px 0 0 4px;
		padding: 4px 8px;
		flex: 1;
		height: 100%;
		display: flex;
		align-items: center;
		overflow: hidden;
		min-width: 0;
	}

	.code-block pre {
		margin: 0;
		font-family: 'Courier New', monospace;
		font-size: 13px;
		color: #e5e5e5;
		white-space: pre-wrap;
		word-break: break-all;
		overflow-y: auto;
		overflow-x: hidden;
		width: 100%;
		height: 100%;
		line-height: 1.1;
		max-height: 31px;
	}

	.copy-button {
		background: #333;
		color: #e5e5e5;
		border: 1px solid #333;
		border-left: none;
		border-radius: 0 4px 4px 0;
		padding: 2px 4px;
		cursor: pointer;
		font-size: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		height: 31px;
		width: 22px;
		flex-shrink: 0;
	}

	.copy-button:hover {
		background: #444;
		transform: translateY(-1px);
	}

	.copy-button:active {
		transform: translateY(0);
	}

	.hotlink-section {
		display: flex;
		flex-direction: column;
		gap: 4px; 
		align-items: center;
		margin-top: 0;
	}

	.hotlink-toggle {
		background: none;
		border: none;
		color: var(--text-primary);
		cursor: pointer;
		font-size: 14px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0;
		text-align: center;
		transition: color 0.2s ease;
	}

	.hotlink-toggle:hover {
		color: var(--accent-color);
	}

	.question-mark.bold {
		font-weight: bold;
	}

	.hotlink-explanation {
		background: none;
		border: none;
		border-radius: 0;
		padding: 8px 0;
		margin-top: 4px;
		text-align: center;
	}

	.hotlink-explanation p {
		margin: 0;
		font-size: 13px;
		line-height: 1.5;
		color: var(--text-primary);
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.my-button-widget {
			padding: 3px 8px;
		}

		.button-content {
			flex-direction: row;
			gap: 8px;
			padding: 0 16px;
		}

		.button-image {
			align-self: flex-start;
			height: 31px;
			display: flex;
			align-items: center;
		}

		.code-section {
			height: 31px;
			flex-direction: row;
			gap: 0;
			width: 100%;
		}

		.code-block {
			height: 31px;
			flex: 1;
		}

		.code-block pre {
			font-size: 12px;
			white-space: pre-wrap;
			word-break: break-all;
			height: 100%;
			max-height: 31px;
		}

		.copy-button {
			font-size: 7px;
			padding: 2px 4px;
			height: 31px;
			width: 20px;
			flex-shrink: 0;
		}

		.hotlink-toggle {
			font-size: 13px;
		}

		.hotlink-explanation p {
			font-size: 12px;
		}
	}

	@media (max-width: 480px) {
		.my-button-widget {
			gap: 12px;
		}

		.button-content {
			gap: 10px;
		}

		.code-block {
			padding: 8px 10px;
		}

		.code-block pre {
			font-size: 11px;
			word-break: break-all;
		}

		.copy-button {
			font-size: 6px;
			padding: 2px 3px;
			height: 31px;
			width: 18px;
		}

		.hotlink-explanation {
			padding: 10px;
		}
	}
</style>
