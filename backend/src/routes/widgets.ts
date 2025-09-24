import { Router } from 'express';
import { WidgetService } from '../services/widgetService';

const router = Router();

/**
 * GET /api/widgets/discord-status
 * Get current Discord status for widgets
 */
router.get('/discord-status', async (req, res) => {
  try {
    const widgetData = await WidgetService.getWidgetDataWithFallback('discord_status', {
      status: 0,
      lastUpdate: new Date().toISOString()
    });
    
    res.json(widgetData.data);
  } catch (error) {
    console.error('Error fetching Discord status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/widgets/services/status
 * Get services status
 */
router.get('/services/status', async (req, res) => {
  try {
    const widgetData = await WidgetService.getWidgetDataWithFallback('services_status', {
      services: {},
      lastUpdated: new Date().toISOString()
    });
    
    res.json(widgetData.data);
  } catch (error) {
    console.error('Error fetching services status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/widgets/nowplaying
 * Get now playing information
 */
router.get('/nowplaying', async (req, res) => {
  try {
    const widgetData = await WidgetService.getWidgetDataWithFallback('now_playing', {
      track: null,
      artist: null,
      album: null,
      lastUpdate: new Date().toISOString()
    });
    
    res.json(widgetData.data);
  } catch (error) {
    console.error('Error fetching now playing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/widgets/latest-tweet
 * Get latest tweet
 */
router.get('/latest-tweet', async (req, res) => {
  try {
    const widgetData = await WidgetService.getWidgetDataWithFallback('latest_tweet', {
      text: null,
      username: null,
      createdAt: null,
      lastUpdate: new Date().toISOString()
    });
    
    res.json(widgetData.data);
  } catch (error) {
    console.error('Error fetching latest tweet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/widgets/config/weather
 * Get weather configuration
 */
router.get('/config/weather', async (req, res) => {
  try {
    const widgetData = await WidgetService.getWidgetDataWithFallback('weather_config', {
      defaultWeather: (process.env.DEFAULT_WEATHER || 'rain').toLowerCase()
    });
    
    res.json(widgetData.data);
  } catch (error) {
    console.error('Error fetching weather config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/widgets/types
 * Get all available widget types
 */
router.get('/types', async (req, res) => {
  try {
    const types = await WidgetService.getAllWidgetTypes();
    res.json({ types });
  } catch (error) {
    console.error('Error fetching widget types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
