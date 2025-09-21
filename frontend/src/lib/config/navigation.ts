import { 
	Settings, 
	Home, 
	Users, 
	BarChart3, 
	FileText
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
		id: 'settings',
		label: 'Settings',
		icon: Settings,
		path: '/admin/configuration',
		description: 'Site configuration and settings'
	}
];
