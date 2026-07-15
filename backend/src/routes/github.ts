import { logger } from '../utils/logger';
import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { siteConfig } from '../db/schema';
import { requireSession } from '../middleware/auth';
import { GitHubService } from '../services/githubService';

const router = Router();

/**
 * GET /api/github/status
 * Admin-only: the resolved username (and whether it comes from the database
 * override or the GITHUB_USERNAME env var), whether GITHUB_TOKEN is set, and
 * a live connection test.
 */
router.get('/status', requireSession, async (req, res) => {
	try {
		const [row] = await db
			.select()
			.from(siteConfig)
			.where(eq(siteConfig.key, 'github_username'))
			.limit(1);

		const dbUsername = row?.value?.trim() || '';
		const envUsername = (process.env.GITHUB_USERNAME || '').trim();
		const username = dbUsername || envUsername;
		const usernameSource: 'database' | 'environment' = dbUsername ? 'database' : 'environment';

		const tokenConfigured = GitHubService.isConfigured();
		const connection = await GitHubService.testConnection();

		res.set('Cache-Control', 'no-store');
		res.json({ tokenConfigured, username, usernameSource, connection });
	} catch (error) {
		logger.error('Error fetching GitHub status:', error);
		res.status(500).json({ error: 'Failed to fetch GitHub status' });
	}
});

export default router;
