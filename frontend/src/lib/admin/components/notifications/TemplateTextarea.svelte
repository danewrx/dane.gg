<script lang="ts">
	import { tick } from 'svelte';
	import { marked } from 'marked';
	import { Bold, Italic, Code, Link, List, Eye, EyeOff } from 'lucide-svelte';
	import { renderNotificationTemplate } from '$lib/admin/utils/notificationTemplate';

	const PLACEHOLDER_PATTERN = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g;

	interface Props {
		value: string;
		rows?: number;
		class?: string;
		markdown?: boolean;
		previewVars?: Record<string, string>;
	}

	let {
		value = $bindable(),
		rows = 4,
		class: className = '',
		markdown = false,
		previewVars = {}
	}: Props = $props();

	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let highlightEl = $state<HTMLPreElement | null>(null);
	let showPreview = $state(false);
	let previewHtml = $state('');

	$effect(() => {
		if (!markdown || !showPreview) {
			previewHtml = '';
			return;
		}

		const rendered = renderNotificationTemplate(value, previewVars);
		void marked.parse(rendered).then((html) => {
			previewHtml = typeof html === 'string' ? html : String(html);
		});
	});

	function escapeHtml(text: string): string {
		return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
	}

	function highlightTemplate(text: string): string {
		const escaped = escapeHtml(text);
		const highlighted = escaped.replace(
			PLACEHOLDER_PATTERN,
			(match) => `<code class="template-var">${match}</code>`
		);
		return highlighted.endsWith('\n') ? highlighted : `${highlighted}\n`;
	}

	function syncScroll() {
		if (!textareaEl || !highlightEl) return;
		highlightEl.scrollTop = textareaEl.scrollTop;
		highlightEl.scrollLeft = textareaEl.scrollLeft;
	}

	async function wrapSelection(prefix: string, suffix: string = prefix) {
		if (!textareaEl) return;

		const start = textareaEl.selectionStart;
		const end = textareaEl.selectionEnd;
		const selected = value.slice(start, end);
		value = value.slice(0, start) + prefix + selected + suffix + value.slice(end);

		await tick();
		textareaEl.focus();
		const cursorStart = start + prefix.length;
		const cursorEnd = cursorStart + selected.length;
		textareaEl.setSelectionRange(cursorStart, cursorEnd);
	}

	async function insertLinePrefix(prefix: string) {
		if (!textareaEl) return;

		const start = textareaEl.selectionStart;
		const lineStart = value.lastIndexOf('\n', start - 1) + 1;
		value = value.slice(0, lineStart) + prefix + value.slice(lineStart);

		await tick();
		textareaEl.focus();
		textareaEl.setSelectionRange(start + prefix.length, start + prefix.length);
	}

	async function insertLink() {
		if (!textareaEl) return;

		const start = textareaEl.selectionStart;
		const end = textareaEl.selectionEnd;
		const selected = value.slice(start, end);
		const label = selected || 'link text';
		const url = selected.startsWith('http') ? selected : 'https://example.com';
		const insertion = `[${label}](${url})`;
		value = value.slice(0, start) + insertion + value.slice(end);

		await tick();
		textareaEl.focus();
		textareaEl.setSelectionRange(start, start + insertion.length);
	}
</script>

<div class="template-field {className}">
	{#if markdown}
		<div class="template-toolbar">
			<button type="button" class="toolbar-btn" title="Bold" onclick={() => wrapSelection('**')}>
				<Bold size={15} />
			</button>
			<button type="button" class="toolbar-btn" title="Italic" onclick={() => wrapSelection('*')}>
				<Italic size={15} />
			</button>
			<button type="button" class="toolbar-btn" title="Inline code" onclick={() => wrapSelection('`')}>
				<Code size={15} />
			</button>
			<button type="button" class="toolbar-btn" title="Link" onclick={insertLink}>
				<Link size={15} />
			</button>
			<button type="button" class="toolbar-btn" title="Bullet list" onclick={() => insertLinePrefix('- ')}>
				<List size={15} />
			</button>
			<div class="toolbar-spacer"></div>
			<button
				type="button"
				class="toolbar-btn preview-btn"
				title={showPreview ? 'Hide preview' : 'Show preview'}
				onclick={() => (showPreview = !showPreview)}
			>
				{#if showPreview}
					<EyeOff size={15} />
					<span>Hide preview</span>
				{:else}
					<Eye size={15} />
					<span>Preview</span>
				{/if}
			</button>
		</div>
	{/if}

	<div class="template-editor">
		<pre bind:this={highlightEl} class="template-highlight" aria-hidden="true">
{@html highlightTemplate(value)}</pre>
		<textarea
			bind:this={textareaEl}
			class="template-textarea"
			{rows}
			bind:value
			onscroll={syncScroll}
			spellcheck="false"
		></textarea>
	</div>

	{#if markdown && showPreview}
		<div class="template-preview">
			<p class="preview-label">Preview (sample placeholder values)</p>
			<div class="preview-content">{@html previewHtml}</div>
		</div>
	{:else if !markdown}
		<p class="format-hint">Plain text. Enable <strong>Markdown</strong> above for bold, italic, lists, and links.</p>
	{/if}
</div>

<style>
	.template-field {
		margin-top: 6px;
	}

	.template-toolbar {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 8px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-bottom: none;
		border-radius: 6px 6px 0 0;
		background: var(--bg-secondary, #2d2d2d);
	}

	.toolbar-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-width: 30px;
		height: 30px;
		padding: 0 8px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
	}

	.toolbar-btn:hover {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #fff);
	}

	.preview-btn span {
		font-size: 12px;
		font-weight: 500;
	}

	.toolbar-spacer {
		flex: 1;
	}

	.template-editor {
		position: relative;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 0 0 6px 6px;
		background: var(--bg-tertiary, #3a3a3a);
		overflow: hidden;
	}

	.template-toolbar + .template-editor {
		border-radius: 0 0 6px 6px;
	}

	.template-field:not(:has(.template-toolbar)) .template-editor {
		border-radius: 6px;
	}

	.template-editor:focus-within {
		border-color: var(--accent-color, #6366f1);
	}

	.template-highlight,
	.template-textarea {
		display: block;
		width: 100%;
		margin: 0;
		padding: 10px 12px;
		border: none;
		border-radius: 0;
		font-size: 14px;
		line-height: 1.45;
		font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		box-sizing: border-box;
		white-space: pre-wrap;
		word-wrap: break-word;
		overflow-wrap: anywhere;
		tab-size: 2;
	}

	.template-highlight {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		color: var(--text-primary, #fff);
		background: transparent;
	}

	.template-textarea {
		position: relative;
		z-index: 1;
		min-height: 88px;
		resize: vertical;
		background: transparent;
		color: transparent;
		caret-color: var(--text-primary, #fff);
		outline: none;
	}

	.template-highlight :global(code.template-var) {
		font-family: inherit;
		font-size: inherit;
		line-height: inherit;
		color: #c4b5fd;
		background: rgba(99, 102, 241, 0.18);
		border: 1px solid rgba(129, 140, 248, 0.35);
		border-radius: 4px;
		padding: 0 3px;
		box-decoration-break: clone;
		-webkit-box-decoration-break: clone;
	}

	.format-hint {
		margin: 8px 0 0;
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
		line-height: 1.4;
	}

	.format-hint strong {
		color: var(--text-primary, #fff);
		font-weight: 600;
	}

	.template-preview {
		margin-top: 8px;
		padding: 10px 12px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: var(--bg-secondary, #2d2d2d);
	}

	.preview-label {
		margin: 0 0 8px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary, #a1a1aa);
	}

	.preview-content {
		font-size: 14px;
		line-height: 1.5;
		color: var(--text-primary, #fff);
	}

	.preview-content :global(p) {
		margin: 0 0 8px;
	}

	.preview-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.preview-content :global(ul),
	.preview-content :global(ol) {
		margin: 0 0 8px;
		padding-left: 1.25rem;
	}

	.preview-content :global(code) {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 0.9em;
		background: rgba(0, 0, 0, 0.25);
		padding: 1px 4px;
		border-radius: 3px;
	}

	.preview-content :global(a) {
		color: var(--accent-color, #818cf8);
	}
</style>
