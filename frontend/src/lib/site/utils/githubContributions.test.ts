import { describe, expect, it } from 'vitest';
import {
	computeMonthLabels,
	weekdayRow,
	dayTooltip,
	type ContributionWeek
} from './githubContributions';

/** Build weeks starting at `start`, one column per week (all days = level 0). */
function weeksFrom(start: string, count: number): ContributionWeek[] {
	const weeks: ContributionWeek[] = [];
	const cursor = new Date(`${start}T00:00:00`);
	for (let w = 0; w < count; w++) {
		const days = [];
		for (let d = 0; d < 7; d++) {
			const iso = cursor.toISOString().slice(0, 10);
			days.push({ date: iso, count: 0, level: 0 as const });
			cursor.setDate(cursor.getDate() + 1);
		}
		weeks.push({ days });
	}
	return weeks;
}

describe('computeMonthLabels', () => {
	it('labels each month at the week where it first appears', () => {
		// Start on a Sunday; 9 weeks spans Jan into March.
		const weeks = weeksFrom('2024-01-07', 9);
		const labels = computeMonthLabels(weeks);
		expect(labels.map((l) => l.label)).toEqual(['Jan', 'Feb', 'Mar']);
		// Columns are 1-indexed and strictly increasing.
		const cols = labels.map((l) => l.col);
		expect(cols).toEqual([...cols].sort((a, b) => a - b));
		expect(cols[0]).toBe(1);
	});

	it('skips a label that would collide with the previous one', () => {
		// A month boundary lands 2 columns after Jan (< default minGap of 3):
		// the colliding month is consumed but no label is emitted for it.
		const weeks = weeksFrom('2024-01-28', 6); // Jan 28 → into Feb quickly, then Mar
		const labels = computeMonthLabels(weeks, 3);
		const cols = labels.map((l) => l.col);
		for (let i = 1; i < cols.length; i++) {
			expect(cols[i] - cols[i - 1]).toBeGreaterThanOrEqual(3);
		}
	});

	it('respects a custom minimum gap', () => {
		const weeks = weeksFrom('2024-01-07', 20);
		const tight = computeMonthLabels(weeks, 1);
		const loose = computeMonthLabels(weeks, 6);
		expect(loose.length).toBeLessThanOrEqual(tight.length);
	});

	it('ignores empty weeks and returns nothing for no data', () => {
		expect(computeMonthLabels([])).toEqual([]);
		expect(computeMonthLabels([{ days: [] }, { days: [] }])).toEqual([]);
	});

	it('produces roughly one label per month across a trailing year', () => {
		const weeks = weeksFrom('2024-01-07', 53);
		const labels = computeMonthLabels(weeks);
		// 12–13 months of coverage; every label is a valid 3-letter month.
		expect(labels.length).toBeGreaterThanOrEqual(11);
		expect(labels.length).toBeLessThanOrEqual(13);
		for (const l of labels) {
			expect(l.label).toMatch(/^[A-Z][a-z]{2}$/);
		}
	});
});

describe('weekdayRow', () => {
	it('maps Sunday…Saturday to rows 1…7', () => {
		expect(weekdayRow('2024-01-07')).toBe(1); // Sunday
		expect(weekdayRow('2024-01-08')).toBe(2); // Monday
		expect(weekdayRow('2024-01-13')).toBe(7); // Saturday
	});
});

describe('dayTooltip', () => {
	it('singularises a single contribution', () => {
		expect(dayTooltip({ date: '2024-03-01', count: 1, level: 1 })).toBe(
			'1 contribution on Mar 1, 2024'
		);
	});

	it('pluralises zero and many contributions', () => {
		expect(dayTooltip({ date: '2024-03-02', count: 0, level: 0 })).toBe(
			'0 contributions on Mar 2, 2024'
		);
		expect(dayTooltip({ date: '2024-12-25', count: 7, level: 4 })).toBe(
			'7 contributions on Dec 25, 2024'
		);
	});
});
