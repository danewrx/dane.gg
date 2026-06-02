<script lang="ts">
	import { X } from 'lucide-svelte';

	interface Props {
		tags: string[];
		placeholder?: string;
		maxTags?: number;
	}

	let { tags = $bindable([]), placeholder = 'Type a tag and press Enter', maxTags = 8 }: Props =
		$props();

	let draft = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);
	let inputPlaceholder = $derived(tags.length === 0 ? placeholder : '');

	function normalizeTag(raw: string): string {
		return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
	}

	function addTag(raw: string) {
		const tag = normalizeTag(raw);
		if (!tag || tags.includes(tag) || tags.length >= maxTags) return;
		tags = [...tags, tag];
	}

	function commitDraft() {
		if (!draft.trim()) return;
		addTag(draft);
		draft = '';
	}

	function onInput(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		if (!value.includes(',')) {
			draft = value;
			return;
		}

		const parts = value.split(',');
		for (const part of parts.slice(0, -1)) {
			addTag(part);
		}
		draft = parts[parts.length - 1] ?? '';
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			commitDraft();
			return;
		}

		if (event.key === 'Backspace' && !draft && tags.length > 0) {
			tags = tags.slice(0, -1);
		}
	}

	function removeTag(tag: string) {
		tags = tags.filter((t) => t !== tag);
		inputEl?.focus();
	}

	function focusInput() {
		inputEl?.focus();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="tags-input" onclick={focusInput}>
	{#each tags as tag (tag)}
		<span class="tag-pill">
			{tag}
			<button
				type="button"
				class="tag-remove"
				aria-label="Remove {tag}"
				onclick={(e) => {
					e.stopPropagation();
					removeTag(tag);
				}}
			>
				<X size={12} />
			</button>
		</span>
	{/each}

	<input
		bind:this={inputEl}
		class="tags-field"
		type="text"
		value={draft}
		placeholder={inputPlaceholder}
		disabled={tags.length >= maxTags}
		oninput={onInput}
		onkeydown={onKeydown}
		onblur={commitDraft}
	/>
</div>

<style>
	.tags-input {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		min-height: 42px;
		margin-top: 6px;
		padding: 6px 8px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: var(--bg-tertiary, #3a3a3a);
		cursor: text;
		box-sizing: border-box;
	}

	.tags-input:focus-within {
		border-color: var(--accent-color, #6366f1);
	}

	.tag-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		max-width: 100%;
		padding: 4px 6px 4px 10px;
		border-radius: 999px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary, #fff);
		line-height: 1.2;
	}

	.tag-remove {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		padding: 0;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		flex-shrink: 0;
	}

	.tag-remove:hover {
		background: rgba(255, 255, 255, 0.08);
		color: var(--text-primary, #fff);
	}

	.tags-field {
		flex: 1 1 120px;
		min-width: 80px;
		border: none;
		outline: none;
		background: transparent;
		font-size: 14px;
		color: var(--text-primary, #fff);
		font-family: inherit;
		padding: 4px 2px;
	}

	.tags-field:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.tags-field::placeholder {
		color: var(--text-secondary, #a1a1aa);
	}
</style>
