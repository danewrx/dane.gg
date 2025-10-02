import { Router } from 'express';
import { DiscordStatusService } from '../services/discordStatusService';
import { LastFmService } from '../services/lastfmService';
import { TweetService } from '../services/tweetService';

const router = Router();

/**
 * GET /api/widgets/discord-status
 * Get current Discord status for widgets
 */
router.get('/discord-status', async (req, res) => {
  try {
    const statusData = await DiscordStatusService.getCurrentStatus();
    
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
    console.error('Error fetching Discord status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/widgets/nowplaying
 * Get now playing information from Last.fm API
 */
router.get('/nowplaying', async (req, res) => {
  try {
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

    // Get fresh data directly from Last.fm API
    const musicData = await LastFmService.getCurrentMusicStatus();
    res.json(musicData);
  } catch (error) {
    console.error('Error fetching now playing from Last.fm:', error);
    
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
    const latestTweet = await TweetService.getLatestTweet();
    
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
      authorProfileImage: latestTweet.authorProfileImage,
      authorProfileUrl: latestTweet.authorProfileUrl,
      tweetUrl: latestTweet.tweetUrl,
      createdAt: latestTweet.createdAt,
      lastUpdate: latestTweet.updatedAt
    });
  } catch (error) {
    console.error('Error fetching latest tweet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
