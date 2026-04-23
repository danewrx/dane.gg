import { logger } from '../utils/logger';
import { db } from '../db';
import { discordStatus, tweets } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Manual cleanup script to remove old records and keep only the last 30
 * Run this with: npx tsx src/scripts/cleanupOldRecords.ts
 */

async function cleanupDiscordStatus() {
	try {
		logger.info('Cleaning up Discord status records...');

		// Get all records ordered by lastUpdate
		const allRecords = await db
			.select({ id: discordStatus.id, lastUpdate: discordStatus.lastUpdate })
			.from(discordStatus)
			.orderBy(desc(discordStatus.lastUpdate));

		logger.info(`Found ${allRecords.length} Discord status records`);

		// If we have more than 30 records, delete the oldest ones
		if (allRecords.length > 30) {
			const recordsToDelete = allRecords.slice(30);
			logger.info(`Deleting ${recordsToDelete.length} old Discord status records...`);

			// Delete all old records
			for (const record of recordsToDelete) {
				await db.delete(discordStatus).where(eq(discordStatus.id, record.id));
			}

			logger.info(
				`✅ Cleaned up ${recordsToDelete.length} old Discord status records (kept last 30)`
			);
		} else {
			logger.info('No cleanup needed for Discord status records');
		}
	} catch (error) {
		logger.error('Error cleaning up Discord status records:', error);
	}
}

async function cleanupTweets() {
	try {
		logger.info('Cleaning up tweet records...');

		// Get all records ordered by createdAt
		const allRecords = await db
			.select({ id: tweets.id, createdAt: tweets.createdAt })
			.from(tweets)
			.orderBy(desc(tweets.createdAt));

		logger.info(`Found ${allRecords.length} tweet records`);

		// If we have more than 30 records, delete the oldest ones
		if (allRecords.length > 30) {
			const recordsToDelete = allRecords.slice(30);
			logger.info(`Deleting ${recordsToDelete.length} old tweet records...`);

			// Delete all old records
			for (const record of recordsToDelete) {
				await db.delete(tweets).where(eq(tweets.id, record.id));
			}

			logger.info(`Cleaned up ${recordsToDelete.length} old tweet records (kept last 30)`);
		} else {
			logger.info('No cleanup needed for tweet records');
		}
	} catch (error) {
		logger.error('Error cleaning up tweet records:', error);
	}
}

async function main() {
	logger.info('Starting database cleanup...\n');

	await cleanupDiscordStatus();
	logger.info('');
	await cleanupTweets();

	logger.info('\nDatabase cleanup completed!');
	process.exit(0);
}

main().catch((error) => {
	logger.error('Script failed:', error);
	process.exit(1);
});
