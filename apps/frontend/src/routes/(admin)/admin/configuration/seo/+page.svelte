<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Loader2 } from 'lucide-svelte';

	const PAGES = [
		{ path: '/', label: 'Home' },
		{ path: '/about', label: 'About' },
		{ path: '/contact', label: 'Contact' },
		{ path: '/projects', label: 'Projects' },
		{ path: '/blog', label: 'Blog' }
	];

	let pageSeo = $state<Record<string, { name: string; description: string }>>({});
	let isLoading = $state(true);
	let saving = $state(false);

	onMount(async () => {
		try {
			const response = await fetch('/api/config/page-seo');
			if (response.ok) pageSeo = (await response.json()).data ?? {};
		} catch (error) {
			logger.error('Error loading page SEO:', error);
			toast.error('Failed to load settings');
		} finally {
			isLoading = false;
		}
	});

	async function save() {
		try {
			saving = true;
			const response = await fetch('/api/config/page_seo', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ value: pageSeo, dataType: 'json' })
			});
			if (!response.ok) throw new Error('Request failed');
			toast.success('Saved');
		} catch (error) {
			logger.error('Error saving page SEO:', error);
			toast.error('Failed to save');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{adminPageTitle('SEO')}</title>
</svelte:head>

<div class="seo">
	<div class="settings-description">
		<p>
			The name and description of each page. They set the browser tab title, the meta description
			search engines show, and the text of the link preview card (see Social Preview). A page's name
			is also its card title. Clearing a box restores the built-in text, and changes show on the
			site after a reload. Blog posts and project categories use their own content instead.
		</p>
	</div>

	{#if isLoading}
		<div class="loading"><Loader2 size={24} class="spin" /> Loading...</div>
	{:else}
		{#each PAGES as page (page.path)}
			{#if pageSeo[page.path]}
				<section class="card">
					<h3 class="card-title">{page.label}</h3>
					{#if page.path !== '/'}
						<div class="form-group">
							<label class="field-label" for="name-{page.path}">Name</label>
							<input
								id="name-{page.path}"
								class="text-input"
								type="text"
								bind:value={pageSeo[page.path].name}
								maxlength="60"
							/>
						</div>
					{/if}
					<div class="form-group">
						<label class="field-label" for="description-{page.path}">Description</label>
						<textarea
							id="description-{page.path}"
							class="text-input"
							rows="2"
							bind:value={pageSeo[page.path].description}
							maxlength="300"
						></textarea>
					</div>
				</section>
			{/if}
		{/each}
		<div class="form-actions">
			<button type="button" class="save-button" onclick={save} disabled={saving}>
				{#if saving}<Loader2 size={16} class="spin" />{/if}
				{saving ? 'Saving...' : 'Save'}
			</button>
		</div>
	{/if}
</div>

<style>
	.seo {
		width: 100%;
		max-width: 720px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.settings-description {
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.settings-description p {
		color: var(--text-secondary, #a1a1aa);
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 20px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 10px;
	}

	.card-title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field-label {
		font-size: 13px;
		color: var(--text-secondary, #a1a1aa);
	}

	.text-input {
		width: 100%;
		box-sizing: border-box;
		background: var(--bg-tertiary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 12px 14px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-family: inherit;
	}

	.text-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
	}

	.save-button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: var(--accent-bg, var(--accent-color, #6366f1));
		color: var(--accent-fg);
		border: none;
		border-radius: 8px;
		padding: 12px 20px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}

	.save-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
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

	@media (max-width: 640px) {
		.card {
			padding: 16px;
		}

		.save-button {
			width: 100%;
			justify-content: center;
		}
	}
</style>
