import { logger } from '$lib/logger';
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { SITE_CONFIG_UPDATED_EVENT } from '$lib/site/stores/siteConfig';

/** A single advertisement banner as stored in the database. */
export interface Advert {
	id: string;
	title: string;
	description?: string | null;
	imageUrl: string;
	linkUrl: string;
	isActive: boolean;
	displayOrder: number;
}

// Active adverts, ordered for rotation on the public homepage.
export const adverts = writable<Advert[]>([]);

/**
 * Load the active adverts from the API.
 */
export async function loadAdverts(): Promise<void> {
	if (!browser) return;

	try {
		const response = await fetch('/api/adverts');
		if (!response.ok) {
			throw new Error(`Failed to fetch adverts: ${response.statusText}`);
		}

		const data = await response.json();
		if (data.success && Array.isArray(data.data)) {
			adverts.set(data.data);
		} else {
			adverts.set([]);
		}
	} catch (error) {
		logger.error('Error loading adverts:', error);
		adverts.set([]);
	}
}

// Load on startup and refresh whenever site config broadcasts a live update
// (admin advert changes trigger the same broadcast). Kept inside a sync
// helper: top-level await would make this an async module and reorder the
// import graph, which previously broke WebKit (see oneko/variants.ts).
function initAdvertsStore(): void {
	if (!browser) return;
	void loadAdverts();
	window.addEventListener(SITE_CONFIG_UPDATED_EVENT, () => {
		void loadAdverts();
	});
}

initAdvertsStore();
