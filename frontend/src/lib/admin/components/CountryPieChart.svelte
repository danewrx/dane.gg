<script lang="ts">
	import { onMount } from 'svelte';
	import countryFlagColors from 'country-flag-colors';
	import countryData from 'flag-icons/country.json';
	import 'flag-icons/css/flag-icons.min.css';

	interface Props {
		data: Array<{
			country: string | null;
			visitors: string | number;
			vpnVisitors: string | number;
		}>;
		title?: string;
	}

	let { data, title = 'Visitor Countries' }: Props = $props();

	// Fallback for segment colours
	const colors = [
		'#3B82F6',
		'#10B981',
		'#F59E0B',
		'#EF4444',
		'#8B5CF6',
		'#06B6D4',
		'#84CC16',
		'#F97316',
		'#EC4899',
		'#6366F1'
	];

	// Get flag colors (library)
	function getFlagColorsFromLibrary(country: string): { primary: string; secondary: string } {
		try {
			const countryData = countryFlagColors.find((f: any) => 
				f.name.toLowerCase() === country.toLowerCase()
			);
			
			if (countryData && countryData.colors && countryData.colors.length > 0) {
				const primary = countryData.colors[0];
				const secondary = countryData.colors.length > 1 ? countryData.colors[1] : (countryData.colors.length > 0 ? countryData.colors[0] : '#6B7280');
				return { primary, secondary };
			}
		} catch (e) {}
		return { primary: '#6B7280', secondary: '#9CA3AF' };
	}

	function getFlagColors(country: string): { primary: string; secondary: string } {
		// Fetch from lib first
		const libraryColors = getFlagColorsFromLibrary(country);
		if (libraryColors.primary !== '#6B7280' && libraryColors.secondary !== '#9CA3AF') {
			return libraryColors;
		}

		// Fallback:pick color palette based on country name
		function getFallbackColors(name: string): { primary: string; secondary: string } {
			let hash = 0;
			for (let i = 0; i < name.length; i++) {
				hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
			}
			
			const primary = colors[hash % colors.length];
			const secondary = colors[(hash + 5) % colors.length];
			
			return { primary, secondary };
		}
		
		return getFallbackColors(country);
	}

	// Get country code from lib
	function getCountryCode(countryName: string): string {
		// Try exact match
		const match = countryData.find((c: any) => 
			c.name.toLowerCase() === countryName.toLowerCase()
		);
		
		if (match) {
			return match.code;
		}
		
		// Try fuzzy match for common variations
		const lowerName = countryName.toLowerCase();
		
		// Country name variations
		const variations: Record<string, string> = {
			'united states': 'us',
			'usa': 'us',
			'us': 'us',
			'america': 'us',
			'united kingdom': 'gb',
			'uk': 'gb',
			'great britain': 'gb',
			'britain': 'gb',
			'england': 'gb',
			'russia': 'ru',
			'south korea': 'kr',
			'korea': 'kr',
			'north korea': 'kp',
			'czech republic': 'cz',
			'czechia': 'cz',
			'uae': 'ae',
			'united arab emirates': 'ae',
			'congo': 'cd',
			'drc': 'cd',
			'democratic republic of the congo': 'cd',
			'ivory coast': 'ci',
			'côte d\'ivoire': 'ci',
			'cote d\'ivoire': 'ci',
			'timor-leste': 'tl',
			'east timor': 'tl',
			'burma': 'mm',
			'myanmar': 'mm',
			'swaziland': 'sz',
			'eswatini': 'sz',
			'macedonia': 'mk',
			'north macedonia': 'mk'
		};
		
		if (variations[lowerName]) {
			return variations[lowerName];
		}
		
		for (const item of countryData as any[]) {
			if (item.name.toLowerCase().includes(lowerName) || 
			    lowerName.includes(item.name.toLowerCase())) {
				return item.code;
			}
		}
		
		return 'xx';
	}
	
	// Flag mapping
	function getCountryFlag(country: string): string {
		return getCountryCode(country);
	}

	// Process data for chart
	const chartData = $derived((() => {
		// Utilities to work with color similarity (hue buckets)
		function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
			const normalized = hex.replace('#', '');
			if (normalized.length !== 6) return null;
			const r = parseInt(normalized.slice(0, 2), 16);
			const g = parseInt(normalized.slice(2, 4), 16);
			const b = parseInt(normalized.slice(4, 6), 16);
			if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
			return { r, g, b };
		}

		function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
			r /= 255; g /= 255; b /= 255;
			const max = Math.max(r, g, b), min = Math.min(r, g, b);
			let h = 0, s = 0; const l = (max + min) / 2;
			if (max !== min) {
				const d = max - min;
				s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
				switch (max) {
					case r: h = (g - b) / d + (g < b ? 6 : 1); break;
					case g: h = (b - r) / d + 3; break;
					case b: h = (r - g) / d + 5; break;
				}
				h *= 60;
			}
			return { h, s, l };
		}

		function hueFromHex(hex: string): number | null {
			const rgb = hexToRgb(hex);
			if (!rgb) return null;
			return rgbToHsl(rgb.r, rgb.g, rgb.b).h;
		}

		function hueBucket(hex: string, bucketSize: number = 24): number | null {
			const h = hueFromHex(hex);
			if (h === null || Number.isNaN(h)) return null;
			return Math.floor(h / bucketSize); // 15 buckets
		}

		const usedHue = new Set<number>();
		const usedExact = new Set<string>();

		return data
			.filter(item => {
				const visitors = typeof item.visitors === 'number' ? item.visitors : parseInt(item.visitors.toString()) || 0;
				return item.country !== null && visitors >= 0;
			})
			.map((item) => {
				const { primary, secondary } = getFlagColors(item.country!);
				const pBucket = hueBucket(primary);
				const sBucket = hueBucket(secondary);

				let chosen = primary;
				if ((pBucket !== null && usedHue.has(pBucket)) || usedExact.has(primary)) {
					if ((sBucket !== null && !usedHue.has(sBucket)) && !usedExact.has(secondary)) {
						chosen = secondary;
					}
				}

				const chosenBucket = hueBucket(chosen);
				if (chosenBucket !== null) usedHue.add(chosenBucket);
				usedExact.add(chosen);

				return {
					country: item.country!,
					visitors: parseInt(item.visitors.toString()) || 0,
					vpnVisitors: parseInt(item.vpnVisitors.toString()) || 0,
					color: chosen,
					flag: getCountryFlag(item.country!),
					primaryColor: primary,
					secondaryColor: secondary
				};
			});
	})());

	const totalVisitors = $derived(chartData.reduce((sum, item) => sum + item.visitors, 0));

	// Calculate pie segments
	const segments = $derived(chartData.map((item, index) => {
		const percentage = totalVisitors > 0 ? (item.visitors / totalVisitors) : 0;
		const startAngle = chartData.slice(0, index).reduce((sum, prev) => 
			sum + (totalVisitors > 0 ? (prev.visitors / totalVisitors) * 360 : 0), 0);
		const endAngle = startAngle + (percentage * 360);
		const middleAngle = startAngle + (percentage * 360 / 2);
		
		return {
			...item,
			percentage,
			startAngle,
			endAngle,
			middleAngle,
			index
		};
	}));

	// Chart dimensions
	let chartSize = $state(450);
	let centerX = $derived(chartSize / 2);
	let centerY = $derived(chartSize / 2);
	let radius = $derived(chartSize * 0.256);
	let innerRadius = $derived(chartSize * 0.129);
	let flagDistance = $derived(chartSize * 0.378);
	
	let containerElement: HTMLElement | null = $state(null);

	// Update chart size based on window width and available space
	function updateChartSize() {
		if (typeof window === 'undefined') return;
		const width = window.innerWidth;
		
		// Mobile/Tablet breakpoints
		if (width <= 480) {
			chartSize = 280;
		} else if (width <= 768) {
			chartSize = 350;
		} else if (width <= 1024) {
			chartSize = 380;
		} else if (width <= 1508) {
			chartSize = 420; // Larger size for stacked layout on tablet/desktop
		} 
		// Desktop side-by-side layout
		else {
			chartSize = 450;
		}
	}

	onMount(() => {
		updateChartSize();
		window.addEventListener('resize', updateChartSize);
		
		if (containerElement) {
			const resizeObserver = new ResizeObserver(() => {
				updateChartSize();
			});
			resizeObserver.observe(containerElement);
			return () => {
				resizeObserver.disconnect();
				window.removeEventListener('resize', updateChartSize);
			};
		}
		
		return () => window.removeEventListener('resize', updateChartSize);
	});

	// Calculate flag positions
	const flagPositions = $derived(segments.map(segment => {
		const angleDiff = segment.endAngle - segment.startAngle;
		const isFullCircle = angleDiff >= 359;
		const angle = isFullCircle ? 0 : segment.middleAngle;
		const radians = (angle - 90) * (Math.PI / 180);
		const x = centerX + Math.cos(radians) * flagDistance;
		const y = centerY + Math.sin(radians) * flagDistance;
		
		const segmentEdgeX = centerX + Math.cos(radians) * radius;
		const segmentEdgeY = centerY + Math.sin(radians) * radius;
		
		return {
			...segment,
			flagX: x,
			flagY: y,
			segmentEdgeX,
			segmentEdgeY,
			isFullCircle
		};
	}));

	// Convert angle to path for pie segment
	function createArcPath(startAngle: number, endAngle: number, outerRadius: number, innerRadius: number) {
		const angleDiff = endAngle - startAngle;
		
		if (angleDiff >= 359.99) {
			const adjustedEndAngle = startAngle + 359;
			
			const start = polarToCartesian(centerX, centerY, outerRadius, adjustedEndAngle);
			const end = polarToCartesian(centerX, centerY, outerRadius, startAngle);
			const innerStart = polarToCartesian(centerX, centerY, innerRadius, adjustedEndAngle);
			const innerEnd = polarToCartesian(centerX, centerY, innerRadius, startAngle);
			
			return [
				"M", start.x, start.y,
				"A", outerRadius, outerRadius, 0, "1", "0", end.x, end.y,
				"L", innerEnd.x, innerEnd.y,
				"A", innerRadius, innerRadius, 0, "1", "1", innerStart.x, innerStart.y,
				"Z"
			].join(" ");
		}
		
		const start = polarToCartesian(centerX, centerY, outerRadius, endAngle);
		const end = polarToCartesian(centerX, centerY, outerRadius, startAngle);
		const innerStart = polarToCartesian(centerX, centerY, innerRadius, endAngle);
		const innerEnd = polarToCartesian(centerX, centerY, innerRadius, startAngle);
		
		const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
		
		return [
			"M", start.x, start.y,
			"A", outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
			"L", innerEnd.x, innerEnd.y,
			"A", innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
			"Z"
		].join(" ");
	}

	function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
		const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
		return {
			x: centerX + (radius * Math.cos(angleInRadians)),
			y: centerY + (radius * Math.sin(angleInRadians))
		};
	}

	interface TooltipData {
		country: string;
		visitors: number;
		vpnVisitors: number;
		flag: string;
	}

	let tooltip = $state<{ show: boolean; x: number; y: number; data: TooltipData | null }>({ 
		show: false, 
		x: 0, 
		y: 0, 
		data: null 
	});

	function showTooltip(event: MouseEvent, segment: any) {
		tooltip = {
			show: true,
			x: event.clientX,
			y: event.clientY,
			data: segment
		};
	}

	function hideTooltip() {
		tooltip.show = false;
	}
</script>

<div class="chart-container" bind:this={containerElement}>
	<h3 class="chart-title">{title}</h3>
	
	<div class="chart-content">
		<div class="chart-main">
			<div class="chart-left">
				<div class="chart-wrapper" style="width: {chartSize}px; height: {chartSize}px; position: relative;">
				<!-- SVG for pie chart -->
				<svg width={chartSize} height={chartSize} class="chart-svg">
					<!-- Pie chart segments -->
					{#each segments as segment}
						<path
							d={createArcPath(segment.startAngle, segment.endAngle, radius, innerRadius)}
						fill={segment.color}
							stroke="#ffffff"
							stroke-width="2"
							class="pie-segment"
							on:mouseenter={(e) => showTooltip(e, segment)}
							on:mouseleave={hideTooltip}
						/>
					{/each}
					
					<!-- Leader lines -->
					{#each flagPositions as flag}
						<line
							x1={flag.segmentEdgeX}
							y1={flag.segmentEdgeY}
							x2={flag.flagX}
							y2={flag.flagY}
							stroke={flag.color}
							stroke-width="2"
							opacity="0.8"
							class="leader-line"
						/>
					{/each}
				</svg>

				<!-- Country flags -->
				{#each flagPositions as flag}
					<div
						class="flag-item"
						style="
							position: absolute;
							left: {flag.flagX - 15}px;
							top: {flag.flagY - 15}px;
							width: 30px;
							height: 30px;
							display: flex;
							align-items: center;
							justify-content: center;
							cursor: pointer;
							z-index: 10;
						"
						on:mouseenter={(e) => showTooltip(e, flag)}
						on:mouseleave={hideTooltip}
					>
						<span class="fi fi-{flag.flag}"></span>
					</div>
				{/each}
				</div>
			</div>

			<!-- Legend - Desktop: Right side -->
			{#if segments.length > 0}
				<div class="chart-legend-desktop">
					<div class="legend-scroll">
						{#each segments as segment}
							<div class="legend-item">
								<div 
									class="legend-color" 
									style="background-color: {segment.color};"
								></div>
								<span class="legend-flag"><span class="fi fi-{segment.flag}"></span></span>
								<div class="legend-text-container">
									<span class="legend-text">{segment.country}</span>
									<span class="legend-percentage">{(segment.percentage * 100).toFixed(1)}%</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Legend - Mobile: Below chart -->
		{#if segments.length > 0}
			<div class="chart-legend-mobile">
				<div class="legend-scroll">
					{#each segments as segment}
						<div class="legend-item">
							<div 
								class="legend-color" 
								style="background-color: {segment.color};"
							></div>
							<span class="legend-flag"><span class="fi fi-{segment.flag}"></span></span>
							<div class="legend-text-container">
								<span class="legend-text">{segment.country}</span>
								<span class="legend-percentage">{(segment.percentage * 100).toFixed(1)}%</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Tooltip -->
	{#if tooltip.show && tooltip.data}
		<div 
			class="tooltip"
			style="
				position: fixed;
				left: {tooltip.x + 10}px;
				top: {tooltip.y - 10}px;
				z-index: 1000;
			"
		>
			<div class="tooltip-content">
				<div class="tooltip-header">
					<span class="tooltip-flag"><span class="fi fi-{tooltip.data.flag}"></span></span>
					<span class="tooltip-country">{tooltip.data.country}</span>
				</div>
				<div class="tooltip-body">
					<div class="tooltip-stat">
						Total visitors: <strong>{tooltip.data.visitors.toLocaleString()}</strong>
					</div>
					{#if tooltip.data.vpnVisitors > 0}
						<div class="tooltip-stat">
							VPN/Proxy: <strong style="color: #fbbf24;">{tooltip.data.vpnVisitors.toLocaleString()}</strong>
							<span class="vpn-percentage">
								({((tooltip.data.vpnVisitors / tooltip.data.visitors) * 100).toFixed(1)}%)
							</span>
						</div>
					{:else}
						<div class="tooltip-stat no-vpn">
							No VPN/Proxy detected
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.chart-container {
		background: var(--bg-secondary, #282828);
		border-radius: 12px;
		padding: 20px;
		border: 1px solid var(--border-color, #3a3a3a);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		transition: background 0.2s ease, border-color 0.2s ease;
		height: 100%;
		min-height: 0;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
	}

	.chart-title {
		color: var(--text-primary, #f9fafb);
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 16px 0;
		text-align: center;
	}

	.chart-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.chart-main {
		display: flex;
		align-items: flex-start;
		gap: 24px;
		width: 100%;
		max-width: 100%;
		justify-content: space-between;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.chart-left {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 0;
		min-width: 0;
		overflow: hidden;
	}

	.chart-wrapper {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		flex: 0 0 auto;
		max-width: 100%;
		overflow: visible;
	}

	.chart-svg {
		display: block;
		max-width: 100%;
		height: auto;
	}

	.pie-segment {
		cursor: pointer;
		transition: opacity 0.2s ease;
	}

	.pie-segment:hover {
		opacity: 0.8;
	}

	.leader-line {
		pointer-events: none;
	}

	.flag-item {
		transition: transform 0.2s ease;
	}
	
	.flag-item .fi {
		font-size: 24px;
		line-height: 1;
		display: block;
	}

	.flag-item:hover {
		transform: scale(1.2);
	}

	.chart-legend-desktop {
		width: 30%;
		min-width: 250px;
		max-width: 300px;
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	.legend-scroll {
		flex: 1;
		overflow-y: auto;
		padding-right: 8px;
		min-height: 0;
	}

	.legend-scroll::-webkit-scrollbar {
		width: 6px;
	}

	.legend-scroll::-webkit-scrollbar-track {
		background: var(--bg-primary, #282828);
		border-radius: 3px;
	}

	.legend-scroll::-webkit-scrollbar-thumb {
		background: #6b7280;
		border-radius: 3px;
	}

	.legend-scroll::-webkit-scrollbar-thumb:hover {
		background: #9ca3af;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: var(--bg-tertiary, #2f2f2f);
		border-radius: 8px;
		border: 1px solid var(--border-color, #3a3a3a);
		margin-bottom: 8px;
		transition: background-color 0.2s ease, border-color 0.2s ease;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.legend-item:hover {
		background: var(--bg-hover, #3a3a3a);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
		border-color: var(--accent-color, #6366f1);
	}

	.legend-color {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.legend-flag {
		flex-shrink: 0;
		width: 24px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.legend-flag .fi {
		font-size: 20px;
		line-height: 1;
	}

	.legend-text-container {
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 2px;
	}

	.legend-text {
		color: var(--text-primary, #d1d5db);
		font-size: 14px;
		font-weight: 500;
	}

	.legend-percentage {
		color: var(--text-secondary, #9ca3af);
		font-size: 12px;
		font-weight: 500;
	}

	.chart-legend-mobile {
		display: none;
		width: 100%;
		max-width: 600px;
	}

	.chart-legend-mobile .legend-scroll {
		max-height: 200px;
		overflow-y: auto;
		padding-right: 8px;
	}

	.chart-legend-mobile .legend-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: var(--bg-tertiary, #2f2f2f);
		border-radius: 6px;
		border: 1px solid var(--border-color, #3a3a3a);
		margin-bottom: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		transition: background 0.2s ease, border-color 0.2s ease;
	}

	.chart-legend-mobile .legend-text-container {
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
	}

	.chart-legend-mobile .legend-text {
		font-size: 13px;
	}

	.chart-legend-mobile .legend-percentage {
		font-size: 11px;
	}

	.tooltip {
		pointer-events: none;
	}

	.tooltip-content {
		background: var(--bg-tertiary, #242424);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 12px;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
		min-width: 200px;
		transition: background 0.2s ease, border-color 0.2s ease;
	}

	.tooltip-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.tooltip-flag {
		width: 24px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.tooltip-flag .fi {
		font-size: 20px;
		line-height: 1;
	}

	.tooltip-country {
		color: var(--text-primary, #f9fafb);
		font-weight: 600;
		font-size: 14px;
	}

	.tooltip-body {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.tooltip-stat {
		color: var(--text-secondary, #d1d5db);
		font-size: 12px;
	}

	.tooltip-stat strong {
		color: var(--accent-color, #60a5fa);
	}

	.vpn-percentage {
		color: #fbbf24;
		margin-left: 4px;
	}

	.no-vpn {
		color: #10b981;
	}

	/* Responsive adjustments */
	@media (max-width: 1508px) {
		.chart-container {
			height: auto;
		}

		.chart-content {
			overflow: visible;
		}

		.chart-main {
			flex-direction: column;
			align-items: center;
			overflow: visible;
		}

		.chart-left {
			overflow: visible;
		}

		.chart-legend-desktop {
			display: none;
		}

		.chart-legend-mobile {
			display: flex;
		}

		.chart-wrapper {
			justify-content: center;
			max-width: 100%;
		}
	}

	@media (max-width: 768px) {
		.chart-container {
			padding: 16px;
		}
		
		.chart-title {
			font-size: 16px;
			margin-bottom: 12px;
		}

		.chart-content {
			gap: 12px;
		}

		.chart-main {
			gap: 16px;
		}

		.chart-wrapper {
			width: 100%;
			max-width: 100%;
		}

		.chart-svg {
			max-width: 100%;
			height: auto;
		}

		.flag-item {
			width: 20px;
			height: 20px;
		}
		
		.flag-item .fi {
			font-size: 18px;
		}
	}

	@media (max-width: 480px) {
		.chart-container {
			padding: 12px;
		}

		.chart-title {
			font-size: 15px;
		}

		.chart-wrapper {
			width: 100%;
			max-width: 100%;
		}

		.legend-scroll {
			max-height: 200px;
		}
		
		.flag-item {
			width: 18px;
			height: 18px;
		}
		
		.flag-item .fi {
			font-size: 16px;
		}
		
		.legend-item {
			padding: 10px 12px;
		}
		
		.legend-text {
			font-size: 13px;
		}
		
		.legend-percentage {
			font-size: 11px;
		}
	}

	/* Make unknown/test flags (xx) black in light mode */
	:global(html:not(.dark)) .fi-xx {
		filter: brightness(0) saturate(100%);
	}
</style>