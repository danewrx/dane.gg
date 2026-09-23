import { describe, expect, test } from 'bun:test';
import { mapContributionCalendar, type ContributionCalendar } from './githubService';

const calendar = (
	weeks: { date: string; contributionCount: number; contributionLevel: string }[][],
	total: number
): ContributionCalendar => ({
	totalContributions: total,
	weeks: weeks.map((days) => ({ contributionDays: days }))
});

describe('mapContributionCalendar', () => {
	test('maps quartile enums to 0–4 levels', () => {
		const result = mapContributionCalendar(
			calendar(
				[
					[
						{ date: '2024-01-07', contributionCount: 0, contributionLevel: 'NONE' },
						{ date: '2024-01-08', contributionCount: 2, contributionLevel: 'FIRST_QUARTILE' },
						{ date: '2024-01-09', contributionCount: 5, contributionLevel: 'SECOND_QUARTILE' },
						{ date: '2024-01-10', contributionCount: 9, contributionLevel: 'THIRD_QUARTILE' },
						{ date: '2024-01-11', contributionCount: 20, contributionLevel: 'FOURTH_QUARTILE' }
					]
				],
				36
			),
			'danewrx'
		);

		expect(result.weeks[0].days.map((d) => d.level)).toEqual([0, 1, 2, 3, 4]);
		expect(result.weeks[0].days.map((d) => d.count)).toEqual([0, 2, 5, 9, 20]);
		expect(result.username).toBe('danewrx');
		expect(result.totalContributions).toBe(36);
	});

	test('falls back to level 0 for an unknown contribution level', () => {
		const result = mapContributionCalendar(
			calendar([[{ date: '2024-01-07', contributionCount: 3, contributionLevel: 'SURPRISE' }]], 3),
			'danewrx'
		);
		expect(result.weeks[0].days[0].level).toBe(0);
	});

	test('derives from/to from the first and last day across weeks', () => {
		const result = mapContributionCalendar(
			calendar(
				[
					[{ date: '2024-01-07', contributionCount: 0, contributionLevel: 'NONE' }],
					[
						{ date: '2024-01-14', contributionCount: 1, contributionLevel: 'FIRST_QUARTILE' },
						{ date: '2024-01-15', contributionCount: 0, contributionLevel: 'NONE' }
					]
				],
				1
			),
			'danewrx'
		);
		expect(result.from).toBe('2024-01-07');
		expect(result.to).toBe('2024-01-15');
	});

	test('returns empty from/to for an empty calendar', () => {
		const result = mapContributionCalendar(calendar([], 0), 'danewrx');
		expect(result.from).toBe('');
		expect(result.to).toBe('');
		expect(result.weeks).toEqual([]);
		expect(result.totalContributions).toBe(0);
	});
});
