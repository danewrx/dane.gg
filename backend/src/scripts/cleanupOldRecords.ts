import { db } from '../db';
import { discordStatus, tweets } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Manual cleanup script to remove old records and keep only the last 30
 * Run this with: npx tsx src/scripts/cleanupOldRecords.ts
 */

async function cleanupDiscordStatus() {
	try {
		console.log('Cleaning up Discord status records...');

		// Get all records ordered by lastUpdate
		const allRecords = await db
			.select({ id: discordStatus.id, lastUpdate: discordStatus.lastUpdate })
			.from(discordStatus)
			.orderBy(desc(discordStatus.lastUpdate));

		console.log(`Found ${allRecords.length} Discord status records`);

		// If we have more than 30 records, delete the oldest ones
		if (allRecords.length > 30) {
			const recordsToDelete = allRecords.slice(30);
			console.log(`Deleting ${recordsToDelete.length} old Discord status records...`);

			// Delete all old records
			for (const record of recordsToDelete) {
				await db.delete(discordStatus).where(eq(discordStatus.id, record.id));
			}

			console.log(
				`✅ Cleaned up ${recordsToDelete.length} old Discord status records (kept last 30)`
			);
		} else {
			console.log('✅ No cleanup needed for Discord status records');
		}
	} catch (error) {
		console.error('❌ Error cleaning up Discord status records:', error);
	}
}

async function cleanupTweets() {
	try {
		console.log('Cleaning up tweet records...');

		// Get all records ordered by createdAt
		const allRecords = await db
			.select({ id: tweets.id, createdAt: tweets.createdAt })
			.from(tweets)
			.orderBy(desc(tweets.createdAt));

		console.log(`Found ${allRecords.length} tweet records`);

		// If we have more than 30 records, delete the oldest ones
		if (allRecords.length > 30) {
			const recordsToDelete = allRecords.slice(30);
			console.log(`Deleting ${recordsToDelete.length} old tweet records...`);

			// Delete all old records
			for (const record of recordsToDelete) {
				await db.delete(tweets).where(eq(tweets.id, record.id));
			}

			console.log(`✅ Cleaned up ${recordsToDelete.length} old tweet records (kept last 30)`);
		} else {
			console.log('✅ No cleanup needed for tweet records');
		}
	} catch (error) {
		console.error('❌ Error cleaning up tweet records:', error);
	}
}

async function main() {
	console.log('🧹 Starting database cleanup...\n');

	await cleanupDiscordStatus();
	console.log('');
	await cleanupTweets();

	console.log('\n✨ Database cleanup completed!');
	process.exit(0);
}

main().catch((error) => {
	console.error('❌ Script failed:', error);
	process.exit(1);
});
