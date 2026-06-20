import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { loadSiteConfig, siteConfig, SITE_CONFIG_UPDATED_EVENT } from '$lib/site/stores/siteConfig';
import { subscribeSiteConfigBroadcast } from '$lib/shared/utils/siteConfigLiveSync';

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

export function normalizeDefaultWebNekoTypeForServer(value: unknown): string {
	if (value === WEB_NEKO_DISABLED) return WEB_NEKO_DISABLED;
	if (typeof value === 'string') {
		const s = value.toLowerCase();
		if (s === WEB_NEKO_DISABLED) return WEB_NEKO_DISABLED;
		if (ALLOWED_SKIN_IDS.has(s)) return s;
	}
	return 'white';
}

export type WebNekoGridOption = WebNekoVariant | { id: typeof WEB_NEKO_DISABLED; label: string };

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
	if (!browser) return 'white';
	return normalizeDefaultWebNekoTypeForServer(get(siteConfig).default_web_neko_type);
}

export function getStoredWebNekoType(): string {
	if (!browser) return getDefaultWebNekoType();
	migrateLegacyOnekoVariantKey();
	const cfg = get(siteConfig);
	if (cfg.enforce_web_neko) {
		return normalizeDefaultWebNekoTypeForServer(
			cfg.enforced_web_neko_type ?? cfg.default_web_neko_type
		);
	}
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

export function syncWebNekoInjectedGlobalsFromSiteConfig(): void {
	if (!browser) return;
	const c = get(siteConfig);
	const def = normalizeDefaultWebNekoTypeForServer(c.default_web_neko_type);
	const enf = normalizeDefaultWebNekoTypeForServer(
		c.enforced_web_neko_type ?? c.default_web_neko_type
	);
	(
		window as unknown as { __DANE_DEFAULT_WEB_NEKO_TYPE__?: string }
	).__DANE_DEFAULT_WEB_NEKO_TYPE__ = def;
	(
		window as unknown as { __DANE_ENFORCED_WEB_NEKO_TYPE__?: string }
	).__DANE_ENFORCED_WEB_NEKO_TYPE__ = enf;
	(window as unknown as { __DANE_ENFORCE_WEB_NEKO__?: boolean }).__DANE_ENFORCE_WEB_NEKO__ =
		Boolean(c.enforce_web_neko);
}

/** Persist skin; restarts Web Neko in-page when available, else full reload. */
export function setStoredWebNekoType(id: string): void {
	if (!browser) return;
	if (get(siteConfig).enforce_web_neko) return;
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

/**
 * Re-apply the Web Neko skin from the live site config. The skin is first chosen
 * at boot from the SSR-injected globals, which can be stale (the server caches the
 * page vars, and a CDN may cache the HTML). Once fresh config is available we
 * reconcile: restart only when the effective skin actually differs, so a visitor's
 * personal pick (or an already-correct default) is never disrupted.
 */
function reconcileWebNekoFromConfig(): void {
	if (!browser) return;
	syncWebNekoInjectedGlobalsFromSiteConfig();
	const w = window as Window & { daneRestartWebNeko?: () => void; NekoType?: string };
	const effective = getStoredWebNekoType();
	const current = typeof w.NekoType === 'string' ? w.NekoType.toLowerCase() : WEB_NEKO_DISABLED;
	if (current === effective) return;
	if (typeof w.daneRestartWebNeko === 'function') w.daneRestartWebNeko();
}

if (browser) {
	// Live server push: when an admin changes config, the backend broadcasts over
	// the chat WebSocket, which reloads siteConfig and dispatches this event. The
	// store is already fresh here, so reconcile directly — connected visitors
	// update within ~350ms, no polling needed.
	window.addEventListener(SITE_CONFIG_UPDATED_EVENT, () => reconcileWebNekoFromConfig());

	// Cross-tab: admin saved in another tab of the same browser.
	subscribeSiteConfigBroadcast(() => {
		void loadSiteConfig().then(() => reconcileWebNekoFromConfig());
	});

	// Initial load: correct the boot-time skin once fresh config is available,
	// covering new visitors whose injected default was served stale.
	void loadSiteConfig().then(() => reconcileWebNekoFromConfig());
}
