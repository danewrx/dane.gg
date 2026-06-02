<script lang="ts">
	const PLACEHOLDER_PATTERN = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g;

	interface Props {
		value: string;
		rows?: number;
		class?: string;
	}

	let { value = $bindable(), rows = 4, class: className = '' }: Props = $props();

	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let highlightEl = $state<HTMLPreElement | null>(null);

	function escapeHtml(text: string): string {
		return text
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;');
	}

	function highlightTemplate(text: string): string {
		const escaped = escapeHtml(text);
		const highlighted = escaped.replace(
			PLACEHOLDER_PATTERN,
			(match) => `<code class="template-var">${match}</code>`
		);
		// Keep scroll height in sync when the last line has no trailing newline
		return highlighted.endsWith('\n') ? highlighted : `${highlighted}\n`;
	}

	function syncScroll() {
		if (!textareaEl || !highlightEl) return;
		highlightEl.scrollTop = textareaEl.scrollTop;
		highlightEl.scrollLeft = textareaEl.scrollLeft;
	}
</script>

<div class="template-editor {className}">
	<pre
		bind:this={highlightEl}
		class="template-highlight"
		aria-hidden="true"
	>{@html highlightTemplate(value)}</pre>
	<textarea
		bind:this={textareaEl}
		class="template-textarea"
		{rows}
		bind:value
		onscroll={syncScroll}
		spellcheck="false"
	></textarea>
</div>

<style>
	.template-editor {
		position: relative;
		margin-top: 6px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: var(--bg-tertiary, #3a3a3a);
		overflow: hidden;
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
</style>
