import emojiData from 'emojibase-data/en/data.json';
import shortcodes from 'emojibase-data/en/shortcodes/emojibase.json';
import * as emojibase from 'emojibase';

export interface EmojiData {
	name: string;
	emoji: string;
	isCustom: boolean;
	imageUrl?: string;
	group?: number;
	subgroup?: number;
}

export interface EmojiCategory {
	name: string;
	key: string;
	emojis: Array<{ emoji: string; name: string }>;
}

// Cache for name -> emoji lookup
let nameToEmojiMap: Map<string, string> | null = null;
// Cache for emoji -> name lookup
let emojiToNameMap: Map<string, string> | null = null;

/**
 * Initialize lookup maps from emojibase data
 */
function initializeLookupMaps() {
	if (nameToEmojiMap && emojiToNameMap) return;

	nameToEmojiMap = new Map<string, string>();
	emojiToNameMap = new Map<string, string>();

	try {
		for (const emojiItem of emojiData as Array<{
			label: string;
			emoji: string;
			hexcode: string;
		}>) {
			if (emojiItem.emoji && emojiItem.hexcode) {
				// Get shortcode
				const shortcodeData = (shortcodes as Record<string, string | string[]>)[emojiItem.hexcode];

				if (shortcodeData) {
					const shortcodeNames = Array.isArray(shortcodeData) ? shortcodeData : [shortcodeData];

					for (const name of shortcodeNames) {
						if (name) {
							nameToEmojiMap.set(name.toLowerCase(), emojiItem.emoji);
							if (!emojiToNameMap.has(emojiItem.emoji)) {
								emojiToNameMap.set(emojiItem.emoji, name);
							}
						}
					}
				}
			}
		}
	} catch (error) {
		console.error('Error initializing emoji lookup maps:', error);
	}
}

/**
 * Get all default emojis from emojibase library
 */
export function getAllDefaultEmojis(): EmojiData[] {
	const emojiList: EmojiData[] = [];

	try {
		for (const emojiItem of emojiData as Array<{
			label: string;
			emoji: string;
			group: number;
			subgroup: number;
			hexcode: string;
		}>) {
			if (emojiItem.emoji && emojiItem.hexcode) {
				const shortcodeData = (shortcodes as Record<string, string | string[]>)[emojiItem.hexcode];
				let name: string;

				if (shortcodeData) {
					name = Array.isArray(shortcodeData) ? shortcodeData[0] : shortcodeData;
				} else {
					name = emojiItem.label
						.toLowerCase()
						.replace(/\s+/g, '_')
						.replace(/[^a-z0-9_]/g, '');
				}

				emojiList.push({
					name: name,
					emoji: emojiItem.emoji,
					isCustom: false,
					group: emojiItem.group,
					subgroup: emojiItem.subgroup
				});
			}
		}
	} catch (error) {
		console.error('Error loading emojis from emojibase:', error);
	}

	return emojiList;
}

/**
 * Get emoji categories from emojibase
 */
export function getEmojiCategories(): EmojiCategory[] {
	const allEmojis = getAllDefaultEmojis();

	// Map group numbers to category names
	const groupMap: Record<number, { name: string; key: string }> = {
		0: { name: 'Smileys & Emotion', key: emojibase.GROUP_KEY_SMILEYS_EMOTION },
		1: { name: 'People & Body', key: emojibase.GROUP_KEY_PEOPLE_BODY },
		2: { name: 'Animals & Nature', key: emojibase.GROUP_KEY_ANIMALS_NATURE },
		3: { name: 'Food & Drink', key: emojibase.GROUP_KEY_FOOD_DRINK },
		4: { name: 'Travel & Places', key: emojibase.GROUP_KEY_TRAVEL_PLACES },
		5: { name: 'Activities', key: emojibase.GROUP_KEY_ACTIVITIES },
		6: { name: 'Objects', key: emojibase.GROUP_KEY_OBJECTS },
		7: { name: 'Symbols', key: emojibase.GROUP_KEY_SYMBOLS },
		8: { name: 'Flags', key: emojibase.GROUP_KEY_FLAGS }
	};

	const categories: Record<string, Array<{ emoji: string; name: string }>> = {};

	// Initialize categories
	for (const groupInfo of Object.values(groupMap)) {
		categories[groupInfo.key] = [];
	}

	// Group emojis by category
	for (const emojiItem of allEmojis) {
		if (emojiItem.group !== undefined && groupMap[emojiItem.group]) {
			const groupKey = groupMap[emojiItem.group].key;
			categories[groupKey].push({
				emoji: emojiItem.emoji,
				name: emojiItem.name
			});
		}
	}

	// Convert to array format
	return Object.entries(groupMap)
		.map(([, groupInfo]) => ({
			name: groupInfo.name,
			key: groupInfo.key,
			emojis: categories[groupInfo.key] || []
		}))
		.filter((category) => category.emojis.length > 0);
}

/**
 * Get emoji character from name
 */
export function getEmojiFromName(name: string): string | undefined {
	initializeLookupMaps();
	return nameToEmojiMap?.get(name.toLowerCase());
}

/**
 * Get emoji name from character
 */
export function getNameFromEmoji(emojiChar: string): string | undefined {
	initializeLookupMaps();
	return emojiToNameMap?.get(emojiChar);
}

/**
 * Check if an emoji name exists
 */
export function hasEmoji(name: string): boolean {
	initializeLookupMaps();
	return nameToEmojiMap?.has(name.toLowerCase()) ?? false;
}
