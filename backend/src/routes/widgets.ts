import { logger } from '../utils/logger';
import { Router } from 'express';
import { DiscordStatusService } from '../services/discordStatusService';
import { LastFmService } from '../services/lastfmService';
import { TweetService } from '../services/tweetService';
import { getOrSetCached } from '../utils/shortLivedCache';

const router = Router();

const DISCORD_WIDGET_TTL_MS = 20_000;
const LASTFM_WIDGET_TTL_MS = 15_000;
const LATEST_TWEET_WIDGET_TTL_MS = 30_000;

function shouldProxyTwitterImages(): boolean {
	return (process.env.TWITTER_PROXY_PROFILE_IMAGES ?? 'true').toLowerCase() === 'true';
}

function proxiedTwitterImageUrl(url: string | null | undefined): string | null {
	if (!url) return null;
	if (!shouldProxyTwitterImages()) return url;
	if (!url.includes('pbs.twimg.com') && !url.includes('twimg.com')) return url;
	return `/api/widgets/tweet-profile-image?url=${encodeURIComponent(url)}`;
}

/**
 * GET /api/widgets/discord-status
 * Get current Discord status for widgets
 */
router.get('/discord-status', async (req, res) => {
	try {
		const statusData = await getOrSetCached('widget:discord-status', DISCORD_WIDGET_TTL_MS, () =>
			DiscordStatusService.getCurrentStatus()
		);

		res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');

		if (!statusData) {
			return res.json({
				status: 0,
				lastUpdate: new Date().toISOString()
			});
		}

		res.json({
			status: statusData.status,
			lastUpdate: statusData.lastUpdate?.toISOString() || new Date().toISOString()
		});
	} catch (error) {
		logger.error('Error fetching Discord status:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * GET /api/widgets/nowplaying
 * Get now playing information from Last.fm API
 */
router.get('/nowplaying', async (req, res) => {
	try {
		res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');

		if (!LastFmService.isConfigured()) {
			// Return default data if Last.fm is not configured
			return res.json({
				track: null,
				artist: null,
				album: null,
				image: null,
				url: null,
				nowPlaying: false,
				lastUpdate: new Date().toISOString()
			});
		}

		const musicData = await getOrSetCached('widget:lastfm-nowplaying', LASTFM_WIDGET_TTL_MS, () =>
			LastFmService.getCurrentMusicStatus()
		);
		res.json(musicData);
	} catch (error) {
		logger.error('Error fetching now playing from Last.fm:', error);

		// Return default data on error
		res.json({
			track: null,
			artist: null,
			album: null,
			image: null,
			url: null,
			nowPlaying: false,
			lastUpdate: new Date().toISOString()
		});
	}
});

/**
 * GET /api/widgets/latest-tweet
 * Get latest tweet from database
 */
router.get('/latest-tweet', async (req, res) => {
	try {
		res.set('Cache-Control', 'public, max-age=20, stale-while-revalidate=120');

		const latestTweet = await getOrSetCached('widget:latest-tweet', LATEST_TWEET_WIDGET_TTL_MS, () =>
			TweetService.getLatestTweet()
		);

		if (!latestTweet) {
			return res.json({
				tweetId: null,
				content: null,
				authorName: null,
				authorUsername: null,
				authorProfileImage: null,
				authorProfileUrl: null,
				tweetUrl: null,
				createdAt: null,
				lastUpdate: new Date().toISOString()
			});
		}

		res.json({
			tweetId: latestTweet.tweetId,
			content: latestTweet.content,
			authorName: latestTweet.authorName,
			authorUsername: latestTweet.authorUsername,
			authorProfileImage: proxiedTwitterImageUrl(latestTweet.authorProfileImage),
			authorProfileUrl: latestTweet.authorProfileUrl,
			tweetUrl: latestTweet.tweetUrl,
			createdAt: latestTweet.createdAt,
			lastUpdate: latestTweet.updatedAt
		});
	} catch (error) {
		logger.error('Error fetching latest tweet:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * GET /api/widgets/tweet-profile-image
 * Proxy endpoint to fetch and serve Twitter profile images
 * Bypasses browser tracking protection by serving images from site domain
 */
router.get('/tweet-profile-image', async (req, res) => {
	try {
		const imageUrl = req.query.url as string;

		if (!imageUrl) {
			return res.status(400).json({ error: 'Missing url parameter' });
		}

		if (!imageUrl.includes('pbs.twimg.com') && !imageUrl.includes('twimg.com')) {
			return res.status(400).json({ error: 'Invalid image URL' });
		}

		const response = await fetch(imageUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				Referer: 'https://x.com/'
			}
		});

		if (!response.ok) {
			return res.status(response.status).json({ error: 'Failed to fetch image' });
		}

		const imageBuffer = await response.arrayBuffer();
		const contentType = response.headers.get('content-type') || 'image/jpeg';

		res.setHeader('Content-Type', contentType);
		res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
		res.setHeader('Access-Control-Allow-Origin', '*');

		res.send(Buffer.from(imageBuffer));
	} catch (error: any) {
		logger.error('Error proxying tweet profile image:', error);
		res.status(500).json({ error: 'Failed to fetch image' });
	}
});

export default router;
