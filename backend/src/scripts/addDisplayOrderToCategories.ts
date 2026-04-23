import { logger } from '../utils/logger';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function addDisplayOrderToCategories() {
	try {
		logger.info('Adding display_order column to project_categories...');

		await db.execute(sql`
      ALTER TABLE website.project_categories
      ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
    `);

		logger.info('Column added successfully');

		// Update existing categories to have sequential display_order values
		logger.info('Updating existing categories with display_order values...');
		await db.execute(sql`
      UPDATE website.project_categories
      SET display_order = subquery.row_number
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_number
        FROM website.project_categories
      ) AS subquery
      WHERE website.project_categories.id = subquery.id;
    `);

		logger.info('Migration completed successfully!');
		process.exit(0);
	} catch (error) {
		logger.error('Error running migration:', error);
		process.exit(1);
	}
}

addDisplayOrderToCategories();
