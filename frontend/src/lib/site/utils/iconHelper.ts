import * as LucideIcons from 'lucide-svelte';
import Icon from '@iconify/svelte';
import type { ComponentType } from 'svelte';

// Map of common icon names to their Lucide components
const iconMap: Record<string, ComponentType> = {
	ExternalLink: LucideIcons.ExternalLink,
	Github: LucideIcons.Github,
	Gitlab: LucideIcons.GitBranch,
	Bitbucket: LucideIcons.Code,
	Codeberg: LucideIcons.Code2,
	'Git Server': LucideIcons.Server,
	Globe: LucideIcons.Globe,
	Link: LucideIcons.Link,
	ArrowRight: LucideIcons.ArrowRight,
	Play: LucideIcons.Play,
	Eye: LucideIcons.Eye,
	Download: LucideIcons.Download,
	FileText: LucideIcons.FileText,
	Package: LucideIcons.Package,
	// Add more as needed
};

export interface IconRenderInfo {
	type: 'lucide' | 'iconify' | 'svg' | 'text' | 'default';
	component?: ComponentType;
	icon?: string;
	url?: string;
	text?: string;
}

/**
 * Get icon render information based on icon name
 * Supports:
 * - Lucide icons (just the icon name, e.g., "ExternalLink")
 * - CoreUI brand icons (format: "cib-{iconName}", e.g., "cib-github")
 * - Custom SVG URLs (starts with "http://" or "https://")
 * - Custom text (any other string)
 */
export function getIconRenderInfo(iconName: string | null | undefined): IconRenderInfo {
	if (!iconName) {
		return { type: 'default', component: LucideIcons.ExternalLink };
	}

	// Check if it's a CoreUI brand icon (format: "cib-{iconName}")
	if (iconName.startsWith('cib-')) {
		const iconSet = iconName.substring(4); // Remove "cib-" prefix
		return {
			type: 'iconify',
			icon: `cib:${iconSet}`
		};
	}

	// Check if custom SVG URL
	if (iconName.startsWith('http://') || iconName.startsWith('https://')) {
		return {
			type: 'svg',
			url: iconName
		};
	}

	// Try to find as Lucide icon
	if (iconName in iconMap) {
		return {
			type: 'lucide',
			component: iconMap[iconName]
		};
	}

	// Try case-insensitive match in iconMap
	const lowerName = iconName.toLowerCase();
	for (const [key, value] of Object.entries(iconMap)) {
		if (key.toLowerCase() === lowerName) {
			return {
				type: 'lucide',
				component: value
			};
		}
	}

	// Try to find in LucideIcons directly (for PascalCase names)
	if (iconName in LucideIcons) {
		return {
			type: 'lucide',
			component: (LucideIcons as any)[iconName]
		};
	}

	const pascalName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
	if (pascalName in LucideIcons && pascalName !== iconName) {
		return {
			type: 'lucide',
			component: (LucideIcons as any)[pascalName]
		};
	}

	const lowerIconName = iconName.toLowerCase();
	for (const key in LucideIcons) {
		if (key.toLowerCase() === lowerIconName) {
			return {
				type: 'lucide',
				component: (LucideIcons as any)[key]
			};
		}
	}

	return {
		type: 'text',
		text: iconName
	};
}

/**
 * Get a Lucide icon component by name
 * Falls back to ExternalLink if icon not found
 */
export function getIconComponent(iconName: string | null | undefined): ComponentType {
	const info = getIconRenderInfo(iconName);
	if (info.type === 'lucide' && info.component) {
		return info.component;
	}
	return LucideIcons.ExternalLink; // Default
}

