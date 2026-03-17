<script lang="ts">
	import { X, Upload, Trash2, Loader2, Type } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	export interface Font {
		id: string;
		name: string;
		type: 'google' | 'custom';
		googleFontFamily: string | null;
		filePath: string | null;
		displayOrder: number;
	}

	interface Props {
		open?: boolean;
		onClose?: () => void;
		onFontsChange?: () => void;
	}

	let { open = $bindable(false), onClose, onFontsChange }: Props = $props();

	let customFonts = $state<Font[]>([]);
	let loading = $state(true);
	let uploading = $state(false);
	let deletingId = $state<string | null>(null);
	let fileInput: HTMLInputElement | undefined = $state(undefined);

	async function loadFonts() {
		try {
			loading = true;
			const res = await fetch('/api/fonts', { credentials: 'include' });
			if (!res.ok) throw new Error('Failed to load fonts');
			const data = await res.json();
			const all: Font[] = data.data || [];
			customFonts = all.filter((f) => f.type === 'custom');
		} catch (e) {
			console.error(e);
			toast.error('Failed to load fonts');
			customFonts = [];
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (open) loadFonts();
	});

	async function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
		if (!['.woff', '.woff2', '.ttf', '.otf'].includes(ext)) {
			toast.error('Allowed formats: .woff, .woff2, .ttf, .otf');
			return;
		}

		try {
			uploading = true;
			const form = new FormData();
			form.append('file', file);
			const name = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim() || 'Custom Font';
			form.append('name', name);

			const res = await fetch('/api/fonts/upload', {
				method: 'POST',
				credentials: 'include',
				body: form
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Upload failed');
			}

			await loadFonts();
			onFontsChange?.();
			toast.success('Font added');
		} catch (err: any) {
			toast.error(err.message || 'Failed to upload font');
		} finally {
			uploading = false;
		}
	}

	async function deleteFont(font: Font) {
		if (font.type !== 'custom') return;
		if (!confirm(`Remove "${font.name}"? This cannot be undone.`)) return;
		try {
			deletingId = font.id;
			const res = await fetch(`/api/fonts/${font.id}`, {
				method: 'DELETE',
				credentials: 'include'
			});
			if (!res.ok) throw new Error('Delete failed');
			await loadFonts();
			onFontsChange?.();
			toast.success('Font removed');
		} catch (err: any) {
			toast.error(err.message || 'Failed to remove font');
		} finally {
			deletingId = null;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target !== e.currentTarget) return;
		open = false;
		onClose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
			onClose?.();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="dialog-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="font-manage-title"
		tabindex="-1"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<div class="dialog-panel">
			<div class="dialog-header">
				<h2 id="font-manage-title" class="dialog-title">
					<Type size={20} />
					Manage fonts
				</h2>
				<button type="button" class="dialog-close" aria-label="Close" onclick={() => { open = false; onClose?.(); }}>
					<X size={18} />
				</button>
			</div>
			<div class="dialog-body">
				<p class="dialog-description">
					Custom fonts are available in the font dropdown when editing themes. Google Fonts are built-in and cannot be removed.
				</p>

				<!-- Add new font -->
				<div class="upload-zone">
					<input
						bind:this={fileInput}
						type="file"
						accept=".woff,.woff2,.ttf,.otf"
						class="sr-only"
						onchange={handleFileChange}
					/>
					<button
						type="button"
						class="upload-zone-btn"
						disabled={uploading}
						onclick={() => fileInput?.click()}
					>
						{#if uploading}
							<Loader2 size={20} class="spin" />
							<span>Uploading…</span>
						{:else}
							<Upload size={20} />
							<span>Add font</span>
							<span class="upload-hint">.woff, .woff2, .ttf, .otf (max 5MB)</span>
						{/if}
					</button>
				</div>

				<!-- List of custom fonts -->
				<div class="font-list-section">
					<h3 class="font-list-title">Uploaded fonts ({customFonts.length})</h3>
					{#if loading}
						<div class="font-list-loading">
							<Loader2 size={24} class="spin" />
							<span>Loading…</span>
						</div>
					{:else if customFonts.length === 0}
						<div class="font-list-empty">
							<Type size={32} />
							<p>No custom fonts yet.</p>
							<p class="font-list-empty-hint">Upload a font above to use it in your themes.</p>
						</div>
					{:else}
						<ul class="font-list">
							{#each customFonts as font (font.id)}
								<li class="font-list-item">
									<span class="font-list-name">{font.name}</span>
									<button
										type="button"
										class="font-list-delete"
										aria-label="Remove {font.name}"
										disabled={deletingId === font.id}
										onclick={() => deleteFont(font)}
									>
										{#if deletingId === font.id}
											<Loader2 size={14} class="spin" />
										{:else}
											<Trash2 size={14} />
										{/if}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.dialog-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		animation: fadeIn 0.15s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.dialog-panel {
		background: var(--bg-secondary, #2a2a2a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
		width: 100%;
		max-width: 440px;
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		animation: slideIn 0.2s ease-out;
	}

	@keyframes slideIn {
		from {
			transform: scale(0.96) translateY(-10px);
			opacity: 0;
		}
		to {
			transform: scale(1) translateY(0);
			opacity: 1;
		}
	}

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.dialog-title {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.dialog-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: border-color 0.2s, color 0.2s;
	}

	.dialog-close:hover {
		border-color: var(--accent-color, #6366f1);
		color: var(--text-primary, #ffffff);
	}

	.dialog-body {
		padding: 16px;
		overflow-y: auto;
		flex: 1;
		min-height: 0;
	}

	.dialog-description {
		margin: 0 0 16px 0;
		font-size: 13px;
		color: var(--text-secondary, #a1a1aa);
		line-height: 1.45;
	}

	.upload-zone {
		margin-bottom: 20px;
	}

	.upload-zone-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 20px;
		background: var(--bg-primary, #1a1a1a);
		border: 2px dashed var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
		cursor: pointer;
		transition: border-color 0.2s, color 0.2s, background 0.2s;
	}

	.upload-zone-btn:hover:not(:disabled) {
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-color, #6366f1);
		background: color-mix(in srgb, var(--bg-primary, #1a1a1a) 95%, var(--accent-color, #6366f1) 5%);
	}

	.upload-zone-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.upload-hint {
		font-size: 11px;
		color: var(--text-secondary, #a1a1aa);
		opacity: 0.85;
	}

	.font-list-section {
		border-top: 1px solid var(--border-color, #3a3a3a);
		padding-top: 16px;
	}

	.font-list-title {
		margin: 0 0 10px 0;
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-secondary, #a1a1aa);
	}

	.font-list-loading,
	.font-list-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 24px;
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
	}

	.font-list-empty :global(svg) {
		opacity: 0.5;
	}

	.font-list-empty-hint {
		font-size: 12px;
		opacity: 0.8;
		margin: 0;
	}

	.font-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.font-list-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px 12px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
	}

	.font-list-name {
		font-size: 14px;
		color: var(--text-primary, #ffffff);
		font-weight: 500;
	}

	.font-list-delete {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: border-color 0.2s, color 0.2s, background 0.2s;
	}

	.font-list-delete:hover:not(:disabled) {
		border-color: #ef4444;
		color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
	}

	.font-list-delete:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
