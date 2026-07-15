import { logger } from '../utils/logger';

export interface GitHubContributionDay {
	date: string;
	count: number;
	/** 0 (none) … 4 (highest), mirrors GitHub's contribution levels. */
	level: 0 | 1 | 2 | 3 | 4;
}

export interface GitHubContributionWeek {
	days: GitHubContributionDay[];
}

export interface GitHubContributions {
	username: string;
	totalContributions: number;
	weeks: GitHubContributionWeek[];
	from: string;
	to: string;
}

const LEVEL_BY_ENUM: Record<string, 0 | 1 | 2 | 3 | 4> = {
	NONE: 0,
	FIRST_QUARTILE: 1,
	SECOND_QUARTILE: 2,
	THIRD_QUARTILE: 3,
	FOURTH_QUARTILE: 4
};

const CONTRIBUTIONS_QUERY = `
	query ($login: String!) {
		user(login: $login) {
			contributionsCollection {
				contributionCalendar {
					totalContributions
					weeks {
						contributionDays {
							date
							contributionCount
							contributionLevel
						}
					}
				}
			}
		}
	}
`;

interface GraphQLDay {
	date: string;
	contributionCount: number;
	contributionLevel: string;
}

export interface ContributionCalendar {
	totalContributions: number;
	weeks: { contributionDays: GraphQLDay[] }[];
}

interface GraphQLResponse {
	data?: {
		user?: {
			contributionsCollection?: {
				contributionCalendar?: ContributionCalendar;
			};
		};
	};
	errors?: { message: string }[];
}

/**
 * Map a GitHub contribution calendar to the widget shape
 */
export function mapContributionCalendar(
	calendar: ContributionCalendar,
	login: string
): GitHubContributions {
	const weeks: GitHubContributionWeek[] = calendar.weeks.map((week) => ({
		days: week.contributionDays.map((day) => ({
			date: day.date,
			count: day.contributionCount,
			level: LEVEL_BY_ENUM[day.contributionLevel] ?? 0
		}))
	}));

	const allDays = weeks.flatMap((w) => w.days);
	return {
		username: login,
		totalContributions: calendar.totalContributions,
		weeks,
		from: allDays[0]?.date ?? '',
		to: allDays[allDays.length - 1]?.date ?? ''
	};
}

export class GitHubService {
	private static readonly API_URL = 'https://api.github.com/graphql';

	static isConfigured(): boolean {
		return Boolean(process.env.GITHUB_TOKEN);
	}

	/**
	 * Verify the configured token can authenticate against the GitHub API with a
	 * minimal `viewer { login }` query. Used by the admin status card.
	 */
	static async testConnection(): Promise<{
		connected: boolean;
		login?: string;
		message: string;
	}> {
		const token = process.env.GITHUB_TOKEN;
		if (!token) {
			return { connected: false, message: 'GITHUB_TOKEN is not set' };
		}
		try {
			const response = await fetch(this.API_URL, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
					'User-Agent': 'dane.gg-site'
				},
				body: JSON.stringify({ query: 'query { viewer { login } }' }),
				signal: AbortSignal.timeout(10_000)
			});

			if (response.status === 401) {
				return { connected: false, message: 'Token rejected (401 Unauthorized)' };
			}
			if (!response.ok) {
				return { connected: false, message: `GitHub API error (HTTP ${response.status})` };
			}

			const body = (await response.json()) as {
				data?: { viewer?: { login?: string } };
				errors?: { message: string }[];
			};
			if (body.errors?.length) {
				return { connected: false, message: body.errors[0].message };
			}
			const login = body.data?.viewer?.login;
			if (!login) {
				return { connected: false, message: 'No authenticated user returned' };
			}
			return { connected: true, login, message: `Authenticated as ${login}` };
		} catch (error) {
			logger.error('GitHub connection test failed:', error);
			return {
				connected: false,
				message: error instanceof Error ? error.message : 'Request failed'
			};
		}
	}

	/**
	 * Fetch the trailing-year contribution calendar for a user via the GitHub
	 * GraphQL API. Requires a `GITHUB_TOKEN`. Returns null when unconfigured or on error.
	 */
	static async getContributions(username: string): Promise<GitHubContributions | null> {
		const token = process.env.GITHUB_TOKEN;
		if (!token) {
			logger.warn('GitHub contributions requested but GITHUB_TOKEN is not set');
			return null;
		}
		const login = username.trim();
		if (!login) {
			return null;
		}

		try {
			const response = await fetch(this.API_URL, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
					'User-Agent': 'dane.gg-site'
				},
				body: JSON.stringify({
					query: CONTRIBUTIONS_QUERY,
					variables: { login }
				}),
				signal: AbortSignal.timeout(10_000)
			});

			if (!response.ok) {
				logger.error(`GitHub GraphQL request failed: HTTP ${response.status}`);
				return null;
			}

			const body = (await response.json()) as GraphQLResponse;
			if (body.errors?.length) {
				logger.error('GitHub GraphQL errors:', body.errors.map((e) => e.message).join('; '));
				return null;
			}

			const calendar = body.data?.user?.contributionsCollection?.contributionCalendar;
			if (!calendar) {
				logger.warn(`No contribution calendar returned for GitHub user '${login}'`);
				return null;
			}

			return mapContributionCalendar(calendar, login);
		} catch (error) {
			logger.error('Error fetching GitHub contributions:', error);
			return null;
		}
	}
}
