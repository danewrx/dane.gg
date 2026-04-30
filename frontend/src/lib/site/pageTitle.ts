const PUBLIC_TITLE_SUFFIX = 'dane.gg (丹恩)';
const ADMIN_TITLE_SUFFIX = 'Admin - dane.gg (丹恩)';

/** Public site: `<PAGE NAME> - dane.gg (丹恩)` */
export function publicPageTitle(pageName: string): string {
	return `${pageName.trim()} - ${PUBLIC_TITLE_SUFFIX}`;
}

/** Admin (and login/logout): `<PAGE NAME> - Admin - dane.gg (丹恩)` */
export function adminPageTitle(pageName: string): string {
	return `${pageName.trim()} - ${ADMIN_TITLE_SUFFIX}`;
}
