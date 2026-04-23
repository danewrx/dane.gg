<script lang="ts">
	import { logger } from '$lib/logger';

	import { marked } from 'marked';
	import {
		Bold,
		Italic,
		Strikethrough,
		Underline,
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
		EyeOff,
		X
	} from 'lucide-svelte';
	import FileUpload, { type UploadedFile } from './ui/FileUpload.svelte';

	type ToolType =
		| 'heading1'
		| 'heading2'
		| 'heading3'
		| 'bold'
		| 'italic'
		| 'underline'
		| 'strikethrough'
		| 'code'
		| 'link'
		| 'image'
		| 'bulletList'
		| 'numberedList'
		| 'quote'
		| 'preview';

	interface Props {
		value: string;
		onchange?: (value: string) => void;
		placeholder?: string;
		minHeight?: string;
		enabledTools?: ToolType[];
		outputFormat?: 'markdown' | 'html';
	}

	// Default tools
	const DEFAULT_TOOLS: ToolType[] = [
		'heading1',
		'heading2',
		'heading3',
		'bold',
		'italic',
		'strikethrough',
		'code',
		'link',
		'image',
		'bulletList',
		'numberedList',
		'quote',
		'preview'
	];

	let {
		value = $bindable(''),
		onchange,
		placeholder = 'Write your markdown here...',
		minHeight = '400px',
		enabledTools = DEFAULT_TOOLS,
		outputFormat = 'markdown'
	}: Props = $props();

	// Check if tools are enabled
	const hasTool = (tool: ToolType) => enabledTools.includes(tool);
	const hasAnyTool = (tools: ToolType[]) => tools.some((tool) => enabledTools.includes(tool));

	let showPreview = $state(false);
	let showImageUploadModal = $state(false);
	let imageAltText = $state('');
	let imageInsertPosition = $state<{ start: number; end: number } | null>(null);

	$effect(() => {
		if (!hasTool('preview')) {
			showPreview = false;
		}
	});

	// Convert HTML back to markdown for editing when outputFormat is 'html'
	function convertHtmlToMarkdown(html: string): string {
		if (!html) return '';
		if (!/<[a-z][\s\S]*>/i.test(html)) {
			return html;
		}

		let markdown = html;

		markdown = markdown.replace(/<strong>(.+?)<\/strong>/gi, '**$1**');
		markdown = markdown.replace(/<b>(.+?)<\/b>/gi, '**$1**');
		markdown = markdown.replace(/<em>(.+?)<\/em>/gi, '*$1*');
		markdown = markdown.replace(/<i>(.+?)<\/i>/gi, '*$1*');
		markdown = markdown.replace(/<s>(.+?)<\/s>/gi, '~~$1~~');
		markdown = markdown.replace(/<strike>(.+?)<\/strike>/gi, '~~$1~~');

		return markdown;
	}

	// Maintain internal markdown state
	let internalMarkdown = $state('');
	let isInitialized = $state(false);

	// Convert HTML to markdown when loading
	$effect(() => {
		if (outputFormat === 'html' && value && !isInitialized) {
			internalMarkdown = convertHtmlToMarkdown(value);
			isInitialized = true;
		} else if (outputFormat !== 'html') {
			internalMarkdown = value;
			isInitialized = true;
		}
	});

	// Sync bound value changes to internal markdown
	$effect(() => {
		if (outputFormat === 'html' && isInitialized) {
			const markdownValue = convertHtmlToMarkdown(value);
			if (markdownValue !== internalMarkdown) {
				internalMarkdown = markdownValue;
			}
		} else if (outputFormat !== 'html') {
			internalMarkdown = value;
		}
	});

	let textarea: HTMLTextAreaElement;
	let activeFormats = $state({
		bold: false,
		italic: false,
		underline: false,
		strikethrough: false,
		code: false,
		h1: false,
		h2: false,
		h3: false,
		bulletList: false,
		numberedList: false,
		quote: false
	});

	const getEditorValue = () => (outputFormat === 'html' ? internalMarkdown : value);

	// Configure marked to not render images
	const markedRenderer = new marked.Renderer();
	markedRenderer.image = () => '';

	let previewHtml = $derived.by(() => {
		try {
			const markdownValue = getEditorValue();
			// Strip only image markdown syntax
			const cleanedMarkdown = markdownValue
				// Remove inline images
				.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
				// Remove reference-style images
				.replace(/!\[([^\]]*)\]\[[^\]]+\]/g, '');
			return marked(cleanedMarkdown, {
				renderer: markedRenderer,
				breaks: true,
				gfm: true
			});
		} catch (error) {
			logger.error('Markdown parsing error:', error);
			return '<p>Error parsing markdown</p>';
		}
	});

	// Convert markdown to HTML when outputFormat is 'html'
	function convertToHtml(markdown: string): string {
		try {
			if (/<[a-z][\s\S]*>/i.test(markdown)) {
				return markdown;
			}

			let html = markdown;

			html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
			html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

			html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
			html = html.replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>');

			html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');

			return html;
		} catch (error) {
			logger.error('Error converting to HTML:', error);
			return markdown;
		}
	}

	function handleValueChange(newValue: string) {
		if (outputFormat === 'html') {
			internalMarkdown = newValue;
			const htmlValue = convertToHtml(newValue);
			value = htmlValue;
			onchange?.(htmlValue);
		} else {
			value = newValue;
			internalMarkdown = newValue;
			onchange?.(newValue);
		}
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		handleValueChange(target.value);
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

		const editorValue = getEditorValue();

		if (hasSelection) {
			const selectedText = editorValue.substring(start, end);

			const lineStart = editorValue.lastIndexOf('\n', start - 1) + 1;

			const hasBoldItalic =
				selectedText.startsWith('***') && selectedText.endsWith('***') && selectedText.length > 6;

			if (hasBoldItalic) {
				activeFormats.bold = true;
				activeFormats.italic = true;
			} else {
				const hasBold =
					(selectedText.startsWith('**') &&
						selectedText.endsWith('**') &&
						selectedText.length > 4) ||
					(selectedText.startsWith('__') && selectedText.endsWith('__') && selectedText.length > 4);
				activeFormats.bold = hasBold;

				const hasItalic =
					(selectedText.startsWith('*') &&
						selectedText.endsWith('*') &&
						!selectedText.startsWith('**') &&
						selectedText.length > 2) ||
					(selectedText.startsWith('_') &&
						selectedText.endsWith('_') &&
						!selectedText.startsWith('__') &&
						selectedText.length > 2);
				activeFormats.italic = hasItalic;
			}

			const hasStrikethrough =
				selectedText.startsWith('~~') && selectedText.endsWith('~~') && selectedText.length > 4;
			activeFormats.strikethrough = hasStrikethrough;

			const hasUnderline =
				selectedText.startsWith('<u>') && selectedText.endsWith('</u>') && selectedText.length > 7;
			activeFormats.underline = hasUnderline;

			const hasCode =
				selectedText.startsWith('`') && selectedText.endsWith('`') && selectedText.length > 2;
			activeFormats.code = hasCode;

			const lineTextStart = start - lineStart;

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
			const editorValue = getEditorValue();
			const textBeforeCursor = editorValue.substring(0, cursorPos);
			const textAfterCursor = editorValue.substring(cursorPos);

			const lines = textBeforeCursor.split('\n');
			const currentLine = lines[lines.length - 1];

			const bulletMatch = currentLine.match(/^(\s*)([-*])\s+(.*)$/);
			if (bulletMatch) {
				const [, indent, bullet, content] = bulletMatch;

				if (!content.trim()) {
					e.preventDefault();
					const newTextBefore = textBeforeCursor.substring(
						0,
						textBeforeCursor.lastIndexOf('\n') + 1
					);
					handleValueChange(newTextBefore + textAfterCursor);

					setTimeout(() => {
						target.setSelectionRange(newTextBefore.length, newTextBefore.length);
					}, 0);
					return;
				}

				e.preventDefault();
				const newLine = `\n${indent}${bullet} `;
				handleValueChange(textBeforeCursor + newLine + textAfterCursor);

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
					const newTextBefore = textBeforeCursor.substring(
						0,
						textBeforeCursor.lastIndexOf('\n') + 1
					);
					handleValueChange(newTextBefore + textAfterCursor);

					setTimeout(() => {
						target.setSelectionRange(newTextBefore.length, newTextBefore.length);
					}, 0);
					return;
				}

				e.preventDefault();
				const nextNumber = parseInt(number) + 1;
				const newLine = `\n${indent}${nextNumber}. `;
				handleValueChange(textBeforeCursor + newLine + textAfterCursor);

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
		const editorValue = getEditorValue();
		const text = editorValue.substring(start, end);
		return { start, end, text };
	}

	function insertText(before: string, after: string = '') {
		const { start, end, text } = getSelection();
		const editorValue = getEditorValue();

		if (text.startsWith('***') && text.endsWith('***') && text.length > 6) {
			if (before === '**') {
				const content = text.substring(3, text.length - 3);
				const newValue =
					editorValue.substring(0, start) + '*' + content + '*' + editorValue.substring(end);
				handleValueChange(newValue);

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
				const newValue =
					editorValue.substring(0, start) + '**' + content + '**' + editorValue.substring(end);
				handleValueChange(newValue);

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

		if (
			(text.startsWith('**') && text.endsWith('**') && text.length > 4) ||
			(text.startsWith('__') && text.endsWith('__') && text.length > 4)
		) {
			if (before === '**') {
				const markerLength = text.startsWith('**') ? 2 : 2;
				const content = text.substring(markerLength, text.length - markerLength);
				const newValue = editorValue.substring(0, start) + content + editorValue.substring(end);
				handleValueChange(newValue);

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
				const newValue =
					editorValue.substring(0, start) + '***' + content + '***' + editorValue.substring(end);
				handleValueChange(newValue);

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
		if (
			(text.startsWith('*') && text.endsWith('*') && !text.startsWith('**') && text.length > 2) ||
			(text.startsWith('_') && text.endsWith('_') && !text.startsWith('__') && text.length > 2)
		) {
			if (before === '*') {
				const content = text.substring(1, text.length - 1);
				const newValue = editorValue.substring(0, start) + content + editorValue.substring(end);
				handleValueChange(newValue);

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
				const newValue =
					editorValue.substring(0, start) + '***' + content + '***' + editorValue.substring(end);
				handleValueChange(newValue);

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
				const newValue = editorValue.substring(0, start) + content + editorValue.substring(end);
				handleValueChange(newValue);

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
				const newValue = editorValue.substring(0, start) + content + editorValue.substring(end);
				handleValueChange(newValue);

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
		const currentValue = getEditorValue();
		const newValue = currentValue.substring(0, start) + newText + currentValue.substring(end);
		handleValueChange(newValue);

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
		const editorValue = getEditorValue();

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
			const newValue = editorValue.substring(0, start) + newText + editorValue.substring(end);
			handleValueChange(newValue);

			setTimeout(() => {
				textarea.focus();
				const newStart = start;
				const newEnd = start + newText.length;
				textarea.setSelectionRange(newStart, newEnd);
				updateActiveFormats();
			}, 0);
		} else {
			newText = prefix + text;
			const newValue = editorValue.substring(0, start) + newText + editorValue.substring(end);
			handleValueChange(newValue);

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
		const editorValue = getEditorValue();

		const headingRegex = /^(#{1,6})\s+/;
		const match = text.match(headingRegex);

		if (match && match[1].length === level) {
			const newText = text.replace(headingRegex, '');
			const newValue = editorValue.substring(0, start) + newText + editorValue.substring(end);
			handleValueChange(newValue);

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
			const newValue = editorValue.substring(0, start) + newText + editorValue.substring(end);
			handleValueChange(newValue);

			setTimeout(() => {
				textarea.focus();
				const newStart = start;
				const newEnd = start + newText.length;
				textarea.setSelectionRange(newStart, newEnd);
				updateActiveFormats();
			}, 0);
		} else {
			const newText = prefix + text;
			const newValue = editorValue.substring(0, start) + newText + editorValue.substring(end);
			handleValueChange(newValue);

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
		const editorValue = getEditorValue();
		const linkText = text || 'link text';
		const newText = `[${linkText}](url)`;
		const newValue = editorValue.substring(0, start) + newText + editorValue.substring(end);
		handleValueChange(newValue);

		setTimeout(() => {
			textarea.focus();
			const urlStart = start + linkText.length + 3;
			textarea.setSelectionRange(urlStart, urlStart + 3);
		}, 0);
	}

	function insertImage() {
		const { start, end, text } = getSelection();
		imageAltText = text || '';
		imageInsertPosition = { start, end };
		showImageUploadModal = true;
	}

	function formatImagePath(path: string, isExternal: boolean): string {
		if (isExternal || path.startsWith('http://') || path.startsWith('https://')) {
			return path;
		}
		// If starts with /uploads/, serve through the API
		if (path.startsWith('/uploads/')) {
			const filename = path.replace('/uploads/', '');
			return `/api/upload/file/${filename}`;
		}
		return path;
	}

	function handleImageUpload(file: UploadedFile | UploadedFile[]) {
		const uploadedFile = Array.isArray(file) ? file[0] : file;
		if (!uploadedFile || !imageInsertPosition) return;

		const { start, end } = imageInsertPosition;
		const editorValue = getEditorValue();
		const altText = imageAltText || uploadedFile.originalName || 'image';

		const imagePath = formatImagePath(uploadedFile.path, uploadedFile.isExternal || false);

		const newText = `![${altText}](${imagePath})`;
		const newValue = editorValue.substring(0, start) + newText + editorValue.substring(end);
		handleValueChange(newValue);

		showImageUploadModal = false;
		imageAltText = '';
		imageInsertPosition = null;

		setTimeout(() => {
			textarea.focus();
			const newStart = start + newText.length;
			textarea.setSelectionRange(newStart, newStart);
			updateActiveFormats();
		}, 0);
	}

	function closeImageUploadModal() {
		showImageUploadModal = false;
		imageAltText = '';
		imageInsertPosition = null;
	}

	function insertUnderline() {
		const { start, end, text } = getSelection();
		const editorValue = getEditorValue();

		if (text.startsWith('<u>') && text.endsWith('</u>')) {
			const content = text.substring(3, text.length - 4);
			const newValue = editorValue.substring(0, start) + content + editorValue.substring(end);
			handleValueChange(newValue);

			setTimeout(() => {
				textarea.focus();
				const newStart = start;
				const newEnd = start + content.length;
				textarea.setSelectionRange(newStart, newEnd);
				updateActiveFormats();
			}, 0);
		} else {
			const newText = `<u>${text}</u>`;
			const newValue = editorValue.substring(0, start) + newText + editorValue.substring(end);
			handleValueChange(newValue);

			setTimeout(() => {
				textarea.focus();
				const newStart = start;
				const newEnd = start + newText.length;
				textarea.setSelectionRange(newStart, newEnd);
				updateActiveFormats();
			}, 0);
		}
	}
</script>

<div class="markdown-editor">
	<!-- Toolbar -->
	<div class="editor-toolbar">
		{#if hasAnyTool(['heading1', 'heading2', 'heading3'])}
			<div class="toolbar-group">
				{#if hasTool('heading1')}
					<button
						type="button"
						onclick={() => insertHeading(1)}
						title="Heading 1"
						class="toolbar-btn"
						class:active={activeFormats.h1}
					>
						<Heading1 size={18} />
					</button>
				{/if}
				{#if hasTool('heading2')}
					<button
						type="button"
						onclick={() => insertHeading(2)}
						title="Heading 2"
						class="toolbar-btn"
						class:active={activeFormats.h2}
					>
						<Heading2 size={18} />
					</button>
				{/if}
				{#if hasTool('heading3')}
					<button
						type="button"
						onclick={() => insertHeading(3)}
						title="Heading 3"
						class="toolbar-btn"
						class:active={activeFormats.h3}
					>
						<Heading3 size={18} />
					</button>
				{/if}
			</div>

			<div class="toolbar-divider"></div>
		{/if}

		{#if hasAnyTool(['bold', 'italic', 'underline', 'strikethrough', 'code'])}
			<div class="toolbar-group">
				{#if hasTool('bold')}
					<button
						type="button"
						onclick={() => insertText('**', '**')}
						title="Bold"
						class="toolbar-btn"
						class:active={activeFormats.bold}
					>
						<Bold size={18} />
					</button>
				{/if}
				{#if hasTool('italic')}
					<button
						type="button"
						onclick={() => insertText('*', '*')}
						title="Italic"
						class="toolbar-btn"
						class:active={activeFormats.italic}
					>
						<Italic size={18} />
					</button>
				{/if}
				{#if hasTool('underline')}
					<button
						type="button"
						onclick={insertUnderline}
						title="Underline"
						class="toolbar-btn"
						class:active={activeFormats.underline}
					>
						<Underline size={18} />
					</button>
				{/if}
				{#if hasTool('strikethrough')}
					<button
						type="button"
						onclick={() => insertText('~~', '~~')}
						title="Strikethrough"
						class="toolbar-btn"
						class:active={activeFormats.strikethrough}
					>
						<Strikethrough size={18} />
					</button>
				{/if}
				{#if hasTool('code') && outputFormat === 'markdown'}
					<button
						type="button"
						onclick={() => insertText('`', '`')}
						title="Inline Code"
						class="toolbar-btn"
						class:active={activeFormats.code}
					>
						<Code size={18} />
					</button>
				{/if}
			</div>

			<div class="toolbar-divider"></div>
		{/if}

		{#if hasAnyTool(['link', 'image'])}
			<div class="toolbar-group">
				{#if hasTool('link')}
					<button type="button" onclick={insertLink} title="Link" class="toolbar-btn">
						<Link size={18} />
					</button>
				{/if}
				{#if hasTool('image')}
					<button type="button" onclick={insertImage} title="Image" class="toolbar-btn">
						<Image size={18} />
					</button>
				{/if}
			</div>

			<div class="toolbar-divider"></div>
		{/if}

		{#if hasAnyTool(['bulletList', 'numberedList', 'quote'])}
			<div class="toolbar-group">
				{#if hasTool('bulletList')}
					<button
						type="button"
						onclick={() => insertLine('- ')}
						title="Bullet List"
						class="toolbar-btn"
						class:active={activeFormats.bulletList}
					>
						<List size={18} />
					</button>
				{/if}
				{#if hasTool('numberedList')}
					<button
						type="button"
						onclick={() => insertLine('1. ')}
						title="Numbered List"
						class="toolbar-btn"
						class:active={activeFormats.numberedList}
					>
						<ListOrdered size={18} />
					</button>
				{/if}
				{#if hasTool('quote')}
					<button
						type="button"
						onclick={() => insertLine('> ')}
						title="Quote"
						class="toolbar-btn"
						class:active={activeFormats.quote}
					>
						<Quote size={18} />
					</button>
				{/if}
			</div>

			<div class="toolbar-divider"></div>
		{/if}

		<div class="toolbar-spacer"></div>

		{#if hasTool('preview')}
			<button
				type="button"
				onclick={togglePreview}
				title={showPreview ? 'Hide Preview' : 'Show Preview'}
				class="toolbar-btn preview-toggle"
			>
				{#if showPreview}
					<EyeOff size={18} />
				{:else}
					<Eye size={18} />
				{/if}
				<span>{showPreview ? 'Hide' : 'Show'} Preview</span>
			</button>
		{/if}
	</div>

	<!-- Editor Content -->
	<div class="editor-content" class:split={showPreview} style="min-height: {minHeight};">
		<div class="editor-pane" class:half={showPreview}>
			<textarea
				bind:this={textarea}
				class="editor-textarea"
				value={outputFormat === 'html' ? internalMarkdown : value}
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

<!-- Image Upload Modal -->
{#if showImageUploadModal}
	<div
		class="image-upload-modal-overlay"
		onclick={closeImageUploadModal}
		onkeydown={(e) => e.key === 'Escape' && closeImageUploadModal()}
		role="button"
		tabindex="0"
		aria-label="Close image upload modal"
	>
		<div
			class="image-upload-modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="image-upload-title"
			tabindex="0"
		>
			<div class="modal-header">
				<h3 id="image-upload-title">Upload Image</h3>
				<button
					type="button"
					class="modal-close-button"
					onclick={closeImageUploadModal}
					aria-label="Close"
				>
					<X size={20} />
				</button>
			</div>
			<div class="modal-content">
				<div class="form-group">
					<label for="image-alt-text">Alt Text (optional)</label>
					<input
						type="text"
						id="image-alt-text"
						class="form-input"
						bind:value={imageAltText}
						placeholder="Describe the image"
					/>
				</div>
				<FileUpload
					acceptedTypes={['image']}
					maxSize={10 * 1024 * 1024}
					multiple={false}
					label="Upload Image"
					showPreview={true}
					onUpload={handleImageUpload}
					allowExternalUrl={true}
				/>
			</div>
		</div>
	</div>
{/if}

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

	/* Image Upload Modal */
	.image-upload-modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}

	.image-upload-modal {
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 12px;
		padding: 24px;
		max-width: 600px;
		width: 90%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	.modal-header h3 {
		color: var(--text-primary, #ffffff);
		font-size: 20px;
		font-weight: 600;
		margin: 0;
	}

	.modal-close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.modal-close-button:hover {
		background: var(--bg-tertiary, #3a3a3a);
		border-color: var(--accent-color, #6366f1);
		color: var(--text-primary, #ffffff);
	}

	.modal-content {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.modal-content .form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.modal-content .form-group label {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-weight: 500;
	}

	.modal-content .form-input {
		padding: 10px 14px;
		background: var(--bg-tertiary, #3a3a3a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		transition: all 0.2s ease;
	}

	.modal-content .form-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
		background: var(--bg-secondary, #2d2d2d);
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
