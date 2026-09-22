import { writable } from 'svelte/store';

export interface BannerLabelPosition {
	top: number;
	left: number;
	visible: boolean;
}

export const bannerLabelPosition = writable<BannerLabelPosition>({
	top: 0,
	left: 0,
	visible: false
});
