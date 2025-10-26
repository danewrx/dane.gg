<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		data: Array<{
			country: string | null;
			visitors: string | number;
			vpnVisitors: string | number;
		}>;
		title?: string;
	}

	let { data, title = 'Visitor Countries' }: Props = $props();

	// Color palette for chart segments (fallback)
	const colors = [
		'#3B82F6', // Blue
		'#10B981', // Green
		'#F59E0B', // Orange
		'#EF4444', // Red
		'#8B5CF6', // Purple
		'#06B6D4', // Cyan
		'#84CC16', // Lime
		'#F97316', // Orange
		'#EC4899', // Pink
		'#6366F1'  // Indigo
	];

	// Flag gradient colors for major countries
	function getFlagGradient(country: string): { start: string; end: string } {
		// Deterministic fallback: pick from a set of flag-like color pairs
		function autoGradient(name: string): { start: string; end: string } {
			const pairs: Array<{ start: string; end: string }> = [
				{ start: '#CE1126', end: '#FFFFFF' }, // red/white
				{ start: '#002868', end: '#FFFFFF' }, // blue/white
				{ start: '#007A3D', end: '#FFFFFF' }, // green/white
				{ start: '#009739', end: '#FFDF00' }, // green/yellow
				{ start: '#0033A0', end: '#FFC400' }, // blue/yellow
				{ start: '#000000', end: '#FCD116' }, // black/yellow
				{ start: '#000000', end: '#CE1126' }, // black/red
				{ start: '#A2001D', end: '#00205B' }, // red/blue
				{ start: '#14B53A', end: '#FCD116' }, // green/gold
				{ start: '#8B5CF6', end: '#3B82F6' }  // purple/blue
			];
			let hash = 0;
			for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
			const idx = hash % pairs.length;
			return pairs[idx];
		}
		const gradientMap: Record<string, { start: string; end: string }> = {
			// United States - Red, White, Blue
			'United States': { start: '#B22234', end: '#002868' },
			'USA': { start: '#B22234', end: '#002868' },
			'US': { start: '#B22234', end: '#002868' },
			
			// United Kingdom - Red, White, Blue
			'United Kingdom': { start: '#CE1124', end: '#012169' },
			'UK': { start: '#CE1124', end: '#012169' },
			'Great Britain': { start: '#CE1124', end: '#012169' },
			
			// Germany - Black, Red, Gold
			'Germany': { start: '#000000', end: '#DD0000' },
			
			// France - Blue, White, Red
			'France': { start: '#0055A4', end: '#EF4135' },
			
			// Italy - Green, White, Red
			'Italy': { start: '#009246', end: '#CE2B37' },
			
			// Spain - Red, Yellow
			'Spain': { start: '#C60B1E', end: '#FFC400' },
			
			// Netherlands - Red, White, Blue
			'Netherlands': { start: '#CE1126', end: '#21468B' },
			
			// Belgium - Black, Yellow, Red
			'Belgium': { start: '#000000', end: '#ED2939' },
			
			// Canada - Red, White
			'Canada': { start: '#EF1420', end: '#FFFFFF' },
			
			// Australia - Blue, White
			'Australia': { start: '#012169', end: '#FFFFFF' },
			
			// Japan - Red, White
			'Japan': { start: '#BC002D', end: '#FFFFFF' },
			
			// China - Red, Yellow
			'China': { start: '#DE2910', end: '#FFDE00' },
			
			// Brazil - Green, Yellow
			'Brazil': { start: '#009739', end: '#FFDF00' },
			
			// India - Saffron, White, Green
			'India': { start: '#FF9933', end: '#138808' },
			
			// Russia - White, Blue, Red
			'Russia': { start: '#FFFFFF', end: '#0052BD' },
			
			// South Korea - White, Red, Blue
			'South Korea': { start: '#0047A0', end: '#CE1126' },
			'Korea': { start: '#0047A0', end: '#CE1126' },
			
			// Sweden - Blue, Yellow
			'Sweden': { start: '#006AA7', end: '#FECC00' },
			
			// Norway - Red, Blue
			'Norway': { start: '#BA0C2F', end: '#00205B' },
			
			// Denmark - Red, White
			'Denmark': { start: '#C8102E', end: '#FFFFFF' },
			
			// Finland - Blue, White
			'Finland': { start: '#002F6C', end: '#FFFFFF' },
			
			// Ireland - Green, Orange
			'Ireland': { start: '#169B62', end: '#FF883E' },
			
			// Poland - White, Red
			'Poland': { start: '#FFFFFF', end: '#DC143C' },
			
			// Czech Republic - Blue, White, Red
			'Czech Republic': { start: '#11457E', end: '#D7141A' },
			'Czechia': { start: '#11457E', end: '#D7141A' },
			
			// Switzerland - Red, White
			'Switzerland': { start: '#FF0000', end: '#FFFFFF' },
			
			// Mexico - Green, White, Red
			'Mexico': { start: '#006847', end: '#CE1126' },
			
			// Argentina - Light Blue, White
			'Argentina': { start: '#74ACDF', end: '#FFFFFF' },
			
			// Chile - Blue, Red
			'Chile': { start: '#002654', end: '#C8102E' },
			
			// Colombia - Yellow, Blue, Red
			'Colombia': { start: '#FFE800', end: '#ED0017' },
			
			// Turkey - Red, White
			'Turkey': { start: '#E30A17', end: '#FFFFFF' },
			
			// Israel - Blue, White
			'Israel': { start: '#0038B8', end: '#FFFFFF' },
			
			// Saudi Arabia - Green
			'Saudi Arabia': { start: '#006C35', end: '#FFFFFF' },
			
			// United Arab Emirates - Red, Green, White, Black
			'United Arab Emirates': { start: '#007A3D', end: '#000000' },
			'UAE': { start: '#007A3D', end: '#000000' },
			
			// Egypt - Red, White, Black
			'Egypt': { start: '#CE1126', end: '#000000' },
			
			// South Africa - Multi-color
			'South Africa': { start: '#007A4D', end: '#002395' },
			
			// Nigeria - Green, White
			'Nigeria': { start: '#008751', end: '#FFFFFF' },
			
			// Kenya - Black, Red, Green
			'Kenya': { start: '#000000', end: '#006600' },
			
			// New Zealand - Blue, White
			'New Zealand': { start: '#00247D', end: '#FFFFFF' },
			
			// Singapore - Red, White
			'Singapore': { start: '#CE1126', end: '#FFFFFF' },
			
			// Malaysia - Blue, Yellow
			'Malaysia': { start: '#003D82', end: '#FFCC00' },
			
			// Indonesia - Red, White
			'Indonesia': { start: '#FF0000', end: '#FFFFFF' },
			
			// Philippines - Blue, Red
			'Philippines': { start: '#0032A0', end: '#CE1126' },
			
			// Thailand - Red, White, Blue
			'Thailand': { start: '#A51931', end: '#2E2FA7' },
			
			// Vietnam - Red, Yellow
			'Vietnam': { start: '#DA020E', end: '#FFD700' },
			
			// Bangladesh - Green, Red
			'Bangladesh': { start: '#006747', end: '#F42A41' },
			
			// Pakistan - Green, White
			'Pakistan': { start: '#01411C', end: '#FFFFFF' },
			
			// Iran - Green, White, Red
			'Iran': { start: '#239F40', end: '#DA0000' },
			
			// Iraq - Red, White, Black
			'Iraq': { start: '#CE1126', end: '#000000' },
			
			// Egypt - Red, White, Black
			'Egypt': { start: '#CE1126', end: '#000000' },
			
			// Morocco - Red, Green
			'Morocco': { start: '#C1272D', end: '#006233' },
			
			// Algeria - Green, White
			'Algeria': { start: '#006633', end: '#FFFFFF' },
			
			// Ghana - Red, Yellow, Green
			'Ghana': { start: '#CE1126', end: '#006B3C' },
			
			// Ethiopia - Green, Yellow, Red
			'Ethiopia': { start: '#078930', end: '#DA1219' },
			
			// Zimbabwe - Green, Yellow, Red
			'Zimbabwe': { start: '#006400', end: '#FFE800' },
			
			// Angola - Red, Black
			'Angola': { start: '#C8102E', end: '#000000' },
			
			// Madagascar - Red, Green
			'Madagascar': { start: '#FC3D32', end: '#007E3A' },
			
			// Test Country - Gradient
			'Test Country': { start: '#3B82F6', end: '#10B981' },
			
			// Default fallback
			'Unknown': { start: '#6B7280', end: '#9CA3AF' }
		};
		
		// Try exact match first
		if (gradientMap[country]) {
			return gradientMap[country];
		}
		
		// Try case-insensitive partial match
		const lowerCountry = country.toLowerCase();
		const match = Object.entries(gradientMap).find(([key]) => 
			key.toLowerCase() === lowerCountry || lowerCountry.includes(key.toLowerCase())
		);
		
		if (match) {
			return match[1];
		}
		
		// Default gradient for unknown countries: deterministic but varied
		return autoGradient(country);
	}

	// Comprehensive country flag mapping
	function getCountryFlag(country: string): string {
		const flagMap: Record<string, string> = {
			// North America
			'United States': '🇺🇸',
			'USA': '🇺🇸',
			'US': '🇺🇸',
			'Canada': '🇨🇦',
			'Mexico': '🇲🇽',
			'Guatemala': '🇬🇹',
			'Belize': '🇧🇿',
			'El Salvador': '🇸🇻',
			'Honduras': '🇭🇳',
			'Nicaragua': '🇳🇮',
			'Costa Rica': '🇨🇷',
			'Panama': '🇵🇦',
			'Cuba': '🇨🇺',
			'Jamaica': '🇯🇲',
			'Haiti': '🇭🇹',
			'Dominican Republic': '🇩🇴',
			'Puerto Rico': '🇵🇷',
			'Trinidad and Tobago': '🇹🇹',
			'Barbados': '🇧🇧',
			'Bahamas': '🇧🇸',

			// South America
			'Brazil': '🇧🇷',
			'Argentina': '🇦🇷',
			'Chile': '🇨🇱',
			'Colombia': '🇨🇴',
			'Peru': '🇵🇪',
			'Venezuela': '🇻🇪',
			'Ecuador': '🇪🇨',
			'Bolivia': '🇧🇴',
			'Paraguay': '🇵🇾',
			'Uruguay': '🇺🇾',
			'Guyana': '🇬🇾',
			'Suriname': '🇸🇷',
			'French Guiana': '🇬🇫',

			// Europe
			'United Kingdom': '🇬🇧',
			'UK': '🇬🇧',
			'Great Britain': '🇬🇧',
			'Germany': '🇩🇪',
			'France': '🇫🇷',
			'Italy': '🇮🇹',
			'Spain': '🇪🇸',
			'Netherlands': '🇳🇱',
			'Belgium': '🇧🇪',
			'Switzerland': '🇨🇭',
			'Austria': '🇦🇹',
			'Sweden': '🇸🇪',
			'Norway': '🇳🇴',
			'Denmark': '🇩🇰',
			'Finland': '🇫🇮',
			'Poland': '🇵🇱',
			'Czech Republic': '🇨🇿',
			'Czechia': '🇨🇿',
			'Hungary': '🇭🇺',
			'Portugal': '🇵🇹',
			'Greece': '🇬🇷',
			'Turkey': '🇹🇷',
			'Russia': '🇷🇺',
			'Ukraine': '🇺🇦',
			'Romania': '🇷🇴',
			'Bulgaria': '🇧🇬',
			'Croatia': '🇭🇷',
			'Serbia': '🇷🇸',
			'Slovenia': '🇸🇮',
			'Slovakia': '🇸🇰',
			'Lithuania': '🇱🇹',
			'Latvia': '🇱🇻',
			'Estonia': '🇪🇪',
			'Ireland': '🇮🇪',
			'Iceland': '🇮🇸',
			'Luxembourg': '🇱🇺',
			'Malta': '🇲🇹',
			'Cyprus': '🇨🇾',
			'Albania': '🇦🇱',
			'Macedonia': '🇲🇰',
			'North Macedonia': '🇲🇰',
			'Montenegro': '🇲🇪',
			'Bosnia and Herzegovina': '🇧🇦',
			'Moldova': '🇲🇩',
			'Belarus': '🇧🇾',
			'Georgia': '🇬🇪',
			'Armenia': '🇦🇲',
			'Azerbaijan': '🇦🇿',
			'Kazakhstan': '🇰🇿',
			'Uzbekistan': '🇺🇿',
			'Kyrgyzstan': '🇰🇬',
			'Tajikistan': '🇹🇯',
			'Turkmenistan': '🇹🇲',

			// Asia
			'China': '🇨🇳',
			'Japan': '🇯🇵',
			'South Korea': '🇰🇷',
			'Korea': '🇰🇷',
			'North Korea': '🇰🇵',
			'India': '🇮🇳',
			'Pakistan': '🇵🇰',
			'Bangladesh': '🇧🇩',
			'Sri Lanka': '🇱🇰',
			'Nepal': '🇳🇵',
			'Bhutan': '🇧🇹',
			'Maldives': '🇲🇻',
			'Afghanistan': '🇦🇫',
			'Iran': '🇮🇷',
			'Iraq': '🇮🇶',
			'Israel': '🇮🇱',
			'Palestine': '🇵🇸',
			'Jordan': '🇯🇴',
			'Lebanon': '🇱🇧',
			'Syria': '🇸🇾',
			'Saudi Arabia': '🇸🇦',
			'United Arab Emirates': '🇦🇪',
			'UAE': '🇦🇪',
			'Qatar': '🇶🇦',
			'Kuwait': '🇰🇼',
			'Bahrain': '🇧🇭',
			'Oman': '🇴🇲',
			'Yemen': '🇾🇪',
			'Thailand': '🇹🇭',
			'Vietnam': '🇻🇳',
			'Cambodia': '🇰🇭',
			'Laos': '🇱🇦',
			'Myanmar': '🇲🇲',
			'Burma': '🇲🇲',
			'Malaysia': '🇲🇾',
			'Singapore': '🇸🇬',
			'Indonesia': '🇮🇩',
			'Philippines': '🇵🇭',
			'Brunei': '🇧🇳',
			'East Timor': '🇹🇱',
			'Timor-Leste': '🇹🇱',
			'Mongolia': '🇲🇳',
			'Taiwan': '🇹🇼',
			'Hong Kong': '🇭🇰',
			'Macau': '🇲🇴',

			// Africa
			'South Africa': '🇿🇦',
			'Egypt': '🇪🇬',
			'Libya': '🇱🇾',
			'Tunisia': '🇹🇳',
			'Algeria': '🇩🇿',
			'Morocco': '🇲🇦',
			'Sudan': '🇸🇩',
			'South Sudan': '🇸🇸',
			'Ethiopia': '🇪🇹',
			'Eritrea': '🇪🇷',
			'Djibouti': '🇩🇯',
			'Somalia': '🇸🇴',
			'Kenya': '🇰🇪',
			'Uganda': '🇺🇬',
			'Tanzania': '🇹🇿',
			'Rwanda': '🇷🇼',
			'Burundi': '🇧🇮',
			'Democratic Republic of the Congo': '🇨🇩',
			'DRC': '🇨🇩',
			'Congo': '🇨🇬',
			'Central African Republic': '🇨🇫',
			'Chad': '🇹🇩',
			'Niger': '🇳🇪',
			'Nigeria': '🇳🇬',
			'Cameroon': '🇨🇲',
			'Gabon': '🇬🇦',
			'Equatorial Guinea': '🇬🇶',
			'São Tomé and Príncipe': '🇸🇹',
			'Angola': '🇦🇴',
			'Zambia': '🇿🇲',
			'Zimbabwe': '🇿🇼',
			'Botswana': '🇧🇼',
			'Namibia': '🇳🇦',
			'Lesotho': '🇱🇸',
			'Swaziland': '🇸🇿',
			'Eswatini': '🇸🇿',
			'Madagascar': '🇲🇬',
			'Mauritius': '🇲🇺',
			'Seychelles': '🇸🇨',
			'Comoros': '🇰🇲',
			'Cape Verde': '🇨🇻',
			'Guinea-Bissau': '🇬🇼',
			'Guinea': '🇬🇳',
			'Sierra Leone': '🇸🇱',
			'Liberia': '🇱🇷',
			'Ivory Coast': '🇨🇮',
			'Côte d\'Ivoire': '🇨🇮',
			'Ghana': '🇬🇭',
			'Togo': '🇹🇬',
			'Benin': '🇧🇯',
			'Burkina Faso': '🇧🇫',
			'Mali': '🇲🇱',
			'Senegal': '🇸🇳',
			'Gambia': '🇬🇲',
			'Mauritania': '🇲🇷',
			'Western Sahara': '🇪🇭',

			// Oceania
			'Australia': '🇦🇺',
			'New Zealand': '🇳🇿',
			'Papua New Guinea': '🇵🇬',
			'Fiji': '🇫🇯',
			'Solomon Islands': '🇸🇧',
			'Vanuatu': '🇻🇺',
			'New Caledonia': '🇳🇨',
			'French Polynesia': '🇵🇫',
			'Samoa': '🇼🇸',
			'Tonga': '🇹🇴',
			'Kiribati': '🇰🇮',
			'Tuvalu': '🇹🇻',
			'Nauru': '🇳🇷',
			'Palau': '🇵🇼',
			'Marshall Islands': '🇲🇭',
			'Micronesia': '🇫🇲',
			'Cook Islands': '🇨🇰',
			'Niue': '🇳🇺',
			'Tokelau': '🇹🇰',

			// Special cases and common variations
			'Test Country': '🧪',
			'Unknown': '❓',
			'Other': '🌍',
			'Global': '🌍',
			'World': '🌍',
			'International': '🌍',
			'Local': '🏠',
			'Localhost': '🏠',
			'Development': '🛠️',
			'Testing': '🧪',
			'Debug': '🐛'
		};
		
		// Try exact match first
		if (flagMap[country]) {
			return flagMap[country];
		}
		
		// Try case-insensitive match
		const lowerCountry = country.toLowerCase();
		for (const [key, flag] of Object.entries(flagMap)) {
			if (key.toLowerCase() === lowerCountry) {
				return flag;
			}
		}
		
		// Try partial match for common variations
		if (lowerCountry.includes('united states') || lowerCountry.includes('usa') || lowerCountry.includes('america')) {
			return '🇺🇸';
		}
		if (lowerCountry.includes('united kingdom') || lowerCountry.includes('britain') || lowerCountry.includes('england')) {
			return '🇬🇧';
		}
		if (lowerCountry.includes('south korea') || lowerCountry.includes('korea')) {
			return '🇰🇷';
		}
		if (lowerCountry.includes('czech')) {
			return '🇨🇿';
		}
		if (lowerCountry.includes('macedonia')) {
			return '🇲🇰';
		}
		if (lowerCountry.includes('swaziland') || lowerCountry.includes('eswatini')) {
			return '🇸🇿';
		}
		if (lowerCountry.includes('congo')) {
			return '🇨🇩';
		}
		if (lowerCountry.includes('côte') || lowerCountry.includes('ivory')) {
			return '🇨🇮';
		}
		if (lowerCountry.includes('timor')) {
			return '🇹🇱';
		}
		if (lowerCountry.includes('burma')) {
			return '🇲🇲';
		}
		
		// Default fallback
		return '🌍';
	}

	// Process data for chart
	const chartData = $derived(data
		.filter(item => {
			const visitors = typeof item.visitors === 'number' ? item.visitors : parseInt(item.visitors.toString()) || 0;
			return item.country !== null && visitors >= 0;
		})
		.map((item, index) => {
			const gradient = getFlagGradient(item.country!);
			return {
				country: item.country!,
				visitors: parseInt(item.visitors.toString()) || 0,
				vpnVisitors: parseInt(item.vpnVisitors.toString()) || 0,
				color: colors[index % colors.length],
				flag: getCountryFlag(item.country!),
				gradientStart: gradient.start,
				gradientEnd: gradient.end,
				gradientId: `gradient-${index}`
			};
		}));

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
	const chartSize = 400;
	const centerX = chartSize / 2;
	const centerY = chartSize / 2;
	const radius = 100;
	const innerRadius = 50;
	const flagDistance = 150;

	// Calculate flag positions
	const flagPositions = $derived(segments.map(segment => {
		// For full circles (100% or single segment), position flag at top
		// Check if it's close to 360 degrees (accounting for near-complete arcs)
		const angleDiff = segment.endAngle - segment.startAngle;
		const isFullCircle = angleDiff >= 359;
		const angle = isFullCircle ? 0 : segment.middleAngle;
		const radians = (angle - 90) * (Math.PI / 180);
		const x = centerX + Math.cos(radians) * flagDistance;
		const y = centerY + Math.sin(radians) * flagDistance;
		
		// Calculate segment edge position for leader line
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
		
		// If it's a full circle (or very close to it), treat it as almost-full to avoid SVG path issues
		if (angleDiff >= 359.99) {
			// Draw as a near-complete arc (359 degrees) to avoid issues with start/end being the same
			// Use startAngle + 359 so there's a visible but tiny gap
			const adjustedEndAngle = startAngle + 359;
			
			const start = polarToCartesian(centerX, centerY, outerRadius, adjustedEndAngle);
			const end = polarToCartesian(centerX, centerY, outerRadius, startAngle);
			const innerStart = polarToCartesian(centerX, centerY, innerRadius, adjustedEndAngle);
			const innerEnd = polarToCartesian(centerX, centerY, innerRadius, startAngle);
			
			// For near-complete circle, always use large arc flag
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

<div class="chart-container">
	<h3 class="chart-title">{title}</h3>
	
	<div class="chart-content">
		<div class="chart-main">
			<div class="chart-wrapper" style="width: {chartSize}px; height: {chartSize}px; position: relative;">
				<!-- SVG for pie chart and leader lines -->
				<svg width={chartSize} height={chartSize} class="chart-svg">
					<!-- Gradient definitions per segment -->
					<defs>
						{#each segments as segment}
							<linearGradient id={segment.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
								<stop offset="0%" stop-color={segment.gradientStart} />
								<stop offset="100%" stop-color={segment.gradientEnd} />
							</linearGradient>
						{/each}
					</defs>
					<!-- Pie chart segments -->
					{#each segments as segment}
						<path
							d={createArcPath(segment.startAngle, segment.endAngle, radius, innerRadius)}
							fill={`url(#${segment.gradientId})`}
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
							font-size: 20px;
							cursor: pointer;
							z-index: 10;
						"
						on:mouseenter={(e) => showTooltip(e, flag)}
						on:mouseleave={hideTooltip}
					>
						{flag.flag}
					</div>
				{/each}
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
								<span class="legend-flag">{segment.flag}</span>
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
								style="background: linear-gradient(135deg, {segment.gradientStart}, {segment.gradientEnd});"
							></div>
							<div 
								class="legend-color" 
								style="background: linear-gradient(135deg, {segment.gradientStart}, {segment.gradientEnd});"
							></div>
							<span class="legend-flag">{segment.flag}</span>
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
					<span class="tooltip-flag">{tooltip.data.flag}</span>
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
		background: #282828;
		border-radius: 12px;
		padding: 24px;
		border: 1px solid #3a3a3a;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.chart-title {
		color: #f9fafb;
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 20px 0;
		text-align: center;
	}

	.chart-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px;
	}

	.chart-main {
		display: flex;
		align-items: flex-start;
		gap: 20px;
		width: 100%;
		max-width: 1000px;
	}

	.chart-wrapper {
		position: relative;
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.chart-svg {
		position: absolute;
		top: 0;
		left: 0;
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

	.flag-item:hover {
		transform: scale(1.2);
	}

	/* Desktop Legend - Right side */
	.chart-legend-desktop {
		width: 30%;
		min-width: 250px;
		max-width: 300px;
		display: block;
	}

	.legend-scroll {
		max-height: 400px;
		overflow-y: auto;
		padding-right: 8px;
	}

	.legend-scroll::-webkit-scrollbar {
		width: 6px;
	}

	.legend-scroll::-webkit-scrollbar-track {
		background: #282828;
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
		background: #2f2f2f;
		border-radius: 8px;
		border: 1px solid #3a3a3a;
		margin-bottom: 8px;
		transition: background-color 0.2s ease;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.legend-item:hover {
		background: #3a3a3a;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
	}

	.legend-color {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.legend-flag {
		font-size: 18px;
		flex-shrink: 0;
	}

	.legend-text-container {
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 2px;
	}

	.legend-text {
		color: #d1d5db;
		font-size: 14px;
		font-weight: 500;
	}

	.legend-percentage {
		color: #9ca3af;
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
		background: #2f2f2f;
		border-radius: 6px;
		border: 1px solid #3a3a3a;
		margin-bottom: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
		background: #242424;
		border: 1px solid #3a3a3a;
		border-radius: 8px;
		padding: 12px;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
		min-width: 200px;
	}

	.tooltip-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.tooltip-flag {
		font-size: 18px;
	}

	.tooltip-country {
		color: #f9fafb;
		font-weight: 600;
		font-size: 14px;
	}

	.tooltip-body {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.tooltip-stat {
		color: #d1d5db;
		font-size: 12px;
	}

	.tooltip-stat strong {
		color: #60a5fa;
	}

	.vpn-percentage {
		color: #fbbf24;
		margin-left: 4px;
	}

	.no-vpn {
		color: #10b981;
	}

	/* Responsive adjustments */
	@media (max-width: 1024px) {
		.chart-main {
			flex-direction: column;
			align-items: center;
		}

		.chart-legend-desktop {
			display: none;
		}

		.chart-legend-mobile {
			display: block;
		}

		.chart-wrapper {
			justify-content: center;
		}
	}

	@media (max-width: 768px) {
		.chart-container {
			padding: 16px;
		}
		
		.chart-title {
			font-size: 16px;
		}

		.chart-main {
			gap: 16px;
		}

		.chart-wrapper {
			width: 100%;
			height: 300px;
		}

		.chart-svg {
			width: 100%;
			height: 100%;
		}

		.flag-item {
			width: 24px;
			height: 24px;
			font-size: 14px;
		}
	}

	@media (max-width: 480px) {
		.chart-wrapper {
			height: 250px;
		}

		.legend-scroll {
			max-height: 150px;
		}
	}
</style>