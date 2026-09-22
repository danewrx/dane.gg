export const CHAT_NOTIFICATION_SOUNDS_UPDATED_EVENT = 'chatNotificationSoundsUpdated';

export const DEFAULT_CHAT_NOTIFICATION_SOUND_ID = 'a0000000-0000-4000-8000-000000000001';
export const DEFAULT_CHAT_NOTIFICATION_SOUND_NAME = 'default';
export const DEFAULT_CHAT_NOTIFICATION_SOUND_URL = '/chat-sounds/default-notification.mp3';

const LEGACY_DEFAULT_STORAGE_ID = 'default';

export const CHAT_NOTIFICATION_SOUND_ID_KEY = 'chatNotificationSoundId';

export type ChatNotificationSoundOption = {
	id: string;
	name: string;
	displayName?: string | null;
	soundUrl: string;
};

function builtinOption(): ChatNotificationSoundOption {
	return {
		id: DEFAULT_CHAT_NOTIFICATION_SOUND_ID,
		name: DEFAULT_CHAT_NOTIFICATION_SOUND_NAME,
		displayName: 'Default',
		soundUrl: DEFAULT_CHAT_NOTIFICATION_SOUND_URL
	};
}

function fallbackOptions(): ChatNotificationSoundOption[] {
	return [builtinOption()];
}

function isBuiltinSoundRow(r: { id: string; name: string }): boolean {
	return (
		r.id === DEFAULT_CHAT_NOTIFICATION_SOUND_ID || r.name === DEFAULT_CHAT_NOTIFICATION_SOUND_NAME
	);
}

function mergePublicNotificationSoundOptions(
	rows: Array<{ id: string; name: string; displayName?: string | null; soundUrl: string }>
): ChatNotificationSoundOption[] {
	const customOnly = rows.filter((r) => !isBuiltinSoundRow(r));
	const mapped: ChatNotificationSoundOption[] = customOnly.map((r) => ({
		id: r.id,
		name: r.name,
		displayName: r.displayName ?? null,
		soundUrl: r.soundUrl
	}));
	return [builtinOption(), ...mapped];
}

export function formatNotificationSoundLabel(name: string): string {
	return name === DEFAULT_CHAT_NOTIFICATION_SOUND_NAME ? 'Default' : name;
}

export function labelForNotificationSoundOption(
	o: Pick<ChatNotificationSoundOption, 'name' | 'displayName'>
): string {
	const d = o.displayName?.trim();
	if (d) return d;
	return formatNotificationSoundLabel(o.name);
}

export async function fetchChatNotificationSoundOptions(): Promise<ChatNotificationSoundOption[]> {
	try {
		const res = await fetch('/api/chat-notification-sounds');
		if (!res.ok) return fallbackOptions();
		const json = await res.json();
		const rows = (json.data || []) as Array<{
			id: string;
			name: string;
			displayName?: string | null;
			soundUrl: string;
		}>;
		return mergePublicNotificationSoundOptions(rows);
	} catch {
		return fallbackOptions();
	}
}

function normalizeStoredId(raw: string | null): string {
	if (!raw || raw.length === 0) return DEFAULT_CHAT_NOTIFICATION_SOUND_ID;
	if (raw === LEGACY_DEFAULT_STORAGE_ID) return DEFAULT_CHAT_NOTIFICATION_SOUND_ID;
	return raw;
}

export function readStoredChatNotificationSoundId(): string {
	if (typeof window === 'undefined') return DEFAULT_CHAT_NOTIFICATION_SOUND_ID;
	try {
		const v = localStorage.getItem(CHAT_NOTIFICATION_SOUND_ID_KEY);
		const normalized = normalizeStoredId(v);
		if (v === LEGACY_DEFAULT_STORAGE_ID && normalized !== v) {
			try {
				localStorage.setItem(CHAT_NOTIFICATION_SOUND_ID_KEY, normalized);
			} catch {}
		}
		return normalized;
	} catch {
		return DEFAULT_CHAT_NOTIFICATION_SOUND_ID;
	}
}

export function resolveChatNotificationSoundUrl(
	options: ChatNotificationSoundOption[],
	storedId: string
): string {
	const id = normalizeStoredId(storedId);
	const found = options.find((o) => o.id === id);
	return found?.soundUrl ?? DEFAULT_CHAT_NOTIFICATION_SOUND_URL;
}
