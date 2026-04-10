// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface Window {
		NekoType?: string;
		/** Read by webneko.net `startANeko()` — number or eval string for home/spawn (see `web-neko-init.js`) */
		startNekoX?: number | string;
		startNekoY?: number | string;
		aNekos?: { active: boolean }[];
		daneRestartWebNeko?: () => void;
		daneTeardownWebNeko?: () => void;
		__DANE_DEFAULT_WEB_NEKO_TYPE__?: string;
		__DANE_ENFORCED_WEB_NEKO_TYPE__?: string;
		__DANE_ENFORCE_WEB_NEKO__?: boolean;
	}

	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: string;
				username: string;
				isAdmin: boolean;
			};
			isAuthenticated?: boolean;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
