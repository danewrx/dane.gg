/**
 * Database seed entrypoint. Individual datasets live in `./seeds/*` for easier maintenance.
 *
 * Order matters: see each module’s imports / FK usage. `clear.ts` must stay aligned with FK graph.
 */
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
import { seedThemes } from './seeds/themes';
import { seedVisitorStats } from './seeds/visitor-stats';

export async function seed() {
	console.log('🌱 Starting database seed...');

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
		const themeSeeds = await seedThemes();
		const visitorCount = await seedVisitorStats();

		console.log('✅ Database seeded successfully!');
		console.log(`📊 Seeded data:`);
		console.log(`   - ${categories.length} project categories`);
		console.log(`   - ${portfolioTags.length} tags`);
		console.log(`   - ${blogTagSeeds.length} blog tags`);
		console.log(`   - ${projectSeeds.length} projects`);
		console.log(`   - ${postSeeds.length} blog posts`);
		console.log(`   - ${projectTagLinkCount} project-tag relationships`);
		console.log(`   - ${postTagLinkCount} post-tag relationships`);
		console.log(`   - 5 site configuration settings`);
		console.log(`   - ${contactEmailSeeds.length} contact emails`);
		console.log(`   - 4 contact page settings`);
		console.log(`   - ${themeSeeds.length} themes`);
		console.log(`   - ${visitorCount} visitor statistics records`);
	} catch (error) {
		console.error('❌ Error seeding database:', error);
		throw error;
	}
}

if (import.meta.main) {
	seed()
		.then(() => {
			console.log('🎉 Seed completed successfully!');
			process.exit(0);
		})
		.catch((error) => {
			console.error('💥 Seed failed:', error);
			process.exit(1);
		});
}
