import { logger } from '../utils/logger';
import * as cron from 'node-cron';
import { TwitterApiService } from './twitterApiService';
import { ConfigService } from './config';

/**
 * Twitter Scheduler Service
 * Handles all scheduled Twitter API tasks using cron
 */
export class TwitterScheduler {
	private static fetchJob: cron.ScheduledTask | null = null;
	private static healthCheckJob: cron.ScheduledTask | null = null;
	private static backfillJob: cron.ScheduledTask | null = null;
	private static isInitialized = false;

	private static async getCurrentUsername(): Promise<string | undefined> {
		const dbUsername = await ConfigService.get('twitter_username');
		return dbUsername && typeof dbUsername === 'string' && dbUsername.trim()
			? dbUsername.trim()
			: process.env.TWITTER_USERNAME;
	}

	private static resolveFetchCronExpression(): string {
		if (process.env.TWITTER_FETCH_CRON) return process.env.TWITTER_FETCH_CRON;
		if (process.env.TWITTER_POLL_INTERVAL) {
			const ms = Math.max(parseInt(process.env.TWITTER_POLL_INTERVAL, 10), 30000);
			logger.info('TWITTER_POLL_INTERVAL is deprecated. Use TWITTER_FETCH_CRON instead.');
			return `*/${Math.floor(ms / 60000)} * * * *`;
		}
		return '*/2 * * * *';
	}

	private static scheduleJob(
		expression: string,
		action: (username: string) => Promise<unknown>,
		label: string
	): cron.ScheduledTask {
		return cron.schedule(expression, async () => {
			try {
				const username = await this.getCurrentUsername();
				if (username) await action(username);
				else logger.warn(`Username not available, skipping ${label}`);
			} catch (error: any) {
				logger.error(`${label} failed:`, error.message);
			}
		}, { timezone: 'UTC' });
	}

	static async initialize(): Promise<void> {
		if (this.isInitialized) {
			logger.info('Already initialized');
			return;
		}

		if (!process.env.TWITTER_AUTH_TOKEN) {
			logger.info('TWITTER_AUTH_TOKEN not set, skipping scheduler initialization');
			return;
		}

		try {
			const username = await this.getCurrentUsername();

			if (!username) {
				logger.info(
					'Twitter username not configured. Set it in the admin panel or TWITTER_USERNAME environment variable'
				);
				return;
			}

			const healthy = await TwitterApiService.checkConnectionHealth(username);
			if (healthy) logger.info(`Connection healthy for @${username}`);
			else logger.error(`Connection unhealthy for @${username}`);

			TwitterApiService.fetchAndUpdateLatestTweet(username).catch((err) => {
				logger.error('Initial fetch failed:', err.message);
			});

			const fullBackfillEnabled =
				(process.env.TWITTER_FULL_BACKFILL_ENABLED ?? 'true').toLowerCase() === 'true';
			if (fullBackfillEnabled) {
				logger.info('Starting one-time tweet history backfill on startup');
				TwitterApiService.fetchAndBackfillAllTweets(username).catch((err) => {
					logger.error('Startup full backfill failed:', err.message);
				});
			}

			const fetchCronExpression = this.resolveFetchCronExpression();
			if (!cron.validate(fetchCronExpression)) {
				throw new Error(`Invalid cron expression for TWITTER_FETCH_CRON: ${fetchCronExpression}`);
			}

			const backfillCronExpression = process.env.TWITTER_BACKFILL_CRON || '0 */6 * * *';
			if (!cron.validate(backfillCronExpression)) {
				throw new Error(`Invalid cron expression for TWITTER_BACKFILL_CRON: ${backfillCronExpression}`);
			}

			const healthCheckCronExpression = process.env.TWITTER_HEALTH_CHECK_CRON || '0 */2 * * *';
			if (!cron.validate(healthCheckCronExpression)) {
				throw new Error(`Invalid cron expression for TWITTER_HEALTH_CHECK_CRON: ${healthCheckCronExpression}`);
			}

			this.fetchJob = this.scheduleJob(fetchCronExpression, (u) => TwitterApiService.fetchAndUpdateLatestTweet(u), 'fetch');
			this.backfillJob = this.scheduleJob(backfillCronExpression, (u) => TwitterApiService.fetchAndBackfillAllTweets(u), 'periodic backfill');
			this.healthCheckJob = this.scheduleJob(healthCheckCronExpression, (u) => TwitterApiService.checkConnectionHealth(u), 'health check');

			this.isInitialized = true;
			logger.info(`Initialized for @${username}`);
			logger.info(`Fetch schedule: ${fetchCronExpression}`);
			logger.info(`Backfill schedule: ${backfillCronExpression}`);
			logger.info(`Health check schedule: ${healthCheckCronExpression}`);
			logger.info('Polling too frequently may trigger Twitter rate limits or account restrictions');
		} catch (error: any) {
			logger.error('Failed to initialize:', error.message);
		}
	}

	/**
	 * Stop all scheduled Twitter jobs
	 */
	static stop(): void {
		if (this.fetchJob) {
			this.fetchJob.stop();
			this.fetchJob = null;
		}

		if (this.backfillJob) {
			this.backfillJob.stop();
			this.backfillJob = null;
		}

		if (this.healthCheckJob) {
			this.healthCheckJob.stop();
			this.healthCheckJob = null;
		}

		this.isInitialized = false;
		logger.info('Stopped all scheduled jobs');
	}

	/**
	 * Restart the scheduler
	 */
	static async restart(): Promise<void> {
		this.stop();
		await this.initialize();
	}

	/**
	 * Check if scheduler is initialized
	 */
	static getInitialized(): boolean {
		return this.isInitialized;
	}
}
