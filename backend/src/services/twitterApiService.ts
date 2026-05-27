import { logger } from '../utils/logger';
import { TwitterOpenApi } from 'twitter-openapi-typescript';
import { TweetService, type TweetData } from './tweetService';
import { NotificationService } from './notificationService';
import { ConfigService } from './config';
import { getKwargs } from 'twitter-openapi-typescript/dist/src/utils/api';
import { invalidateCached } from '../utils/shortLivedCache';

function parseTweetPostedAtFromLegacy(
	legacy: Record<string, unknown> | null | undefined
): Date | undefined {
	if (!legacy) return undefined;
	const raw =
		legacy.created_at ??
		legacy.createdAt ??
		legacy.timestamp_ms ??
		legacy.timestampMs;

	if (raw == null) return undefined;

	if (typeof raw === 'number') {
		const d = new Date(raw);
		return Number.isNaN(d.getTime()) ? undefined : d;
	}

	if (typeof raw === 'string') {
		// If it's digits, treat as epoch millis.
		if (/^\d+$/.test(raw)) {
			const ms = Number(raw);
			if (Number.isNaN(ms)) return undefined;
			const d = new Date(ms);
			return Number.isNaN(d.getTime()) ? undefined : d;
		}

		const d = new Date(raw);
		return Number.isNaN(d.getTime()) ? undefined : d;
	}

	return undefined;
}

/** Compare Twitter snowflake tweet IDs. Returns negative if a < b. */
function compareTweetIds(a: string, b: string): number | null {
	if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) return null;
	const aId = BigInt(a);
	const bId = BigInt(b);
	if (aId < bId) return -1;
	if (aId > bId) return 1;
	return 0;
}

export class TwitterApiService {
	private static api: TwitterOpenApi | null = null;
	private static client: any = null;
	private static lastFetchTime: number = 0;
	private static lastFullBackfillTime: number = 0;
	private static consecutiveErrors: number = 0;
	private static consecutiveFullBackfillErrors: number = 0;
	private static lastConnectionStatus: 'connected' | 'disconnected' | 'unknown' = 'unknown';
	private static lastNotificationTime: number = 0;
	private static readonly MIN_FETCH_INTERVAL = 30000; // Minimum 30 seconds
	private static readonly MAX_CONSECUTIVE_ERRORS = 5; // 5 consecutive errors
	private static readonly MIN_FULL_BACKFILL_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
	private static readonly NOTIFICATION_COOLDOWN = 30 * 60 * 1000; // 30 minutes

	/**
	 * Get Twitter username from database - fallback to env variable
	 */
	private static async getUsername(): Promise<string | null> {
		try {
			const dbUsername = await ConfigService.get('twitter_username');
			if (dbUsername && typeof dbUsername === 'string' && dbUsername.trim()) {
				return dbUsername.trim();
			}
		} catch {}

		return process.env.TWITTER_USERNAME || null;
	}

	/**
	 * Initialize the Twitter API client with authentication cookies
	 * Cookies should be obtained from a logged-in Twitter/X session
	 */
	static async initialize(): Promise<boolean> {
		try {
			const cookies = process.env.TWITTER_COOKIES;

			if (!cookies) {
				logger.error('TWITTER_COOKIES environment variable is not set');
				return false;
			}

			// Parse cookies string (format: "cookie1=value1; cookie2=value2")
			const cookieMap: Record<string, string> = {};
			cookies.split(';').forEach((cookie) => {
				const trimmed = cookie.trim();
				const equalIndex = trimmed.indexOf('=');
				if (equalIndex > 0) {
					const key = trimmed.substring(0, equalIndex);
					const value = trimmed.substring(equalIndex + 1);
					cookieMap[key] = value;
				}
			});

			this.api = new TwitterOpenApi();

			this.client = await this.api.getClientFromCookies(cookieMap);

			logger.info('Client initialized successfully');
			return true;
		} catch (error: any) {
			logger.error('Failed to initialize client:', error.message);
			return false;
		}
	}

	/**
	 * Get the latest tweet from a user's timeline
	 * @param username - Twitter username (without @)
	 */
	static async getLatestTweet(username: string): Promise<TweetData | null> {
		try {
			if (!this.client) {
				const initialized = await this.initialize();
				if (!initialized) {
					return null;
				}
			}

			if (!this.client) {
				logger.error('Client is not initialized');
				return null;
			}

			// Get user by screen name using getUserApi
			const userResult = await this.client
				.getUserApi()
				.getUserByScreenName({ screenName: username });

			// Extract user ID
			let userId: string | null = null;
			let userData: any = null;

			if (userResult.data?.user) {
				userData = userResult.data.user;
				userId = userData.restId || null;
			} else if (userResult.data?.raw?.result) {
				userData = userResult.data.raw.result;
				userId = userData.restId || null;
			}

			if (!userId) {
				logger.error('Could not get user ID for:', username);
				logger.error(
					'Response structure:',
					JSON.stringify(userResult.data, null, 2)
				);
				return null;
			}

			logger.info('Found user ID:', userId);

			// Get user timeline tweets using getTweetApi
			const tweetApiUtils = this.client.getTweetApi();
			const flag = tweetApiUtils?.flag?.UserTweets ?? tweetApiUtils?.flag?.['UserTweets'];
			const initOverrides = tweetApiUtils?.initOverrides?.(flag);
			const timelineCount = 20;
			const args = getKwargs(flag, { userId, count: timelineCount });

			const rawResp = await tweetApiUtils.api.getUserTweetsRaw(args, initOverrides);
			const rawJson = await rawResp.raw.json();
			const timelineResult: any = rawJson;

			// Extract tweet data from timeline response
			const responseData = timelineResult.data || timelineResult;

			logger.info(
				'Timeline response structure:',
				JSON.stringify(responseData, null, 2).substring(0, 1500)
			);

			// Extract tweet from the timeline structure
			let tweetData: any = null;

			function pickNewerTweet(current: any, candidate: any): any {
				if (!current) return candidate;
				if (!candidate) return current;

				const curLegacy = current?.legacy as Record<string, unknown> | undefined;
				const candLegacy = candidate?.legacy as Record<string, unknown> | undefined;

				const curPosted = curLegacy ? parseTweetPostedAtFromLegacy(curLegacy) : undefined;
				const candPosted = candLegacy ? parseTweetPostedAtFromLegacy(candLegacy) : undefined;

				if (curPosted && candPosted) return candPosted > curPosted ? candidate : current;
				if (candPosted && !curPosted) return candidate;
				if (curPosted && !candPosted) return current;

				const curIdRaw =
					current?.rest_id ??
					current?.restId ??
					curLegacy?.id_str ??
					curLegacy?.idStr ??
					current?.id ??
					current?.id_str ??
					current?.idStr ??
					null;
				const candIdRaw =
					candidate?.rest_id ??
					candidate?.restId ??
					candLegacy?.id_str ??
					candLegacy?.idStr ??
					candidate?.id ??
					candidate?.id_str ??
					candidate?.idStr ??
					null;

				const curId = typeof curIdRaw === 'string' ? curIdRaw : curIdRaw != null ? String(curIdRaw) : '';
				const candId = typeof candIdRaw === 'string' ? candIdRaw : candIdRaw != null ? String(candIdRaw) : '';

				if (/^\d+$/.test(curId) && /^\d+$/.test(candId)) {
					return BigInt(candId) > BigInt(curId) ? candidate : current;
				}

				return current;
			}

			const instructions =
				responseData?.user?.result?.timeline?.timeline?.instructions ??
				responseData?.data?.user?.result?.timeline?.timeline?.instructions ??
				responseData.raw?.instruction ??
				null;

			if (Array.isArray(instructions)) {
				for (const instruction of instructions) {
					const entries = (instruction as any)?.entries;
					if (!Array.isArray(entries)) continue;
					for (const entry of entries) {
						const result =
							(entry as any)?.content?.itemContent?.tweet_results?.result ??
							(entry as any)?.content?.itemContent?.tweetResults?.result ??
							null;
						if (result && (result.__typename === 'Tweet' || result.legacy)) {
							tweetData = pickNewerTweet(tweetData, result);
						}
					}
				}
			} else if (responseData.raw?.instruction) {
				for (const instruction of responseData.raw.instruction) {
					if (instruction.entries) {
						for (const entry of instruction.entries) {
							if (entry.content?.itemContent?.tweetResults?.result) {
								const result = entry.content.itemContent.tweetResults.result;
								if (result && (result.__typename === 'Tweet' || result.legacy)) {
									tweetData = pickNewerTweet(tweetData, result);
								}
							}
						}
					}
				}
			}

			if (!tweetData) {
				function findTweet(obj: any, depth = 0): any {
					if (depth > 10) return null;

					if (obj && typeof obj === 'object') {
						if (
							obj.legacy &&
							(obj.legacy.full_text || obj.legacy.fullText || obj.legacy.text)
						) {
							return obj;
						}
						if (
							(obj.full_text || obj.fullText || obj.text) &&
							typeof (obj.full_text || obj.fullText || obj.text) === 'string' &&
							(obj.legacy ||
								obj.__typename === 'Tweet' ||
								(typeof obj.id_str === 'string' && /^\d+$/.test(obj.id_str)) ||
								(typeof obj.idStr === 'string' && /^\d+$/.test(obj.idStr)) ||
								(typeof obj.id === 'string' && /^\d+$/.test(obj.id)))
						) {
							return obj;
						}

						if (obj.__typename === 'Tweet') {
							return obj;
						}

						for (const key in obj) {
							const result = findTweet(obj[key], depth + 1);
							if (result) return result;
						}
					}
					return null;
				}
				tweetData = findTweet(responseData);
			}

			if (!tweetData) {
				logger.info('No tweet data found in response');
				return null;
			}

			logger.info('Tweet data keys:', Object.keys(tweetData));
			logger.info(
				'Full tweet data structure:',
				JSON.stringify(tweetData, null, 2).substring(0, 2000)
			);

			// Extract tweet information from the tweet result
			// The tweet data structure: tweetResults.result has a legacy property with the actual tweet
			// The legacy property contains: id_str, full_text, etc.
			const tweetLegacy = tweetData.legacy;

			if (!tweetLegacy) {
				logger.error('Tweet data does not have legacy property');
				// Try alternative paths
				if (tweetData.tweet?.legacy) {
					logger.info('Found legacy in tweet.tweet.legacy');
					const altLegacy = tweetData.tweet.legacy;
					const tweetId = altLegacy.id_str || altLegacy.id?.toString() || null;
					const tweetText = altLegacy.full_text || altLegacy.text || '';
					if (tweetId && tweetText) {
						// Use this alternative path
						const userLegacy = userData?.legacy || userData;
						const authorName = userLegacy?.name || '';
						const authorUsername = userLegacy?.screenName || userLegacy?.screen_name || username;
						const profileImage =
							userLegacy?.profileImageUrlHttps ||
							userLegacy?.profile_image_url_https ||
							userLegacy?.profile_image_url ||
							null;
						const tweetUrl = `https://x.com/${authorUsername}/status/${tweetId}`;
						const profileUrl = `https://x.com/${authorUsername}`;

						return {
							tweetId: tweetId,
							content: tweetText,
							authorName: authorName,
							authorUsername: authorUsername,
							authorProfileImage: profileImage,
							authorProfileUrl: profileUrl,
							tweetUrl: tweetUrl,
							postedAt: parseTweetPostedAtFromLegacy(altLegacy as Record<string, unknown>)
						};
					}
				}

				function extractIdAndText(obj: any): { tweetId: string | null; tweetText: string | null } {
					let tweetId: string | null = null;
					let tweetText: string | null = null;

					function walk(cur: any, d: number): void {
						if (tweetId && tweetText) return;
						if (!cur || typeof cur !== 'object') return;
						if (d > 10) return;

						for (const [k, v] of Object.entries(cur)) {
							if (tweetId == null && typeof v === 'string') {
								if (
									(k === 'id_str' || k === 'idStr' || k === 'id') &&
									/^\d+$/.test(v)
								) {
									tweetId = v;
								}
							}

							if (tweetText == null && typeof v === 'string') {
								if (
									(k === 'full_text' || k === 'fullText' || k === 'text') &&
									v.trim().length > 0 &&
									(v.trim().length >= 2 || v.includes(' '))
								) {
									tweetText = v;
								}
							}

							walk(v, d + 1);
							if (tweetId && tweetText) return;
						}
					}

					walk(obj, 0);
					return { tweetId, tweetText };
				}

				const { tweetId, tweetText } = extractIdAndText(tweetData);
				if (tweetId && tweetText) {
					const modernUserLegacy =
						(tweetData.core?.userResults?.result?.legacy as any) ??
						(tweetData.core?.user_results?.result?.legacy as any) ??
						(tweetData.core?.userResults?.result as any) ??
						(tweetData.core?.user_results?.result as any);

					const userLegacy = modernUserLegacy ?? userData?.legacy ?? userData;

					const authorName = userLegacy?.name || '';
					const authorUsername =
						userLegacy?.screenName || userLegacy?.screen_name || username;

					const profileImage =
						userLegacy?.profileImageUrlHttps ||
						userLegacy?.profile_image_url_https ||
						userLegacy?.profile_image_url ||
						null;

					const tweetUrl = `https://x.com/${authorUsername}/status/${tweetId}`;
					const profileUrl = `https://x.com/${authorUsername}`;

					return {
						tweetId,
						content: tweetText,
						authorName,
						authorUsername,
						authorProfileImage: profileImage,
						authorProfileUrl: profileUrl,
						tweetUrl,
						postedAt: undefined
					};
				}
				return null;
			}

			const tweetId = tweetLegacy.idStr || tweetLegacy.id_str || tweetLegacy.id?.toString() || null;
			const tweetText = tweetLegacy.fullText || tweetLegacy.full_text || tweetLegacy.text || '';

			if (!tweetId || !tweetText) {
				logger.error('Could not extract tweet ID or text from legacy');
				logger.error(
					'Legacy structure:',
					JSON.stringify(tweetLegacy, null, 2).substring(0, 500)
				);
				return null;
			}

			logger.info('Successfully extracted tweet:', tweetId);

			// Extract user information
			let userLegacy = null;
			let profileImage = null;

			// Check if tweet has user data embedded
			if (tweetData.core?.userResults?.result?.legacy) {
				userLegacy = tweetData.core.userResults.result.legacy;
				profileImage =
					userLegacy.profileImageUrlHttps ||
					userLegacy.profile_image_url_https ||
					userLegacy.profile_image_url ||
					null;
			}

			// Fall back to original user data if not found in tweet
			if (!userLegacy) {
				userLegacy = userData?.legacy || userData;
				profileImage =
					userLegacy?.profileImageUrlHttps ||
					userLegacy?.profile_image_url_https ||
					userLegacy?.profile_image_url ||
					null;
			}

			const authorName = userLegacy?.name || '';
			const authorUsername = userLegacy?.screenName || userLegacy?.screen_name || username;
			const tweetUrl = `https://x.com/${authorUsername}/status/${tweetId}`;
			const profileUrl = `https://x.com/${authorUsername}`;

			logger.info('Profile image URL:', profileImage);

			const result: TweetData = {
				tweetId: tweetId,
				content: tweetText,
				authorName: authorName,
				authorUsername: authorUsername,
				authorProfileImage: profileImage,
				authorProfileUrl: profileUrl,
				tweetUrl: tweetUrl,
				postedAt: parseTweetPostedAtFromLegacy(tweetLegacy as Record<string, unknown>)
			};

			return result;
		} catch (error: any) {
			logger.error('Error fetching latest tweet:', error.message);
			logger.error('Error stack:', error.stack);
			return null;
		}
	}

	/**
	 * Fetch and update the latest tweet in the database
	 * @param username - Twitter username (without @)
	 */
	static async fetchAndUpdateLatestTweet(username: string): Promise<boolean> {
		try {
			// Rate limiting: Don't fetch too frequently
			const now = Date.now();
			const timeSinceLastFetch = now - this.lastFetchTime;

			if (timeSinceLastFetch < this.MIN_FETCH_INTERVAL) {
				const waitTime = this.MIN_FETCH_INTERVAL - timeSinceLastFetch;
				logger.info(
					`waiting ${Math.ceil(waitTime / 1000)}s before next fetch`
				);
				return false;
			}

			if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
				const backoffTime = 10 * 60 * 1000;
				if (timeSinceLastFetch < backoffTime) {
					logger.info(
						`Too many errors, backing off for ${Math.ceil((backoffTime - timeSinceLastFetch) / 60000)} minutes`
					);
					return false;
				} else {
					this.consecutiveErrors = 0;
				}
			}

			this.lastFetchTime = now;
			const tweetData = await this.getLatestTweet(username);

			if (!tweetData) {
				logger.info('No tweet data to update');
				this.consecutiveErrors++;
				return false;
			}

			// Check if this is a new tweet by comparing with the latest in DB
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

			// Fetched latest is older than DB latest
			const pruneOnFetch =
				(process.env.TWITTER_FETCH_PRUNE_DELETED ?? 'true').toLowerCase() === 'true';
			if (existingTweet && pruneOnFetch) {
				const idCompare = compareTweetIds(tweetData.tweetId, existingTweet.tweetId);
				if (idCompare != null && idCompare < 0) {
					const pruned = await TweetService.deleteTweetsNewerThan(tweetData.tweetId);
					if (pruned > 0) {
						logger.info(
							`Removed ${pruned} tweet(s) no longer on timeline (deleted on X); new latest: ${tweetData.tweetId}`
						);
						invalidateCached('widget:latest-tweet');
					}
				}
			}

			// Save the new tweet
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

			// Check for rate limiting errors
			if (
				error.message?.includes('rate limit') ||
				error.message?.includes('429') ||
				error.message?.includes('Too Many Requests')
			) {
				logger.error('Rate limit detected! Backing off for 15 minutes');
				this.consecutiveErrors = this.MAX_CONSECUTIVE_ERRORS;
			}

			// Trigger health check if multiple consecutive errors
			if (this.consecutiveErrors >= 3) {
				const username = await this.getUsername();
				if (username) {
					this.checkConnectionHealth(username).catch((err) => {
						logger.error('Health check failed during error handling:', err.message);
					});
				}
			}

			return false;
		}
	}

	/**
	 * Fetch the user's entire timeline history and upsert any tweets missing from the DB.
	 *
	 * This uses cursor-based pagination on the raw timeline endpoint.
	 */
	static async fetchAndBackfillAllTweets(username: string): Promise<boolean> {
		try {
			if (!this.client) {
				const initialized = await this.initialize();
				if (!initialized) return false;
			}
			if (!this.client) {
				logger.error('Client is not initialized');
				return false;
			}

			const now = Date.now();
			const minInterval = parseInt(
				process.env.TWITTER_FULL_BACKFILL_MIN_INTERVAL_MS ??
					String(this.MIN_FULL_BACKFILL_INTERVAL_MS),
				10
			);
			if (Number.isFinite(minInterval) && minInterval > 0) {
				const timeSinceLastFull = now - this.lastFullBackfillTime;
				if (timeSinceLastFull < minInterval) {
					return false;
				}
			}

			this.lastFullBackfillTime = now;

			// Get user by screen name using getUserApi
			const userResult = await this.client
				.getUserApi()
				.getUserByScreenName({ screenName: username });

			let userId: string | null = null;
			let userData: any = null;
			if (userResult.data?.user) {
				userData = userResult.data.user;
				userId = userData.restId || null;
			} else if (userResult.data?.raw?.result) {
				userData = userResult.data.raw.result;
				userId = userData.restId || null;
			}

			if (!userId) {
				logger.error('Could not get user ID for backfill:', username);
				return false;
			}

			const userLegacy = userData?.legacy || userData;
			const authorName = userLegacy?.name || '';
			const authorUsername = userLegacy?.screenName || userLegacy?.screen_name || username;

			const profileImage =
				userLegacy?.profileImageUrlHttps ||
				userLegacy?.profile_image_url_https ||
				userLegacy?.profile_image_url ||
				null;

			const profileUrl = `https://x.com/${authorUsername}`;

			const existingIds = new Set(await TweetService.getAllTweetIds());
			const fetchedIds = new Set<string>();

			const batchSize = Math.max(parseInt(process.env.TWITTER_FULL_BACKFILL_BATCH_SIZE ?? '20', 10), 1);
			const maxPages = Math.max(parseInt(process.env.TWITTER_FULL_BACKFILL_MAX_PAGES ?? '200', 10), 1);
			const maxNewTweets = parseInt(process.env.TWITTER_FULL_BACKFILL_MAX_NEW_TWEETS ?? '0', 10); // 0 => unlimited
			const pruneDeleted =
				(process.env.TWITTER_FULL_BACKFILL_PRUNE_DELETED ?? 'true').toLowerCase() === 'true';

			let cursor: string | undefined = undefined;
			let pages = 0;
			let inserted = 0;
			let reachedEndOfTimeline = false;

			const pickTweetId = (legacy: any, fallback: any): string | null => {
				const idStr =
					legacy?.id_str ??
					legacy?.idStr ??
					fallback?.rest_id ??
					fallback?.restId ??
					fallback?.id_str ??
					fallback?.idStr ??
					fallback?.id;

				if (idStr == null) return null;
				const s = typeof idStr === 'string' ? idStr : String(idStr);
				return /^\d+$/.test(s) ? s : null;
			};

			const extractBottomCursor = (obj: any, depth = 0): string | null => {
				if (!obj || typeof obj !== 'object' || depth > 25) return null;

				if (obj.cursorType === 'Bottom' || obj.cursor_type === 'Bottom') {
					const v = obj.value ?? obj.cursor;
					if (typeof v === 'string' && v.trim()) return v;
				}

				for (const key of Object.keys(obj)) {
					const res = extractBottomCursor(obj[key], depth + 1);
					if (res) return res;
				}
				return null;
			};

			const collectTweetsFromTimeline = (timeline: any): any[] => {
				const results: any[] = [];
				const seen = new Set<string>();

				const maybeAdd = (tweetResult: any) => {
					if (!tweetResult) return;
					if (!(tweetResult.__typename === 'Tweet' || tweetResult.legacy)) return;
					const legacy = tweetResult.legacy || tweetResult;
					const tweetId = pickTweetId(legacy, tweetResult);
					if (!tweetId || seen.has(tweetId)) return;
					seen.add(tweetId);
					results.push(tweetResult);
				};

				const instructions =
					timeline?.user?.result?.timeline?.timeline?.instructions ??
					timeline?.data?.user?.result?.timeline?.timeline?.instructions ??
					timeline?.raw?.instruction ??
					null;

				if (Array.isArray(instructions)) {
					for (const instruction of instructions) {
						const entries = (instruction as any)?.entries;
						if (!Array.isArray(entries)) continue;
						for (const entry of entries) {
							const result =
								(entry as any)?.content?.itemContent?.tweet_results?.result ??
								(entry as any)?.content?.itemContent?.tweetResults?.result ??
								null;
							if (result) maybeAdd(result);
						}
					}
					return results;
				}

				if (timeline?.raw?.instruction && Array.isArray(timeline.raw.instruction)) {
					for (const instruction of timeline.raw.instruction) {
						if (!instruction?.entries) continue;
						for (const entry of instruction.entries) {
							const result = entry?.content?.itemContent?.tweetResults?.result;
							if (result) maybeAdd(result);
						}
					}
					return results;
				}

				const deepScan = (obj: any, depth = 0): void => {
					if (!obj || typeof obj !== 'object' || depth > 10) return;
					if (obj.__typename === 'Tweet' || obj.legacy) {
						maybeAdd(obj);
					}
					for (const key of Object.keys(obj)) {
						deepScan(obj[key], depth + 1);
						if (results.length > batchSize * 5) return;
					}
				};

				deepScan(timeline);
				return results;
			};

			logger.info(`TWITTER: Starting backfill for @${username}`);

			while (pages < maxPages) {
				if (maxNewTweets > 0 && inserted >= maxNewTweets) break;

				const tweetApiUtils = this.client.getTweetApi();
				const flag = tweetApiUtils?.flag?.UserTweets ?? tweetApiUtils?.flag?.['UserTweets'];
				const initOverrides = tweetApiUtils?.initOverrides?.(flag);

				const args: any = cursor
					? getKwargs(flag, { userId, count: batchSize, cursor })
					: getKwargs(flag, { userId, count: batchSize });

				const rawResp: any = await tweetApiUtils.api.getUserTweetsRaw(args, initOverrides);
				const rawJson: any = await rawResp.raw.json();
				const timelineResult: any = rawJson?.data || rawJson;

				const tweets = collectTweetsFromTimeline(rawJson);
				if (tweets.length === 0) break;

				let batchNew = 0;
				for (const t of tweets) {
					const legacy = t?.legacy || t;
					const tweetId = pickTweetId(legacy, t);
					const tweetText = legacy?.full_text ?? legacy?.fullText ?? legacy?.text;
					if (!tweetId || typeof tweetText !== 'string' || !tweetText.trim()) continue;

					fetchedIds.add(tweetId);

					if (existingIds.has(tweetId)) continue;

					const postedAt = parseTweetPostedAtFromLegacy(legacy as Record<string, unknown>);

					await TweetService.upsertTweet({
						tweetId,
						content: tweetText,
						authorName,
						authorUsername,
						authorProfileImage: profileImage || undefined,
						authorProfileUrl: profileUrl || undefined,
						tweetUrl: `https://x.com/${authorUsername}/status/${tweetId}`,
						postedAt
					});

					existingIds.add(tweetId);
					inserted++;
					batchNew++;
				}

				pages++;

				const nextCursor: string | null =
					extractBottomCursor(rawJson) ?? extractBottomCursor(timelineResult);
				if (!nextCursor) {
					reachedEndOfTimeline = true;
					break;
				}

				cursor = nextCursor;

				logger.info(
					`TWITTER: backfill page ${pages}/${maxPages} (inserted ${batchNew}, total ${inserted}, fetched ${fetchedIds.size})`
				);
			}

			let pruned = 0;
			if (pruneDeleted && fetchedIds.size > 0 && reachedEndOfTimeline) {
				pruned = await TweetService.deleteTweetsNotIn(fetchedIds);
				if (pruned > 0) {
					invalidateCached('widget:latest-tweet');
				}
			} else if (pruneDeleted && fetchedIds.size > 0 && !reachedEndOfTimeline) {
				logger.warn(
					'TWITTER: skipped pruning deleted tweets — timeline pagination did not reach the end (increase TWITTER_FULL_BACKFILL_MAX_PAGES or check limits)'
				);
			}

			logger.info(
				`TWITTER: backfill complete (inserted ${inserted} new, pruned ${pruned}, fetched ${fetchedIds.size} from timeline)`
			);
			this.consecutiveFullBackfillErrors = 0;
			return true;
		} catch (error: any) {
			this.consecutiveFullBackfillErrors++;
			logger.error('Error in fetchAndBackfillAllTweets:', error?.message || error);
			return false;
		}
	}

	/**
	 * Check if service is configured (checks database first)
	 */
	static async isConfigured(): Promise<boolean> {
		const cookies = process.env.TWITTER_COOKIES;
		const username = await this.getUsername();
		return !!cookies && !!username;
	}

	/**
	 * Synchronous check (for backwards compatibility)
	 */
	static isConfiguredSync(): boolean {
		return !!process.env.TWITTER_COOKIES && !!process.env.TWITTER_USERNAME;
	}

	/**
	 * Test the Twitter API connection
	 * Returns connection status, error message, and failure type
	 */
	static async testConnection(username?: string): Promise<{
		connected: boolean;
		message: string;
		failureType?:
			| 'authentication'
			| 'rate_limit'
			| 'network'
			| 'api_error'
			| 'configuration'
			| 'unknown';
		details?: string;
		request?: {
			method: string;
			endpoint: string;
			username: string;
			hasCookies: boolean;
		};
		response?: {
			status?: number;
			data?: any;
			error?: string;
		};
	}> {
		try {
			const testUsername = username || (await this.getUsername());
			if (!testUsername) {
				return {
					connected: false,
					message: 'Twitter username not configured',
					failureType: 'configuration',
					details:
						'Twitter username is not set in database or TWITTER_USERNAME environment variable',
					request: {
						method: 'GET',
						endpoint: 'getUserByScreenName',
						username: 'N/A',
						hasCookies: !!process.env.TWITTER_COOKIES
					}
				};
			}

			if (!process.env.TWITTER_COOKIES) {
				return {
					connected: false,
					message: 'Twitter cookies not configured',
					failureType: 'configuration',
					details: 'TWITTER_COOKIES environment variable is not set',
					request: {
						method: 'GET',
						endpoint: 'getUserByScreenName',
						username: testUsername,
						hasCookies: false
					}
				};
			}

			if (!this.client) {
				try {
					const initialized = await this.initialize();
					if (!initialized) {
						return {
							connected: false,
							message: 'Failed to initialize Twitter API client',
							failureType: 'authentication',
							details: 'Client initialization failed - cookies may be invalid or expired',
							request: {
								method: 'GET',
								endpoint: 'getUserByScreenName',
								username: testUsername,
								hasCookies: true
							},
							response: {
								error: 'Client initialization failed'
							}
						};
					}
				} catch (initError: any) {
					return {
						connected: false,
						message: 'Failed to initialize client',
						failureType: 'authentication',
						details: initError.message || 'Authentication failed - cookies may be expired',
						request: {
							method: 'GET',
							endpoint: 'getUserByScreenName',
							username: testUsername,
							hasCookies: true
						},
						response: {
							error: initError.message || 'Initialization error'
						}
					};
				}
			}

			if (!this.client) {
				return {
					connected: false,
					message: 'Client is not initialized',
					failureType: 'configuration',
					details: 'Client initialization did not complete',
					request: {
						method: 'GET',
						endpoint: 'getUserByScreenName',
						username: testUsername,
						hasCookies: true
					},
					response: {
						error: 'Client not initialized'
					}
				};
			}

			try {
				const requestInfo = {
					method: 'GET',
					endpoint: 'getUserByScreenName',
					username: testUsername,
					hasCookies: !!process.env.TWITTER_COOKIES
				};

				const userResult = await this.client.getUserApi().getUserByScreenName({
					screenName: testUsername
				});

				if (userResult.data?.user || userResult.data?.raw?.result) {
					// Extract relevant response data (remove sensitive info)
					const responseData = {
						hasUser: !!userResult.data?.user,
						hasRawResult: !!userResult.data?.raw?.result,
						userData: userResult.data?.user
							? {
									restId: userResult.data.user.restId,
									legacy: userResult.data.user.legacy
										? {
												screenName: userResult.data.user.legacy.screenName,
												name: userResult.data.user.legacy.name
											}
										: null
								}
							: null,
						rawResult: userResult.data?.raw?.result
							? {
									restId: userResult.data.raw.result.restId,
									legacy: userResult.data.raw.result.legacy
										? {
												screenName: userResult.data.raw.result.legacy.screenName,
												name: userResult.data.raw.result.legacy.name
											}
										: null
								}
							: null
					};

					return {
						connected: true,
						message: 'Connection successful',
						request: requestInfo,
						response: {
							status: 200,
							data: responseData
						}
					};
				} else {
					return {
						connected: false,
						message: 'Failed to fetch user data',
						failureType: 'api_error',
						details: 'API returned empty or invalid response',
						request: requestInfo,
						response: {
							data: userResult.data || null,
							error: 'No user data in response'
						}
					};
				}
			} catch (apiError: any) {
				const errorMessage = apiError.message || String(apiError);
				const errorString = errorMessage.toLowerCase();

				const requestInfo = {
					method: 'GET',
					endpoint: 'getUserByScreenName',
					username: testUsername,
					hasCookies: !!process.env.TWITTER_COOKIES
				};

				const responseInfo = {
					error: errorMessage,
					stack: apiError.stack ? apiError.stack.substring(0, 500) : undefined
				};

				// Detect specific error types
				if (
					errorString.includes('rate limit') ||
					errorString.includes('429') ||
					errorString.includes('too many requests') ||
					errorString.includes('rate_limit')
				) {
					return {
						connected: false,
						message: 'Rate limit exceeded',
						failureType: 'rate_limit',
						details: 'Twitter API rate limit has been reached. Please wait before retrying.',
						request: requestInfo,
						response: {
							status: 429,
							...responseInfo
						}
					};
				}

				if (
					errorString.includes('unauthorized') ||
					errorString.includes('401') ||
					errorString.includes('forbidden') ||
					errorString.includes('403') ||
					errorString.includes('authentication') ||
					errorString.includes('cookie') ||
					errorString.includes('token')
				) {
					return {
						connected: false,
						message: 'Authentication failed',
						failureType: 'authentication',
						details:
							'Cookies may be expired or invalid. Please update TWITTER_COOKIES in your .env file.',
						request: requestInfo,
						response: {
							status: errorString.includes('401')
								? 401
								: errorString.includes('403')
									? 403
									: undefined,
							...responseInfo
						}
					};
				}

				if (
					errorString.includes('network') ||
					errorString.includes('timeout') ||
					errorString.includes('econnrefused') ||
					errorString.includes('enotfound')
				) {
					return {
						connected: false,
						message: 'Network error',
						failureType: 'network',
						details: 'Unable to reach Twitter API. Check your internet connection.',
						request: requestInfo,
						response: responseInfo
					};
				}
				return {
					connected: false,
					message: 'API request failed',
					failureType: 'api_error',
					details: errorMessage,
					request: requestInfo,
					response: responseInfo
				};
			}
		} catch (error: any) {
			const errorMessage = error.message || String(error);
			const errorString = errorMessage.toLowerCase();

			if (
				errorString.includes('network') ||
				errorString.includes('timeout') ||
				errorString.includes('econnrefused')
			) {
				const fallbackUsername = username || (await this.getUsername()) || 'N/A';
				return {
					connected: false,
					message: 'Network error',
					failureType: 'network',
					details: errorMessage,
					request: {
						method: 'GET',
						endpoint: 'getUserByScreenName',
						username: fallbackUsername,
						hasCookies: !!process.env.TWITTER_COOKIES
					},
					response: {
						error: errorMessage
					}
				};
			}

			const fallbackUsername = username || (await this.getUsername()) || 'N/A';
			return {
				connected: false,
				message: 'Connection test failed',
				failureType: 'unknown',
				details: errorMessage,
				request: {
					method: 'GET',
					endpoint: 'getUserByScreenName',
					username: fallbackUsername,
					hasCookies: !!process.env.TWITTER_COOKIES
				},
				response: {
					error: errorMessage
				}
			};
		}
	}

	/**
	 * Check connection health and send notifications if needed
	 */
	static async checkConnectionHealth(username: string): Promise<boolean> {
		try {
			const connectionTest = await this.testConnection(username);
			const now = Date.now();

			// Only send notification if status changed and cooldown has passed
			const shouldNotify =
				(this.lastConnectionStatus === 'connected' && !connectionTest.connected) ||
				(this.lastConnectionStatus === 'disconnected' && connectionTest.connected) ||
				(this.lastConnectionStatus === 'unknown' && !connectionTest.connected);

			const canNotify = now - this.lastNotificationTime > this.NOTIFICATION_COOLDOWN;

			if (shouldNotify && canNotify && NotificationService.isConfigured()) {
				if (!connectionTest.connected) {
					const errorDetails = connectionTest.details
						? `${connectionTest.message}\n\nDetails: ${connectionTest.details}\n\nFailure Type: ${connectionTest.failureType || 'unknown'}`
						: connectionTest.message;

					await this.sendConnectionFailureNotification(errorDetails);
					this.lastNotificationTime = now;
					this.lastConnectionStatus = 'disconnected';
				} else {
					await this.sendConnectionRestoredNotification();
					this.lastNotificationTime = now;
					this.lastConnectionStatus = 'connected';
				}
			} else if (connectionTest.connected) {
				this.lastConnectionStatus = 'connected';
			} else {
				this.lastConnectionStatus = 'disconnected';
			}

			if (!connectionTest.connected) {
				logger.error(`Connection failed: ${connectionTest.message}`);
				if (connectionTest.failureType) {
					logger.error(`Failure type: ${connectionTest.failureType}`);
				}
				if (connectionTest.details) {
					logger.error(`Details: ${connectionTest.details}`);
				}
			}

			return connectionTest.connected;
		} catch (error: any) {
			logger.error('Error checking connection health:', error.message);
			return false;
		}
	}

	/**
	 * Send a Twitter API connection failure notification
	 * @private
	 */
	private static async sendConnectionFailureNotification(error: string): Promise<boolean> {
		return NotificationService.send(
			`Twitter API connection failed: ${error}\n\nTime: ${new Date().toISOString()}`,
			'⚠️ Twitter API Connection Failed',
			4, // High priority
			['warning', 'twitter', 'api']
		);
	}

	/**
	 * Send a Twitter API connection restored notification
	 * @private
	 */
	private static async sendConnectionRestoredNotification(): Promise<boolean> {
		return NotificationService.send(
			`Twitter API connection has been restored.\n\nTime: ${new Date().toISOString()}`,
			'✅ Twitter API Connection Restored',
			2, // Low priority
			['success', 'twitter', 'api']
		);
	}
}
