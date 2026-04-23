<script lang="ts">
	import { logger } from '$lib/logger';

	import { onMount } from 'svelte';
	import { Settings2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import FontManageDialog from './FontManageDialog.svelte';

	export interface Font {
		id: string;
		name: string;
		type: 'google' | 'custom';
		googleFontFamily: string | null;
		filePath: string | null;
		displayOrder: number;
	}

	interface Props {
		/** Current font family name */
		value: string;
		/** Called when selection changes */
		onChange?: (fontFamily: string) => void;
		/** Label above the select */
		label?: string;
		/** Select element id for label */
		id?: string;
		/** Disable the control */
		disabled?: boolean;
		/** Allow uploading custom fonts */
		allowUpload?: boolean;
		/** Optional class on the wrapper */
		class?: string;
	}

	let {
		value = '',
		onChange,
		label = 'Font',
		id = 'font-picker',
		disabled = false,
		allowUpload = true,
		class: className = ''
	}: Props = $props();

	let fonts = $state<Font[]>([]);
	let loading = $state(true);
	let manageOpen = $state(false);

	onMount(() => {
		loadFonts();
	});

	async function loadFonts() {
		try {
			loading = true;
			const res = await fetch('/api/fonts', { credentials: 'include' });
			if (!res.ok) throw new Error('Failed to load fonts');
			const data = await res.json();
			fonts = data.data || [];
		} catch (e) {
			logger.error(e);
			toast.error('Failed to load fonts');
			fonts = [];
		} finally {
			loading = false;
		}
	}

	function handleSelectChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		onChange?.(target?.value ?? '');
	}

	const googleFonts = $derived(fonts.filter((f) => f.type === 'google'));
	const customFonts = $derived(fonts.filter((f) => f.type === 'custom'));
</script>

<div class="font-picker" class:className>
	{#if label}
		<label class="font-picker-label" for={id}>{label}</label>
	{/if}
	<select {id} class="font-picker-select" {disabled} {value} onchange={handleSelectChange}>
		{#if loading}
			<option value="">Loading fonts…</option>
		{/if}
		{#if !loading && googleFonts.length > 0}
			<optgroup label="Google Fonts">
				{#each googleFonts as f}
					<option value={f.name}>{f.name}</option>
				{/each}
			</optgroup>
		{/if}
		{#if !loading && customFonts.length > 0}
			<optgroup label="Custom fonts">
				{#each customFonts as f}
					<option value={f.name}>{f.name}</option>
				{/each}
			</optgroup>
		{/if}
		{#if !loading && fonts.length === 0 && !allowUpload}
			<option value="">No fonts available</option>
		{/if}
	</select>
	{#if allowUpload}
		<button type="button" class="font-picker-manage" {disabled} onclick={() => (manageOpen = true)}>
			<Settings2 size={14} />
			<span>Manage fonts</span>
		</button>
		<FontManageDialog bind:open={manageOpen} onFontsChange={loadFonts} />
	{/if}
</div>

<style>
	.font-picker {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
	}

	.font-picker-label {
		display: block;
		margin-bottom: 6px;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary, #a1a1aa);
	}

	.font-picker-select {
		width: 100%;
		padding: 10px 12px;
		padding-right: 36px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		font-family: inherit;
		font-size: 14px;
		color: var(--text-primary, #ffffff);
		cursor: pointer;
		min-height: 40px;
		box-sizing: border-box;
		appearance: none;
		-moz-appearance: none;
		-webkit-appearance: none;
		background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23a1a1aa' d='M4 6l4 4 4-4z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 12px center;
		background-size: 14px;
	}

	.font-picker-select:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.font-picker-select:hover:not(:disabled) {
		border-color: var(--accent-color, #6366f1);
	}

	.font-picker-manage {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		cursor: pointer;
		transition:
			color 0.2s,
			border-color 0.2s;
	}

	.font-picker-manage:hover:not(:disabled) {
		color: var(--accent-color, #6366f1);
		border-color: var(--accent-color, #6366f1);
	}

	.font-picker-manage:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
