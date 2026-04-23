import { logger } from '../../utils/logger';
import { db } from '../index';
import { projectCategories, tags } from '../schema';

type Category = typeof projectCategories.$inferSelect;

export async function seedPortfolioTags(categories: Category[]) {
	logger.info('Seeding tags...');
	const dev = categories[0];
	if (!dev) throw new Error('seedPortfolioTags: missing Development category');

	return db
		.insert(tags)
		.values([
			{ title: 'JavaScript', color: '#F0DB4F', categoryId: dev.id },
			{ title: 'Express', color: '#000000', categoryId: dev.id },
			{ title: 'React', color: '#61DAFB', categoryId: dev.id },
			{ title: 'CSS', color: '#2965f1', categoryId: dev.id },
			{ title: 'HTML', color: '#e34c26', categoryId: dev.id },
			{ title: 'TypeScript', color: '#3178c6', categoryId: dev.id },
			{ title: 'Svelte', color: '#ff3e00', categoryId: dev.id },
			{ title: 'Node.js', color: '#43853D', categoryId: dev.id },
			{ title: 'Vue.js', color: '#4fc08d', categoryId: dev.id },
			{ title: 'Python', color: '#3776ab', categoryId: dev.id },
			{ title: 'PostgreSQL', color: '#336791', categoryId: dev.id },
			{ title: 'Docker', color: '#2496ed', categoryId: dev.id }
		])
		.returning();
}
