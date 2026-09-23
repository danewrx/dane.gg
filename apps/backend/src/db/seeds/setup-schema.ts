import { logger } from '../../utils/logger';
import { db } from '../index';
import { sql } from 'drizzle-orm';

export async function setupWebsiteSchema() {
	logger.info('Creating website schema...');
	await db.execute(sql`CREATE SCHEMA IF NOT EXISTS website`);
	await db.execute(sql`GRANT USAGE ON SCHEMA website TO dane_gg`);
	await db.execute(
		sql`ALTER DEFAULT PRIVILEGES IN SCHEMA website GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dane_gg`
	);
	await db.execute(
		sql`ALTER DEFAULT PRIVILEGES IN SCHEMA website GRANT USAGE, SELECT ON SEQUENCES TO dane_gg`
	);
}
