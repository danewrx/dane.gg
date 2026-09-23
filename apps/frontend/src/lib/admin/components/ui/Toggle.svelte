<script lang="ts">
	interface Props {
		checked: boolean;
		onchange?: (checked: boolean) => void;
		label?: string;
		size?: 'small' | 'medium' | 'large';
		disabled?: boolean;
	}

	let {
		checked = $bindable(false),
		onchange,
		label,
		size = 'medium',
		disabled = false
	}: Props = $props();

	function handleChange() {
		if (disabled) return;
		onchange?.(checked);
	}

	function snapshotScrollChain(from: HTMLElement) {
		const chain: { el: HTMLElement; top: number; left: number }[] = [];
		let p: HTMLElement | null = from;
		while (p) {
			chain.push({ el: p, top: p.scrollTop, left: p.scrollLeft });
			p = p.parentElement;
		}
		return { chain, winX: window.scrollX, winY: window.scrollY };
	}

	function restoreScrollChain(snap: ReturnType<typeof snapshotScrollChain>) {
		for (const { el, top, left } of snap.chain) {
			el.scrollTop = top;
			el.scrollLeft = left;
		}
		window.scrollTo(snap.winX, snap.winY);
	}

	function preserveScrollOnInteraction(e: MouseEvent) {
		if (disabled || e.button !== 0) return;
		const snap = snapshotScrollChain(e.currentTarget as HTMLElement);
		requestAnimationFrame(() => {
			restoreScrollChain(snap);
			requestAnimationFrame(() => restoreScrollChain(snap));
		});
	}
</script>

<label class="toggle-wrapper {size}" class:disabled>
	<input type="checkbox" bind:checked onchange={handleChange} {disabled} class="toggle-input" />
	<span class="toggle-body" role="none" onmousedown={preserveScrollOnInteraction}>
		<span class="toggle-slider"></span>
		{#if label}
			<span class="toggle-label-text">{label}</span>
		{/if}
	</span>
</label>

<style>
	.toggle-wrapper {
		position: relative;
		display: inline-flex;
		cursor: pointer;
		user-select: none;
	}

	.toggle-body {
		display: inline-flex;
		align-items: center;
		gap: 12px;
	}

	.toggle-wrapper.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
		opacity: 0;
		pointer-events: none;
	}

	/* Medium size (default) */
	.toggle-slider {
		width: 44px;
		height: 24px;
		background: var(--border-color, #3a3a3a);
		border-radius: 12px;
		position: relative;
		transition: background 0.2s ease;
		flex-shrink: 0;
	}

	.toggle-slider::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 20px;
		height: 20px;
		background: white;
		border-radius: 50%;
		transition: transform 0.2s ease;
	}

	.toggle-input:checked + .toggle-body .toggle-slider {
		background: var(--accent-bg, var(--accent-color, #6366f1));
	}

	.toggle-input:checked + .toggle-body .toggle-slider::after {
		transform: translateX(20px);
	}

	/* Small size */
	.toggle-wrapper.small .toggle-slider {
		width: 36px;
		height: 20px;
		border-radius: 10px;
	}

	.toggle-wrapper.small .toggle-slider::after {
		width: 16px;
		height: 16px;
	}

	.toggle-wrapper.small .toggle-input:checked + .toggle-body .toggle-slider::after {
		transform: translateX(16px);
	}

	/* Large size */
	.toggle-wrapper.large .toggle-slider {
		width: 52px;
		height: 28px;
		border-radius: 14px;
	}

	.toggle-wrapper.large .toggle-slider::after {
		width: 24px;
		height: 24px;
	}

	.toggle-wrapper.large .toggle-input:checked + .toggle-body .toggle-slider::after {
		transform: translateX(24px);
	}

	.toggle-label-text {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-weight: 400;
	}

	.toggle-wrapper.small .toggle-label-text {
		font-size: 13px;
	}

	.toggle-wrapper.large .toggle-label-text {
		font-size: 15px;
	}
</style>
