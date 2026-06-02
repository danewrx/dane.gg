<script lang="ts">
	import type { NtfyEventAppearance } from '$lib/admin/types/ntfy';
	import Toggle from '$lib/admin/components/ui/Toggle.svelte';
	import TemplateTextarea from '$lib/admin/components/notifications/TemplateTextarea.svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		appearance: NtfyEventAppearance;
		heading?: string;
		placeholders?: string[];
	}

	let { appearance = $bindable(), heading = '', placeholders = [] }: Props = $props();

	let tagsInput = $state('');

	$effect(() => {
		tagsInput = appearance.tags.join(', ');
	});

	function onTagsInput(value: string) {
		tagsInput = value;
		appearance.tags = value
			.split(/[,\s]+/)
			.map((t) => t.trim().toLowerCase())
			.filter(Boolean);
	}

	async function copyPlaceholder(key: string) {
		const token = `{${key}}`;
		try {
			await navigator.clipboard.writeText(token);
			toast.message(`Copied ${token}`);
		} catch {
			toast.error('Could not copy to clipboard');
		}
	}
</script>

{#if heading}
	<h4 class="appearance-heading">{heading}</h4>
{/if}

<div class="appearance-fields">
	<label>
		Message body
		<TemplateTextarea bind:value={appearance.body} rows={4} />
	</label>

	{#if placeholders.length > 0}
		<div class="placeholder-panel">
			<p class="placeholder-panel-label">Available placeholders</p>
			<div class="placeholder-codes">
				{#each placeholders as key (key)}
					<button type="button" class="placeholder-code" onclick={() => copyPlaceholder(key)}>
						<code>{'{'}{key}{'}'}</code>
					</button>
				{/each}
			</div>
			<p class="field-help">Click to copy syntax into your template. Placeholders also work in the title field.</p>
		</div>
	{/if}

	<div class="field-row">
		<label>
			Title
			<input class="form-input" bind:value={appearance.title} />
		</label>
		<label>
			Priority (1–5)
			<input class="form-input" type="number" min="1" max="5" bind:value={appearance.priority} />
		</label>
	</div>

	<label>
		Tags (comma-separated)
		<input
			class="form-input"
			value={tagsInput}
			oninput={(e) => onTagsInput((e.currentTarget as HTMLInputElement).value)}
			placeholder="warning, lock, skull"
		/>
	</label>
	<p class="field-help">
		Tags pick emoji/icons in the ntfy app — see
		<a href="https://docs.ntfy.sh/emojis/" target="_blank" rel="noopener noreferrer">ntfy emojis</a>.
	</p>

	<div class="field-row toggle-row">
		<Toggle bind:checked={appearance.markdown} />
		<span class="toggle-label">Markdown body</span>
	</div>

	<div class="field-row">
		<label>
			Icon URL
			<input
				class="form-input"
				type="url"
				bind:value={appearance.icon}
				placeholder="https://example.com/icon.png"
			/>
		</label>
		<label>
			Click URL
			<input
				class="form-input"
				type="url"
				bind:value={appearance.click}
				placeholder="https://admin.example.com/"
			/>
		</label>
	</div>
</div>

<style>
	.appearance-heading {
		margin: 0 0 12px;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary, #a1a1aa);
	}

	.appearance-fields {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.field-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 12px;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.toggle-label {
		font-size: 14px;
		color: var(--text-primary, #fff);
	}

	label {
		display: block;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary, #fff);
	}

	.form-input {
		display: block;
		width: 100%;
		margin-top: 6px;
		padding: 10px 12px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		font-size: 14px;
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #fff);
		box-sizing: border-box;
		font-family: inherit;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.placeholder-panel {
		margin-top: -4px;
		padding: 10px 12px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: var(--bg-secondary, #2d2d2d);
	}

	.placeholder-panel-label {
		margin: 0 0 8px;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary, #a1a1aa);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.placeholder-codes {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.placeholder-code {
		display: inline-block;
		font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 12px;
		line-height: 1.4;
		color: #c4b5fd;
		background: rgba(99, 102, 241, 0.15);
		border: 1px solid rgba(129, 140, 248, 0.3);
		border-radius: 4px;
		padding: 3px 8px;
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease;
		appearance: none;
	}

	.placeholder-code:hover {
		background: rgba(99, 102, 241, 0.25);
		border-color: rgba(129, 140, 248, 0.5);
	}

	.placeholder-code code {
		font-family: inherit;
		font-size: inherit;
		color: inherit;
		background: none;
		padding: 0;
	}

	.field-help {
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
		margin: 8px 0 0;
		line-height: 1.4;
	}

	.field-help a {
		color: var(--accent-color, #818cf8);
	}
</style>
