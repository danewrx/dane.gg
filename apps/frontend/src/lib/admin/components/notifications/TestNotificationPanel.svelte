<script lang="ts">
	import { Send } from 'lucide-svelte';

	interface Props {
		onSend: () => void;
		sendDisabled?: boolean;
		sending?: boolean;
	}

	let { onSend, sendDisabled = false, sending = false }: Props = $props();
</script>

<div class="test-panel">
	<div class="test-panel-icon" aria-hidden="true">
		<Send size={20} />
	</div>

	<div class="test-panel-content">
		<h3 class="test-panel-title">Send test notification</h3>
		<p class="test-panel-description">
			Fires a fixed push using the site favicon, <code>dane.gg</code> click link, and a sample
			<code>{'{time}'}</code> placeholder. Not configurable like event alerts below.
		</p>
		<ul class="test-preset-list">
			<li>Title: Test notification</li>
			<li>Tags: test, admin</li>
			<li>Priority: 3</li>
		</ul>
	</div>

	<div class="test-panel-action">
		<button
			type="button"
			class="send-button"
			disabled={sendDisabled || sending}
			onclick={() => onSend()}
		>
			<Send size={16} />
			<span>{sending ? 'Sending…' : 'Send test'}</span>
		</button>
		{#if sendDisabled}
			<p class="action-hint">Configure server connection above first.</p>
		{/if}
	</div>
</div>

<style>
	.test-panel {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 16px 20px;
		padding: 16px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		background: var(--bg-tertiary, #3a3a3a);
	}

	.test-panel-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		flex-shrink: 0;
		border-radius: 8px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		color: var(--accent-color, #818cf8);
	}

	.test-panel-content {
		flex: 1;
		min-width: min(100%, 280px);
	}

	.test-panel-title {
		margin: 0 0 8px;
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary, #fff);
		line-height: 1.3;
	}

	.test-panel-description {
		margin: 0 0 10px;
		font-size: 13px;
		line-height: 1.45;
		color: var(--text-secondary, #a1a1aa);
	}

	.test-panel-description code {
		font-size: 12px;
		background: var(--bg-secondary, #2d2d2d);
		padding: 2px 6px;
		border-radius: 4px;
	}

	.test-preset-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.test-preset-list li {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary, #a1a1aa);
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		padding: 4px 10px;
	}

	.test-panel-action {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 8px;
		flex-shrink: 0;
		min-width: 140px;
		margin-left: auto;
		align-self: center;
	}

	.send-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 18px;
		border: none;
		border-radius: 6px;
		background: var(--accent-bg, #6366f1);
		color: var(--accent-fg, #fff);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.15s ease;
	}

	.send-button:hover:not(:disabled) {
		opacity: 0.92;
	}

	.send-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.action-hint {
		margin: 0;
		font-size: 12px;
		line-height: 1.4;
		color: var(--text-secondary, #a1a1aa);
		text-align: center;
	}

	@media (max-width: 640px) {
		.test-panel-action {
			width: 100%;
			margin-left: 0;
			align-self: stretch;
		}
	}
</style>
