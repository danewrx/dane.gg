import { db } from '../db';
import { tweets, type Tweet, type NewTweet } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export interface TweetData {
	tweetId: string;
	content: string;
	authorName: string;
	authorUsername: string;
	authorProfileImage?: string;
	authorProfileUrl?: string;
	tweetUrl?: string;
}

export class TweetService {
	/**
	 * Get the latest tweet from the database
	 */
	static async getLatestTweet(): Promise<Tweet | null> {
		try {
			const latestTweet = await db.select().from(tweets).orderBy(desc(tweets.createdAt)).limit(1);

			return latestTweet[0] || null;
		} catch (error) {
			console.error('Error fetching latest tweet:', error);
			return null;
		}
	}

	/**
	 * Create or update a tweet in the database
	 * Uses UPSERT pattern - updates if tweetId exists, creates if not
	 */
	static async upsertTweet(tweetData: TweetData): Promise<boolean> {
		try {
			// Check if tweet already exists
			const existingTweet = await db
				.select()
				.from(tweets)
				.where(eq(tweets.tweetId, tweetData.tweetId))
				.limit(1);

			const tweetRecord: NewTweet = {
				tweetId: tweetData.tweetId,
				content: tweetData.content,
				authorName: tweetData.authorName,
				authorUsername: tweetData.authorUsername,
				authorProfileImage: tweetData.authorProfileImage || null,
				authorProfileUrl: tweetData.authorProfileUrl || null,
				tweetUrl: tweetData.tweetUrl || null,
				updatedAt: new Date()
			};

			if (existingTweet.length > 0) {
				// Update existing tweet
				await db.update(tweets).set(tweetRecord).where(eq(tweets.tweetId, tweetData.tweetId));

				console.log(`Updated tweet: ${tweetData.tweetId}`);
			} else {
				// Create new tweet
				await db.insert(tweets).values(tweetRecord);
				console.log(`Created new tweet: ${tweetData.tweetId}`);
			}

			// Clean up old records after each update
			await this.cleanupOldRecords();

			return true;
		} catch (error) {
			console.error('Error upserting tweet:', error);
			return false;
		}
	}

	/**
	 * Delete a tweet by tweetId
	 */
	static async deleteTweet(tweetId: string): Promise<boolean> {
		try {
			await db.delete(tweets).where(eq(tweets.tweetId, tweetId));

			console.log(`Deleted tweet: ${tweetId}`);
			return true;
		} catch (error) {
			console.error('Error deleting tweet:', error);
			return false;
		}
	}

	/**
	 * Get all tweets (for admin purposes)
	 */
	static async getAllTweets(): Promise<Tweet[]> {
		try {
			return await db.select().from(tweets).orderBy(desc(tweets.createdAt));
		} catch (error) {
			console.error('Error fetching all tweets:', error);
			return [];
		}
	}

	/**
	 * Get tweet count
	 */
	static async getTweetCount(): Promise<number> {
		try {
			const result = await db.select({ count: tweets.id }).from(tweets);

			return result.length;
		} catch (error) {
			console.error('Error getting tweet count:', error);
			return 0;
		}
	}

	/**
	 * Clean up old tweet records (keep only last 30)
	 */
	static async cleanupOldRecords(): Promise<boolean> {
		try {
			// Get all records ordered by createdAt
			const allRecords = await db
				.select({ id: tweets.id })
				.from(tweets)
				.orderBy(desc(tweets.createdAt));

			// If we have more than 30 records, delete the oldest ones
			if (allRecords.length > 30) {
				const recordsToDelete = allRecords.slice(30);
				const idsToDelete = recordsToDelete.map((record) => record.id);

				// Delete all old records at once
				for (const id of idsToDelete) {
					await db.delete(tweets).where(eq(tweets.id, id));
				}

				console.log(`Cleaned up ${recordsToDelete.length} old tweet records (kept last 30)`);
			}

			return true;
		} catch (error) {
			console.error('Error cleaning up tweet records:', error);
			return false;
		}
	}
}
