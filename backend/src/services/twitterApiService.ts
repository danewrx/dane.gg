import { logger } from '../utils/logger';
import { TwitterOpenApi } from 'twitter-openapi-typescript';
import { TweetService, type TweetData } from './tweetService';
import { NotificationService } from './notificationService';
import { getNotificationSettings } from './notificationSettings';
import { resolveTemplatedAppearance } from './ntfyTemplate';
import { ConfigService } from './config';
import { getKwargs } from 'twitter-openapi-typescript/dist/src/utils/api';
import { invalidateCached } from '../utils/shortLivedCache';

function asObject(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object') return null;
	return value as Record<string, unknown>;
}

function parseTweetPostedAtFromLegacy(legacy: unknown): Date | undefined {
	const record = asObject(legacy);
	if (!record) return undefined;
	const rawValue =
		record.created_at ?? record.createdAt ?? record.timestamp_ms ?? record.timestampMs;
	if (rawValue == null) return undefined;

	const toValidDate = (value: string | number): Date | undefined => {
		const d = new Date(value);
		return Number.isNaN(d.getTime()) ? undefined : d;
	};

	const asEpochMs = (value: string): number | undefined => {
		if (!/^\d+$/.test(value)) return undefined;
		const ms = Number(value);
		return Number.isNaN(ms) ? undefined : ms;
	};

	if (typeof rawValue === 'number') return toValidDate(rawValue);
	if (typeof rawValue !== 'string') return undefined;

	const epochMs = asEpochMs(rawValue);
	if (epochMs != null) return toValidDate(epochMs);
	return toValidDate(rawValue);
}

/** Coerce a tweet id field to string without `[object Object]` for plain objects. */
function coerceTweetIdString(raw: unknown): string {
	if (typeof raw === 'string') return raw;
	if (raw == null) return '';
	if (typeof raw === 'number' || typeof raw === 'bigint' || typeof raw === 'boolean') {
		return String(raw);
	}
	return '';
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

export function getTimelineInstructionEntries(instruction: unknown): unknown[] | null {
	const instr = asObject(instruction);
	if (!instr) return null;
	// TimelineAddEntries: has `entries` array
	if (Array.isArray(instr.entries)) return instr.entries;
	// TimelinePinEntry: has single `entry` object
	if (instr.entry && typeof instr.entry === 'object') return [instr.entry as unknown];
	return null;
}

function getTweetResultFromTimelineEntry(entry: unknown): any {
	const itemContent = asObject(asObject(entry)?.content)?.itemContent;
	const ic = asObject(itemContent);
	if (!ic) return null;
	const tweetResults = ic.tweet_results ?? ic.tweetResults;
	return asObject(tweetResults)?.result ?? null;
}

function tweetTextFromRecord(record: Record<string, unknown>): string | null {
	const text = record.full_text ?? record.fullText ?? record.text;
	if (typeof text !== 'string') return null;
	return text;
}

function hasNumericTweetId(record: Record<string, unknown>): boolean {
	for (const key of ['id_str', 'idStr', 'id'] as const) {
		const id = record[key];
		if (typeof id === 'string' && /^\d+$/.test(id)) return true;
	}
	return false;
}

function isTweetLikeObject(obj: unknown): boolean {
	const record = asObject(obj);
	if (!record) return false;

	const legacy = asObject(record.legacy);
	if (legacy && tweetTextFromRecord(legacy)) return true;

	const topLevelText = tweetTextFromRecord(record);
	if (topLevelText) {
		if (legacy || record.__typename === 'Tweet' || hasNumericTweetId(record)) {
			return true;
		}
	}

	return record.__typename === 'Tweet';
}

function findTweetInResponse(obj: unknown, depth = 0): any {
	if (depth > 10) return null;
	if (isTweetLikeObject(obj)) return obj;

	const record = asObject(obj);
	if (!record) return null;

	for (const key of Object.keys(record)) {
		const found = findTweetInResponse(record[key], depth + 1);
		if (found) return found;
	}
	return null;
}

function parseTweetIdFromEntry(key: string, value: string): string | null {
	const isIdKey = key === 'id_str' || key === 'idStr' || key === 'id';
	if (!isIdKey || !/^\d+$/.test(value)) return null;
	return value;
}

function parseTweetTextFromEntry(key: string, value: string): string | null {
	const isTextKey = key === 'full_text' || key === 'fullText' || key === 'text';
	if (!isTextKey) return null;

	const trimmed = value.trim();
	if (trimmed.length === 0) return null;
	if (trimmed.length < 2 && !trimmed.includes(' ')) return null;
	return value;
}

function resolveUserLegacyFromTweet(tweetData: any, fallbackUser: any): any {
	return (
		tweetData.core?.userResults?.result?.legacy ??
		tweetData.core?.user_results?.result?.legacy ??
		tweetData.core?.userResults?.result ??
		tweetData.core?.user_results?.result ??
		fallbackUser?.legacy ??
		fallbackUser
	);
}

function profileImageFromUserLegacy(userLegacy: any): string | undefined {
	if (!userLegacy) return undefined;
	return (
		userLegacy.profileImageUrlHttps ||
		userLegacy.profile_image_url_https ||
		userLegacy.profile_image_url ||
		undefined
	);
}

function extractIdAndTextFromObject(obj: unknown): {
	tweetId: string | null;
	tweetText: string | null;
} {
	let tweetId: string | null = null;
	let tweetText: string | null = null;

	const visit = (cur: unknown, depth: number): boolean => {
		if (tweetId && tweetText) return true;

		const record = asObject(cur);
		if (!record || depth > 10) return false;

		for (const [key, value] of Object.entries(record)) {
			if (!tweetId && typeof value === 'string') {
				tweetId = parseTweetIdFromEntry(key, value);
			}
			if (!tweetText && typeof value === 'string') {
				tweetText = parseTweetTextFromEntry(key, value);
			}
			if (visit(value, depth + 1)) return true;
		}

		return Boolean(tweetId && tweetText);
	};

	visit(obj, 0);
	return { tweetId, tweetText };
}

function pickNewerTweet(current: unknown, candidate: unknown): unknown {
	if (!current) return candidate;
	if (!candidate) return current;

	const parsePostedAt = (tweet: unknown): Date | undefined =>
		parseTweetPostedAtFromLegacy(asObject(tweet)?.legacy);

	const pickTweetId = (tweet: unknown): string => {
		const record = asObject(tweet);
		const legacy = asObject(record?.legacy);
		const raw =
			record?.rest_id ??
			record?.restId ??
			legacy?.id_str ??
			legacy?.idStr ??
			record?.id ??
			record?.id_str ??
			record?.idStr ??
			null;
		return coerceTweetIdString(raw);
	};

	const byPostedAt = (() => {
		const curPosted = parsePostedAt(current);
		const candPosted = parsePostedAt(candidate);
		if (curPosted && candPosted) {
			if (candPosted > curPosted) return candidate;
			return current;
		}
		if (candPosted) return candidate;
		if (curPosted) return current;
		return null;
	})();
	if (byPostedAt) return byPostedAt;

	const curId = pickTweetId(current);
	const candId = pickTweetId(candidate);
	if (!/^\d+$/.test(curId) || !/^\d+$/.test(candId)) return current;
	if (BigInt(candId) > BigInt(curId)) return candidate;
	return current;
}

function isTimelineTweetResult(result: any): boolean {
	return Boolean(result && (result.__typename === 'Tweet' || result.legacy));
}

export function isRetweetOrReply(candidate: any): boolean {
	const legacy = asObject(candidate?.legacy);
	if (!legacy) return false;
	const text = legacy.full_text ?? legacy.fullText ?? legacy.text ?? '';
	if (typeof text === 'string' && text.trimStart().startsWith('RT @')) return true;
	const inReplyTo =
		legacy.in_reply_to_status_id_str ?? legacy.inReplyToStatusIdStr ?? legacy.in_reply_to_status_id;
	return !!inReplyTo;
}

export function mergeNewestTweet(current: any, candidate: any): any {
	if (!isTimelineTweetResult(candidate)) return current;
	if (isRetweetOrReply(candidate)) return current;
	return pickNewerTweet(current, candidate);
}

function pickNewestFromStandardInstructions(instructions: unknown[], tweetData: any): any {
	let newest = tweetData;
	for (const instruction of instructions) {
		const entries = getTimelineInstructionEntries(instruction);
		if (!entries) continue;
		for (const entry of entries) {
			newest = mergeNewestTweet(newest, getTweetResultFromTimelineEntry(entry));
		}
	}
	return newest;
}

function pickNewestFromRawInstructions(instructions: any[], tweetData: any): any {
	let newest = tweetData;
	for (const instruction of instructions) {
		if (!instruction?.entries) continue;
		for (const entry of instruction.entries) {
			const result = entry?.content?.itemContent?.tweetResults?.result;
			newest = mergeNewestTweet(newest, result);
		}
	}
	return newest;
}

export function extractNewestTweetFromTimeline(responseData: any): any {
	let tweetData: any = null;
	const instructions = getTimelineInstructions(responseData);

	if (instructions) {
		tweetData = pickNewestFromStandardInstructions(instructions, tweetData);
	} else if (responseData?.raw?.instruction && Array.isArray(responseData.raw.instruction)) {
		tweetData = pickNewestFromRawInstructions(responseData.raw.instruction, tweetData);
	}

	return tweetData ?? findTweetInResponse(responseData);
}

type BackfillAuthor = {
	authorName: string;
	authorUsername: string;
	profileImage: string | null;
	profileUrl: string;
};

type BackfillConfig = {
	batchSize: number;
	maxPages: number;
	maxNewTweets: number;
	pruneDeleted: boolean;
};

type BackfillPageResult = {
	inserted: number;
	pages: number;
	reachedEndOfTimeline: boolean;
};

function parseBackfillConfig(): BackfillConfig {
	return {
		batchSize: Math.max(
			Number.parseInt(process.env.TWITTER_FULL_BACKFILL_BATCH_SIZE ?? '20', 10),
			1
		),
		maxPages: Math.max(
			Number.parseInt(process.env.TWITTER_FULL_BACKFILL_MAX_PAGES ?? '200', 10),
			1
		),
		maxNewTweets: Number.parseInt(process.env.TWITTER_FULL_BACKFILL_MAX_NEW_TWEETS ?? '0', 10),
		pruneDeleted:
			(process.env.TWITTER_FULL_BACKFILL_PRUNE_DELETED ?? 'true').toLowerCase() === 'true'
	};
}

export function pickBackfillTweetId(legacy: any, fallback: any): string | null {
	const idStr =
		legacy?.id_str ??
		legacy?.idStr ??
		fallback?.rest_id ??
		fallback?.restId ??
		fallback?.id_str ??
		fallback?.idStr ??
		fallback?.id;

	if (idStr == null) return null;
	const s = coerceTweetIdString(idStr);
	return /^\d+$/.test(s) ? s : null;
}

export function extractBottomCursor(obj: any, depth = 0): string | null {
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
}

type BackfillTweetCollector = {
	results: any[];
	seen: Set<string>;
};

function createBackfillTweetCollector(): BackfillTweetCollector {
	return { results: [], seen: new Set() };
}

function isTweetResultObject(tweetResult: any): boolean {
	return Boolean(tweetResult && (tweetResult.__typename === 'Tweet' || tweetResult.legacy));
}

function tryAddBackfillTweet(tweetResult: any, collector: BackfillTweetCollector): void {
	if (!isTweetResultObject(tweetResult)) return;
	const legacy = tweetResult.legacy || tweetResult;
	const tweetId = pickBackfillTweetId(legacy, tweetResult);
	if (!tweetId || collector.seen.has(tweetId)) return;
	collector.seen.add(tweetId);
	collector.results.push(tweetResult);
}

function getTimelineInstructions(timeline: any): unknown[] | null {
	const instructions =
		timeline?.user?.result?.timeline?.timeline?.instructions ??
		timeline?.data?.user?.result?.timeline?.timeline?.instructions ??
		timeline?.raw?.instruction ??
		null;
	return Array.isArray(instructions) ? instructions : null;
}

function collectTweetsFromStandardInstructions(
	instructions: unknown[],
	collector: BackfillTweetCollector
): void {
	for (const instruction of instructions) {
		const entries = getTimelineInstructionEntries(instruction);
		if (!entries) continue;
		for (const entry of entries) {
			const result = getTweetResultFromTimelineEntry(entry);
			if (result) tryAddBackfillTweet(result, collector);
		}
	}
}

function collectTweetsFromRawInstructions(
	instructions: any[],
	collector: BackfillTweetCollector
): void {
	for (const instruction of instructions) {
		if (!instruction?.entries) continue;
		for (const entry of instruction.entries) {
			const result = entry?.content?.itemContent?.tweetResults?.result;
			if (result) tryAddBackfillTweet(result, collector);
		}
	}
}

function deepScanTweetsForBackfill(
	obj: any,
	batchSize: number,
	collector: BackfillTweetCollector,
	depth = 0
): void {
	if (!obj || typeof obj !== 'object' || depth > 10) return;
	if (isTweetResultObject(obj)) {
		tryAddBackfillTweet(obj, collector);
	}
	if (collector.results.length > batchSize * 5) return;
	for (const key of Object.keys(obj)) {
		deepScanTweetsForBackfill(obj[key], batchSize, collector, depth + 1);
		if (collector.results.length > batchSize * 5) return;
	}
}

function collectTweetsFromTimeline(timeline: any, batchSize: number): any[] {
	const collector = createBackfillTweetCollector();
	const instructions = getTimelineInstructions(timeline);

	if (instructions) {
		collectTweetsFromStandardInstructions(instructions, collector);
		return collector.results;
	}

	if (timeline?.raw?.instruction && Array.isArray(timeline.raw.instruction)) {
		collectTweetsFromRawInstructions(timeline.raw.instruction, collector);
		return collector.results;
	}

	deepScanTweetsForBackfill(timeline, batchSize, collector);
	return collector.results;
}

function buildBackfillAuthor(userData: any, username: string): BackfillAuthor {
	const userLegacy = userData?.legacy || userData;
	const authorUsername = userLegacy?.screenName || userLegacy?.screen_name || username;
	return {
		authorName: userLegacy?.name || '',
		authorUsername,
		profileImage:
			userLegacy?.profileImageUrlHttps ||
			userLegacy?.profile_image_url_https ||
			userLegacy?.profile_image_url ||
			null,
		profileUrl: `https://x.com/${authorUsername}`
	};
}

export function extractProfileImageFromTweetResult(tweetResult: any): string | null {
	const userLegacy =
		tweetResult?.core?.user_results?.result?.legacy ||
		tweetResult?.core?.userResults?.result?.legacy;
	if (!userLegacy) return null;
	return (
		userLegacy.profile_image_url_https ||
		userLegacy.profileImageUrlHttps ||
		userLegacy.profile_image_url ||
		null
	);
}

async function upsertNewBackfillTweets(
	tweets: any[],
	author: BackfillAuthor,
	existingIds: Set<string>,
	fetchedIds: Set<string>
): Promise<number> {
	let batchNew = 0;
	for (const t of tweets) {
		const legacy = t?.legacy || t;
		const tweetId = pickBackfillTweetId(legacy, t);
		const tweetText = legacy?.full_text ?? legacy?.fullText ?? legacy?.text;
		if (!tweetId || typeof tweetText !== 'string' || !tweetText.trim()) continue;

		fetchedIds.add(tweetId);
		if (existingIds.has(tweetId)) {
			const profileImage = extractProfileImageFromTweetResult(t) || author.profileImage;
			if (profileImage) {
				await TweetService.updateProfileImageIfMissing(tweetId, profileImage);
			}
			continue;
		}

		await TweetService.upsertTweet({
			tweetId,
			content: tweetText,
			authorName: author.authorName,
			authorUsername: author.authorUsername,
			authorProfileImage: extractProfileImageFromTweetResult(t) || author.profileImage || undefined,
			authorProfileUrl: author.profileUrl || undefined,
			tweetUrl: `https://x.com/${author.authorUsername}/status/${tweetId}`,
			postedAt: parseTweetPostedAtFromLegacy(legacy)
		});

		existingIds.add(tweetId);
		batchNew++;
	}
	return batchNew;
}

async function pruneDeletedTweetsAfterBackfill(
	pruneDeleted: boolean,
	fetchedIds: Set<string>,
	reachedEndOfTimeline: boolean
): Promise<number> {
	if (!pruneDeleted || fetchedIds.size === 0) return 0;

	if (!reachedEndOfTimeline) {
		logger.warn(
			'TWITTER: skipped pruning deleted tweets — timeline pagination did not reach the end (increase TWITTER_FULL_BACKFILL_MAX_PAGES or check limits)'
		);
		return 0;
	}

	const pruned = await TweetService.deleteTweetsNotIn(fetchedIds);
	if (pruned > 0) {
		invalidateCached('widget:latest-tweet');
	}
	return pruned;
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
				logger.error('Response structure:', JSON.stringify(userResult.data, null, 2));
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

			const tweetData = extractNewestTweetFromTimeline(responseData);
			if (!tweetData) {
				logger.info('No tweet data found in response');
				return null;
			}

			logger.info('Tweet data keys:', Object.keys(tweetData));
			logger.info(
				'Full tweet data structure:',
				JSON.stringify(tweetData, undefined, 2).substring(0, 2000)
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
							postedAt: parseTweetPostedAtFromLegacy(altLegacy)
						};
					}
				}

				const { tweetId, tweetText } = extractIdAndTextFromObject(tweetData);
				if (tweetId && tweetText) {
					const userLegacy = resolveUserLegacyFromTweet(tweetData, userData);

					const authorName = userLegacy?.name || '';
					const authorUsername = userLegacy?.screenName || userLegacy?.screen_name || username;

					const profileImage = profileImageFromUserLegacy(userLegacy);

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
					JSON.stringify(tweetLegacy, undefined, 2).substring(0, 500)
				);
				return null;
			}

			logger.info('Successfully extracted tweet:', tweetId);

			const userLegacy = resolveUserLegacyFromTweet(tweetData, userData);
			const profileImage = profileImageFromUserLegacy(userLegacy);

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
				postedAt: parseTweetPostedAtFromLegacy(tweetLegacy)
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
				logger.info(`waiting ${Math.ceil(waitTime / 1000)}s before next fetch`);
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

	private static async ensureClientInitialized(): Promise<boolean> {
		if (!this.client) {
			const initialized = await this.initialize();
			if (!initialized) return false;
		}
		if (!this.client) {
			logger.error('Client is not initialized');
			return false;
		}
		return true;
	}

	private static canStartFullBackfillNow(): boolean {
		const minInterval = Number.parseInt(
			process.env.TWITTER_FULL_BACKFILL_MIN_INTERVAL_MS ??
				String(this.MIN_FULL_BACKFILL_INTERVAL_MS),
			10
		);
		if (Number.isFinite(minInterval) && minInterval > 0) {
			if (Date.now() - this.lastFullBackfillTime < minInterval) {
				return false;
			}
		}
		this.lastFullBackfillTime = Date.now();
		return true;
	}

	private static async resolveBackfillUser(
		username: string
	): Promise<{ userId: string; userData: any } | null> {
		const userResult = await this.client.getUserApi().getUserByScreenName({ screenName: username });

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
			return null;
		}
		return { userId, userData };
	}

	private static async runBackfillPagination(
		userId: string,
		author: BackfillAuthor,
		existingIds: Set<string>,
		fetchedIds: Set<string>,
		config: BackfillConfig
	): Promise<BackfillPageResult> {
		let cursor: string | undefined;
		let pages = 0;
		let inserted = 0;
		let reachedEndOfTimeline = false;

		while (pages < config.maxPages) {
			if (config.maxNewTweets > 0 && inserted >= config.maxNewTweets) break;

			const tweetApiUtils = this.client.getTweetApi();
			const flag = tweetApiUtils?.flag?.UserTweets ?? tweetApiUtils?.flag?.['UserTweets'];
			const initOverrides = tweetApiUtils?.initOverrides?.(flag);
			const kwargs = { userId, count: config.batchSize, ...(cursor ? { cursor } : {}) };
			const args = getKwargs(flag, kwargs);

			const rawResp: any = await tweetApiUtils.api.getUserTweetsRaw(args, initOverrides);
			const rawJson: any = await rawResp.raw.json();
			const timelineResult: any = rawJson?.data || rawJson;

			const tweets = collectTweetsFromTimeline(rawJson, config.batchSize);
			if (tweets.length === 0) break;

			const prevFetchedSize = fetchedIds.size;
			const batchNew = await upsertNewBackfillTweets(tweets, author, existingIds, fetchedIds);
			inserted += batchNew;
			pages++;

			if (fetchedIds.size === prevFetchedSize) {
				reachedEndOfTimeline = true;
				break;
			}

			const nextCursor = extractBottomCursor(rawJson) ?? extractBottomCursor(timelineResult);
			if (!nextCursor) {
				reachedEndOfTimeline = true;
				break;
			}

			cursor = nextCursor;
			logger.info(
				`TWITTER: backfill page ${pages}/${config.maxPages} (inserted ${batchNew}, total ${inserted}, fetched ${fetchedIds.size})`
			);
		}

		return { inserted, pages, reachedEndOfTimeline };
	}

	/**
	 * Fetch the user's entire timeline history and upsert any tweets missing from the DB.
	 *
	 * This uses cursor-based pagination on the raw timeline endpoint.
	 */
	static async fetchAndBackfillAllTweets(username: string): Promise<boolean> {
		try {
			if (!(await this.ensureClientInitialized())) return false;
			if (!this.canStartFullBackfillNow()) return false;

			const user = await this.resolveBackfillUser(username);
			if (!user) return false;

			const author = buildBackfillAuthor(user.userData, username);
			const existingIds = new Set(await TweetService.getAllTweetIds());
			const fetchedIds = new Set<string>();
			const config = parseBackfillConfig();

			logger.info(`TWITTER: Starting backfill for @${username}`);

			const { inserted, reachedEndOfTimeline } = await this.runBackfillPagination(
				user.userId,
				author,
				existingIds,
				fetchedIds,
				config
			);

			const pruned = await pruneDeletedTweetsAfterBackfill(
				config.pruneDeleted,
				fetchedIds,
				reachedEndOfTimeline
			);

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

					const sent = await this.sendConnectionFailureNotification(errorDetails);
					if (sent) {
						this.lastNotificationTime = now;
					}
					this.lastConnectionStatus = 'disconnected';
				} else {
					const sent = await this.sendConnectionRestoredNotification();
					if (sent) {
						this.lastNotificationTime = now;
					}
					this.lastConnectionStatus = 'connected';
				}
			} else if (shouldNotify && canNotify && !NotificationService.isConfigured()) {
				logger.warn(
					'Twitter connection status changed but NTFY_TOPIC is not set; skipping push notification'
				);
			} else if (shouldNotify && !canNotify) {
				logger.info(
					'Twitter connection status changed but notification cooldown is active; skipping push notification'
				);
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
		const settings = await getNotificationSettings();
		const { failure } = settings.twitter;
		if (!failure.enabled) return false;
		const { message, appearance } = resolveTemplatedAppearance(failure, {
			error,
			time: new Date().toISOString()
		});
		return NotificationService.sendWithAppearance(message, appearance);
	}

	/**
	 * Send a Twitter API connection restored notification
	 * @private
	 */
	private static async sendConnectionRestoredNotification(): Promise<boolean> {
		const settings = await getNotificationSettings();
		const { restored } = settings.twitter;
		if (!restored.enabled) return false;
		const { message, appearance } = resolveTemplatedAppearance(restored, {
			time: new Date().toISOString()
		});
		return NotificationService.sendWithAppearance(message, appearance);
	}
}
