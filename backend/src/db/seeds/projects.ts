import { db } from '../index';
import { projectCategories, projects, projectTags, tags } from '../schema';

type Category = typeof projectCategories.$inferSelect;
type PortfolioTag = typeof tags.$inferSelect;
type Project = typeof projects.$inferSelect;

export async function seedProjectsAndTagLinks(
	categories: Category[],
	portfolioTags: PortfolioTag[]
): Promise<{ projects: Project[]; projectTagLinkCount: number }> {
	const dev = categories[0];
	const graphics = categories[1];
	const videos = categories[2];
	if (!dev || !graphics || !videos) {
		throw new Error('seedProjectsAndTagLinks: expected 3 categories');
	}

	console.log('🚀 Seeding projects...');
	const projectSeeds = await db
		.insert(projects)
		.values([
			{
				title: 'dane.gg',
				description:
					"My personal website which you're on right now!\nJQuery-only frontend + React (Vite) admin CMS.",
				categoryId: dev.id,
				featured: true,
				published: true,
				imageUrl: null,
				active: 'Active',
				projectUrl: 'https://dane.gg',
				projectText: 'Visit Website',
				repoUrl: 'https://github.com/dane/dane.gg',
				repoText: 'View on GitHub',
				displayOrder: 1
			},
			{
				title: 'dane.lol',
				description: "A website where i make games and random other things when I'm bored!",
				categoryId: dev.id,
				featured: true,
				published: true,
				imageUrl: null,
				active: 'Active',
				projectUrl: 'https://dane.lol',
				projectText: 'Visit Website',
				repoUrl: 'https://github.com/dane/dane.lol',
				repoText: 'View on GitHub',
				displayOrder: 2
			},
			{
				title: 'Task Management App',
				description:
					'A full-stack task management application with real-time collaboration features. Built with React, Node.js, and PostgreSQL.',
				categoryId: dev.id,
				featured: false,
				published: true,
				imageUrl: null,
				active: 'Active',
				projectUrl: 'https://tasks.dane.gg',
				projectText: 'Try Demo',
				repoUrl: 'https://github.com/dane/task-manager',
				repoText: 'View on GitHub',
				displayOrder: 3
			},
			{
				title: 'Weather Dashboard',
				description:
					'A beautiful weather dashboard with location-based forecasts and interactive charts. Built with Vue.js and Chart.js.',
				categoryId: dev.id,
				featured: false,
				published: true,
				imageUrl: null,
				active: 'Complete',
				projectUrl: 'https://weather.dane.gg',
				projectText: 'View App',
				repoUrl: 'https://github.com/dane/weather-dashboard',
				repoText: 'View on GitHub',
				displayOrder: 4
			},
			{
				title: 'Logo Design Collection',
				description:
					"A collection of logo designs I've created for various clients and personal projects.",
				categoryId: graphics.id,
				featured: true,
				published: true,
				imageUrl: null,
				active: 'Active',
				projectUrl: null,
				projectText: 'View Portfolio',
				repoUrl: null,
				repoText: null,
				displayOrder: 1
			},
			{
				title: 'Brand Identity Package',
				description:
					'Complete brand identity design including logo, color palette, typography, and brand guidelines.',
				categoryId: graphics.id,
				featured: false,
				published: true,
				imageUrl: null,
				active: 'Complete',
				projectUrl: null,
				projectText: 'View Case Study',
				repoUrl: null,
				repoText: null,
				displayOrder: 2
			},
			{
				title: 'Tutorial Series',
				description:
					'A comprehensive video tutorial series covering web development fundamentals and advanced techniques.',
				categoryId: videos.id,
				featured: true,
				published: true,
				imageUrl: null,
				active: 'Active',
				projectUrl: 'https://youtube.com/@dane',
				projectText: 'Watch on YouTube',
				repoUrl: null,
				repoText: null,
				displayOrder: 1
			}
		])
		.returning();

	const tagId = (title: string) => portfolioTags.find((t) => t.title === title)?.id;

	console.log('🔗 Linking projects with tags...');
	const projectTagLinks = [
		{ projectId: projectSeeds[0].id, tagId: tagId('JavaScript') },
		{ projectId: projectSeeds[0].id, tagId: tagId('Express') },
		{ projectId: projectSeeds[0].id, tagId: tagId('React') },
		{ projectId: projectSeeds[0].id, tagId: tagId('CSS') },
		{ projectId: projectSeeds[0].id, tagId: tagId('HTML') },
		{ projectId: projectSeeds[0].id, tagId: tagId('TypeScript') },

		{ projectId: projectSeeds[1].id, tagId: tagId('JavaScript') },
		{ projectId: projectSeeds[1].id, tagId: tagId('Express') },
		{ projectId: projectSeeds[1].id, tagId: tagId('CSS') },
		{ projectId: projectSeeds[1].id, tagId: tagId('HTML') },

		{ projectId: projectSeeds[2].id, tagId: tagId('React') },
		{ projectId: projectSeeds[2].id, tagId: tagId('Node.js') },
		{ projectId: projectSeeds[2].id, tagId: tagId('PostgreSQL') },

		{ projectId: projectSeeds[3].id, tagId: tagId('Vue.js') },
		{ projectId: projectSeeds[3].id, tagId: tagId('JavaScript') }
	].filter((link): link is { projectId: string; tagId: string } => Boolean(link.tagId));

	await db.insert(projectTags).values(projectTagLinks);

	return { projects: projectSeeds, projectTagLinkCount: projectTagLinks.length };
}
