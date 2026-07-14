/**
 * Pure math for the advert crop editor: a fixed-aspect viewport acts as the
 * crop window while the image pans and zooms beneath it. panX/panY are the
 * image's top-left relative to the viewport, in CSS pixels.
 */

export interface PanZoomState {
	zoom: number;
	panX: number;
	panY: number;
}

/** Scale at which the image exactly covers the viewport at zoom 1. */
export function coverScale(
	viewportW: number,
	viewportH: number,
	imgW: number,
	imgH: number
): number {
	if (!viewportW || !viewportH || !imgW || !imgH) return 0;
	return Math.max(viewportW / imgW, viewportH / imgH);
}

/** Clamp the pan so the displayed image always covers the whole viewport. */
export function clampPan(
	panX: number,
	panY: number,
	viewportW: number,
	viewportH: number,
	dispW: number,
	dispH: number
): { panX: number; panY: number } {
	return {
		panX: Math.min(0, Math.max(viewportW - dispW, panX)),
		panY: Math.min(0, Math.max(viewportH - dispH, panY))
	};
}

/** Pan that centres the image in the viewport at the given display size. */
export function centredPan(
	viewportW: number,
	viewportH: number,
	dispW: number,
	dispH: number
): { panX: number; panY: number } {
	return {
		panX: (viewportW - dispW) / 2,
		panY: (viewportH - dispH) / 2
	};
}

/**
 * Change zoom while keeping the image point under the viewport centre fixed.
 * Zoom is clamped to [1, maxZoom] and the resulting pan re-clamped to cover.
 */
export function zoomAroundCentre(
	state: PanZoomState,
	nextZoom: number,
	opts: {
		coverScale: number;
		viewportW: number;
		viewportH: number;
		imgW: number;
		imgH: number;
		maxZoom: number;
	}
): PanZoomState {
	const zoom = Math.min(opts.maxZoom, Math.max(1, nextZoom));
	if (!opts.coverScale || zoom === state.zoom) return state;

	const s1 = opts.coverScale * state.zoom;
	const s2 = opts.coverScale * zoom;
	const cx = (opts.viewportW / 2 - state.panX) / s1;
	const cy = (opts.viewportH / 2 - state.panY) / s1;

	const clamped = clampPan(
		opts.viewportW / 2 - cx * s2,
		opts.viewportH / 2 - cy * s2,
		opts.viewportW,
		opts.viewportH,
		opts.imgW * s2,
		opts.imgH * s2
	);
	return { zoom, ...clamped };
}

/** Map the viewport back to a region in source-image pixels. */
export function viewportToImageRegion(
	panX: number,
	panY: number,
	viewportW: number,
	viewportH: number,
	scale: number
): { x: number; y: number; width: number; height: number } {
	return {
		x: -panX / scale,
		y: -panY / scale,
		width: viewportW / scale,
		height: viewportH / scale
	};
}
