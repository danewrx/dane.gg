import { describe, expect, it } from 'vitest';
import { balancedColumns } from './balancedColumns';

/** Row sizes produced by wrapping `count` items at `cols` per row. */
function rowSizes(count: number, cols: number): number[] {
	const rows: number[] = [];
	for (let remaining = count; remaining > 0; remaining -= cols) {
		rows.push(Math.min(cols, remaining));
	}
	return rows;
}

describe('balancedColumns', () => {
	it('gives a single row up to the maximum', () => {
		expect(balancedColumns(1)).toBe(1);
		expect(balancedColumns(3)).toBe(3);
		expect(balancedColumns(7)).toBe(7);
		expect(balancedColumns(8)).toBe(8);
	});

	it('spreads counts just over the maximum instead of orphaning them', () => {
		// The original bug: 17 icons rendered 8+8+1 with a lone icon on row 3.
		expect(rowSizes(17, balancedColumns(17))).toEqual([6, 6, 5]);
		expect(rowSizes(9, balancedColumns(9))).toEqual([5, 4]);
		expect(rowSizes(12, balancedColumns(12))).toEqual([6, 6]);
		expect(rowSizes(20, balancedColumns(20))).toEqual([7, 7, 6]);
		expect(rowSizes(24, balancedColumns(24))).toEqual([8, 8, 8]);
	});

	it('is near-even, not perfectly even (single column width serves all rows)', () => {
		// Documented behaviour: 22 renders 8+8+6, not the ideal 8+7+7.
		expect(rowSizes(22, balancedColumns(22))).toEqual([8, 8, 6]);
	});

	it('narrows rows when even wrapping would strand a single icon', () => {
		// 57 would greedily wrap 8+8+8+8+8+8+8+1; narrowing to 6 avoids the orphan.
		expect(rowSizes(57, balancedColumns(57))).toEqual([6, 6, 6, 6, 6, 6, 6, 6, 6, 3]);
	});

	it('falls back to the maximum for empty or invalid counts', () => {
		expect(balancedColumns(0)).toBe(8);
		expect(balancedColumns(-3)).toBe(8);
	});

	it('respects a custom maximum', () => {
		expect(balancedColumns(5, 4)).toBe(3); // 3+2 instead of 4+1
		expect(rowSizes(5, balancedColumns(5, 4))).toEqual([3, 2]);
	});

	it('holds its invariants for every count up to 200', () => {
		for (let count = 1; count <= 200; count++) {
			const cols = balancedColumns(count);
			const rows = rowSizes(count, cols);

			// Never more than 8 per row, never a nonsensical column count.
			expect(cols).toBeGreaterThanOrEqual(1);
			expect(cols).toBeLessThanOrEqual(8);

			// All items are placed.
			expect(rows.reduce((a, b) => a + b, 0)).toBe(count);

			// The core guarantee: once wrapping happens, no orphan rows.
			if (count > 8) {
				expect(rows[rows.length - 1]).toBeGreaterThanOrEqual(2);
			}

			// Row count stays minimal unless the even width would have
			// stranded a single icon (then extra rows are the trade-off).
			const minimalRows = Math.ceil(count / 8);
			const evenCols = Math.ceil(count / minimalRows);
			if (count % evenCols !== 1) {
				expect(rows.length).toBe(minimalRows);
			}
		}
	});
});
