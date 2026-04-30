<a
	class="admin-shortcut"
	href="/admin"
	target="_blank"
	rel="noopener noreferrer"
	title="Open admin dashboard (new tab)"
	aria-label="Open admin dashboard in a new tab"
>
	Admin
</a>

<style>
	.admin-shortcut {
		position: fixed;
		z-index: 99;
		left: max(0px, env(safe-area-inset-left, 0px));
		bottom: max(0px, env(safe-area-inset-bottom, 0px));
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 6px 10px;
		line-height: 1.2;
		font-size: calc(10 * 1em / 14);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--text-secondary);
		background: var(--bg-secondary);
		border: var(--theme-widget-border-width, 2px) solid var(--border-color);
		border-left: none;
		border-bottom: none;
		border-radius: var(--theme-widget-border-radius, 0);
		box-shadow: 2px -2px 8px var(--shadow, rgba(0, 0, 0, 0.2));
		transition:
			color 0.2s ease,
			background 0.2s ease,
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}

	.admin-shortcut:hover {
		color: var(--accent-color);
		background: var(--bg-hover);
		border-color: var(--accent-color);
		box-shadow: 3px -3px 12px var(--shadow, rgba(0, 0, 0, 0.3));
	}

	.admin-shortcut:focus-visible {
		outline: 2px solid var(--accent-color);
		outline-offset: 2px;
	}
</style>
