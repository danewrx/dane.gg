<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Loader2, X } from 'lucide-svelte';
	import FileUpload, { type UploadedFile } from '$lib/admin/components/ui/FileUpload.svelte';

	const KEYS = { background: 'og_background_image', logo: 'og_logo_image' } as const;
	type Field = keyof typeof KEYS;
	const DEFAULT_IMAGES: Record<Field, string> = {
		background: '/api/blog/og-default/background',
		logo: '/api/blog/og-default/logo'
	};

	let values = $state<Record<Field, string>>({ background: '', logo: '' });
	let isLoading = $state(true);
	let saving = $state<Field | null>(null);
	let choosing = $state<Record<Field, boolean>>({ background: false, logo: false });

	async function load(field: Field) {
		const response = await fetch(`/api/config/${KEYS[field]}`, { credentials: 'include' });
		values[field] = response.ok ? ((await response.json()).data?.value ?? '') : '';
	}

	onMount(async () => {
		try {
			await Promise.all([load('background'), load('logo')]);
		} catch (error) {
			logger.error('Error loading social preview settings:', error);
			toast.error('Failed to load settings');
		} finally {
			isLoading = false;
		}
	});

	async function save(field: Field, value: string) {
		try {
			saving = field;
			const response = await fetch(`/api/config/${KEYS[field]}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ value, dataType: 'string' })
			});
			if (!response.ok) throw new Error('Request failed');
			values[field] = value;
			choosing[field] = false;
			toast.success(value ? 'Saved' : 'Reset to the built-in default');
		} catch (error) {
			logger.error('Error saving social preview setting:', error);
			toast.error('Failed to save');
		} finally {
			saving = null;
		}
	}

	function onUpload(field: Field, file: UploadedFile | UploadedFile[]) {
		const uploaded = Array.isArray(file) ? file[0] : file;
		if (uploaded) void save(field, uploaded.path);
	}
</script>

<svelte:head>
	<title>{adminPageTitle('Social preview')}</title>
</svelte:head>

<div class="social-preview">
	<p class="description">
		Blog posts without a cover image use this background and logo in their preview card (Twitter,
		Discord, etc.). Leave one unset to use the built-in art. Existing cards update straight away;
		the static card for other pages needs <code>bun run og:default</code> re-running.
	</p>

	{#if isLoading}
		<div class="loading"><Loader2 size={24} class="spin" /> Loading...</div>
	{:else}
		{#each [{ field: 'background', title: 'Default background', hint: 'Shown with a dark fade behind the title. 1200×630 works best.' }, { field: 'logo', title: 'Logo', hint: 'Drawn on the right, up to 420px square. A transparent PNG works best.' }] as { field, title, hint } (field)}
			{@const f = field as Field}
			<section class="group">
				<h3>{title}</h3>
				<p class="hint">{hint}</p>
				{#if values[f] || !choosing[f]}
					<div class="image-row">
						<img
							class="current"
							class:logo={f === 'logo'}
							src={values[f] || DEFAULT_IMAGES[f]}
							alt="Current {title}"
						/>
						<button
							type="button"
							class="remove-image-btn"
							title={values[f]
								? 'Remove (use the built-in default)'
								: 'Replace the built-in default'}
							disabled={saving === f}
							onclick={() => (values[f] ? save(f, '') : (choosing[f] = true))}
						>
							<X size={16} />
						</button>
					</div>
					{#if !values[f]}<p class="hint">This is the built-in default.</p>{/if}
				{:else}
					<FileUpload
						acceptedTypes={['image']}
						onUpload={(file) => onUpload(f, file)}
						showPreview={false}
						label="Upload image"
					/>
					<button type="button" class="cancel" onclick={() => (choosing[f] = false)}>
						Keep the built-in default
					</button>
				{/if}
			</section>
		{/each}
	{/if}
</div>

<style>
	.social-preview {
		width: 100%;
		max-width: 640px;
	}
	.description,
	.hint {
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
		line-height: 1.5;
		margin: 0 0 12px;
	}
	.group {
		margin-bottom: 32px;
	}
	.group h3 {
		margin: 0 0 4px;
		font-size: 16px;
	}
	.current {
		display: block;
		max-width: 100%;
		max-height: 220px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
	}
	.current.logo {
		background: #1a1240;
		padding: 8px;
	}
	.image-row {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		margin-bottom: 8px;
	}
	.remove-image-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		background: rgba(239, 68, 68, 0.9);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}
	.remove-image-btn:hover {
		background: rgba(239, 68, 68, 1);
	}
	.cancel {
		margin-top: 8px;
		background: none;
		border: none;
		color: var(--text-secondary, #a1a1aa);
		text-decoration: underline;
		cursor: pointer;
		padding: 0;
	}
	.loading {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--text-secondary, #a1a1aa);
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
