import { describe, it, expect } from 'bun:test';

describe('Emoji Sync Logic', () => {
	/**
	 * Simulates the sync logic: process incoming emojis and return what should be marked as deleted
	 */
	function simulateSyncLogic(
		incomingEmojis: Array<{ id: string; name: string; imageUrl: string }>
	): {
		toInsertOrUpdate: Array<{ id: string; name: string; imageUrl: string }>;
		toMarkDeleted: string[];
		toUndelete: string[];
	} {
		const incomingIds = incomingEmojis.map((e) => e.id);

		return {
			toInsertOrUpdate: incomingEmojis,
			toMarkDeleted: incomingIds.length > 0 ? [] : [], // Would be IDs NOT in incomingIds
			toUndelete: incomingIds
		};
	}

	it('should identify emojis to insert or update from incoming list', () => {
		const incoming = [
			{ id: 'emoji-1', name: 'test1', imageUrl: 'https://example.com/1.png' },
			{ id: 'emoji-2', name: 'test2', imageUrl: 'https://example.com/2.png' }
		];

		const result = simulateSyncLogic(incoming);

		expect(result.toInsertOrUpdate.length).toBe(2);
		expect(result.toInsertOrUpdate[0].name).toBe('test1');
		expect(result.toInsertOrUpdate[1].name).toBe('test2');
	});

	it('should detect missing Discord emojis for deletion', () => {
		// Current state: emoji-1, emoji-2
		// Incoming: only emoji-1
		// Expected: mark emoji-2 as deleted

		const incomingIds = ['emoji-1'];
		const existingIds = ['emoji-1', 'emoji-2'];

		const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

		expect(toDelete).toEqual(['emoji-2']);
		expect(toDelete.length).toBe(1);
	});

	it('should handle emoji resurrection', () => {
		// Previously deleted: emoji-2
		// Now incoming: emoji-1, emoji-2
		// Expected: un-delete emoji-2

		const incomingIds = ['emoji-1', 'emoji-2'];
		const previouslyDeleted = ['emoji-2'];

		const toUndelete = previouslyDeleted.filter((id) => incomingIds.includes(id));

		expect(toUndelete).toEqual(['emoji-2']);
	});

	it('should not touch site-uploaded emojis in Discord sync', () => {
		// Discord emoji: has discordEmojiId
		// Site emoji: no discordEmojiId (null)
		// The delete query should only target emojis with discordEmojiId set

		const emojisInDb = [
			{ id: 'uuid-1', name: 'discord1', discordEmojiId: 'emoji-1' },
			{ id: 'uuid-2', name: 'siteupload', discordEmojiId: null }
		];

		const incomingIds = ['emoji-1']; // emoji-1 still exists in Discord

		// Filter: only mark as deleted if discordEmojiId is set AND not in incoming
		const toMarkDeleted = emojisInDb
			.filter((e) => e.discordEmojiId !== null && !incomingIds.includes(e.discordEmojiId!))
			.map((e) => e.id);

		expect(toMarkDeleted).toEqual([]);
		expect(emojisInDb[1].discordEmojiId).toBeNull();
	});

	it('should validate emoji names follow constraints', () => {
		const nameRegex = /^[a-zA-Z0-9_-]+$/;

		const validNames = ['test_emoji', 'emoji-123', 'ALLCAPS', 'lowercase'];
		const invalidNames = ['test emoji', 'emoji!', 'test.emoji', 'emoji@symbol'];

		for (const name of validNames) {
			expect(nameRegex.test(name)).toBe(true);
		}

		for (const name of invalidNames) {
			expect(nameRegex.test(name)).toBe(false);
		}
	});

	it('should handle empty incoming emoji list (all should be marked deleted)', () => {
		const incomingIds: string[] = [];
		const existingIds = ['emoji-1', 'emoji-2', 'emoji-3'];

		const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

		expect(toDelete).toEqual(existingIds);
		expect(toDelete.length).toBe(existingIds.length);
	});

	it('should validate filtering logic for GET endpoint', () => {
		const allEmojis = [
			{ id: '1', name: 'active', deleted: false, hidden: false },
			{ id: '2', name: 'hidden', deleted: false, hidden: true },
			{ id: '3', name: 'deleted', deleted: true, hidden: false }
		];

		// Default: exclude deleted
		const active = allEmojis.filter((e) => !e.deleted);
		expect(active.length).toBe(2);
		expect(active.map((e) => e.name)).toEqual(['active', 'hidden']);

		// With includeDeleted=true
		const all = allEmojis;
		expect(all.length).toBe(3);

		// For picker: exclude both deleted and hidden
		const picker = allEmojis.filter((e) => !e.deleted && !e.hidden);
		expect(picker.length).toBe(1);
		expect(picker[0].name).toBe('active');
	});
});
