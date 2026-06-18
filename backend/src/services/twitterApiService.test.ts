import { describe, expect, test, mock, beforeEach, spyOn } from 'bun:test';


const mockLogin = mock(async (_token: string) => {});
const mockGetByUsername = mock(async (_username: string): Promise<any> => null);
const mockUsersTweets = mock(
	async (_userId: string, _opts?: any): Promise<{ tweets: any[]; nextCursor?: string }> => ({
		tweets: [],
		nextCursor: undefined
	})
);
const mockTweetsGet = mock(async (_id: string): Promise<any> => null);

mock.module('emusks', () => ({
	default: class MockEmusks {
		login = mockLogin;
		users = { getByUsername: mockGetByUsername, tweets: mockUsersTweets };
		tweets = { get: mockTweetsGet };
	}
}));

const mockDbGetLatest = mock(async (): Promise<any> => null);
const mockDbUpsert = mock(async (_data: any): Promise<boolean> => true);
const mockDbDeleteNewerThan = mock(async (_id: string): Promise<number> => 0);
const mockDbDeleteNotIn = mock(async (_ids: Set<string>): Promise<number> => 0);
const mockDbGetAllIds = mock(async (): Promise<string[]> => []);
const mockDbSetPostedAt = mock(async (_id: string, _date: Date): Promise<boolean> => true);

mock.module('./tweetService', () => ({
	TweetService: {
		getLatestTweet: mockDbGetLatest,
		upsertTweet: mockDbUpsert,
		deleteTweetsNewerThan: mockDbDeleteNewerThan,
		deleteTweetsNotIn: mockDbDeleteNotIn,
		getAllTweetIds: mockDbGetAllIds,
		setTweetPostedAt: mockDbSetPostedAt
	}
}));

const mockInvalidateCached = mock((_key: string) => {});
mock.module('../utils/shortLivedCache', () => ({ invalidateCached: mockInvalidateCached }));
mock.module('../utils/logger', () => ({
	logger: { info: mock(() => {}), error: mock(() => {}), warn: mock(() => {}) }
}));
mock.module('./config', () => ({ ConfigService: { get: mock(async () => null) } }));

import { TwitterApiService } from './twitterApiService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };

interface MockTweet {
	id: string;
	text: string;
	created_at: string;
	user: { id: string; username: string; name: string; profile_image: string | null };
	in_reply_to_status_id: string | null;
}

function makeTweet(id: string, text = 'hello world', overrides: Partial<MockTweet> = {}): MockTweet {
	return {
		id,
		text,
		created_at: '2026-06-17T22:00:00.000Z',
		user: { id: '111', username: 'danewrx', name: 'dane', profile_image: null },
		in_reply_to_status_id: null,
		...overrides
	};
}

const DEFAULT_USER = { id: '111', username: 'danewrx', name: 'dane', pinned_tweets: [] as string[] };

const MOCK_CLIENT = {
	login: mockLogin,
	users: { getByUsername: mockGetByUsername, tweets: mockUsersTweets },
	tweets: { get: mockTweetsGet }
};

function setClient() {
	(TwitterApiService as any).client = MOCK_CLIENT;
}

function resetService() {
	(TwitterApiService as any).client = null;
	(TwitterApiService as any).lastFetchTime = 0;
	(TwitterApiService as any).lastFullBackfillTime = 0;
	(TwitterApiService as any).consecutiveErrors = 0;
	(TwitterApiService as any).consecutiveFullBackfillErrors = 0;
	(TwitterApiService as any).lastConnectionStatus = 'unknown';
	(TwitterApiService as any).lastNotificationTime = 0;
}

beforeEach(() => {
	resetService();
	process.env.TWITTER_AUTH_TOKEN = 'test-auth-token-abc123';
	delete process.env.TWITTER_USERNAME;
	delete process.env.TWITTER_FULL_BACKFILL_PRUNE_DELETED;
	delete process.env.TWITTER_FULL_BACKFILL_MAX_PAGES;
	delete process.env.TWITTER_FULL_BACKFILL_MAX_NEW_TWEETS;
	mockLogin.mockClear();
	mockGetByUsername.mockClear();
	mockUsersTweets.mockClear();
	mockTweetsGet.mockClear();
	mockDbGetLatest.mockClear();
	mockDbUpsert.mockClear();
	mockDbDeleteNewerThan.mockClear();
	mockDbDeleteNotIn.mockClear();
	mockDbGetAllIds.mockClear();
	mockDbSetPostedAt.mockClear();
	mockInvalidateCached.mockClear();
});

// ─── initialize() ─────────────────────────────────────────────────────────────

describe('initialize()', () => {
	test('returns false when TWITTER_AUTH_TOKEN is not set', async () => {
		delete process.env.TWITTER_AUTH_TOKEN;
		const result = await TwitterApiService.initialize();
		expect(result).toBe(false);
		expect(mockLogin).not.toHaveBeenCalled();
	});

	test('calls login with the auth token and returns true on success', async () => {
		const result = await TwitterApiService.initialize();
		expect(result).toBe(true);
		expect(mockLogin).toHaveBeenCalledWith('test-auth-token-abc123');
	});

	test('assigns client only after successful login', async () => {
		expect((TwitterApiService as any).client).toBeNull();
		await TwitterApiService.initialize();
		expect((TwitterApiService as any).client).not.toBeNull();
	});

	test('returns false and leaves client null when login throws', async () => {
		mockLogin.mockRejectedValueOnce(new Error('invalid token'));
		const result = await TwitterApiService.initialize();
		expect(result).toBe(false);
		expect((TwitterApiService as any).client).toBeNull();
	});
});

// ─── getLatestTweet() ─────────────────────────────────────────────────────────

describe('getLatestTweet()', () => {
	beforeEach(() => setClient());

	test('returns null when timeline is empty', async () => {
		mockGetByUsername.mockResolvedValueOnce(DEFAULT_USER);
		mockUsersTweets.mockResolvedValueOnce({ tweets: [], nextCursor: undefined });
		const result = await TwitterApiService.getLatestTweet('danewrx');
		expect(result).toBeNull();
	});

	test('filters out retweets', async () => {
		mockGetByUsername.mockResolvedValueOnce(DEFAULT_USER);
		mockUsersTweets.mockResolvedValueOnce({
			tweets: [makeTweet('200', 'RT @someone: cool post')],
			nextCursor: undefined
		});
		const result = await TwitterApiService.getLatestTweet('danewrx');
		expect(result).toBeNull();
	});

	test('filters out replies', async () => {
		mockGetByUsername.mockResolvedValueOnce(DEFAULT_USER);
		mockUsersTweets.mockResolvedValueOnce({
			tweets: [makeTweet('200', 'nice tweet', { in_reply_to_status_id: '199' })],
			nextCursor: undefined
		});
		const result = await TwitterApiService.getLatestTweet('danewrx');
		expect(result).toBeNull();
	});

	test('returns the newest tweet by snowflake ID when multiple candidates exist', async () => {
		mockGetByUsername.mockResolvedValueOnce(DEFAULT_USER);
		mockUsersTweets.mockResolvedValueOnce({
			tweets: [makeTweet('100', 'older tweet'), makeTweet('300', 'newer tweet'), makeTweet('200', 'middle tweet')],
			nextCursor: undefined
		});
		const result = await TwitterApiService.getLatestTweet('danewrx');
		expect(result?.tweetId).toBe('300');
	});

	test('fetches pinned tweet separately when it is not in the timeline', async () => {
		const user = { ...DEFAULT_USER, pinned_tweets: ['999'] };
		mockGetByUsername.mockResolvedValueOnce(user);
		mockUsersTweets.mockResolvedValueOnce({
			tweets: [makeTweet('100', 'regular tweet')],
			nextCursor: undefined
		});
		mockTweetsGet.mockResolvedValueOnce(makeTweet('999', 'pinned tweet'));
		const result = await TwitterApiService.getLatestTweet('danewrx');
		expect(result?.tweetId).toBe('999');
		expect(mockTweetsGet).toHaveBeenCalledWith('999');
	});

	test('does not fetch pinned tweet separately when it is already in the timeline', async () => {
		const user = { ...DEFAULT_USER, pinned_tweets: ['300'] };
		mockGetByUsername.mockResolvedValueOnce(user);
		mockUsersTweets.mockResolvedValueOnce({
			tweets: [makeTweet('300', 'pinned and in timeline'), makeTweet('100', 'older')],
			nextCursor: undefined
		});
		await TwitterApiService.getLatestTweet('danewrx');
		expect(mockTweetsGet).not.toHaveBeenCalled();
	});

	test('maps tweet fields to TweetData correctly', async () => {
		mockGetByUsername.mockResolvedValueOnce(DEFAULT_USER);
		mockUsersTweets.mockResolvedValueOnce({
			tweets: [makeTweet('500', 'my tweet')],
			nextCursor: undefined
		});
		const result = await TwitterApiService.getLatestTweet('danewrx');
		expect(result).toMatchObject({
			tweetId: '500',
			content: 'my tweet',
			authorUsername: 'danewrx',
			tweetUrl: 'https://x.com/danewrx/status/500'
		});
	});
});

// ─── fetchAndUpdateLatestTweet() ──────────────────────────────────────────────

describe('fetchAndUpdateLatestTweet()', () => {
	beforeEach(() => setClient());

	test('skips fetch when called too soon after the last one', async () => {
		(TwitterApiService as any).lastFetchTime = Date.now();
		const spy = spyOn(TwitterApiService, 'getLatestTweet');
		const result = await TwitterApiService.fetchAndUpdateLatestTweet('danewrx');
		expect(result).toBe(false);
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	test('upserts tweet and invalidates cache when a new tweet is found', async () => {
		const tweet = { tweetId: '500', content: 'new tweet', authorUsername: 'danewrx', authorName: 'dane', authorProfileImage: null, authorProfileUrl: 'https://x.com/danewrx', tweetUrl: 'https://x.com/danewrx/status/500', postedAt: new Date() };
		spyOn(TwitterApiService, 'getLatestTweet').mockResolvedValueOnce(tweet as any);
		mockDbGetLatest.mockResolvedValueOnce(null);
		mockDbUpsert.mockResolvedValueOnce(true);

		const result = await TwitterApiService.fetchAndUpdateLatestTweet('danewrx');
		expect(result).toBe(true);
		expect(mockDbUpsert).toHaveBeenCalledTimes(1);
		expect(mockInvalidateCached).toHaveBeenCalledWith('widget:latest-tweet');
	});

	test('skips upsert and updates postedAt when tweet is already up to date', async () => {
		const existing = { tweetId: '500', content: 'existing' };
		const fetched = { tweetId: '500', content: 'existing', postedAt: new Date(), authorUsername: 'danewrx', authorName: 'dane', authorProfileImage: null, authorProfileUrl: '', tweetUrl: '' };
		spyOn(TwitterApiService, 'getLatestTweet').mockResolvedValueOnce(fetched as any);
		mockDbGetLatest.mockResolvedValueOnce(existing);

		await TwitterApiService.fetchAndUpdateLatestTweet('danewrx');
		expect(mockDbUpsert).not.toHaveBeenCalled();
		expect(mockDbSetPostedAt).toHaveBeenCalledWith('500', fetched.postedAt);
	});

	test('prunes DB when API returns older tweet and direct lookup confirms deletion', async () => {
		const fetched = { tweetId: '100', content: 'older', postedAt: new Date(), authorUsername: 'danewrx', authorName: 'dane', authorProfileImage: null, authorProfileUrl: '', tweetUrl: '' };
		const existing = { tweetId: '500' }; // newer in DB
		spyOn(TwitterApiService, 'getLatestTweet').mockResolvedValueOnce(fetched as any);
		mockDbGetLatest.mockResolvedValueOnce(existing);
		mockTweetsGet.mockResolvedValueOnce(null); // tweet 500 is gone
		mockDbDeleteNewerThan.mockResolvedValueOnce(1);

		await TwitterApiService.fetchAndUpdateLatestTweet('danewrx');
		expect(mockTweetsGet).toHaveBeenCalledWith('500');
		expect(mockDbDeleteNewerThan).toHaveBeenCalledWith('100');
	});

	test('does not prune when direct lookup confirms tweet still exists', async () => {
		const fetched = { tweetId: '100', content: 'older', postedAt: new Date(), authorUsername: 'danewrx', authorName: 'dane', authorProfileImage: null, authorProfileUrl: '', tweetUrl: '' };
		const existing = { tweetId: '500' };
		spyOn(TwitterApiService, 'getLatestTweet').mockResolvedValueOnce(fetched as any);
		mockDbGetLatest.mockResolvedValueOnce(existing);
		mockTweetsGet.mockResolvedValueOnce(makeTweet('500', 'still there')); // tweet 500 exists

		await TwitterApiService.fetchAndUpdateLatestTweet('danewrx');
		expect(mockTweetsGet).toHaveBeenCalledWith('500');
		expect(mockDbDeleteNewerThan).not.toHaveBeenCalled();
	});

	test('does not prune when API tweet is newer than DB tweet', async () => {
		const fetched = { tweetId: '900', content: 'brand new', postedAt: new Date(), authorUsername: 'danewrx', authorName: 'dane', authorProfileImage: null, authorProfileUrl: '', tweetUrl: '' };
		const existing = { tweetId: '500' };
		spyOn(TwitterApiService, 'getLatestTweet').mockResolvedValueOnce(fetched as any);
		mockDbGetLatest.mockResolvedValueOnce(existing);

		await TwitterApiService.fetchAndUpdateLatestTweet('danewrx');
		expect(mockTweetsGet).not.toHaveBeenCalled();
		expect(mockDbDeleteNewerThan).not.toHaveBeenCalled();
	});
});

// ─── fetchAndBackfillAllTweets() ──────────────────────────────────────────────

describe('fetchAndBackfillAllTweets()', () => {
	beforeEach(() => {
		setClient();
		mockGetByUsername.mockResolvedValue(DEFAULT_USER);
	});

	test('inserts new tweets and skips ones already in the DB', async () => {
		mockDbGetAllIds.mockResolvedValueOnce(['100']); // 100 already in DB
		mockUsersTweets.mockResolvedValueOnce({
			tweets: [makeTweet('100', 'existing'), makeTweet('200', 'new tweet')],
			nextCursor: undefined
		});

		await TwitterApiService.fetchAndBackfillAllTweets('danewrx');
		expect(mockDbUpsert).toHaveBeenCalledTimes(1);
		expect(mockDbUpsert.mock.calls[0][0].tweetId).toBe('200');
	});

	test('prunes DB tweets not seen when timeline end is reached', async () => {
		process.env.TWITTER_FULL_BACKFILL_PRUNE_DELETED = 'true';
		mockDbGetAllIds.mockResolvedValueOnce(['100', '999']);
		mockUsersTweets.mockResolvedValueOnce({
			tweets: [makeTweet('100', 'still exists')],
			nextCursor: undefined
		});

		await TwitterApiService.fetchAndBackfillAllTweets('danewrx');
		expect(mockDbDeleteNotIn).toHaveBeenCalledTimes(1);
		const keptIds: Set<string> = mockDbDeleteNotIn.mock.calls[0][0];
		expect(keptIds.has('100')).toBe(true);
		expect(keptIds.has('999')).toBe(false);
	});

	test('does not prune when stopped at maxPages limit', async () => {
		process.env.TWITTER_FULL_BACKFILL_PRUNE_DELETED = 'true';
		process.env.TWITTER_FULL_BACKFILL_MAX_PAGES = '1';
		mockDbGetAllIds.mockResolvedValueOnce([]);
		mockUsersTweets.mockResolvedValueOnce({
			tweets: [makeTweet('100', 'tweet')],
			nextCursor: 'cursor-abc'
		});

		await TwitterApiService.fetchAndBackfillAllTweets('danewrx');
		expect(mockDbDeleteNotIn).not.toHaveBeenCalled();
	});

	test('does not prune when stopped at maxNewTweets cap', async () => {
		process.env.TWITTER_FULL_BACKFILL_PRUNE_DELETED = 'true';
		process.env.TWITTER_FULL_BACKFILL_MAX_NEW_TWEETS = '1';
		mockDbGetAllIds.mockResolvedValueOnce([]);
		mockUsersTweets.mockResolvedValueOnce({
			tweets: [makeTweet('100', 'first'), makeTweet('200', 'second')],
			nextCursor: undefined
		});

		await TwitterApiService.fetchAndBackfillAllTweets('danewrx');
		expect(mockDbDeleteNotIn).not.toHaveBeenCalled();
	});

	test('does not prune when TWITTER_FULL_BACKFILL_PRUNE_DELETED is false', async () => {
		process.env.TWITTER_FULL_BACKFILL_PRUNE_DELETED = 'false';
		mockDbGetAllIds.mockResolvedValueOnce([]);
		mockUsersTweets.mockResolvedValueOnce({
			tweets: [makeTweet('100', 'tweet')],
			nextCursor: undefined
		});

		await TwitterApiService.fetchAndBackfillAllTweets('danewrx');
		expect(mockDbDeleteNotIn).not.toHaveBeenCalled();
	});

	test('skips retweets and replies during backfill', async () => {
		mockDbGetAllIds.mockResolvedValueOnce([]);
		mockUsersTweets.mockResolvedValueOnce({
			tweets: [
				makeTweet('100', 'RT @someone: a retweet'),
				makeTweet('200', 'a reply', { in_reply_to_status_id: '199' }),
				makeTweet('300', 'original tweet')
			],
			nextCursor: undefined
		});

		await TwitterApiService.fetchAndBackfillAllTweets('danewrx');
		expect(mockDbUpsert).toHaveBeenCalledTimes(1);
		expect(mockDbUpsert.mock.calls[0][0].tweetId).toBe('300');
	});
});
