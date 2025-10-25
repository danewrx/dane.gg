import { Router, Request, Response } from 'express';
import { StatsService } from '../services/statsService';

const router = Router();

/**
 * POST /api/track
 * Track a page view
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      path, 
      method = 'GET', 
      query, 
      statusCode = 200, 
      responseTime = 0, 
      contentLength,
      visitorId,
      sessionId
    } = req.body;
    
    if (!path) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Path is required'
      });
    }

    // Extract visitor data
    const visitorData = StatsService.extractVisitorData(req);
    
    // Use provided visitor and session IDs, or fall back to extracted ones
    const finalVisitorId = visitorId || visitorData.visitorId;
    const finalSessionId = sessionId || visitorData.sessionId;
    
    // Track the visitor
    await StatsService.trackVisitor({
      ...visitorData,
      visitorId: finalVisitorId,
      sessionId: finalSessionId,
      method,
      path,
      query,
      statusCode,
      responseTime,
      contentLength
    });

    res.json({
      success: true,
      message: 'Page view tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking page view:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to track page view'
    });
  }
});

export default router;
