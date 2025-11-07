<script lang="ts">
	import { marked } from 'marked';
	import { 
		Bold, 
		Italic, 
		Strikethrough, 
		Code, 
		Link, 
		Image, 
		List, 
		ListOrdered, 
		Heading1, 
		Heading2, 
		Heading3,
		Quote,
		Eye,
		EyeOff
	} from 'lucide-svelte';

	interface Props {
		value: string;
		onchange?: (value: string) => void;
		placeholder?: string;
		minHeight?: string;
	}

	let { 
		value = $bindable(''),
		onchange,
		placeholder = 'Write your markdown here...',
		minHeight = '400px'
	}: Props = $props();

	let showPreview = $state(false);
	let textarea: HTMLTextAreaElement;
	let activeFormats = $state({
		bold: false,
		italic: false,
		strikethrough: false,
		code: false,
		h1: false,
		h2: false,
		h3: false,
		bulletList: false,
		numberedList: false,
		quote: false
	});
	
	let previewHtml = $derived.by(() => {
		try {
			return marked(value);
		} catch (error) {
			console.error('Markdown parsing error:', error);
			return '<p>Error parsing markdown</p>';
		}
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		value = target.value;
		onchange?.(value);
		updateActiveFormats();
	}

	function handleSelectionChange() {
		updateActiveFormats();
	}

	function updateActiveFormats() {
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const hasSelection = start !== end;
		
		if (hasSelection) {
			const selectedText = value.substring(start, end);
			
			const lineStart = value.lastIndexOf('\n', start - 1) + 1;
			const lineEnd = value.indexOf('\n', start);
			const fullLine = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
			
			const hasBoldItalic = selectedText.startsWith('***') && selectedText.endsWith('***') && selectedText.length > 6;
			
			if (hasBoldItalic) {
				activeFormats.bold = true;
				activeFormats.italic = true;
			} else {
				const hasBold = (selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length > 4) ||
				                (selectedText.startsWith('__') && selectedText.endsWith('__') && selectedText.length > 4);
				activeFormats.bold = hasBold;
				

				const hasItalic = (selectedText.startsWith('*') && selectedText.endsWith('*') && 
				                   !selectedText.startsWith('**') && selectedText.length > 2) ||
				                  (selectedText.startsWith('_') && selectedText.endsWith('_') && 
				                   !selectedText.startsWith('__') && selectedText.length > 2);
				activeFormats.italic = hasItalic;
			}
			
			const hasStrikethrough = selectedText.startsWith('~~') && selectedText.endsWith('~~') && selectedText.length > 4;
			activeFormats.strikethrough = hasStrikethrough;
			
			const hasCode = selectedText.startsWith('`') && selectedText.endsWith('`') && selectedText.length > 2;
			activeFormats.code = hasCode;
			

			const lineTextStart = start - lineStart;
			const lineTextEnd = end - lineStart;
			
			// Check if selection includes the beginning of the line
			const includesLineStart = lineTextStart === 0;
			
			if (includesLineStart) {
				activeFormats.h1 = selectedText.startsWith('# ');
				activeFormats.h2 = selectedText.startsWith('## ');
				activeFormats.h3 = selectedText.startsWith('### ');
				activeFormats.bulletList = /^(\s*)([-*])\s/.test(selectedText);
				activeFormats.numberedList = /^(\s*)\d+\.\s/.test(selectedText);
				activeFormats.quote = selectedText.startsWith('> ');
			} else {
				activeFormats.h1 = false;
				activeFormats.h2 = false;
				activeFormats.h3 = false;
				activeFormats.bulletList = false;
				activeFormats.numberedList = false;
				activeFormats.quote = false;
			}
		} else {
			activeFormats.bold = false;
			activeFormats.italic = false;
			activeFormats.strikethrough = false;
			activeFormats.code = false;
			activeFormats.h1 = false;
			activeFormats.h2 = false;
			activeFormats.h3 = false;
			activeFormats.bulletList = false;
			activeFormats.numberedList = false;
			activeFormats.quote = false;
		}
	}


	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			const target = e.target as HTMLTextAreaElement;
			const cursorPos = target.selectionStart;
			const textBeforeCursor = value.substring(0, cursorPos);
			const textAfterCursor = value.substring(cursorPos);
			
			const lines = textBeforeCursor.split('\n');
			const currentLine = lines[lines.length - 1];
			
			const bulletMatch = currentLine.match(/^(\s*)([-*])\s+(.*)$/);
			if (bulletMatch) {
				const [, indent, bullet, content] = bulletMatch;
				
				if (!content.trim()) {
					e.preventDefault();
					const newTextBefore = textBeforeCursor.substring(0, textBeforeCursor.lastIndexOf('\n') + 1);
					value = newTextBefore + textAfterCursor;
					onchange?.(value);
					
					setTimeout(() => {
						target.setSelectionRange(newTextBefore.length, newTextBefore.length);
					}, 0);
					return;
				}
				
				e.preventDefault();
				const newLine = `\n${indent}${bullet} `;
				value = textBeforeCursor + newLine + textAfterCursor;
				onchange?.(value);
				
				setTimeout(() => {
					const newPos = cursorPos + newLine.length;
					target.setSelectionRange(newPos, newPos);
				}, 0);
				return;
			}
			
			// Check for numbered list
			const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
			if (numberedMatch) {
				const [, indent, number, content] = numberedMatch;
				
				if (!content.trim()) {
					e.preventDefault();
					const newTextBefore = textBeforeCursor.substring(0, textBeforeCursor.lastIndexOf('\n') + 1);
					value = newTextBefore + textAfterCursor;
					onchange?.(value);
					
					setTimeout(() => {
						target.setSelectionRange(newTextBefore.length, newTextBefore.length);
					}, 0);
					return;
				}
				
				e.preventDefault();
				const nextNumber = parseInt(number) + 1;
				const newLine = `\n${indent}${nextNumber}. `;
				value = textBeforeCursor + newLine + textAfterCursor;
				onchange?.(value);
				
				setTimeout(() => {
					const newPos = cursorPos + newLine.length;
					target.setSelectionRange(newPos, newPos);
				}, 0);
				return;
			}
		}
	}

	function togglePreview() {
		showPreview = !showPreview;
	}

	function getSelection(): { start: number; end: number; text: string } {
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const text = value.substring(start, end);
		return { start, end, text };
	}

	function insertText(before: string, after: string = '') {
		const { start, end, text } = getSelection();
		
		if (text.startsWith('***') && text.endsWith('***') && text.length > 6) {
			if (before === '**') {
				const content = text.substring(3, text.length - 3);
				const newValue = value.substring(0, start) + '*' + content + '*' + value.substring(end);
				value = newValue;
				onchange?.(value);
				
				setTimeout(() => {
					textarea.focus();
					const newStart = start;
					const newEnd = start + content.length + 2;
					textarea.setSelectionRange(newStart, newEnd);
					updateActiveFormats();
				}, 0);
				return;
			} else if (before === '*') {
				const content = text.substring(3, text.length - 3);
				const newValue = value.substring(0, start) + '**' + content + '**' + value.substring(end);
				value = newValue;
				onchange?.(value);
				
				setTimeout(() => {
					textarea.focus();
					const newStart = start;
					const newEnd = start + content.length + 4;
					textarea.setSelectionRange(newStart, newEnd);
					updateActiveFormats();
				}, 0);
				return;
			}
		}
		
		if ((text.startsWith('**') && text.endsWith('**') && text.length > 4) ||
		    (text.startsWith('__') && text.endsWith('__') && text.length > 4)) {
			if (before === '**') {
				const markerLength = text.startsWith('**') ? 2 : 2;
				const content = text.substring(markerLength, text.length - markerLength);
				const newValue = value.substring(0, start) + content + value.substring(end);
				value = newValue;
				onchange?.(value);
				
				setTimeout(() => {
					textarea.focus();
					const newStart = start;
					const newEnd = start + content.length;
					textarea.setSelectionRange(newStart, newEnd);
					updateActiveFormats();
				}, 0);
				return;
			} else if (before === '*') {
				const content = text.substring(2, text.length - 2);
				const newValue = value.substring(0, start) + '***' + content + '***' + value.substring(end);
				value = newValue;
				onchange?.(value);
				
				setTimeout(() => {
					textarea.focus();
					const newStart = start;
					const newEnd = start + content.length + 6;
					textarea.setSelectionRange(newStart, newEnd);
					updateActiveFormats();
				}, 0);
				return;
			}
		}
		
		// Check for italic
		if ((text.startsWith('*') && text.endsWith('*') && !text.startsWith('**') && text.length > 2) ||
		    (text.startsWith('_') && text.endsWith('_') && !text.startsWith('__') && text.length > 2)) {
			if (before === '*') {
				const content = text.substring(1, text.length - 1);
				const newValue = value.substring(0, start) + content + value.substring(end);
				value = newValue;
				onchange?.(value);
				
				setTimeout(() => {
					textarea.focus();
					const newStart = start;
					const newEnd = start + content.length;
					textarea.setSelectionRange(newStart, newEnd);
					updateActiveFormats();
				}, 0);
				return;
			} else if (before === '**') {
				const content = text.substring(1, text.length - 1);
				const newValue = value.substring(0, start) + '***' + content + '***' + value.substring(end);
				value = newValue;
				onchange?.(value);
				
				setTimeout(() => {
					textarea.focus();
					const newStart = start;
					const newEnd = start + content.length + 6;
					textarea.setSelectionRange(newStart, newEnd);
					updateActiveFormats();
				}, 0);
				return;
			}
		}
		
		if (text.startsWith('~~') && text.endsWith('~~') && text.length > 4) {
			if (before === '~~') {
				const content = text.substring(2, text.length - 2);
				const newValue = value.substring(0, start) + content + value.substring(end);
				value = newValue;
				onchange?.(value);
				
				setTimeout(() => {
					textarea.focus();
					const newStart = start;
					const newEnd = start + content.length;
					textarea.setSelectionRange(newStart, newEnd);
					updateActiveFormats();
				}, 0);
				return;
			}
		}
		
		if (text.startsWith('`') && text.endsWith('`') && text.length > 2) {
			if (before === '`') {
				const content = text.substring(1, text.length - 1);
				const newValue = value.substring(0, start) + content + value.substring(end);
				value = newValue;
				onchange?.(value);
				
				setTimeout(() => {
					textarea.focus();
					const newStart = start;
					const newEnd = start + content.length;
					textarea.setSelectionRange(newStart, newEnd);
					updateActiveFormats();
				}, 0);
				return;
			}
		}
		
		const newText = before + text + after;
		const newValue = value.substring(0, start) + newText + value.substring(end);
		value = newValue;
		onchange?.(value);
		
		setTimeout(() => {
			textarea.focus();
			const newStart = start;
			const newEnd = start + newText.length;
			textarea.setSelectionRange(newStart, newEnd);
			updateActiveFormats();
		}, 0);
	}

	function insertLine(prefix: string) {
		const { start, end, text } = getSelection();
		
		const bulletRegex = /^(\s*)([-*])\s+/;
		const numberedRegex = /^(\s*)\d+\.\s+/;
		const quoteRegex = /^>\s+/;
		
		let hasPrefix = false;
		let newText = '';
		
		if (prefix.includes('-') || prefix.includes('*')) {
			hasPrefix = bulletRegex.test(text);
			if (hasPrefix) {
				newText = text.replace(bulletRegex, '$1');
			}
		} else if (prefix.match(/\d+\./)) {
			hasPrefix = numberedRegex.test(text);
			if (hasPrefix) {
				newText = text.replace(numberedRegex, '$1');
			}
		} else if (prefix.includes('>')) {
			hasPrefix = quoteRegex.test(text);
			if (hasPrefix) {
				newText = text.replace(quoteRegex, '');
			}
		}
		
		if (hasPrefix) {
			const newValue = value.substring(0, start) + newText + value.substring(end);
			value = newValue;
			onchange?.(value);
			
			setTimeout(() => {
				textarea.focus();
				const newStart = start;
				const newEnd = start + newText.length;
				textarea.setSelectionRange(newStart, newEnd);
				updateActiveFormats();
			}, 0);
		} else {
			newText = prefix + text;
			const newValue = value.substring(0, start) + newText + value.substring(end);
			value = newValue;
			onchange?.(value);
			
			setTimeout(() => {
				textarea.focus();
				const newStart = start;
				const newEnd = start + newText.length;
				textarea.setSelectionRange(newStart, newEnd);
				updateActiveFormats();
			}, 0);
		}
	}

	function insertHeading(level: number) {
		const prefix = '#'.repeat(level) + ' ';
		const { start, end, text } = getSelection();
		
		const headingRegex = /^(#{1,6})\s+/;
		const match = text.match(headingRegex);
		
		if (match && match[1].length === level) {
			const newText = text.replace(headingRegex, '');
			const newValue = value.substring(0, start) + newText + value.substring(end);
			value = newValue;
			onchange?.(value);
			
			setTimeout(() => {
				textarea.focus();
				const newStart = start;
				const newEnd = start + newText.length;
				textarea.setSelectionRange(newStart, newEnd);
				updateActiveFormats();
			}, 0);
		} else if (match) {
			const content = text.replace(headingRegex, '');
			const newText = prefix + content;
			const newValue = value.substring(0, start) + newText + value.substring(end);
			value = newValue;
			onchange?.(value);
			
			setTimeout(() => {
				textarea.focus();
				const newStart = start;
				const newEnd = start + newText.length;
				textarea.setSelectionRange(newStart, newEnd);
				updateActiveFormats();
			}, 0);
		} else {
			const newText = prefix + text;
			const newValue = value.substring(0, start) + newText + value.substring(end);
			value = newValue;
			onchange?.(value);
			
			setTimeout(() => {
				textarea.focus();
				const newStart = start;
				const newEnd = start + newText.length;
				textarea.setSelectionRange(newStart, newEnd);
				updateActiveFormats();
			}, 0);
		}
	}

	function insertLink() {
		const { start, end, text } = getSelection();
		const linkText = text || 'link text';
		const newText = `[${linkText}](url)`;
		const newValue = value.substring(0, start) + newText + value.substring(end);
		value = newValue;
		onchange?.(value);
		
		setTimeout(() => {
			textarea.focus();
			const urlStart = start + linkText.length + 3;
			textarea.setSelectionRange(urlStart, urlStart + 3);
		}, 0);
	}

	function insertImage() {
		const { start, end, text } = getSelection();
		const altText = text || 'image';
		const newText = `![${altText}](image-url)`;
		const newValue = value.substring(0, start) + newText + value.substring(end);
		value = newValue;
		onchange?.(value);
		
		setTimeout(() => {
			textarea.focus();
			const urlStart = start + altText.length + 4;
			textarea.setSelectionRange(urlStart, urlStart + 9);
		}, 0);
	}
</script>

<div class="markdown-editor">
	<!-- Toolbar -->
	<div class="editor-toolbar">
		<div class="toolbar-group">
			<button type="button" onclick={() => insertHeading(1)} title="Heading 1" class="toolbar-btn" class:active={activeFormats.h1}>
				<Heading1 size={18} />
			</button>
			<button type="button" onclick={() => insertHeading(2)} title="Heading 2" class="toolbar-btn" class:active={activeFormats.h2}>
				<Heading2 size={18} />
			</button>
			<button type="button" onclick={() => insertHeading(3)} title="Heading 3" class="toolbar-btn" class:active={activeFormats.h3}>
				<Heading3 size={18} />
			</button>
		</div>

		<div class="toolbar-divider"></div>

		<div class="toolbar-group">
			<button type="button" onclick={() => insertText('**', '**')} title="Bold" class="toolbar-btn" class:active={activeFormats.bold}>
				<Bold size={18} />
			</button>
			<button type="button" onclick={() => insertText('*', '*')} title="Italic" class="toolbar-btn" class:active={activeFormats.italic}>
				<Italic size={18} />
			</button>
			<button type="button" onclick={() => insertText('~~', '~~')} title="Strikethrough" class="toolbar-btn" class:active={activeFormats.strikethrough}>
				<Strikethrough size={18} />
			</button>
			<button type="button" onclick={() => insertText('`', '`')} title="Inline Code" class="toolbar-btn" class:active={activeFormats.code}>
				<Code size={18} />
			</button>
		</div>

		<div class="toolbar-divider"></div>

		<div class="toolbar-group">
			<button type="button" onclick={insertLink} title="Link" class="toolbar-btn">
				<Link size={18} />
			</button>
			<button type="button" onclick={insertImage} title="Image" class="toolbar-btn">
				<Image size={18} />
			</button>
		</div>

		<div class="toolbar-divider"></div>

		<div class="toolbar-group">
			<button type="button" onclick={() => insertLine('- ')} title="Bullet List" class="toolbar-btn" class:active={activeFormats.bulletList}>
				<List size={18} />
			</button>
			<button type="button" onclick={() => insertLine('1. ')} title="Numbered List" class="toolbar-btn" class:active={activeFormats.numberedList}>
				<ListOrdered size={18} />
			</button>
			<button type="button" onclick={() => insertLine('> ')} title="Quote" class="toolbar-btn" class:active={activeFormats.quote}>
				<Quote size={18} />
			</button>
		</div>

		<div class="toolbar-spacer"></div>

		<button type="button" onclick={togglePreview} title={showPreview ? 'Hide Preview' : 'Show Preview'} class="toolbar-btn preview-toggle">
			{#if showPreview}
				<EyeOff size={18} />
			{:else}
				<Eye size={18} />
			{/if}
			<span>{showPreview ? 'Hide' : 'Show'} Preview</span>
		</button>
	</div>

	<!-- Editor Content -->
	<div class="editor-content" class:split={showPreview} style="min-height: {minHeight};">
		<div class="editor-pane" class:half={showPreview}>
			<textarea
				bind:this={textarea}
				class="editor-textarea"
				value={value}
				oninput={handleInput}
				onkeydown={handleKeyDown}
				onkeyup={handleSelectionChange}
				onclick={handleSelectionChange}
				{placeholder}
				spellcheck="true"
			></textarea>
		</div>

		{#if showPreview}
			<div class="preview-pane">
				<div class="preview-content">
					{@html previewHtml}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.markdown-editor {
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		background: var(--bg-secondary, #2d2d2d);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	/* Toolbar */
	.editor-toolbar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		background: var(--bg-tertiary, #3a3a3a);
		flex-wrap: wrap;
	}

	.toolbar-group {
		display: flex;
		gap: 4px;
	}

	.toolbar-divider {
		width: 1px;
		height: 24px;
		background: var(--border-color, #3a3a3a);
	}

	.toolbar-spacer {
		flex: 1;
	}

	.toolbar-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 6px 8px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 4px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 14px;
	}

	.toolbar-btn:hover {
		background: var(--bg-secondary, #2d2d2d);
		color: var(--text-primary, #ffffff);
		border-color: var(--border-color, #3a3a3a);
	}

	.toolbar-btn:active {
		background: var(--bg-primary, #1a1a1a);
	}

	.toolbar-btn.active {
		background: var(--accent-color, #6366f1);
		color: var(--text-primary, #ffffff);
		border-color: var(--accent-color, #6366f1);
	}

	.toolbar-btn.active:hover {
		background: var(--accent-hover, #5558e3);
		border-color: var(--accent-hover, #5558e3);
	}

	.preview-toggle {
		padding: 6px 12px;
	}

	.preview-toggle span {
		font-weight: 500;
	}

	/* Editor Content */
	.editor-content {
		position: relative;
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.editor-content.split {
		display: flex;
	}

	.editor-pane {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.editor-pane.half {
		flex: 0 0 50%;
		border-right: 1px solid var(--border-color, #3a3a3a);
	}

	.editor-textarea {
		width: 100%;
		height: 100%;
		padding: 16px;
		background: var(--bg-secondary, #2d2d2d);
		color: var(--text-primary, #ffffff);
		border: none;
		outline: none;
		resize: none;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 14px;
		line-height: 1.6;
		overflow-y: auto;
	}

	.editor-textarea::placeholder {
		color: var(--text-muted, #6b7280);
	}

	.preview-pane {
		flex: 0 0 50%;
		overflow-y: auto;
		background: var(--bg-secondary, #2d2d2d);
	}

	.preview-content {
		padding: 16px;
		color: var(--text-primary, #ffffff);
	}

	/* Markdown preview styling */
	.preview-content :global(h1) {
		font-size: 2em;
		margin: 0.67em 0;
		font-weight: 600;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		padding-bottom: 0.3em;
	}

	.preview-content :global(h2) {
		font-size: 1.5em;
		margin: 0.75em 0;
		font-weight: 600;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		padding-bottom: 0.3em;
	}

	.preview-content :global(h3) {
		font-size: 1.17em;
		margin: 0.83em 0;
		font-weight: 600;
	}

	.preview-content :global(h4) {
		font-size: 1em;
		margin: 1em 0;
		font-weight: 600;
	}

	.preview-content :global(h5) {
		font-size: 0.83em;
		margin: 1.17em 0;
		font-weight: 600;
	}

	.preview-content :global(h6) {
		font-size: 0.67em;
		margin: 1.33em 0;
		font-weight: 600;
	}

	.preview-content :global(p) {
		margin: 1em 0;
		line-height: 1.6;
	}

	.preview-content :global(a) {
		color: var(--accent-color, #6366f1);
		text-decoration: underline;
	}

	.preview-content :global(a:hover) {
		color: var(--accent-hover, #4f46e5);
	}

	.preview-content :global(code) {
		background: var(--bg-tertiary, #3a3a3a);
		padding: 2px 6px;
		border-radius: 4px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.9em;
	}

	.preview-content :global(pre) {
		background: var(--bg-tertiary, #3a3a3a);
		padding: 12px;
		border-radius: 4px;
		overflow-x: auto;
		margin: 1em 0;
	}

	.preview-content :global(pre code) {
		background: none;
		padding: 0;
	}

	.preview-content :global(ul),
	.preview-content :global(ol) {
		margin: 1em 0;
		padding-left: 2em;
	}

	.preview-content :global(li) {
		margin: 0.5em 0;
	}

	.preview-content :global(blockquote) {
		border-left: 4px solid var(--accent-color, #6366f1);
		padding-left: 1em;
		margin: 1em 0;
		color: var(--text-secondary, #a1a1aa);
		font-style: italic;
	}

	.preview-content :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 4px;
		margin: 1em 0;
	}

	.preview-content :global(table) {
		border-collapse: collapse;
		width: 100%;
		margin: 1em 0;
	}

	.preview-content :global(th),
	.preview-content :global(td) {
		border: 1px solid var(--border-color, #3a3a3a);
		padding: 8px 12px;
		text-align: left;
	}

	.preview-content :global(th) {
		background: var(--bg-tertiary, #3a3a3a);
		font-weight: 600;
	}

	.preview-content :global(hr) {
		border: none;
		border-top: 1px solid var(--border-color, #3a3a3a);
		margin: 2em 0;
	}

	.preview-content :global(strong) {
		font-weight: 600;
	}

	.preview-content :global(em) {
		font-style: italic;
	}

	.preview-content :global(del) {
		text-decoration: line-through;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.editor-toolbar {
			padding: 6px 8px;
		}

		.toolbar-btn {
			padding: 4px 6px;
		}

		.preview-toggle span {
			display: none;
		}
	}
</style>

