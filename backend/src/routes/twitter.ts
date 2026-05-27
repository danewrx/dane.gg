import { logger } from '../utils/logger';
import { Router, Request, Response } from 'express';
import { requireSession } from '../middleware/auth';
import { TwitterApiService } from '../services/twitterApiService';
import { TweetService } from '../services/tweetService';
import { ConfigService } from '../services/config';

const router = Router();

/**
 * POST /api/twitter/fetch
 * Manually trigger fetching the latest tweet (authenticated users only)
 */
router.post('/fetch', requireSession, async (req: Request, res: Response) => {
	try {
		// Get username from database - fallback to env variable
		const dbUsername = await ConfigService.get('twitter_username');
		const username =
			dbUsername && typeof dbUsername === 'string' && dbUsername.trim()
				? dbUsername.trim()
				: process.env.TWITTER_USERNAME;

		if (!username) {
			return res.status(400).json({
				error:
					'Twitter username is not configured. Please set it in the admin panel or set TWITTER_USERNAME environment variable'
			});
		}

		const isConfigured = await TwitterApiService.isConfigured();
		if (!isConfigured) {
			return res.status(400).json({
				error:
					'Twitter API is not configured. Please set TWITTER_COOKIES environment variable and configure the username'
			});
		}

		const success = await TwitterApiService.fetchAndUpdateLatestTweet(username);

		if (success) {
			res.json({
				success: true,
				message: 'Tweet fetched and updated successfully',
				timestamp: new Date().toISOString()
			});
		} else {
			res.status(500).json({
				error: 'Failed to fetch or update tweet'
			});
		}
	} catch (error: any) {
		logger.error('Twitter fetch error:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: error.message
		});
	}
});

/**
 * GET /api/twitter/status
 * Check Twitter API configuration status (authenticated users only)
 */
router.get('/status', requireSession, async (req: Request, res: Response) => {
	try {
		const isConfigured = await TwitterApiService.isConfigured();

		const dbUsername = await ConfigService.get('twitter_username');
		const username =
			dbUsername && typeof dbUsername === 'string' && dbUsername.trim()
				? dbUsername.trim()
				: process.env.TWITTER_USERNAME || null;
		const usernameSource = dbUsername ? 'database' : 'environment';

		// Test connection
		let connectionTest = null;
		if (isConfigured && username) {
			connectionTest = await TwitterApiService.testConnection(username);
		}

		res.json({
			configured: isConfigured,
			username: username,
			usernameSource: usernameSource,
			hasCookies: !!process.env.TWITTER_COOKIES,
			connection: connectionTest,
			timestamp: new Date().toISOString()
		});
	} catch (error: any) {
		logger.error('Twitter status error:', error);
		res.status(500).json({
			error: 'Internal server error'
		});
	}
});

/**
 * GET /api/twitter/health-check
 * Manually trigger a connection health check (authenticated users only)
 */
router.get('/health-check', requireSession, async (req: Request, res: Response) => {
	try {
		// Get username from database first, then env
		const dbUsername = await ConfigService.get('twitter_username');
		const username =
			dbUsername && typeof dbUsername === 'string' && dbUsername.trim()
				? dbUsername.trim()
				: process.env.TWITTER_USERNAME;

		if (!username) {
			return res.status(400).json({
				error:
					'Twitter username is not configured. Please set it in the admin panel or set TWITTER_USERNAME environment variable'
			});
		}

		const isHealthy = await TwitterApiService.checkConnectionHealth(username);

		res.json({
			healthy: isHealthy,
			timestamp: new Date().toISOString()
		});
	} catch (error: any) {
		logger.error('Twitter health check error:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: error.message
		});
	}
});

/**
 * PUT /api/twitter/username
 * Update Twitter username in database (authenticated users only)
 */
router.put('/username', requireSession, async (req: Request, res: Response) => {
	try {
		const { username } = req.body;

		if (!username || typeof username !== 'string' || !username.trim()) {
			return res.status(400).json({
				success: false,
				error: 'Username is required and must be a non-empty string'
			});
		}

		// Validate username format (no @ symbol)
		const trimmedUsername = username.trim().replace(/^@/, '');
		if (!/^[a-zA-Z0-9_]{1,15}$/.test(trimmedUsername)) {
			return res.status(400).json({
				success: false,
				error:
					'Invalid username format. Username must be 1-15 characters and contain only letters, numbers, and underscores'
			});
		}

		// Save to database
		await ConfigService.set('twitter_username', trimmedUsername, 'string');

		res.json({
			success: true,
			message: 'Username updated successfully',
			data: {
				username: trimmedUsername
			}
		});
	} catch (error: any) {
		logger.error('Twitter username update error:', error);
		res.status(500).json({
			success: false,
			error: 'Internal server error',
			message: error.message
		});
	}
});

/**
 * GET /api/twitter/tweets
 * Get all tweets from database (authenticated users only)
 */
router.get('/tweets', requireSession, async (req: Request, res: Response) => {
	try {
		const tweets = await TweetService.getAllTweets();

		res.json({
			success: true,
			data: tweets,
			count: tweets.length
		});
	} catch (error: any) {
		logger.error('Error fetching tweets:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: error.message
		});
	}
});

export default router;
