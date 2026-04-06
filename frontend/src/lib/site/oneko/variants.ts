import { browser } from '$app/environment';

/** Selected Web Neko skin (folder name on webneko.net, e.g. `white`, `black`). */
export const WEB_NEKO_TYPE_STORAGE_KEY = 'dane-neko-web-type';

/** Stored alone to turn off Web Neko entirely */
export const WEB_NEKO_DISABLED = 'none' as const;

export type WebNekoVariant = {
	/** Directory name on https://webneko.net — matches `?type` on [Web Neko](https://webneko.net/) */
	id: string;
	label: string;
};

/** Thumbnail: idle frame served by Web Neko for each skin. */
export function webNekoStillUrl(id: string): string {
	return `https://webneko.net/${encodeURIComponent(id)}/still.gif`;
}

/**
 * Skins offered in settings (subset of Web Neko server folders).
 * Names align with table on https://webneko.net/
 */
export const WEB_NEKO_VARIANTS: WebNekoVariant[] = [
	{ id: 'white', label: 'Classic' },
	{ id: 'black', label: 'Black' },
	{ id: 'gray', label: 'Gray' },
	{ id: 'calico', label: 'Calico' },
	{ id: 'robot', label: 'Robot' },
	{ id: 'peach', label: 'Peach' },
	{ id: 'colourful', label: 'Colourful' },
	{ id: 'earth', label: 'Earth' },
	{ id: 'air', label: 'Air' },
	{ id: 'water', label: 'Water' },
	{ id: 'fire', label: 'Fire' },
	{ id: 'spirit', label: 'Spirit' },
	{ id: 'rainbow', label: 'Rainbow' },
	{ id: 'silversky', label: 'Silver sky' },
	{ id: 'orange', label: 'Orange' },
	{ id: 'ghetto', label: 'Ghetto' },
	{ id: 'neon', label: 'Neon' },
	{ id: 'pink', label: 'Pink' },
	{ id: 'ghost', label: 'Ghost' },
	{ id: 'lucky', label: 'Lucky' },
	{ id: 'moka', label: 'Moka' },
	{ id: 'usa', label: 'U.S.A.' },
	{ id: 'rose', label: 'Rose' },
	{ id: 'blue', label: 'Blue' },
	{ id: 'silver', label: 'Silver' },
	{ id: 'kuramecha', label: 'Kuramecha' },
	{ id: 'kina', label: 'Kina' },
	{ id: 'ace', label: 'Ace' },
	{ id: 'spooky', label: 'Spooky' },
	{ id: 'holiday', label: 'Holiday' },
	{ id: 'valentine', label: 'Valentine' },
	{ id: 'marmalade', label: 'Marmalade' },
	{ id: 'royal', label: 'Royal' },
	{ id: 'mermaid', label: 'Mermaid' },
	{ id: 'socks', label: 'Socks' },
	{ id: 'dave', label: 'Dave' },
	{ id: 'jess', label: 'Jess' },
	{ id: 'mike', label: 'Mike' },
	{ id: 'lucy', label: 'Lucy' },
	{ id: 'fancy', label: 'Fancy' }
];

const ALLOWED_SKIN_IDS = new Set(WEB_NEKO_VARIANTS.map((v) => v.id));

export type WebNekoGridOption =
	| WebNekoVariant
	| { id: typeof WEB_NEKO_DISABLED; label: string };

export const WEB_NEKO_GRID_OPTIONS: WebNekoGridOption[] = [
	{ id: WEB_NEKO_DISABLED, label: 'None' },
	...WEB_NEKO_VARIANTS
];

const LEGACY_VARIANT_KEY = 'dane-oneko-variant';
const LEGACY_TO_WEB: Record<string, string> = {
	classic: 'white',
	black: 'black',
	black2: 'black',
	colourful: 'colourful',
	dog: 'white',
	fire: 'fire',
	gray: 'gray',
	holiday: 'holiday',
	'neko-cool': 'neon',
	neon: 'neon',
	peach: 'peach',
	pink: 'pink',
	rainbow: 'rainbow',
	royal: 'royal',
	silversky: 'silversky',
	socks: 'socks',
	spirit: 'spirit',
	spooky: 'spooky',
	valentine: 'valentine',
	water: 'water',
	kuramecha: 'kuramecha'
};

function migrateLegacyOnekoVariantKey(): void {
	if (!browser) return;
	try {
		const legacy = localStorage.getItem(LEGACY_VARIANT_KEY);
		if (legacy == null) return;
		const mapped = LEGACY_TO_WEB[legacy];
		if (mapped && ALLOWED_SKIN_IDS.has(mapped)) {
			localStorage.setItem(WEB_NEKO_TYPE_STORAGE_KEY, mapped);
		}
		localStorage.removeItem(LEGACY_VARIANT_KEY);
	} catch {}
}

export function getDefaultWebNekoType(): string {
	return 'white';
}

export function getStoredWebNekoType(): string {
	if (!browser) return getDefaultWebNekoType();
	migrateLegacyOnekoVariantKey();
	try {
		const raw = localStorage.getItem(WEB_NEKO_TYPE_STORAGE_KEY);
		if (raw === WEB_NEKO_DISABLED) return WEB_NEKO_DISABLED;
		if (raw && ALLOWED_SKIN_IDS.has(raw)) return raw;
	} catch {}
	return getDefaultWebNekoType();
}

export function resolveWebNekoVariantId(id: string | null | undefined): string {
	if (id === WEB_NEKO_DISABLED) return WEB_NEKO_DISABLED;
	if (id && ALLOWED_SKIN_IDS.has(id)) return id;
	return getDefaultWebNekoType();
}

/** Persist skin; restarts Web Neko in-page when available, else full reload. */
export function setStoredWebNekoType(id: string): void {
	if (!browser) return;
	const next = resolveWebNekoVariantId(id);
	try {
		localStorage.setItem(WEB_NEKO_TYPE_STORAGE_KEY, next);
	} catch {}
	const w = window as Window & { daneRestartWebNeko?: () => void };
	if (typeof w.daneRestartWebNeko === 'function') {
		w.daneRestartWebNeko();
		return;
	}
	window.location.reload();
}
