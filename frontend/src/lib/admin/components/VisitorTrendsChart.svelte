<script lang="ts">
	import { onMount } from 'svelte';

	interface DataPoint {
		date: string;
		visitors: number;
		views: number;
	}

	interface Props {
		data: DataPoint[];
		title?: string;
	}

	let { data, title = 'Visitor Trends' }: Props = $props();

	// Chart dimensions
	let containerElement: HTMLElement | null = $state(null);
	let chartWidth = $state(800);
	let chartHeight = $state(300);
	const padding = { top: 20, right: 60, bottom: 60, left: 60 };

	// Tooltip state
	let tooltip = $state<{ 
		show: boolean; 
		x: number; 
		y: number; 
		data: { date: string; visitors: number; views: number } | null 
	}>({
		show: false,
		x: 0,
		y: 0,
		data: null
	});

	let tooltipElement: HTMLElement | null = $state(null);

	// Calculate scales
	const chartData = $derived(data.slice().sort((a, b) => 
		new Date(a.date).getTime() - new Date(b.date).getTime()
	));

	const maxVisitors = $derived(Math.max(...chartData.map(d => d.visitors), 1));
	const maxViews = $derived(Math.max(...chartData.map(d => d.views), 1));
	const maxY = $derived(Math.max(maxVisitors, maxViews));

	const innerWidth = $derived(chartWidth - padding.left - padding.right);
	const innerHeight = $derived(chartHeight - padding.top - padding.bottom);

	const yTicks = $derived(() => {
		const tickCount = 5;
		const step = Math.ceil(maxY / tickCount);
		const ticks = [];
		for (let i = 0; i <= tickCount; i++) {
			ticks.push(i * step);
		}
		return ticks;
	});

	function scaleX(index: number): number {
		if (chartData.length <= 1) return padding.left;
		return padding.left + (index / (chartData.length - 1)) * innerWidth;
	}

	function scaleY(value: number): number {
		return chartHeight - padding.bottom - (value / maxY) * innerHeight;
	}

	const visitorsPath = $derived(() => {
		if (chartData.length === 0) return '';
		const points = chartData.map((d, i) => `${scaleX(i)},${scaleY(d.visitors)}`);
		return `M ${points.join(' L ')}`;
	});

	const viewsPath = $derived(() => {
		if (chartData.length === 0) return '';
		const points = chartData.map((d, i) => `${scaleX(i)},${scaleY(d.views)}`);
		return `M ${points.join(' L ')}`;
	});

	// Detect if data is hourly or daily
	const isHourlyData = $derived(() => {
		if (chartData.length === 0) return false;
		if (chartData.length >= 2) {
			const first = new Date(chartData[0].date);
			const second = new Date(chartData[1].date);
			const diffHours = (second.getTime() - first.getTime()) / (1000 * 60 * 60);
			
			return diffHours < 23;
		}
		
		const date = new Date(chartData[0].date);
		return date.getHours() !== 0 || date.getMinutes() !== 0;
	});

	// Format date for display
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		
		if (isHourlyData()) {
			return date.toLocaleTimeString('en-US', { 
				hour: 'numeric', 
				minute: '2-digit',
				hour12: true 
			});
		}
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	// Format date/time for tooltip
	function formatFullDateTime(dateStr: string): string {
		const date = new Date(dateStr);
		
		if (isHourlyData()) {
			return date.toLocaleString('en-US', { 
				month: 'short', 
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});
		}
		
		return date.toLocaleDateString('en-US', { 
			month: 'short', 
			day: 'numeric',
			year: 'numeric'
		});
	}

	function updateDimensions() {
		if (!containerElement) return;
		const width = containerElement.clientWidth;
		chartWidth = width;
		chartHeight = Math.min(300, Math.max(200, width * 0.3));
	}

	// Tooltip functions
	function calculateTooltipPosition(clientX: number, clientY: number): { x: number; y: number } {
		if (typeof window === 'undefined' || !tooltipElement) {
			return { x: clientX, y: clientY };
		}

		const tooltipWidth = tooltipElement.offsetWidth || 200;
		const tooltipHeight = tooltipElement.offsetHeight || 100;
		const padding = 10;
		const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
		const scrollY = window.pageYOffset || document.documentElement.scrollTop;

		let x = clientX + scrollX + 15;
		let y = clientY + scrollY + 15;

		if (x + tooltipWidth + padding > window.innerWidth + scrollX) {
			x = clientX + scrollX - tooltipWidth - 15;
		}

		if (y + tooltipHeight + padding > window.innerHeight + scrollY) {
			y = clientY + scrollY - tooltipHeight - 15;
		}

		if (x < scrollX + padding) {
			x = scrollX + padding;
		}

		if (y < scrollY + padding) {
			y = scrollY + padding;
		}

		return { x, y };
	}

	function showTooltip(event: MouseEvent | TouchEvent, dataPoint: DataPoint) {
		const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
		const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

		const position = calculateTooltipPosition(clientX, clientY);

		tooltip = {
			show: true,
			x: position.x,
			y: position.y,
			data: dataPoint
		};
	}

	function hideTooltip() {
		tooltip.show = false;
	}

	onMount(() => {
		updateDimensions();
		window.addEventListener('resize', updateDimensions);

		if (containerElement) {
			const resizeObserver = new ResizeObserver(() => {
				updateDimensions();
			});
			resizeObserver.observe(containerElement);
			return () => {
				resizeObserver.disconnect();
				window.removeEventListener('resize', updateDimensions);
			};
		}

		return () => window.removeEventListener('resize', updateDimensions);
	});
</script>

<div class="trends-container" bind:this={containerElement}>
	<div class="trends-header">
		<h3 class="trends-title">{title}</h3>
		<div class="legend">
			<div class="legend-item">
				<span class="legend-color" style="background: #60a5fa;"></span>
				<span class="legend-label">Unique Visitors</span>
			</div>
			<div class="legend-item">
				<span class="legend-color" style="background: #34d399;"></span>
				<span class="legend-label">Total Views</span>
			</div>
		</div>
	</div>

	{#if chartData.length === 0}
		<div class="no-data">No trend data available</div>
	{:else}
		<svg width={chartWidth} height={chartHeight} class="trends-svg">
			<!-- Grid lines -->
			<g class="grid">
				{#each yTicks() as tick}
					<line
						x1={padding.left}
						y1={scaleY(tick)}
						x2={chartWidth - padding.right}
						y2={scaleY(tick)}
						stroke="var(--border-color, #3a3a3a)"
						stroke-width="1"
						stroke-dasharray="4 4"
						opacity="0.3"
					/>
					<text
						x={padding.left - 10}
						y={scaleY(tick)}
						text-anchor="end"
						dominant-baseline="middle"
						class="axis-label"
					>
						{tick}
					</text>
				{/each}
			</g>

			<!-- X-axis labels -->
			<g class="x-axis">
				{#each chartData as point, i}
					{@const skipInterval = isHourlyData() 
						? Math.max(1, Math.ceil(chartData.length / 12))
						: Math.max(1, Math.ceil(chartData.length / 8))
					}
					{#if i === 0 || i === chartData.length - 1 || i % skipInterval === 0}
						<text
							x={scaleX(i)}
							y={chartHeight - padding.bottom + 20}
							text-anchor={i === 0 ? 'start' : i === chartData.length - 1 ? 'end' : 'middle'}
							class="axis-label"
						>
							{formatDate(point.date)}
						</text>
					{/if}
				{/each}
			</g>

			<!-- Line paths -->
			<g class="lines">
				<path
					d={visitorsPath()}
					fill="none"
					stroke="#60a5fa"
					stroke-width="2"
					class="line-path"
				/>

				<path
					d={viewsPath()}
					fill="none"
					stroke="#34d399"
					stroke-width="2"
					class="line-path"
				/>
			</g>

			<!-- Data points -->
			<g class="data-points">
				{#each chartData as point, i}
					<circle
						cx={scaleX(i)}
						cy={scaleY(point.visitors)}
						r="4"
						fill="#60a5fa"
						stroke="var(--bg-secondary, #282828)"
						stroke-width="2"
						class="data-point"
						onmouseenter={(e) => showTooltip(e, point)}
						onmouseleave={hideTooltip}
						ontouchstart={(e) => {
							e.preventDefault();
							showTooltip(e, point);
						}}
						ontouchend={hideTooltip}
					/>

					<!-- Views point -->
					<circle
						cx={scaleX(i)}
						cy={scaleY(point.views)}
						r="4"
						fill="#34d399"
						stroke="var(--bg-secondary, #282828)"
						stroke-width="2"
						class="data-point"
						onmouseenter={(e) => showTooltip(e, point)}
						onmouseleave={hideTooltip}
						ontouchstart={(e) => {
							e.preventDefault();
							showTooltip(e, point);
						}}
						ontouchend={hideTooltip}
					/>
				{/each}
			</g>
		</svg>
	{/if}
</div>

<!-- Tooltip -->
{#if tooltip.show && tooltip.data}
	<div
		bind:this={tooltipElement}
		class="tooltip"
		style="
			position: fixed;
			left: {tooltip.x}px;
			top: {tooltip.y}px;
			z-index: 1000;
		"
	>
		<div class="tooltip-content">
			<div class="tooltip-header">
				<strong>{formatFullDateTime(tooltip.data.date)}</strong>
			</div>
			<div class="tooltip-body">
				<div class="tooltip-stat">
					<span class="stat-label" style="color: #60a5fa;">Visitors:</span>
					<strong>{tooltip.data.visitors.toLocaleString()}</strong>
				</div>
				<div class="tooltip-stat">
					<span class="stat-label" style="color: #34d399;">Views:</span>
					<strong>{tooltip.data.views.toLocaleString()}</strong>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.trends-container {
		background: var(--bg-secondary, #282828);
		border-radius: 12px;
		border: 1px solid var(--border-color, #3a3a3a);
		padding: 20px;
		width: 100%;
		box-sizing: border-box;
		transition: background 0.2s ease, border-color 0.2s ease;
	}

	.trends-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		flex-wrap: wrap;
		gap: 12px;
	}

	.trends-title {
		color: var(--text-primary, #f9fafb);
		font-size: 18px;
		font-weight: 600;
		margin: 0;
	}

	.legend {
		display: flex;
		gap: 20px;
		align-items: center;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.legend-color {
		width: 16px;
		height: 3px;
		border-radius: 2px;
		display: block;
	}

	.legend-label {
		color: var(--text-secondary, #d1d5db);
		font-size: 13px;
		font-weight: 500;
	}

	.trends-svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.axis-label {
		fill: var(--text-secondary, #9ca3af);
		font-size: 11px;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.x-axis .axis-label {
		font-size: 10px;
	}

	.line-path {
		transition: stroke-width 0.2s ease;
	}

	.line-path:hover {
		stroke-width: 3;
	}

	.data-point {
		cursor: pointer;
		transition: r 0.2s ease;
	}

	.data-point:hover {
		r: 6;
	}

	.no-data {
		text-align: center;
		padding: 60px 20px;
		color: var(--text-secondary, #9ca3af);
		font-size: 14px;
	}

	.tooltip {
		pointer-events: none;
		max-width: calc(100vw - 20px);
		will-change: transform;
	}

	.tooltip-content {
		background: var(--bg-tertiary, #242424);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 12px;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
		min-width: 180px;
		max-width: 250px;
	}

	.tooltip-header {
		color: var(--text-primary, #f9fafb);
		font-size: 13px;
		margin-bottom: 8px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.tooltip-body {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.tooltip-stat {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: var(--text-secondary, #d1d5db);
		font-size: 12px;
	}

	.stat-label {
		font-weight: 500;
	}

	@media (max-width: 768px) {
		.trends-container {
			padding: 16px;
		}

		.trends-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.trends-title {
			font-size: 16px;
		}

		.legend {
			gap: 16px;
		}

		.legend-label {
			font-size: 12px;
		}

		.axis-label {
			font-size: 10px;
		}
	}

	@media (max-width: 480px) {
		.trends-container {
			padding: 12px;
		}

		.trends-title {
			font-size: 15px;
		}

		.legend {
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
		}

		.tooltip-content {
			padding: 10px;
			min-width: 160px;
		}

		.tooltip-header {
			font-size: 12px;
		}

		.tooltip-stat {
			font-size: 11px;
		}
	}
</style>

