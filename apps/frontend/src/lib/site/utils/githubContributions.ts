/**
 * Helpers for the GitHub contributions heatmap
 */

export interface ContributionDay {
	date: string;
	count: number;
	level: 0 | 1 | 2 | 3 | 4;
}

export interface ContributionWeek {
	days: ContributionDay[];
}

export interface MonthLabel {
	/** 1-indexed grid column (week) where the label sits. */
	col: number;
	label: string;
}

/** Parse a `YYYY-MM-DD` date as local midnight (avoids UTC off-by-one). */
function localDate(date: string): Date {
	return new Date(`${date}T00:00:00`);
}

/**
 * One month label per month, positioned at the week column where it first appears.
 */
export function computeMonthLabels(weeks: ContributionWeek[], minGap = 3): MonthLabel[] {
	const labels: MonthLabel[] = [];
	let lastMonth = -1;
	let lastCol = -minGap;

	weeks.forEach((week, i) => {
		const first = week.days[0];
		if (!first) return;
		const month = localDate(first.date).getMonth();
		if (month === lastMonth) return;

		if (i - lastCol >= minGap) {
			labels.push({
				col: i + 1,
				label: localDate(first.date).toLocaleString('en-US', { month: 'short' })
			});
			lastCol = i;
		}
		lastMonth = month;
	});

	return labels;
}

/** Grid row (1…7) for a date's weekday, Sunday = 1. */
export function weekdayRow(date: string): number {
	return localDate(date).getDay() + 1;
}

/** Native-tooltip text for a single day cell. */
export function dayTooltip(day: ContributionDay): string {
	const label = day.count === 1 ? '1 contribution' : `${day.count} contributions`;
	const when = localDate(day.date).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
	return `${label} on ${when}`;
}
