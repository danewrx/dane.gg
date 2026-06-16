import { logger } from '$lib/logger';
import { browser } from '$app/environment';
import { getNameFromEmoji } from './emojiData';

const STORAGE_KEY = 'recent_emojis';
const MAX_RECENT_EMOJIS = 16;

interface EmojiUsage {
	emoji: string;
	name: string;
	count: number;
	lastUsed: number;
}

/**
 * Track emoji usage in localStorage
 */
export function trackEmojiUsage(emoji: string, name?: string): void {
	if (!browser) return;

	try {
		const emojiName = name || getNameFromEmoji(emoji) || emoji;

		const stored = localStorage.getItem(STORAGE_KEY);
		let usage: EmojiUsage[] = stored ? JSON.parse(stored) : [];

		const existingIndex = usage.findIndex((u) => u.emoji === emoji);

		if (existingIndex >= 0) {
			usage[existingIndex].count++;
			usage[existingIndex].lastUsed = Date.now();
			usage[existingIndex].name = emojiName;
		} else {
			usage.push({
				emoji: emoji,
				name: emojiName,
				count: 1,
				lastUsed: Date.now()
			});
		}

		usage.sort((a, b) => {
			if (b.count !== a.count) {
				return b.count - a.count;
			}
			return b.lastUsed - a.lastUsed;
		});

		usage = usage.slice(0, MAX_RECENT_EMOJIS);

		localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
	} catch (error) {
		logger.error('Error tracking emoji usage:', error);
	}
}

/**
 * Get recently used emojis (top 16)
 */
export function getRecentEmojis(): Array<{ emoji: string; name: string }> {
	if (!browser) return [];

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];

		const usage: EmojiUsage[] = JSON.parse(stored);

		return usage.slice(0, MAX_RECENT_EMOJIS).map((u) => ({
			emoji: u.emoji,
			name: u.name
		}));
	} catch (error) {
		logger.error('Error getting recent emojis:', error);
		return [];
	}
}

/**
 * Filter recent emojis to remove any that are no longer available
 */
export function filterRecentEmojis(
	availableEmojis: Array<{ emoji: string; name: string }>
): void {
	if (!browser) return;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return;

		const usage: EmojiUsage[] = JSON.parse(stored);
		const availableSet = new Set(availableEmojis.map((e) => e.emoji));

		const filtered = usage.filter((u) => availableSet.has(u.emoji));

		if (filtered.length !== usage.length) {
			if (filtered.length === 0) {
				localStorage.removeItem(STORAGE_KEY);
			} else {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
			}
		}
	} catch (error) {
		logger.error('Error filtering recent emojis:', error);
	}
}

/**
 * Clear recent emojis data
 */
export function clearRecentEmojis(): void {
	if (!browser) return;

	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch (error) {
		logger.error('Error clearing recent emojis:', error);
	}
}
