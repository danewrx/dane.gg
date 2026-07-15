<script lang="ts">
	import { logger } from '$lib/logger';
	import { onMount } from 'svelte';

	interface ContributionDay {
		date: string;
		count: number;
		level: 0 | 1 | 2 | 3 | 4;
	}
	interface ContributionWeek {
		days: ContributionDay[];
	}
	interface ContributionsResponse {
		configured: boolean;
		username?: string;
		totalContributions: number;
		weeks: ContributionWeek[];
	}

	let data = $state<ContributionsResponse | null>(null);
	let isLoading = $state(true);
	let hasError = $state(false);

	const weeks = $derived(data?.weeks ?? []);
	const total = $derived(data?.totalContributions ?? 0);
	const profileUrl = $derived(data?.username ? `https://github.com/${data.username}` : null);

	// Month labels: one per month, at the week column where it first appears,
	// skipping labels that would collide with the previous one.
	const monthLabels = $derived.by(() => {
		const labels: { col: number; label: string }[] = [];
		let lastMonth = -1;
		let lastCol = -3;
		weeks.forEach((week, i) => {
			const first = week.days[0];
			if (!first) return;
			const d = new Date(`${first.date}T00:00:00`);
			const month = d.getMonth();
			if (month !== lastMonth && i - lastCol >= 3) {
				labels.push({ col: i + 1, label: d.toLocaleString('en-US', { month: 'short' }) });
				lastMonth = month;
				lastCol = i;
			} else if (month !== lastMonth) {
				lastMonth = month;
			}
		});
		return labels;
	});

	function weekdayRow(date: string): number {
		// getDay: 0 = Sunday … 6 = Saturday → grid rows 1…7
		return new Date(`${date}T00:00:00`).getDay() + 1;
	}

	function tooltip(day: ContributionDay): string {
		const label = day.count === 1 ? '1 contribution' : `${day.count} contributions`;
		const d = new Date(`${day.date}T00:00:00`).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
		return `${label} on ${d}`;
	}

	onMount(async () => {
		try {
			// Bypass the browser cache so a response fetched before the widget was
			// configured (or during setup) isn't served stale
			const response = await fetch('/api/widgets/github-contributions', { cache: 'no-store' });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const body = (await response.json()) as ContributionsResponse;
			data = body;
		} catch (error) {
			logger.error('Error loading GitHub contributions:', error);
			hasError = true;
		} finally {
			isLoading = false;
		}
	});
</script>

<div class="github-widget">
	{#if isLoading}
		<div class="gh-state">
			<div class="gh-spinner"></div>
		</div>
	{:else if hasError || !data?.configured || weeks.length === 0}
		<div class="gh-state">
			<p>GitHub activity is currently unavailable.</p>
		</div>
	{:else}
		<div class="gh-scroll">
			<div class="gh-chart" style="--weeks: {weeks.length}">
				<div class="gh-months">
					{#each monthLabels as m (m.col)}
						<span class="gh-month" style="grid-column: {m.col}">{m.label}</span>
					{/each}
				</div>
				<div class="gh-grid">
					{#each weeks as week, w (w)}
						{#each week.days as day (day.date)}
							<span
								class="gh-cell"
								data-level={day.level}
								style="grid-column: {w + 1}; grid-row: {weekdayRow(day.date)}"
								title={tooltip(day)}
							></span>
						{/each}
					{/each}
				</div>
			</div>
		</div>

		<div class="gh-footer">
			{#if profileUrl}
				<a href={profileUrl} target="_blank" rel="noopener noreferrer" class="gh-total">
					{total} contributions in the last year
				</a>
			{:else}
				<span class="gh-total">{total} contributions in the last year</span>
			{/if}
			<div class="gh-legend">
				<span>Less</span>
				<span class="gh-cell" data-level="0"></span>
				<span class="gh-cell" data-level="1"></span>
				<span class="gh-cell" data-level="2"></span>
				<span class="gh-cell" data-level="3"></span>
				<span class="gh-cell" data-level="4"></span>
				<span>More</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.github-widget {
		width: 100%;
		padding: 4px 0 8px;
		box-sizing: border-box;

		/* Base ramp (grayscale) — works everywhere and is the fallback when
		   color-mix() is unavailable. */
		--gh-level-0: rgba(255, 255, 255, 0.06);
		--gh-level-1: rgba(255, 255, 255, 0.22);
		--gh-level-2: rgba(255, 255, 255, 0.4);
		--gh-level-3: rgba(255, 255, 255, 0.62);
		--gh-level-4: rgba(255, 255, 255, 0.92);
	}

	/* Tint the heatmap with the active theme's accent colour so it matches
	   whatever theme is applied. */
	@supports (background: color-mix(in srgb, red, blue)) {
		.github-widget {
			--gh-surface: var(--theme-surface, var(--bg-secondary, #1a1a1a));
			--gh-accent: var(--theme-accent, var(--accent-color, #6366f1));
			--gh-level-0: color-mix(in srgb, var(--theme-text-primary, #ffffff) 8%, transparent);
			--gh-level-1: color-mix(in srgb, var(--gh-accent) 28%, var(--gh-surface));
			--gh-level-2: color-mix(in srgb, var(--gh-accent) 52%, var(--gh-surface));
			--gh-level-3: color-mix(in srgb, var(--gh-accent) 76%, var(--gh-surface));
			--gh-level-4: var(--gh-accent);
		}
	}

	.gh-state {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 120px;
		color: var(--text-secondary, #9ca3af);
		font-size: calc(13 * 1em / 14);
	}

	.gh-spinner {
		width: 22px;
		height: 22px;
		border: 2px solid var(--theme-border, #374151);
		border-top-color: var(--theme-accent, #6366f1);
		border-radius: 50%;
		animation: gh-spin 0.9s linear infinite;
	}

	@keyframes gh-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Horizontal scroll only kicks in when the column is too narrow. */
	.gh-scroll {
		width: 100%;
		overflow-x: auto;
		padding-bottom: 4px;
	}

	.gh-chart {
		min-width: 100%;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.gh-months {
		display: grid;
		grid-template-columns: repeat(var(--weeks), 1fr);
		font-size: calc(10 * 1em / 14);
		color: var(--text-secondary, #9ca3af);
		height: 14px;
	}

	.gh-month {
		grid-row: 1;
		white-space: nowrap;
	}

	.gh-grid {
		display: grid;
		grid-template-columns: repeat(var(--weeks), 1fr);
		grid-template-rows: repeat(7, auto);
		gap: 2px;
	}

	.gh-cell {
		aspect-ratio: 1;
		width: 100%;
		border-radius: 2px;
		background: var(--gh-level-0);
	}

	.gh-cell[data-level='1'] {
		background: var(--gh-level-1);
	}
	.gh-cell[data-level='2'] {
		background: var(--gh-level-2);
	}
	.gh-cell[data-level='3'] {
		background: var(--gh-level-3);
	}
	.gh-cell[data-level='4'] {
		background: var(--gh-level-4);
	}

	.gh-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 10px;
		flex-wrap: wrap;
		font-size: calc(11 * 1em / 14);
		color: var(--text-secondary, #9ca3af);
	}

	.gh-total {
		color: var(--text-secondary, #9ca3af);
		text-decoration: none;
	}

	a.gh-total:hover {
		color: var(--accent-color, #3b82f6);
	}

	.gh-legend {
		display: flex;
		align-items: center;
		gap: 3px;
	}

	.gh-legend .gh-cell {
		width: 11px;
		height: 11px;
		aspect-ratio: auto;
		flex-shrink: 0;
	}
</style>
