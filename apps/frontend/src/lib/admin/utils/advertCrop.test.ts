import { describe, expect, it } from 'vitest';
import {
	coverScale,
	clampPan,
	centredPan,
	zoomAroundCentre,
	viewportToImageRegion
} from './advertCrop';

// A representative banner viewport: 1100px wide at the 1456:180 aspect.
const VIEW_W = 1100;
const VIEW_H = VIEW_W / (1456 / 180); // ~135.99

describe('coverScale', () => {
	it('scales a tall image by width and a wide image by height', () => {
		// Tall image: width is the binding dimension.
		expect(coverScale(VIEW_W, VIEW_H, 550, 2000)).toBe(VIEW_W / 550);
		// Ultra-wide image: height is the binding dimension.
		expect(coverScale(VIEW_W, VIEW_H, 20000, 100)).toBe(VIEW_H / 100);
	});

	it('always covers the viewport in both dimensions', () => {
		for (const [w, h] of [
			[100, 100],
			[3000, 500],
			[500, 3000],
			[1456, 180]
		]) {
			const s = coverScale(VIEW_W, VIEW_H, w, h);
			expect(w * s).toBeGreaterThanOrEqual(VIEW_W - 1e-9);
			expect(h * s).toBeGreaterThanOrEqual(VIEW_H - 1e-9);
		}
	});

	it('returns 0 when anything is unmeasured', () => {
		expect(coverScale(0, 0, 500, 500)).toBe(0);
		expect(coverScale(VIEW_W, VIEW_H, 0, 500)).toBe(0);
		expect(coverScale(VIEW_W, VIEW_H, 500, 0)).toBe(0);
	});
});

describe('clampPan', () => {
	const DISP_W = 2200;
	const DISP_H = 400;

	it('passes through an in-range pan', () => {
		expect(clampPan(-100, -50, VIEW_W, VIEW_H, DISP_W, DISP_H)).toEqual({ panX: -100, panY: -50 });
	});

	it('never lets the image detach from the top-left edge', () => {
		expect(clampPan(50, 20, VIEW_W, VIEW_H, DISP_W, DISP_H)).toEqual({ panX: 0, panY: 0 });
	});

	it('never lets the image detach from the bottom-right edge', () => {
		const { panX, panY } = clampPan(-99999, -99999, VIEW_W, VIEW_H, DISP_W, DISP_H);
		expect(panX).toBe(VIEW_W - DISP_W);
		expect(panY).toBe(VIEW_H - DISP_H);
	});
});

describe('centredPan', () => {
	it('centres the overhang equally on both axes', () => {
		const { panX, panY } = centredPan(VIEW_W, VIEW_H, 2200, 400);
		expect(panX).toBe((VIEW_W - 2200) / 2);
		expect(panY).toBe((VIEW_H - 400) / 2);
	});
});

describe('zoomAroundCentre', () => {
	const IMG_W = 1200;
	const IMG_H = 900;
	const COVER = coverScale(VIEW_W, VIEW_H, IMG_W, IMG_H);
	const OPTS = {
		coverScale: COVER,
		viewportW: VIEW_W,
		viewportH: VIEW_H,
		imgW: IMG_W,
		imgH: IMG_H,
		maxZoom: 4
	};

	function centreImagePoint(state: { zoom: number; panX: number; panY: number }) {
		const s = COVER * state.zoom;
		return {
			x: (VIEW_W / 2 - state.panX) / s,
			y: (VIEW_H / 2 - state.panY) / s
		};
	}

	it('keeps the image point under the viewport centre fixed', () => {
		const start = { zoom: 2, panX: -400, panY: -300 };
		const before = centreImagePoint(start);
		const after = zoomAroundCentre(start, 3, OPTS);
		const point = centreImagePoint(after);
		expect(point.x).toBeCloseTo(before.x, 6);
		expect(point.y).toBeCloseTo(before.y, 6);
	});

	it('clamps zoom to the [1, maxZoom] range', () => {
		expect(zoomAroundCentre({ zoom: 2, panX: -100, panY: -100 }, 0.2, OPTS).zoom).toBe(1);
		expect(zoomAroundCentre({ zoom: 2, panX: -100, panY: -100 }, 99, OPTS).zoom).toBe(4);
	});

	it('re-clamps the pan so the viewport stays covered after zooming out', () => {
		// Panned hard into a corner at high zoom, then zoomed out: the naive
		// centre-preserving pan would leave a gap.
		const cornered = {
			zoom: 4,
			panX: VIEW_W - IMG_W * COVER * 4,
			panY: VIEW_H - IMG_H * COVER * 4
		};
		const out = zoomAroundCentre(cornered, 1.2, OPTS);
		const dispW = IMG_W * COVER * out.zoom;
		const dispH = IMG_H * COVER * out.zoom;
		expect(out.panX).toBeLessThanOrEqual(0);
		expect(out.panY).toBeLessThanOrEqual(0);
		expect(out.panX).toBeGreaterThanOrEqual(VIEW_W - dispW);
		expect(out.panY).toBeGreaterThanOrEqual(VIEW_H - dispH);
	});

	it('is a no-op when the scale is unmeasured or zoom is unchanged', () => {
		const state = { zoom: 2, panX: -10, panY: -10 };
		expect(zoomAroundCentre(state, 2, OPTS)).toBe(state);
		expect(zoomAroundCentre(state, 3, { ...OPTS, coverScale: 0 })).toBe(state);
	});
});

describe('viewportToImageRegion', () => {
	const IMG_W = 1200;
	const IMG_H = 900;
	const COVER = coverScale(VIEW_W, VIEW_H, IMG_W, IMG_H);

	it('preserves the viewport aspect ratio exactly', () => {
		const region = viewportToImageRegion(-123, -45, VIEW_W, VIEW_H, COVER * 1.7);
		expect(region.width / region.height).toBeCloseTo(VIEW_W / VIEW_H, 9);
	});

	it('maps the full cover at zoom 1 with centred pan to a region inside the image', () => {
		const { panX, panY } = centredPan(VIEW_W, VIEW_H, IMG_W * COVER, IMG_H * COVER);
		const region = viewportToImageRegion(panX, panY, VIEW_W, VIEW_H, COVER);
		expect(region.x).toBeGreaterThanOrEqual(0);
		expect(region.y).toBeGreaterThanOrEqual(0);
		expect(region.x + region.width).toBeLessThanOrEqual(IMG_W + 1e-9);
		expect(region.y + region.height).toBeLessThanOrEqual(IMG_H + 1e-9);
		// The binding dimension is fully used.
		expect(region.width).toBeCloseTo(IMG_W, 9);
	});

	it('stays inside the image for any clamped pan at any zoom', () => {
		for (const zoom of [1, 1.5, 2.7, 4]) {
			const s = COVER * zoom;
			const dispW = IMG_W * s;
			const dispH = IMG_H * s;
			for (const [rawX, rawY] of [
				[0, 0],
				[-99999, -99999],
				[-dispW / 3, -dispH / 5]
			]) {
				const { panX, panY } = clampPan(rawX, rawY, VIEW_W, VIEW_H, dispW, dispH);
				const region = viewportToImageRegion(panX, panY, VIEW_W, VIEW_H, s);
				expect(region.x).toBeGreaterThanOrEqual(-1e-9);
				expect(region.y).toBeGreaterThanOrEqual(-1e-9);
				expect(region.x + region.width).toBeLessThanOrEqual(IMG_W + 1e-9);
				expect(region.y + region.height).toBeLessThanOrEqual(IMG_H + 1e-9);
			}
		}
	});

	it('zooming in shrinks the source region proportionally', () => {
		const at1 = viewportToImageRegion(0, 0, VIEW_W, VIEW_H, COVER);
		const at2 = viewportToImageRegion(0, 0, VIEW_W, VIEW_H, COVER * 2);
		expect(at2.width).toBeCloseTo(at1.width / 2, 9);
		expect(at2.height).toBeCloseTo(at1.height / 2, 9);
	});
});
