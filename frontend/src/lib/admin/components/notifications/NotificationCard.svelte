<script lang="ts">
	import type { NtfyEventAppearance } from '$lib/admin/types/ntfy';
	import Toggle from '$lib/admin/components/ui/Toggle.svelte';
	import { Pencil, Send } from 'lucide-svelte';

	interface Props {
		appearance?: NtfyEventAppearance;
		title: string;
		description: string;
		showEnableToggle?: boolean;
		onedit?: () => void;
		onsend?: () => void;
		sendDisabled?: boolean;
		sending?: boolean;
	}

	let {
		appearance = $bindable(undefined),
		title,
		description,
		showEnableToggle = true,
		onedit,
		onsend,
		sendDisabled = false,
		sending = false
	}: Props = $props();
</script>

<article
	class="notification-card"
	class:disabled={appearance && showEnableToggle && !appearance.enabled}
>
	<div class="card-body">
		<h3 class="card-title">{title}</h3>
		<p class="card-description">{description}</p>
	</div>

	<div class="card-footer">
		{#if appearance && showEnableToggle}
			<div class="enable-control">
				<Toggle bind:checked={appearance.enabled} />
				<span class="enable-label">{appearance.enabled ? 'Enabled' : 'Disabled'}</span>
			</div>
		{/if}

		<div class="card-actions">
			{#if onsend}
				<button
					type="button"
					class="send-button"
					disabled={sendDisabled || sending}
					onclick={() => onsend()}
				>
					<Send size={15} />
					<span>{sending ? 'Sending…' : 'Send test'}</span>
				</button>
			{/if}
			{#if onedit}
				<button type="button" class="edit-button" onclick={() => onedit()} aria-label="Edit {title}">
					<Pencil size={15} />
					<span>Edit</span>
				</button>
			{/if}
		</div>
	</div>
</article>

<style>
	.notification-card {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-height: 168px;
		background: var(--bg-tertiary, #3a3a3a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 16px;
		transition:
			border-color 0.15s ease,
			opacity 0.15s ease;
	}

	.notification-card:hover {
		border-color: rgba(129, 140, 248, 0.45);
	}

	.notification-card.disabled {
		opacity: 0.72;
	}

	.card-body {
		flex: 1;
		min-width: 0;
	}

	.card-title {
		margin: 0 0 8px;
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary, #fff);
		line-height: 1.3;
	}

	.card-description {
		margin: 0;
		font-size: 13px;
		line-height: 1.45;
		color: var(--text-secondary, #a1a1aa);
	}

	.card-footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 16px;
		padding-top: 12px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.card-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-left: auto;
	}

	.enable-control {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-right: auto;
	}

	.enable-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary, #a1a1aa);
		min-width: 52px;
	}

	.edit-button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: var(--bg-secondary, #2d2d2d);
		color: var(--text-primary, #fff);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}

	.send-button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px;
		border: none;
		border-radius: 6px;
		background: var(--accent-bg, #6366f1);
		color: var(--accent-fg, #fff);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: filter 0.15s ease;
	}

	.send-button:hover:not(:disabled) {
		filter: brightness(1.06);
	}

	.send-button:disabled,
	.edit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.edit-button:hover:not(:disabled) {
		border-color: var(--accent-color, #6366f1);
		background: rgba(99, 102, 241, 0.12);
	}
</style>
