import { 
	Settings, 
	Home, 
	Users, 
	BarChart3, 
	FileText,
	Sliders
} from 'lucide-svelte';

export interface NavigationItem {
	id: string;
	label: string;
	icon: any;
	path: string;
	description?: string;
}

// Shared navigation configuration for admin panel
export const adminNavigation: NavigationItem[] = [
	{
		id: 'configuration',
		label: 'Configuration',
		icon: Settings,
		path: '/admin/configuration',
		description: 'Site configuration and settings'
	},
	{
		id: 'settings',
		label: 'Settings',
		icon: Sliders,
		path: '/admin/settings',
		description: 'Admin panel settings and preferences'
	}
];
