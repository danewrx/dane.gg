import { 
	Settings, 
	Users, 
	FileText,
	Sliders,
	TrendingUp,
	FolderKanban,
	MessageSquare
} from 'lucide-svelte';
import type { ComponentType } from 'svelte';

export interface NavigationItem {
	id: string;
	label: string;
	icon: ComponentType;
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
		label: 'Site Settings',
		icon: Settings,
		path: '/admin/configuration',
		description: 'Site configuration and settings'
	},
	{
		id: 'chat',
		label: 'Chat',
		icon: MessageSquare,
		path: '/admin/chat',
		description: 'Site chat management'
	},
	{
		id: 'blog',
		label: 'Blog',
		icon: FileText,
		path: '/admin/blog',
		description: 'Manage blog posts'
	},
	{
		id: 'projects',
		label: 'Projects',
		icon: FolderKanban,
		path: '/admin/projects',
		description: 'Manage projects'
	},
	{
		id: 'users',
		label: 'Users',
		icon: Users,
		path: '/admin/users',
		description: 'Manage user accounts'
	},
	{
		id: 'settings',
		label: 'Settings',
		icon: Sliders,
		path: '/admin/settings',
		description: 'Admin panel settings and preferences'
	}
];
