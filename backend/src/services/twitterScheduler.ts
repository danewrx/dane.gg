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
	private static isInitialized = false;

	/**
	 * Initialize Twitter scheduler
	 * Sets up cron jobs for fetching tweets and health checks
	 */
	static async initialize(): Promise<void> {
		if (this.isInitialized) {
			logger.info('Already initialized');
			return;
		}

		// Check if Twitter is configured
		if (!process.env.TWITTER_COOKIES) {
			logger.info('TWITTER_COOKIES not set, skipping scheduler initialization');
			return;
		}

		try {
			// Get username from database - fallback to env
			const dbUsername = await ConfigService.get('twitter_username');
			const username =
				dbUsername && typeof dbUsername === 'string' && dbUsername.trim()
					? dbUsername.trim()
					: process.env.TWITTER_USERNAME;

			if (!username) {
				logger.info(
					'Twitter username not configured. Set it in the admin panel or TWITTER_USERNAME environment variable'
				);
				return;
			}

			// Test connection on startup
			const connectionTest = await TwitterApiService.testConnection(username);
			if (connectionTest.connected) {
				logger.info(`Connection test successful for @${username}`);
			} else {
				logger.error(`Connection test failed: ${connectionTest.message}`);
			}

			// Perform initial fetch
			TwitterApiService.fetchAndUpdateLatestTweet(username).catch((err) => {
				logger.error('Initial fetch failed:', err.message);
			});

			// Full history backfill once on startup
			const fullBackfillEnabled =
				(process.env.TWITTER_FULL_BACKFILL_ENABLED ?? 'true').toLowerCase() === 'true';
			if (fullBackfillEnabled) {
				logger.info('Starting one-time tweet history backfill on startup');
				TwitterApiService.fetchAndBackfillAllTweets(username).catch((err) => {
					logger.error('Startup full backfill failed:', err.message);
				});
			}

			// Get cron expression from environment (Supports TWITTER_POLL_INTERVAL for backwards compatibility)
			let fetchCronExpression: string;
			if (process.env.TWITTER_FETCH_CRON) {
				// Use cron expression directly from env variable
				fetchCronExpression = process.env.TWITTER_FETCH_CRON;
			} else if (process.env.TWITTER_POLL_INTERVAL) {
				// Backwards compatibility - converts milliseconds to cron expression (deprecated)
				const pollIntervalMs = Math.max(parseInt(process.env.TWITTER_POLL_INTERVAL, 10), 30000);
				const pollIntervalMinutes = Math.floor(pollIntervalMs / 60000);
				fetchCronExpression = `*/${pollIntervalMinutes} * * * *`;
				logger.info(
					`TWITTER_POLL_INTERVAL is deprecated. Use TWITTER_FETCH_CRON instead.`
				);
			} else {
				// Default: every 2 minutes
				fetchCronExpression = '*/2 * * * *';
			}

			// Validate cron expression
			if (!cron.validate(fetchCronExpression)) {
				throw new Error(`Invalid cron expression for TWITTER_FETCH_CRON: ${fetchCronExpression}`);
			}

			// Schedule tweet fetching
			this.fetchJob = cron.schedule(
				fetchCronExpression,
				async () => {
					try {
						// Get username dynamically
						const currentDbUsername = await ConfigService.get('twitter_username');
						const currentUsername =
							currentDbUsername && typeof currentDbUsername === 'string' && currentDbUsername.trim()
								? currentDbUsername.trim()
								: process.env.TWITTER_USERNAME;

						if (currentUsername) {
							await TwitterApiService.fetchAndUpdateLatestTweet(currentUsername);
						} else {
							logger.warn('Username not available, skipping fetch');
						}
					} catch (error: any) {
						logger.error('Scheduled fetch failed:', error.message);
					}
				},
				{
					timezone: 'UTC'
				}
			);

			// Get health check cron expression from environment (default: every 2 hours)
			const healthCheckCronExpression = process.env.TWITTER_HEALTH_CHECK_CRON || '0 */2 * * *';

			// Validate cron expression
			if (!cron.validate(healthCheckCronExpression)) {
				throw new Error(
					`Invalid cron expression for TWITTER_HEALTH_CHECK_CRON: ${healthCheckCronExpression}`
				);
			}

			// Schedule health checks
			this.healthCheckJob = cron.schedule(
				healthCheckCronExpression,
				async () => {
					try {
						// Get username dynamically
						const currentDbUsername = await ConfigService.get('twitter_username');
						const currentUsername =
							currentDbUsername && typeof currentDbUsername === 'string' && currentDbUsername.trim()
								? currentDbUsername.trim()
								: process.env.TWITTER_USERNAME;

						if (currentUsername) {
							await TwitterApiService.checkConnectionHealth(currentUsername);
						} else {
							logger.warn('Username not available, skipping health check');
						}
					} catch (error: any) {
						logger.error('Health check failed:', error.message);
					}
				},
				{
					timezone: 'UTC'
				}
			);

			this.isInitialized = true;

			const source = dbUsername ? 'database' : 'environment';
			logger.info(`Initialized for @${username} (from ${source})`);
			logger.info(`Fetch schedule: ${fetchCronExpression}`);
			logger.info(`Health check schedule: ${healthCheckCronExpression}`);
			logger.info(
				`Polling too frequently may trigger Twitter rate limits or account restrictions`
			);
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
