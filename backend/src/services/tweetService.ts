import { logger } from '../utils/logger';
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
	postedAt?: Date;
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
			logger.error('Error fetching latest tweet:', error);
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
				updatedAt: new Date(),
				...(tweetData.postedAt ? { createdAt: tweetData.postedAt } : {})
			};

			if (existingTweet.length > 0) {
				// Update existing tweet
				await db.update(tweets).set(tweetRecord).where(eq(tweets.tweetId, tweetData.tweetId));

				logger.info(`Updated tweet: ${tweetData.tweetId}`);
			} else {
				// Create new tweet
				await db.insert(tweets).values(tweetRecord);
				logger.info(`Created new tweet: ${tweetData.tweetId}`);
			}

			await this.cleanupOldRecords();

			return true;
		} catch (error) {
			logger.error('Error upserting tweet:', error);
			return false;
		}
	}

	/**
	 * Delete a tweet by tweetId
	 */
	static async setTweetPostedAt(tweetId: string, postedAt: Date): Promise<boolean> {
		try {
			await db
				.update(tweets)
				.set({ createdAt: postedAt, updatedAt: new Date() })
				.where(eq(tweets.tweetId, tweetId));
			return true;
		} catch (error) {
			logger.error('Error setting tweet posted time:', error);
			return false;
		}
	}

	static async deleteTweet(tweetId: string): Promise<boolean> {
		try {
			await db.delete(tweets).where(eq(tweets.tweetId, tweetId));

			logger.info(`Deleted tweet: ${tweetId}`);
			return true;
		} catch (error) {
			logger.error('Error deleting tweet:', error);
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
			logger.error('Error fetching all tweets:', error);
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
			logger.error('Error getting tweet count:', error);
			return 0;
		}
	}

	/**
	 * Clean up old tweet records.
	 * Controlled by TWITTER_MAX_STORED_TWEETS:
	 * - <= 0 (default): keep all history
	 * - > 0: keep only the most recent N tweets
	 */
	static async cleanupOldRecords(): Promise<boolean> {
		try {
			const rawMax = process.env.TWITTER_MAX_STORED_TWEETS ?? '0';
			const maxStoredTweets = Number.parseInt(rawMax, 10);

			if (!Number.isFinite(maxStoredTweets) || maxStoredTweets <= 0) {
				return true;
			}

			// Get all records ordered by createdAt
			const allRecords = await db
				.select({ id: tweets.id })
				.from(tweets)
				.orderBy(desc(tweets.createdAt));

			if (allRecords.length > maxStoredTweets) {
				const recordsToDelete = allRecords.slice(maxStoredTweets);
				const idsToDelete = recordsToDelete.map((record) => record.id);

				// Delete all old records at once
				for (const id of idsToDelete) {
					await db.delete(tweets).where(eq(tweets.id, id));
				}

				logger.info(
					`Cleaned up ${recordsToDelete.length} old tweet records (kept last ${maxStoredTweets})`
				);
			}

			return true;
		} catch (error) {
			logger.error('Error cleaning up tweet records:', error);
			return false;
		}
	}

	/**
	 * Get all stored tweet IDs (used for backfilling missing tweets).
	 */
	static async getAllTweetIds(): Promise<string[]> {
		try {
			const rows = await db.select({ tweetId: tweets.tweetId }).from(tweets);
			return rows.map((r) => r.tweetId);
		} catch (error) {
			logger.error('Error fetching tweet ids:', error);
			return [];
		}
	}

	/**
	 * Delete tweets that are not in the provided set of tweet IDs.
	 * @returns Number of tweets deleted
	 */
	static async deleteTweetsNotIn(keepTweetIds: Set<string>): Promise<number> {
		if (keepTweetIds.size === 0) {
			return 0;
		}

		try {
			const storedIds = await this.getAllTweetIds();
			let deleted = 0;

			for (const tweetId of storedIds) {
				if (keepTweetIds.has(tweetId)) continue;
				const ok = await this.deleteTweet(tweetId);
				if (ok) deleted++;
			}

			return deleted;
		} catch (error) {
			logger.error('Error deleting tweets not in backfill set:', error);
			return 0;
		}
	}
}
