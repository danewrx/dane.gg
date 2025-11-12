import { Router, Request, Response } from 'express';
import { requireSession, requireAdmin } from '../middleware/auth';
import { TwitterApiService } from '../services/twitterApiService';
import { TweetService } from '../services/tweetService';

const router = Router();

/**
 * POST /api/twitter/fetch
 * Manually trigger fetching the latest tweet (admin only)
 */
router.post('/fetch', requireSession, requireAdmin, async (req: Request, res: Response) => {
  try {
    const username = process.env.TWITTER_USERNAME;

    if (!username) {
      return res.status(400).json({
        error: 'TWITTER_USERNAME environment variable is not set'
      });
    }

    if (!TwitterApiService.isConfigured()) {
      return res.status(400).json({
        error: 'Twitter API is not configured. Please set TWITTER_COOKIES and TWITTER_USERNAME environment variables'
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
    console.error('Twitter fetch error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/twitter/status
 * Check Twitter API configuration status (admin only)
 */
router.get('/status', requireSession, requireAdmin, async (req: Request, res: Response) => {
  try {
    const isConfigured = TwitterApiService.isConfigured();
    const username = process.env.TWITTER_USERNAME || null;

    // Test connection
    let connectionTest = null;
    if (isConfigured && username) {
      connectionTest = await TwitterApiService.testConnection(username);
    }

    res.json({
      configured: isConfigured,
      username: username,
      hasCookies: !!process.env.TWITTER_COOKIES,
      connection: connectionTest,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Twitter status error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/twitter/health-check
 * Manually trigger a connection health check (admin only)
 */
router.get('/health-check', requireSession, requireAdmin, async (req: Request, res: Response) => {
  try {
    const username = process.env.TWITTER_USERNAME;

    if (!username) {
      return res.status(400).json({
        error: 'TWITTER_USERNAME environment variable is not set'
      });
    }

    const isHealthy = await TwitterApiService.checkConnectionHealth(username);

    res.json({
      healthy: isHealthy,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Twitter health check error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/twitter/tweets
 * Get all tweets from database (admin only)
 */
router.get('/tweets', requireSession, requireAdmin, async (req: Request, res: Response) => {
  try {
    const tweets = await TweetService.getAllTweets();
    
    const tweetsWithProxyImages = tweets.map(tweet => {
      let profileImageUrl = tweet.authorProfileImage;
      if (profileImageUrl && profileImageUrl.includes('pbs.twimg.com')) {
        const imageUrl = encodeURIComponent(profileImageUrl);
        profileImageUrl = `/api/widgets/tweet-profile-image?url=${imageUrl}`;
      }
      
      return {
        ...tweet,
        authorProfileImage: profileImageUrl
      };
    });

    res.json({
      success: true,
      data: tweetsWithProxyImages,
      count: tweetsWithProxyImages.length
    });
  } catch (error: any) {
    console.error('Error fetching tweets:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;

