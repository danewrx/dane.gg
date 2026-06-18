import { logger } from '../utils/logger';
import Emusks from 'emusks';
import { TweetService, type TweetData } from './tweetService';
import { NotificationService } from './notificationService';
import { getNotificationSettings } from './notificationSettings';
import { resolveTemplatedAppearance } from './ntfyTemplate';
import { ConfigService } from './config';
import { invalidateCached } from '../utils/shortLivedCache';

function isRetweet(text: string): boolean {
	return text.trimStart().startsWith('RT @');
}

function isReply(tweet: any): boolean {
	return !!tweet.in_reply_to_status_id;
}

function parseTweetPostedAt(createdAt: string | undefined): Date | undefined {
	if (!createdAt) return undefined;
	const d = new Date(createdAt);
	return isNaN(d.getTime()) ? undefined : d;
}

function tweetToTweetData(tweet: any, fallbackUsername: string): TweetData {
	const authorUsername = tweet.user?.username || fallbackUsername;
	return {
		tweetId: tweet.id,
		content: tweet.text,
		authorName: tweet.user?.name || authorUsername,
		authorUsername,
		authorProfileImage: tweet.user?.profile_image || undefined,
		authorProfileUrl: `https://x.com/${authorUsername}`,
		tweetUrl: `https://x.com/${authorUsername}/status/${tweet.id}`,
		postedAt: parseTweetPostedAt(tweet.created_at)
	};
}

function pickNewest(a: any, b: any): any {
	if (!a) return b;
	if (!b) return a;
	try {
		return BigInt(a.id) >= BigInt(b.id) ? a : b;
	} catch {
		return a;
	}
}

export class TwitterApiService {
	private static client: any = null;
	private static lastFetchTime = 0;
	private static lastFullBackfillTime = 0;
	private static consecutiveErrors = 0;
	private static consecutiveFullBackfillErrors = 0;
	private static lastConnectionStatus: 'connected' | 'disconnected' | 'unknown' = 'unknown';
	private static lastNotificationTime = 0;
	private static readonly MIN_FETCH_INTERVAL = 30_000;
	private static readonly MAX_CONSECUTIVE_ERRORS = 5;
	private static readonly MIN_FULL_BACKFILL_INTERVAL_MS = 6 * 60 * 60 * 1000;
	private static readonly NOTIFICATION_COOLDOWN = 30 * 60 * 1000;

	private static async getUsername(): Promise<string | null> {
		try {
			const dbUsername = await ConfigService.get('twitter_username');
			if (dbUsername && typeof dbUsername === 'string' && dbUsername.trim()) {
				return dbUsername.trim();
			}
		} catch {}
		return process.env.TWITTER_USERNAME || null;
	}

	static async initialize(): Promise<boolean> {
		const authToken = process.env.TWITTER_AUTH_TOKEN;
		if (!authToken) {
			logger.error('TWITTER_AUTH_TOKEN environment variable is not set');
			return false;
		}
		try {
			const client = new Emusks();
			await client.login(authToken);
			this.client = client;
			logger.info('Client initialized successfully');
			return true;
		} catch (error: any) {
			this.client = null;
			logger.error('Failed to initialize client:', error.message);
			return false;
		}
	}

	private static async ensureClient(): Promise<boolean> {
		if (this.client) return true;
		return this.initialize();
	}

	static async isConfigured(): Promise<boolean> {
		const username = await this.getUsername();
		return !!process.env.TWITTER_AUTH_TOKEN && !!username;
	}

	static isConfiguredSync(): boolean {
		return !!process.env.TWITTER_AUTH_TOKEN && !!process.env.TWITTER_USERNAME;
	}

	static async getLatestTweet(username: string): Promise<TweetData | null> {
		try {
			if (!(await this.ensureClient())) return null;

			const userResult = await this.client.users.getByUsername(username);
			if (!userResult?.id) {
				logger.error('Could not get user ID for:', username);
				return null;
			}

			const userId: string = userResult.id;
			const pinnedIds: string[] = userResult.pinned_tweets || [];

			const { tweets } = await this.client.users.tweets(userId, { count: 20 });
			const timelineTweets: any[] = tweets || [];

			// Collect candidates: timeline tweets + any pinned tweet not already in the list
			const candidates: any[] = timelineTweets.filter(
				(t: any) => !isRetweet(t.text ?? '') && !isReply(t)
			);
			const timelineIds = new Set(candidates.map((t: any) => t.id));

			for (const pinnedId of pinnedIds) {
				if (!timelineIds.has(pinnedId)) {
					try {
						const pinned = await this.client.tweets.get(pinnedId);
						if (pinned?.id && !isRetweet(pinned.text ?? '') && !isReply(pinned)) {
							candidates.push(pinned);
						}
					} catch {
						// pinned tweet unavailable — skip
					}
				}
			}

			if (candidates.length === 0) {
				logger.info('No original tweets found in timeline');
				return null;
			}

			const newest = candidates.reduce(pickNewest);
			logger.info('Successfully extracted tweet:', newest.id);
			return tweetToTweetData(newest, username);
		} catch (error: any) {
			logger.error('Error fetching latest tweet:', error.message);
			return null;
		}
	}

	static async fetchAndUpdateLatestTweet(username: string): Promise<boolean> {
		try {
			const now = Date.now();
			const timeSinceLastFetch = now - this.lastFetchTime;

			if (timeSinceLastFetch < this.MIN_FETCH_INTERVAL) {
				logger.info(`waiting ${Math.ceil((this.MIN_FETCH_INTERVAL - timeSinceLastFetch) / 1000)}s before next fetch`);
				return false;
			}

			if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
				const backoffTime = 10 * 60 * 1000;
				if (timeSinceLastFetch < backoffTime) {
					logger.info('Too many errors, backing off');
					return false;
				}
				this.consecutiveErrors = 0;
			}

			this.lastFetchTime = now;
			const tweetData = await this.getLatestTweet(username);

			if (!tweetData) {
				logger.info('No tweet data to update');
				this.consecutiveErrors++;
				return false;
			}

			const existingTweet = await TweetService.getLatestTweet();
			if (existingTweet && existingTweet.tweetId === tweetData.tweetId) {
				if (tweetData.postedAt) {
					await TweetService.setTweetPostedAt(tweetData.tweetId, tweetData.postedAt);
					invalidateCached('widget:latest-tweet');
				}
				logger.info('Tweet is already up to date:', tweetData.tweetId);
				this.consecutiveErrors = 0;
				return true;
			}

			// If the API returns an older tweet than the DB latest, the newer DB tweet may have
			// been deleted on X. Confirm via direct lookup before pruning to avoid false
			// positives from transient API issues.
			if (existingTweet) {
				try {
					if (BigInt(tweetData.tweetId) < BigInt(existingTweet.tweetId)) {
						let tweetStillExists = false;
						try {
							const check = await this.client.tweets.get(existingTweet.tweetId);
							tweetStillExists = !!check?.id;
						} catch {
							tweetStillExists = false;
						}
						if (!tweetStillExists) {
							const pruned = await TweetService.deleteTweetsNewerThan(tweetData.tweetId);
							if (pruned > 0) {
								logger.info(`Pruned ${pruned} confirmed-deleted tweet(s) newer than ${tweetData.tweetId}`);
								invalidateCached('widget:latest-tweet');
							}
						}
					}
				} catch {}
			}

			const success = await TweetService.upsertTweet(tweetData);
			if (success) {
				logger.info('Successfully updated tweet:', tweetData.tweetId);
				invalidateCached('widget:latest-tweet');
				this.consecutiveErrors = 0;
			} else {
				logger.error('Failed to save tweet to database');
				this.consecutiveErrors++;
			}
			return success;
		} catch (error: any) {
			this.consecutiveErrors++;
			logger.error('Error in fetchAndUpdateLatestTweet:', error.message);
			if (this.consecutiveErrors >= 3) {
				const un = await this.getUsername();
				if (un) this.checkConnectionHealth(un).catch(() => {});
			}
			return false;
		}
	}

	static async fetchAndBackfillAllTweets(username: string): Promise<boolean> {
		try {
			if (!(await this.ensureClient())) return false;

			const minInterval = Number.parseInt(
				process.env.TWITTER_FULL_BACKFILL_MIN_INTERVAL_MS ?? String(this.MIN_FULL_BACKFILL_INTERVAL_MS), 10
			);
			if (Number.isFinite(minInterval) && minInterval > 0 && Date.now() - this.lastFullBackfillTime < minInterval) {
				return false;
			}
			this.lastFullBackfillTime = Date.now();

			const userResult = await this.client.users.getByUsername(username);
			if (!userResult?.id) return false;

			const userId: string = userResult.id;
			const existingIds = new Set(await TweetService.getAllTweetIds());

			const batchSize = Math.max(Number.parseInt(process.env.TWITTER_FULL_BACKFILL_BATCH_SIZE ?? '20', 10), 1);
			const maxPages = Math.max(Number.parseInt(process.env.TWITTER_FULL_BACKFILL_MAX_PAGES ?? '200', 10), 1);
			const maxNewTweets = Number.parseInt(process.env.TWITTER_FULL_BACKFILL_MAX_NEW_TWEETS ?? '0', 10);
			const pruneDeleted = (process.env.TWITTER_FULL_BACKFILL_PRUNE_DELETED ?? 'true').toLowerCase() === 'true';

			logger.info(`TWITTER: Starting backfill for @${username}`);

			let cursor: string | undefined;
			let pages = 0;
			let inserted = 0;
			let reachedEnd = false;
			const fetchedIds = pruneDeleted ? new Set<string>() : null;

			while (pages < maxPages) {
				if (maxNewTweets > 0 && inserted >= maxNewTweets) break;

				const { tweets, nextCursor } = await this.client.users.tweets(userId, {
					count: batchSize,
					...(cursor ? { cursor } : {})
				});

				if (!tweets || tweets.length === 0) {
					reachedEnd = true;
					break;
				}

				let hitCap = false;
				for (const tweet of tweets) {
					if (!tweet.id) continue;
					fetchedIds?.add(tweet.id);
					if (isRetweet(tweet.text ?? '') || isReply(tweet) || existingIds.has(tweet.id)) continue;
					await TweetService.upsertTweet(tweetToTweetData(tweet, username));
					existingIds.add(tweet.id);
					inserted++;
					if (maxNewTweets > 0 && inserted >= maxNewTweets) {
						hitCap = true;
						break;
					}
				}

				pages++;
				if (hitCap) break;
				if (!nextCursor) {
					reachedEnd = true;
					break;
				}
				cursor = nextCursor;
				logger.info(`TWITTER: backfill page ${pages}/${maxPages} (inserted ${inserted})`);
			}

			// Only prune when we reached the true end of the timeline — if we stopped early
			// due to maxPages or maxNewTweets cap we can't know what's missing
			if (pruneDeleted && reachedEnd && fetchedIds && fetchedIds.size > 0) {
				const pruned = await TweetService.deleteTweetsNotIn(fetchedIds);
				if (pruned > 0) {
					logger.info(`TWITTER: pruned ${pruned} tweet(s) no longer on timeline`);
					invalidateCached('widget:latest-tweet');
				}
			}

			logger.info(`TWITTER: backfill complete (inserted ${inserted} new tweets)`);
			this.consecutiveFullBackfillErrors = 0;
			return true;
		} catch (error: any) {
			this.consecutiveFullBackfillErrors++;
			logger.error('Error in fetchAndBackfillAllTweets:', error.message);
			return false;
		}
	}

	static async testConnection(username?: string): Promise<{
		connected: boolean;
		message: string;
		failureType?: 'authentication' | 'rate_limit' | 'network' | 'api_error' | 'configuration' | 'unknown';
		details?: string;
		request?: { method: string; endpoint: string; username: string; hasAuthToken: boolean };
		response?: { status?: number; data?: any; error?: string };
	}> {
		const testUsername = username || (await this.getUsername());
		const requestInfo = {
			method: 'GET',
			endpoint: 'getByUsername',
			username: testUsername || 'N/A',
			hasAuthToken: !!process.env.TWITTER_AUTH_TOKEN
		};

		if (!testUsername) {
			return { connected: false, message: 'Twitter username not configured', failureType: 'configuration', request: requestInfo };
		}
		if (!process.env.TWITTER_AUTH_TOKEN) {
			return { connected: false, message: 'TWITTER_AUTH_TOKEN not configured', failureType: 'configuration', request: requestInfo };
		}

		try {
			if (!(await this.ensureClient())) {
				return {
					connected: false, message: 'Failed to initialize client', failureType: 'authentication',
					details: 'Auth token may be invalid or expired',
					request: requestInfo, response: { error: 'Client initialization failed' }
				};
			}

			const userResult = await this.client.users.getByUsername(testUsername);
			if (userResult?.id) {
				return {
					connected: true, message: 'Connection successful',
					request: requestInfo,
					response: { status: 200, data: { id: userResult.id, username: userResult.username } }
				};
			}
			return {
				connected: false, message: 'Failed to fetch user data', failureType: 'api_error',
				request: requestInfo, response: { error: 'No user data in response' }
			};
		} catch (error: any) {
			const msg: string = error.message || String(error);
			const lower = msg.toLowerCase();
			let failureType: 'authentication' | 'rate_limit' | 'network' | 'api_error' | 'unknown' = 'unknown';
			if (lower.includes('rate limit') || lower.includes('429')) failureType = 'rate_limit';
			else if (lower.includes('unauthorized') || lower.includes('401') || lower.includes('auth') || lower.includes('403')) failureType = 'authentication';
			else if (lower.includes('network') || lower.includes('timeout') || lower.includes('econnrefused')) failureType = 'network';
			else failureType = 'api_error';
			return { connected: false, message: msg, failureType, request: requestInfo, response: { error: msg } };
		}
	}

	static async checkConnectionHealth(username: string): Promise<boolean> {
		try {
			const connectionTest = await this.testConnection(username);
			const now = Date.now();

			const shouldNotify =
				(this.lastConnectionStatus === 'connected' && !connectionTest.connected) ||
				(this.lastConnectionStatus === 'disconnected' && connectionTest.connected) ||
				(this.lastConnectionStatus === 'unknown' && !connectionTest.connected);
			const canNotify = now - this.lastNotificationTime > this.NOTIFICATION_COOLDOWN;

			if (shouldNotify && canNotify && NotificationService.isConfigured()) {
				if (!connectionTest.connected) {
					const details = connectionTest.details
						? `${connectionTest.message}\n\nDetails: ${connectionTest.details}`
						: connectionTest.message;
					const sent = await this.sendConnectionFailureNotification(details);
					if (sent) this.lastNotificationTime = now;
					this.lastConnectionStatus = 'disconnected';
				} else {
					const sent = await this.sendConnectionRestoredNotification();
					if (sent) this.lastNotificationTime = now;
					this.lastConnectionStatus = 'connected';
				}
			} else if (connectionTest.connected) {
				this.lastConnectionStatus = 'connected';
			} else {
				this.lastConnectionStatus = 'disconnected';
			}

			if (!connectionTest.connected) logger.error(`Connection failed: ${connectionTest.message}`);
			return connectionTest.connected;
		} catch (error: any) {
			logger.error('Error checking connection health:', error.message);
			return false;
		}
	}

	private static async sendConnectionFailureNotification(error: string): Promise<boolean> {
		const settings = await getNotificationSettings();
		const { failure } = settings.twitter;
		if (!failure.enabled) return false;
		const { message, appearance } = resolveTemplatedAppearance(failure, { error, time: new Date().toISOString() });
		return NotificationService.sendWithAppearance(message, appearance);
	}

	private static async sendConnectionRestoredNotification(): Promise<boolean> {
		const settings = await getNotificationSettings();
		const { restored } = settings.twitter;
		if (!restored.enabled) return false;
		const { message, appearance } = resolveTemplatedAppearance(restored, { time: new Date().toISOString() });
		return NotificationService.sendWithAppearance(message, appearance);
	}
}
