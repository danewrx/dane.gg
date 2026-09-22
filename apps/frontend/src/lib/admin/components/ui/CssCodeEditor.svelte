<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Compartment, EditorState } from '@codemirror/state';
	import { EditorView, placeholder as cmPlaceholder, keymap } from '@codemirror/view';
	import { basicSetup } from 'codemirror';
	import { css } from '@codemirror/lang-css';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { indentWithTab } from '@codemirror/commands';

	interface Props {
		value?: string;
		id?: string;
		ariaLabelledby?: string;
		placeholder?: string;
		disabled?: boolean;
		class?: string;
		minHeight?: string;
	}

	let {
		value = $bindable(''),
		id = '',
		ariaLabelledby = '',
		placeholder: placeholderText = '',
		disabled = false,
		class: className = '',
		minHeight = '280px'
	}: Props = $props();

	const editableComp = new Compartment();

	let hostEl: HTMLDivElement | null = $state(null);
	let view: EditorView | null = $state(null);
	let applyingExternal = false;

	onMount(() => {
		if (!browser || !hostEl) return;

		const extensions = [
			basicSetup,
			css(),
			oneDark,
			keymap.of([indentWithTab]),
			editableComp.of(EditorView.editable.of(!disabled)),
			EditorView.theme({
				'&': {
					minHeight,
					fontSize: '13px'
				},
				'.cm-scroller': {
					fontFamily: "'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace"
				},
				'.cm-gutters': {
					minHeight
				}
			}),
			EditorView.updateListener.of((update) => {
				if (!update.docChanged || applyingExternal) return;
				const next = update.state.doc.toString();
				if (next !== value) {
					value = next;
				}
			})
		];

		if (placeholderText) {
			extensions.push(cmPlaceholder(placeholderText));
		}

		const state = EditorState.create({
			doc: value ?? '',
			extensions
		});

		view = new EditorView({
			state,
			parent: hostEl
		});

		return () => {
			view?.destroy();
			view = null;
		};
	});

	$effect(() => {
		if (!view) return;
		const v = value ?? '';
		const cur = view.state.doc.toString();
		if (v === cur) return;
		applyingExternal = true;
		try {
			view.dispatch({
				changes: { from: 0, to: view.state.doc.length, insert: v }
			});
		} finally {
			applyingExternal = false;
		}
	});

	$effect(() => {
		if (!view) return;
		view.dispatch({
			effects: editableComp.reconfigure(EditorView.editable.of(!disabled))
		});
	});
</script>

<div
	bind:this={hostEl}
	class="css-code-editor {className}"
	data-css-code-editor
	{id}
	role="textbox"
	aria-multiline="true"
	aria-disabled={disabled}
	aria-labelledby={ariaLabelledby || undefined}
></div>

<style>
	.css-code-editor {
		width: 100%;
		border-radius: 6px;
		overflow: hidden;
		border: 1px solid var(--border-color, #3a3a3a);
		background: #282c34;
	}

	.css-code-editor :global(.cm-editor) {
		outline: none;
	}

	.css-code-editor :global(.cm-editor.cm-focused) {
		outline: 2px solid var(--accent-color, #6366f1);
		outline-offset: 0;
	}

	.css-code-editor :global(.cm-scroller) {
		max-height: min(480px, 50vh);
	}
</style>
