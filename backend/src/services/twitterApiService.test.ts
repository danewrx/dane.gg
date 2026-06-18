import { describe, expect, test } from 'bun:test';
import {
	isRetweetOrReply,
	mergeNewestTweet,
	getTimelineInstructionEntries,
	extractBottomCursor,
	pickBackfillTweetId,
	extractProfileImageFromTweetResult,
	extractNewestTweetFromTimeline
} from './twitterApiService';

// Helpers to build minimal tweet result fixtures

function makeTweet(id: string, text: string, createdAt?: string) {
	return {
		__typename: 'Tweet',
		rest_id: id,
		legacy: {
			id_str: id,
			full_text: text,
			...(createdAt ? { created_at: createdAt } : {})
		}
	};
}

function makeRetweet(id: string) {
	return makeTweet(id, 'RT @someone: original tweet content here');
}

function makeReply(id: string) {
	return {
		...makeTweet(id, 'replying to someone'),
		legacy: {
			id_str: id,
			full_text: 'replying to someone',
			in_reply_to_status_id_str: '1000000000000000000'
		}
	};
}

function makeTimelineEntry(tweet: any) {
	return {
		content: {
			itemContent: {
				tweet_results: { result: tweet }
			}
		}
	};
}

function makeAddEntriesInstruction(tweets: any[]) {
	return { entries: tweets.map(makeTimelineEntry) };
}

function makePinEntryInstruction(tweet: any) {
	return { entry: makeTimelineEntry(tweet) };
}

function makeTimeline(instructions: any[]) {
	return {
		user: {
			result: {
				timeline: {
					timeline: { instructions }
				}
			}
		}
	};
}

// ─── isRetweetOrReply ────────────────────────────────────────────────────────

describe('isRetweetOrReply', () => {
	test('false for a normal tweet', () => {
		expect(isRetweetOrReply(makeTweet('1', 'hello world'))).toBe(false);
	});

	test('true for a retweet (full_text starts with RT @)', () => {
		expect(isRetweetOrReply(makeRetweet('2'))).toBe(true);
	});

	test('true for a reply (has in_reply_to_status_id_str)', () => {
		expect(isRetweetOrReply(makeReply('3'))).toBe(true);
	});

	test('true for reply with camelCase inReplyToStatusIdStr', () => {
		const tweet = {
			__typename: 'Tweet',
			legacy: { full_text: 'reply', inReplyToStatusIdStr: '9999' }
		};
		expect(isRetweetOrReply(tweet)).toBe(true);
	});

	test('false when candidate is null', () => {
		expect(isRetweetOrReply(null)).toBe(false);
	});

	test('false when no legacy on candidate', () => {
		expect(isRetweetOrReply({ __typename: 'Tweet' })).toBe(false);
	});
});

// ─── mergeNewestTweet ────────────────────────────────────────────────────────

describe('mergeNewestTweet', () => {
	test('returns candidate when current is null', () => {
		const tweet = makeTweet('100', 'first tweet');
		expect(mergeNewestTweet(null, tweet)).toBe(tweet);
	});

	test('returns current when candidate is not a tweet result', () => {
		const current = makeTweet('100', 'existing');
		expect(mergeNewestTweet(current, null)).toBe(current);
		expect(mergeNewestTweet(current, { notATweet: true })).toBe(current);
	});

	test('skips retweets — returns current', () => {
		const current = makeTweet('100', 'my original tweet');
		const rt = makeRetweet('999');
		expect(mergeNewestTweet(current, rt)).toBe(current);
	});

	test('skips replies — returns current', () => {
		const current = makeTweet('100', 'my original tweet');
		expect(mergeNewestTweet(current, makeReply('999'))).toBe(current);
	});

	test('picks newer tweet by snowflake ID', () => {
		const older = makeTweet('100', 'older tweet');
		const newer = makeTweet('200', 'newer tweet');
		expect(mergeNewestTweet(older, newer)).toBe(newer);
		expect(mergeNewestTweet(newer, older)).toBe(newer);
	});

	test('picks newer tweet by created_at date', () => {
		const older = makeTweet('100', 'older', 'Mon Jan 01 00:00:00 +0000 2024');
		const newer = makeTweet('99', 'newer', 'Tue Jan 02 00:00:00 +0000 2024');
		expect(mergeNewestTweet(older, newer)).toBe(newer);
	});
});

// ─── getTimelineInstructionEntries ──────────────────────────────────────────

describe('getTimelineInstructionEntries', () => {
	test('returns entries array for TimelineAddEntries', () => {
		const entry = makeTimelineEntry(makeTweet('1', 'hi'));
		const instruction = { entries: [entry] };
		expect(getTimelineInstructionEntries(instruction)).toEqual([entry]);
	});

	test('returns single-element array for TimelinePinEntry', () => {
		const entry = makeTimelineEntry(makeTweet('1', 'pinned'));
		const instruction = { entry };
		const result = getTimelineInstructionEntries(instruction);
		expect(result).toHaveLength(1);
		expect(result![0]).toBe(entry);
	});

	test('returns null for unknown instruction type (e.g. TimelineClearCache)', () => {
		expect(getTimelineInstructionEntries({ type: 'TimelineClearCache' })).toBeNull();
	});

	test('returns null for null input', () => {
		expect(getTimelineInstructionEntries(null)).toBeNull();
	});
});

// ─── extractBottomCursor ─────────────────────────────────────────────────────

describe('extractBottomCursor', () => {
	test('finds cursor nested in timeline structure', () => {
		const timeline = {
			data: {
				user: {
					result: {
						timeline: {
							instructions: [
								{
									entries: [
										{ content: { cursorType: 'Bottom', value: 'cursor_abc123' } }
									]
								}
							]
						}
					}
				}
			}
		};
		expect(extractBottomCursor(timeline)).toBe('cursor_abc123');
	});

	test('handles snake_case cursor_type', () => {
		const obj = { cursor_type: 'Bottom', cursor: 'snake_cursor' };
		expect(extractBottomCursor(obj)).toBe('snake_cursor');
	});

	test('prefers value over cursor field', () => {
		const obj = { cursorType: 'Bottom', value: 'val', cursor: 'cur' };
		expect(extractBottomCursor(obj)).toBe('val');
	});

	test('returns null when no bottom cursor exists', () => {
		expect(extractBottomCursor({ cursorType: 'Top', value: 'top' })).toBeNull();
		expect(extractBottomCursor({})).toBeNull();
		expect(extractBottomCursor(null)).toBeNull();
	});
});

// ─── pickBackfillTweetId ─────────────────────────────────────────────────────

describe('pickBackfillTweetId', () => {
	test('picks id_str from legacy', () => {
		expect(pickBackfillTweetId({ id_str: '123456' }, {})).toBe('123456');
	});

	test('picks idStr (camelCase) from legacy', () => {
		expect(pickBackfillTweetId({ idStr: '789012' }, {})).toBe('789012');
	});

	test('falls back to rest_id on tweet result', () => {
		expect(pickBackfillTweetId({}, { rest_id: '555555' })).toBe('555555');
	});

	test('falls back to restId (camelCase)', () => {
		expect(pickBackfillTweetId({}, { restId: '666666' })).toBe('666666');
	});

	test('returns null for non-numeric id', () => {
		expect(pickBackfillTweetId({ id_str: 'not-a-number' }, {})).toBeNull();
	});

	test('returns null when all sources are absent', () => {
		expect(pickBackfillTweetId({}, {})).toBeNull();
		expect(pickBackfillTweetId(null, null)).toBeNull();
	});
});

// ─── extractProfileImageFromTweetResult ─────────────────────────────────────

describe('extractProfileImageFromTweetResult', () => {
	const imageUrl = 'https://pbs.twimg.com/profile_images/abc/photo_normal.jpg';

	test('extracts from snake_case core.user_results path', () => {
		const result = {
			core: { user_results: { result: { legacy: { profile_image_url_https: imageUrl } } } }
		};
		expect(extractProfileImageFromTweetResult(result)).toBe(imageUrl);
	});

	test('extracts from camelCase core.userResults path', () => {
		const result = {
			core: { userResults: { result: { legacy: { profileImageUrlHttps: imageUrl } } } }
		};
		expect(extractProfileImageFromTweetResult(result)).toBe(imageUrl);
	});

	test('falls back to profile_image_url when https variant absent', () => {
		const result = {
			core: { user_results: { result: { legacy: { profile_image_url: imageUrl } } } }
		};
		expect(extractProfileImageFromTweetResult(result)).toBe(imageUrl);
	});

	test('returns null when no user data', () => {
		expect(extractProfileImageFromTweetResult({})).toBeNull();
		expect(extractProfileImageFromTweetResult(null)).toBeNull();
	});
});

// ─── extractNewestTweetFromTimeline (integration) ────────────────────────────

describe('extractNewestTweetFromTimeline', () => {
	test('picks the newest original tweet from multiple entries', () => {
		const older = makeTweet('100', 'older tweet');
		const newer = makeTweet('200', 'newer tweet');
		const timeline = makeTimeline([makeAddEntriesInstruction([older, newer])]);
		const result = extractNewestTweetFromTimeline(timeline);
		expect(result.rest_id).toBe('200');
	});

	test('ignores retweets when picking newest', () => {
		const original = makeTweet('100', 'my original post');
		const rt = makeRetweet('999');
		const timeline = makeTimeline([makeAddEntriesInstruction([original, rt])]);
		const result = extractNewestTweetFromTimeline(timeline);
		expect(result.rest_id).toBe('100');
	});

	test('ignores replies when picking newest', () => {
		const original = makeTweet('100', 'my original post');
		const reply = makeReply('999');
		const timeline = makeTimeline([makeAddEntriesInstruction([original, reply])]);
		const result = extractNewestTweetFromTimeline(timeline);
		expect(result.rest_id).toBe('100');
	});

	test('picks up tweet from TimelinePinEntry instruction', () => {
		const pinned = makeTweet('50', 'pinned tweet');
		const timeline = makeTimeline([makePinEntryInstruction(pinned)]);
		const result = extractNewestTweetFromTimeline(timeline);
		expect(result.rest_id).toBe('50');
	});

	test('picks newer regular tweet over pinned tweet', () => {
		const pinned = makeTweet('50', 'pinned tweet');
		const newer = makeTweet('200', 'newer regular tweet');
		const timeline = makeTimeline([
			makePinEntryInstruction(pinned),
			makeAddEntriesInstruction([newer])
		]);
		const result = extractNewestTweetFromTimeline(timeline);
		expect(result.rest_id).toBe('200');
	});

	test('returns null for empty timeline', () => {
		expect(extractNewestTweetFromTimeline({})).toBeNull();
		expect(extractNewestTweetFromTimeline(null)).toBeNull();
	});

	test('skips TimelineClearCache instruction without error', () => {
		const tweet = makeTweet('100', 'hello');
		const timeline = makeTimeline([
			{ type: 'TimelineClearCache' },
			makeAddEntriesInstruction([tweet])
		]);
		const result = extractNewestTweetFromTimeline(timeline);
		expect(result.rest_id).toBe('100');
	});
});
