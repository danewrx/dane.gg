/**
 * Row-balancing for icon grids: how many columns per row so that `count`
 * items wrap (greedily, at most `max` per row) into rows that are as even
 * as possible without stranding a single item on the last row.
 *
 * Examples with max 8: 9 -> 5 (rows 5+4), 17 -> 6 (rows 6+6+5). Rows are
 * near-even rather than perfectly even — 22 -> 8 renders 8+8+6, not 8+7+7 —
 * because a single column width has to serve every row. Counts like 57
 * (which would greedily wrap 8+8+...+1) narrow further, trading extra rows
 * for no orphan.
 */
export function balancedColumns(count: number, max = 8): number {
	if (count <= 0) {
		return max;
	}
	if (count <= max) {
		return count;
	}
	const rows = Math.ceil(count / max);
	let cols = Math.ceil(count / rows);
	// Greedy wrapping leaves `count % cols` items on the last row; if that
	// strands a single icon, narrow the rows until it doesn't. (Within any
	// realistic count this terminates well above the cols > 2 floor: a count
	// would need to be ≡ 1 mod every width from `max` down to 3, i.e.
	// 1 mod lcm(3..8) = 841+ for the default max.)
	while (cols > 2 && count % cols === 1) {
		cols--;
	}
	return cols;
}
