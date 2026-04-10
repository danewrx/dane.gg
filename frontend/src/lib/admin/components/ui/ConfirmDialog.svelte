<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { X } from 'lucide-svelte';

	interface Props {
		open?: boolean;
		title: string;
		message?: string;
		detail?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'danger' | 'default';
		loading?: boolean;
		overlayZIndex?: number;
		showCloseButton?: boolean;
		body?: Snippet;
		onConfirm?: () => void | Promise<void>;
		onCancel?: () => void;
	}

	let {
		open = $bindable(false),
		title,
		message = '',
		detail,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		variant = 'default',
		loading = false,
		overlayZIndex,
		showCloseButton = true,
		body,
		onConfirm,
		onCancel
	}: Props = $props();

	let confirmButtonEl: HTMLButtonElement | null = $state(null);

	function handleCancel() {
		open = false;
		onCancel?.();
	}

	async function handleConfirm() {
		await onConfirm?.();
	}

	$effect(() => {
		if (!open || !browser) return;
		requestAnimationFrame(() => confirmButtonEl?.focus());
	});

	$effect(() => {
		if (!open || !browser) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				e.preventDefault();
				handleCancel();
			}
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="confirm-overlay"
		style={overlayZIndex != null ? `z-index: ${overlayZIndex}` : undefined}
		onclick={(e) => {
			if (e.target === e.currentTarget) handleCancel();
		}}
		role="presentation"
	>
		<div
			class="confirm-dialog"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="confirm-dialog-title"
			tabindex="-1"
		>
			<div class="confirm-header">
				<h2 id="confirm-dialog-title">{title}</h2>
				{#if showCloseButton}
					<button type="button" class="icon-close" onclick={handleCancel} aria-label="Close">
						<X size={20} />
					</button>
				{/if}
			</div>
			<div class="confirm-body">
				{#if body}
					{@render body()}
				{:else}
					{#if message}
						<p class="confirm-message">{message}</p>
					{/if}
					{#if detail}
						<p class="confirm-detail">{detail}</p>
					{/if}
				{/if}
			</div>
			<div class="confirm-actions">
				<button type="button" class="btn-cancel" onclick={handleCancel} disabled={loading}>
					{cancelLabel}
				</button>
				<button
					type="button"
					class="btn-confirm"
					class:danger={variant === 'danger'}
					class:default-variant={variant === 'default'}
					onclick={handleConfirm}
					disabled={loading}
					bind:this={confirmButtonEl}
				>
					{loading ? 'Please wait…' : confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.confirm-overlay {
		position: fixed;
		inset: 0;
		z-index: 1100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		background: rgba(0, 0, 0, 0.7);
	}

	:global(html:not(.dark)) .confirm-overlay {
		background: rgba(15, 23, 42, 0.45);
	}

	.confirm-dialog {
		width: 100%;
		max-width: 420px;
		max-height: min(90vh, 640px);
		overflow: auto;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 12px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.35);
	}

	:global(html:not(.dark)) .confirm-dialog {
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.12);
	}

	.confirm-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.confirm-header h2 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		line-height: 1.3;
	}

	:global(html:not(.dark)) .confirm-header h2 {
		color: #1f2937;
	}

	.icon-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;
		flex-shrink: 0;
	}

	.icon-close:hover {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.confirm-body {
		padding: 24px;
	}

	.confirm-message {
		margin: 0 0 12px 0;
		font-size: 14px;
		line-height: 1.5;
		color: var(--text-primary, #ffffff);
	}

	.confirm-message:last-child {
		margin-bottom: 0;
	}

	:global(html:not(.dark)) .confirm-message {
		color: #374151;
	}

	.confirm-detail {
		margin: 0;
		font-size: 13px;
		line-height: 1.5;
		color: #ef4444;
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 20px 24px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.btn-cancel,
	.btn-confirm {
		padding: 10px 20px;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition:
			background 0.15s ease,
			opacity 0.15s ease;
	}

	.btn-cancel {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.btn-cancel:hover:not(:disabled) {
		background: var(--bg-primary, #1a1a1a);
	}

	:global(html:not(.dark)) .btn-cancel {
		background: #e5e7eb;
		color: #1f2937;
	}

	:global(html:not(.dark)) .btn-cancel:hover:not(:disabled) {
		background: #d1d5db;
	}

	.btn-confirm.default-variant {
		background: var(--accent-color, #6366f1);
		color: #ffffff;
	}

	.btn-confirm.default-variant:hover:not(:disabled) {
		background: var(--accent-color-dark, #4f46e5);
	}

	.btn-confirm.danger {
		background: #ef4444;
		color: #ffffff;
	}

	.btn-confirm.danger:hover:not(:disabled) {
		background: #dc2626;
	}

	.btn-cancel:disabled,
	.btn-confirm:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
</style>
