import { logger } from '../../utils/logger';
import { db } from '../index';
import { blogTags } from '../schema';

export async function seedBlogTags() {
	logger.info('Seeding blog tags...');
	return db
		.insert(blogTags)
		.values([
			{ name: 'Tutorial' },
			{ name: 'Web Development' },
			{ name: 'JavaScript' },
			{ name: 'React' },
			{ name: 'Node.js' },
			{ name: 'Database' },
			{ name: 'DevOps' },
			{ name: 'Programming' },
			{ name: 'Tips & Tricks' },
			{ name: 'Project Showcase' }
		])
		.returning();
}
