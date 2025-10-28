import { Router, Request, Response } from 'express';
import { StatsService } from '../services/statsService';
import { requireSession } from '../middleware/auth';

const router = Router();

// Stats routes require session authentication and admin privileges
router.use(requireSession);

function checkAdmin(req: Request, res: Response, next: Function) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ 
      error: 'Access denied', 
      message: 'Admin privileges required' 
    });
  }
  next();
}

/**
 * GET /api/stats/overview
 * Get overview statistics
 */
router.get('/overview', checkAdmin, async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '24h';
    
    const [totalViews, uniqueVisitors] = await Promise.all([
      StatsService.getTotalSiteViews(timeRange),
      StatsService.getUniqueVisitors(timeRange)
    ]);
    
    res.json({
      success: true,
      data: {
        totalViews,
        uniqueVisitors,
        timeRange
      }
    });
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch overview statistics'
    });
  }
});

/**
 * GET /api/stats/page-views
 * Get page views by page
 */
router.get('/page-views', checkAdmin, async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '24h';
    const limit = parseInt((req.query.limit as string) || '10');
    
    const pageViews = await StatsService.getPageViewsByPage(timeRange, limit);
    
    res.json({
      success: true,
      data: pageViews,
      timeRange,
      limit
    });
  } catch (error) {
    console.error('Error fetching page views stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch page views statistics'
    });
  }
});

/**
 * GET /api/stats/visitors/countries
 * Get visitor countries
 */
router.get('/visitors/countries', checkAdmin, async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '24h';
    const limit = parseInt((req.query.limit as string) || '10');
    
    const countries = await StatsService.getVisitorCountries(timeRange, limit);
    
    res.json({
      success: true,
      data: countries,
      timeRange,
      limit
    });
  } catch (error) {
    console.error('Error fetching visitor countries:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch visitor countries statistics'
    });
  }
});

/**
 * GET /api/stats/visitors/browsers
 * Get visitor browsers
 */
router.get('/visitors/browsers', checkAdmin, async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '24h';
    const limit = parseInt((req.query.limit as string) || '10');
    
    const browsers = await StatsService.getVisitorBrowsers(timeRange, limit);
    
    res.json({
      success: true,
      data: browsers,
      timeRange,
      limit
    });
  } catch (error) {
    console.error('Error fetching visitor browsers:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch visitor browsers statistics'
    });
  }
});

/**
 * GET /api/stats/visitors/os
 * Get visitor operating systems
 */
router.get('/visitors/os', checkAdmin, async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '24h';
    const limit = parseInt((req.query.limit as string) || '10');
    
    const os = await StatsService.getVisitorOS(timeRange, limit);
    
    res.json({
      success: true,
      data: os,
      timeRange,
      limit
    });
  } catch (error) {
    console.error('Error fetching visitor OS:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch visitor OS statistics'
    });
  }
});

/**
 * GET /api/stats/visitors/devices
 * Get visitor devices
 */
router.get('/visitors/devices', checkAdmin, async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '24h';
    const limit = parseInt((req.query.limit as string) || '10');
    
    const devices = await StatsService.getVisitorDevices(timeRange, limit);
    
    res.json({
      success: true,
      data: devices,
      timeRange,
      limit
    });
  } catch (error) {
    console.error('Error fetching visitor devices:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch visitor devices statistics'
    });
  }
});

/**
 * GET /api/stats/request-logs
 * Get raw request logs
 */
router.get('/request-logs', checkAdmin, async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '24h';
    const limit = parseInt((req.query.limit as string) || '100');
    
    const logs = await StatsService.getRequestLogs(timeRange, limit);
    
    res.json({
      success: true,
      data: logs,
      timeRange,
      limit
    });
  } catch (error) {
    console.error('Error fetching request logs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch request logs'
    });
  }
});

/**
 * GET /api/stats/dashboard
 * Get all dashboard data in one request
 */
router.get('/dashboard', checkAdmin, async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '24h';
    
    const [
      totalViews,
      uniqueVisitors,
      totalPagesIndexed,
      totalDaysSinceTracking,
      pageViews,
      countries,
      browsers,
      os,
      devices,
      trends
    ] = await Promise.all([
      StatsService.getTotalSiteViews(timeRange),
      StatsService.getUniqueVisitors(timeRange),
      StatsService.getTotalPagesIndexed(timeRange),
      StatsService.getTotalDaysSinceTracking(),
      StatsService.getPageViewsByPage(timeRange, 10),
      StatsService.getVisitorCountries(timeRange, 10),
      StatsService.getVisitorBrowsers(timeRange, 10),
      StatsService.getVisitorOS(timeRange, 10),
      StatsService.getVisitorDevices(timeRange, 10),
      StatsService.getVisitorTrends(timeRange)
    ]);
    
    res.json({
      success: true,
      data: {
        overview: {
          totalViews,
          uniqueVisitors,
          totalPagesIndexed,
          totalDaysSinceTracking,
          timeRange
        },
        pageViews,
        countries,
        browsers,
        os,
        devices,
        trends
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

export default router;


