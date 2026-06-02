<script lang="ts">
	import type { AdminLoginFailedMode, NtfyEventAppearance } from '$lib/admin/types/ntfy';
	import NtfyAppearanceFields from '$lib/admin/components/notifications/NtfyAppearanceFields.svelte';
	import { X } from 'lucide-svelte';

	interface Props {
		open: boolean;
		title: string;
		appearance: NtfyEventAppearance;
		placeholders?: string[];
		showFailedLoginMode?: boolean;
		failedMode?: AdminLoginFailedMode;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		title,
		appearance = $bindable(),
		placeholders = [],
		showFailedLoginMode = false,
		failedMode = $bindable(undefined),
		onclose
	}: Props = $props();

	function close() {
		open = false;
		onclose?.();
	}

	function handleOverlayKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && close()} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={close} role="presentation">
		<div
			class="modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="notification-edit-title"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={handleOverlayKeydown}
		>
			<div class="modal-header">
				<h2 id="notification-edit-title">{title}</h2>
				<button type="button" class="modal-close" onclick={close} aria-label="Close">
					<X size={20} />
				</button>
			</div>

			<div class="modal-content">
				{#if showFailedLoginMode && failedMode !== undefined}
					<div class="failed-mode-field">
						<label for="failed-login-mode">Failed login alerts</label>
						<select id="failed-login-mode" class="form-select" bind:value={failedMode}>
							<option value="lockout">Only when IP is locked out</option>
							<option value="each">Every failed attempt</option>
							<option value="off">Off</option>
						</select>
						<p class="field-help">
							Controls when failed-login notifications fire. Lockout alerts still use the separate
							lockout card when an IP is blocked.
						</p>
					</div>
				{/if}

				<NtfyAppearanceFields bind:appearance {placeholders} showEnableToggle={false} />
			</div>

			<div class="modal-actions">
				<button type="button" class="done-button" onclick={close}>Done</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.72);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2050;
		padding: 16px;
	}

	.modal {
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 10px;
		width: 100%;
		max-width: 640px;
		max-height: min(90vh, 900px);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 18px 20px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 17px;
		font-weight: 600;
		color: var(--text-primary, #fff);
	}

	.modal-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
	}

	.modal-close:hover {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #fff);
	}

	.modal-content {
		padding: 20px;
		overflow-y: auto;
		flex: 1;
		min-height: 0;
	}

	.failed-mode-field {
		margin-bottom: 20px;
		padding-bottom: 20px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.failed-mode-field label {
		display: block;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary, #fff);
		margin-bottom: 8px;
	}

	.form-select {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		font-size: 14px;
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #fff);
		box-sizing: border-box;
	}

	.field-help {
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
		margin: 8px 0 0;
		line-height: 1.4;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		padding: 14px 20px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.done-button {
		padding: 9px 18px;
		border: none;
		border-radius: 6px;
		background: var(--accent-bg, #6366f1);
		color: var(--accent-fg, #fff);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}

	.done-button:hover {
		filter: brightness(1.06);
	}
</style>
