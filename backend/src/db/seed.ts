/**
 * Database seed entrypoint. Individual datasets live in `./seeds/*` for easier maintenance.
 *
 * Order matters: see each module’s imports / FK usage. `clear.ts` must stay aligned with FK graph.
 */
import { logger } from '../utils/logger';
import { setupWebsiteSchema } from './seeds/setup-schema';
import { clearAllSeedData } from './seeds/clear';
import { seedFonts } from './seeds/fonts';
import { seedProjectCategories } from './seeds/project-categories';
import { seedPortfolioTags } from './seeds/portfolio-tags';
import { seedBlogTags } from './seeds/blog-tags';
import { seedProjectsAndTagLinks } from './seeds/projects';
import { seedBlogPostsAndTagLinks } from './seeds/blog-posts';
import { seedSiteConfig } from './seeds/site-config';
import { seedContactEmails } from './seeds/contact-emails';
import { seedContactPageSettings } from './seeds/contact-page-settings';
import { seedThemeCategories } from './seeds/theme-categories';
import { seedThemes } from './seeds/themes';
import { seedVisitorStats } from './seeds/visitor-stats';

export async function seed() {
	logger.info('Starting database seed...');

	try {
		await setupWebsiteSchema();
		await clearAllSeedData();

		await seedFonts();
		const categories = await seedProjectCategories();
		const portfolioTags = await seedPortfolioTags(categories);
		const blogTagSeeds = await seedBlogTags();
		const { projects: projectSeeds, projectTagLinkCount } = await seedProjectsAndTagLinks(
			categories,
			portfolioTags
		);
		const { posts: postSeeds, postTagLinkCount } = await seedBlogPostsAndTagLinks(blogTagSeeds);

		await seedSiteConfig();
		const contactEmailSeeds = await seedContactEmails();
		await seedContactPageSettings();
		const themeCategorySeeds = await seedThemeCategories();
		const themeSeeds = await seedThemes();
		const visitorCount = await seedVisitorStats();

		logger.info('Database seeded successfully!');
		logger.info(`Seeded data:`);
		logger.info(`   - ${categories.length} project categories`);
		logger.info(`   - ${portfolioTags.length} tags`);
		logger.info(`   - ${blogTagSeeds.length} blog tags`);
		logger.info(`   - ${projectSeeds.length} projects`);
		logger.info(`   - ${postSeeds.length} blog posts`);
		logger.info(`   - ${projectTagLinkCount} project-tag relationships`);
		logger.info(`   - ${postTagLinkCount} post-tag relationships`);
		logger.info(`   - 5 site configuration settings`);
		logger.info(`   - ${contactEmailSeeds.length} contact emails`);
		logger.info(`   - 4 contact page settings`);
		logger.info(`   - ${themeCategorySeeds.length} theme categories`);
		logger.info(`   - ${themeSeeds.length} themes`);
		logger.info(`   - ${visitorCount} visitor statistics records`);
	} catch (error) {
		logger.error('Error seeding database:', error);
		throw error;
	}
}

if (import.meta.main) {
	seed()
		.then(() => {
			logger.info('Seed completed successfully!');
			process.exit(0);
		})
		.catch((error) => {
			logger.error('Seed failed:', error);
			process.exit(1);
		});
}
