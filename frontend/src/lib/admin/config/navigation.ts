import { 
	Settings, 
	Home, 
	Users, 
	BarChart3, 
	FileText,
	Sliders,
	TrendingUp
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
		id: 'stats',
		label: 'Statistics',
		icon: TrendingUp,
		path: '/admin/stats',
		description: 'Website analytics and visitor statistics'
	},
	{
		id: 'configuration',
		label: 'Configuration',
		icon: Settings,
		path: '/admin/configuration',
		description: 'Site configuration and settings'
	},
	{
		id: 'blog',
		label: 'Blog',
		icon: FileText,
		path: '/admin/blog',
		description: 'Manage blog posts'
	},
	{
		id: 'settings',
		label: 'Settings',
		icon: Sliders,
		path: '/admin/settings',
		description: 'Admin panel settings and preferences'
	}
];
