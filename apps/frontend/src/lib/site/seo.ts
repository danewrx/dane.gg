import { publicPageTitle } from '$lib/site/pageTitle';

export const DEFAULT_SITE_DESCRIPTION =
	"Hi, I'm Dane! I'm a software engineer & freelance designer from Preston, UK.";

// 1200x630 card; regenerate with `bun run og:default` in apps/backend
export const DEFAULT_OG_IMAGE_PATH = '/assets/og-default.png';

export type StaticRouteSeo = { title: string; description: string };

export function getStaticRouteSeo(pathname: string): StaticRouteSeo | null {
	switch (pathname) {
		case '/':
			return { title: 'dane.gg (丹恩)', description: DEFAULT_SITE_DESCRIPTION };
		case '/about':
			return {
				title: publicPageTitle('About'),
				description: "Hi, I'm Dane! I'm a software engineer & freelance designer from Preston, UK."
			};
		case '/contact':
			return {
				title: publicPageTitle('Contact'),
				description: 'Get in touch with me for collaboration or inquiries.'
			};
		case '/projects':
			return {
				title: publicPageTitle('Projects'),
				description: "Explore my portfolio of software, design, and other random projects."
			};
		case '/blog':
			return {
				title: publicPageTitle('Blog'),
				description:
					'Read my latest blog posts about software, design, and other random stuff I feel like writing about.'
			};
		default:
			return null;
	}
}

export function plainTextExcerpt(markdown: string, maxLength: number): string {
	const s = markdown
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`[^`]*`/g, ' ')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/[#*_~>|]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return s.length <= maxLength ? s : `${s.slice(0, maxLength - 1).trim()}…`;
}
