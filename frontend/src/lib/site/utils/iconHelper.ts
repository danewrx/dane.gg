import * as ComponentIcons from 'lucide-svelte';
import Icon from '@iconify/svelte';
import type { ComponentType } from 'svelte';

export interface IconRenderInfo {
	type: 'component' | 'iconify' | 'svg' | 'text' | 'default';
	component?: ComponentType;
	icon?: string;
	url?: string;
	text?: string;
}

// Map of common icon names to component library components
const commonIconMap: Record<string, ComponentType> = {
	ExternalLink: ComponentIcons.ExternalLink,
	Github: ComponentIcons.Github,
	Gitlab: ComponentIcons.GitBranch,
	Bitbucket: ComponentIcons.Code,
	Codeberg: ComponentIcons.Code2,
	'Git Server': ComponentIcons.Server,
	Globe: ComponentIcons.Globe,
	Link: ComponentIcons.Link,
	ArrowRight: ComponentIcons.ArrowRight,
	Play: ComponentIcons.Play,
	Eye: ComponentIcons.Eye,
	Download: ComponentIcons.Download,
	FileText: ComponentIcons.FileText,
	Package: ComponentIcons.Package
};

/**
 * Attempt to find component icon from available component libraries
 */
function findComponentIcon(iconName: string): ComponentType | null {
	// Check common first
	if (iconName in commonIconMap) {
		return commonIconMap[iconName];
	}

	const lowerName = iconName.toLowerCase();
	for (const [key, value] of Object.entries(commonIconMap)) {
		if (key.toLowerCase() === lowerName) {
			return value;
		}
	}

	if (iconName in ComponentIcons) {
		return (ComponentIcons as any)[iconName];
	}

	const pascalName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
	if (pascalName in ComponentIcons && pascalName !== iconName) {
		return (ComponentIcons as any)[pascalName];
	}

	const lowerIconName = iconName.toLowerCase();
	for (const key in ComponentIcons) {
		if (key.toLowerCase() === lowerIconName) {
			return (ComponentIcons as any)[key];
		}
	}

	return null;
}

/**
 * Get icon render information based on icon identifier string
 *
 * @param iconName - Icon identifier string (can be name, URL, or prefixed identifier)
 * @returns IconRenderInfo object with type and rendering data
 */
export function getIconRenderInfo(iconName: string | null | undefined): IconRenderInfo {
	if (!iconName) {
		return { type: 'default', component: ComponentIcons.ExternalLink };
	}

	if (iconName.startsWith('custom-text-')) {
		const text = iconName.substring(12);
		return {
			type: 'text',
			text: text
		};
	}

	if (iconName.startsWith('cib-')) {
		const iconSet = iconName.substring(4);
		return {
			type: 'iconify',
			icon: `cib:${iconSet}`
		};
	}

	if (iconName.startsWith('http://') || iconName.startsWith('https://')) {
		return {
			type: 'svg',
			url: iconName
		};
	}

	const component = findComponentIcon(iconName);
	if (component) {
		return {
			type: 'component',
			component
		};
	}

	// Fallback: treat as custom text
	return {
		type: 'text',
		text: iconName
	};
}
