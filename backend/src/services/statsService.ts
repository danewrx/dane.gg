import { db } from '../db';
import { visitorStats } from '../db/schema';
import { eq, desc, gte, sql, and, count } from 'drizzle-orm';
import { Request } from 'express';

export interface VisitorData {
  visitorId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  country?: string;
  browser?: string;
  os?: string;
  device?: string;
  screenResolution?: string;
  language?: string;
  referrer?: string;
}

export interface VisitorTrackingData extends VisitorData {
  method: string;
  path: string;
  query?: string;
  statusCode: number;
  responseTime: number;
  contentLength?: number;
}

export class StatsService {
  /**
   * Extract visitor data from request
   */
  static extractVisitorData(req: Request): VisitorData {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    // Generate visitor ID if not exists
    let visitorId = req.cookies?.visitor_id;
    if (!visitorId) {
      visitorId = this.generateId();
    }
    
    // Generate session ID if not exists
    let sessionId = req.cookies?.session_id;
    if (!sessionId) {
      sessionId = this.generateId();
    }
    
    // Parse user agent for browser/OS info
    const { browser, os, device } = this.parseUserAgent(userAgent);
    
    return {
      visitorId,
      sessionId,
      ipAddress,
      userAgent,
      browser,
      os,
      device,
      screenResolution: req.headers['x-screen-resolution'] as string,
      language: req.headers['accept-language']?.split(',')[0],
      referrer: req.get('Referer')
    };
  }

  /**
   * Track visitor data (single method for all tracking)
   */
  static async trackVisitor(data: VisitorTrackingData): Promise<void> {
    try {
      await db.insert(visitorStats).values({
        visitorId: data.visitorId,
        sessionId: data.sessionId,
        method: data.method,
        path: data.path,
        query: data.query,
        statusCode: data.statusCode,
        responseTime: data.responseTime,
        contentLength: data.contentLength,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        country: data.country,
        browser: data.browser,
        os: data.os,
        device: data.device,
        screenResolution: data.screenResolution,
        language: data.language,
        referrer: data.referrer,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error tracking visitor data:', error);
    }
  }

  /**
   * Get total site views for a time range (only actual pages)
   */
  static async getTotalSiteViews(timeRange: string): Promise<number> {
    const timeAgo = this.getTimeAgo(timeRange);
    
    const conditions = [
      eq(visitorStats.method, 'GET'),
      sql`${visitorStats.path} NOT LIKE '/api/%'`,
      sql`${visitorStats.path} NOT LIKE '/admin%'`,
      sql`${visitorStats.path} NOT LIKE '/login%'`,
      sql`${visitorStats.path} NOT LIKE '/logout%'`,
      sql`${visitorStats.path} NOT LIKE '/latest-tweet%'`,
      sql`${visitorStats.path} NOT LIKE '/nowplaying%'`,
      sql`${visitorStats.path} NOT LIKE '/discord-status%'`,
      sql`${visitorStats.path} NOT LIKE '/social-links%'`,
      sql`${visitorStats.path} NOT LIKE '/widgets/%'`,
      sql`${visitorStats.path} NOT LIKE '/webhooks/%'`
    ];
    
    if (timeAgo) {
      conditions.push(gte(visitorStats.timestamp, timeAgo));
    }
    
    const result = await db
      .select({ count: count() })
      .from(visitorStats)
      .where(and(...conditions));
    
    return result[0]?.count || 0;
  }

  /**
   * Get unique visitors for a time range (only actual pages)
   */
  static async getUniqueVisitors(timeRange: string): Promise<number> {
    const timeAgo = this.getTimeAgo(timeRange);
    
    const conditions = [
      eq(visitorStats.method, 'GET'),
      sql`${visitorStats.path} NOT LIKE '/api/%'`,
      sql`${visitorStats.path} NOT LIKE '/admin%'`,
      sql`${visitorStats.path} NOT LIKE '/login%'`,
      sql`${visitorStats.path} NOT LIKE '/logout%'`,
      sql`${visitorStats.path} NOT LIKE '/latest-tweet%'`,
      sql`${visitorStats.path} NOT LIKE '/nowplaying%'`,
      sql`${visitorStats.path} NOT LIKE '/discord-status%'`,
      sql`${visitorStats.path} NOT LIKE '/social-links%'`,
      sql`${visitorStats.path} NOT LIKE '/widgets/%'`,
      sql`${visitorStats.path} NOT LIKE '/webhooks/%'`
    ];
    
    if (timeAgo) {
      conditions.push(gte(visitorStats.timestamp, timeAgo));
    }
    
    const result = await db
      .select({ count: sql<number>`count(distinct ${visitorStats.visitorId})` })
      .from(visitorStats)
      .where(and(...conditions));
    
    return Number(result[0]?.count || 0);
  }

  /**
   * Get page views by page (only actual pages)
   */
  static async getPageViewsByPage(timeRange: string, limit: number = 10): Promise<Array<{ page: string; views: number }>> {
    const timeAgo = this.getTimeAgo(timeRange);
    
    const result = await db
      .select({
        page: visitorStats.path,
        views: sql<number>`count(*)`
      })
      .from(visitorStats)
      .where(and(
        gte(visitorStats.timestamp, timeAgo),
        eq(visitorStats.method, 'GET'),
        sql`${visitorStats.path} NOT LIKE '/api/%'`,
        sql`${visitorStats.path} NOT LIKE '/latest-tweet%'`,
        sql`${visitorStats.path} NOT LIKE '/nowplaying%'`,
        sql`${visitorStats.path} NOT LIKE '/discord-status%'`,
        sql`${visitorStats.path} NOT LIKE '/social-links%'`,
        sql`${visitorStats.path} NOT LIKE '/widgets/%'`,
        sql`${visitorStats.path} NOT LIKE '/webhooks/%'`
      ))
      .groupBy(visitorStats.path)
      .orderBy(desc(sql<number>`count(*)`))
      .limit(limit);
    
    return result;
  }

  /**
   * Get visitor countries (only actual pages)
   */
  static async getVisitorCountries(timeRange: string, limit: number = 10): Promise<Array<{ country: string; visitors: number }>> {
    const timeAgo = this.getTimeAgo(timeRange);
    
    const result = await db
      .select({
        country: visitorStats.country,
        visitors: sql<number>`count(distinct ${visitorStats.visitorId})`
      })
      .from(visitorStats)
      .where(and(
        gte(visitorStats.timestamp, timeAgo),
        eq(visitorStats.method, 'GET'),
        sql`${visitorStats.path} NOT LIKE '/api/%'`,
        sql`${visitorStats.path} NOT LIKE '/latest-tweet%'`,
        sql`${visitorStats.path} NOT LIKE '/nowplaying%'`,
        sql`${visitorStats.path} NOT LIKE '/discord-status%'`,
        sql`${visitorStats.path} NOT LIKE '/social-links%'`,
        sql`${visitorStats.path} NOT LIKE '/widgets/%'`,
        sql`${visitorStats.path} NOT LIKE '/webhooks/%'`,
        sql`${visitorStats.country} IS NOT NULL`
      ))
      .groupBy(visitorStats.country)
      .orderBy(desc(sql<number>`count(distinct ${visitorStats.visitorId})`))
      .limit(limit);
    
    return result;
  }

  /**
   * Get visitor browsers (only actual pages)
   */
  static async getVisitorBrowsers(timeRange: string, limit: number = 10): Promise<Array<{ browser: string; visitors: number }>> {
    const timeAgo = this.getTimeAgo(timeRange);
    
    const result = await db
      .select({
        browser: visitorStats.browser,
        visitors: sql<number>`count(distinct ${visitorStats.visitorId})`
      })
      .from(visitorStats)
      .where(and(
        gte(visitorStats.timestamp, timeAgo),
        eq(visitorStats.method, 'GET'),
        sql`${visitorStats.path} NOT LIKE '/api/%'`,
        sql`${visitorStats.path} NOT LIKE '/latest-tweet%'`,
        sql`${visitorStats.path} NOT LIKE '/nowplaying%'`,
        sql`${visitorStats.path} NOT LIKE '/discord-status%'`,
        sql`${visitorStats.path} NOT LIKE '/social-links%'`,
        sql`${visitorStats.path} NOT LIKE '/widgets/%'`,
        sql`${visitorStats.path} NOT LIKE '/webhooks/%'`,
        sql`${visitorStats.browser} IS NOT NULL`
      ))
      .groupBy(visitorStats.browser)
      .orderBy(desc(sql<number>`count(distinct ${visitorStats.visitorId})`))
      .limit(limit);
    
    return result;
  }

  /**
   * Get visitor operating systems (only actual pages)
   */
  static async getVisitorOS(timeRange: string, limit: number = 10): Promise<Array<{ os: string; visitors: number }>> {
    const timeAgo = this.getTimeAgo(timeRange);
    
    const result = await db
      .select({
        os: visitorStats.os,
        visitors: sql<number>`count(distinct ${visitorStats.visitorId})`
      })
      .from(visitorStats)
      .where(and(
        gte(visitorStats.timestamp, timeAgo),
        eq(visitorStats.method, 'GET'),
        sql`${visitorStats.path} NOT LIKE '/api/%'`,
        sql`${visitorStats.path} NOT LIKE '/latest-tweet%'`,
        sql`${visitorStats.path} NOT LIKE '/nowplaying%'`,
        sql`${visitorStats.path} NOT LIKE '/discord-status%'`,
        sql`${visitorStats.path} NOT LIKE '/social-links%'`,
        sql`${visitorStats.path} NOT LIKE '/widgets/%'`,
        sql`${visitorStats.path} NOT LIKE '/webhooks/%'`,
        sql`${visitorStats.os} IS NOT NULL`
      ))
      .groupBy(visitorStats.os)
      .orderBy(desc(sql<number>`count(distinct ${visitorStats.visitorId})`))
      .limit(limit);
    
    return result;
  }

  /**
   * Get visitor devices (only actual pages)
   */
  static async getVisitorDevices(timeRange: string, limit: number = 10): Promise<Array<{ device: string; visitors: number }>> {
    const timeAgo = this.getTimeAgo(timeRange);
    
    const result = await db
      .select({
        device: visitorStats.device,
        visitors: sql<number>`count(distinct ${visitorStats.visitorId})`
      })
      .from(visitorStats)
      .where(and(
        gte(visitorStats.timestamp, timeAgo),
        eq(visitorStats.method, 'GET'),
        sql`${visitorStats.path} NOT LIKE '/api/%'`,
        sql`${visitorStats.path} NOT LIKE '/latest-tweet%'`,
        sql`${visitorStats.path} NOT LIKE '/nowplaying%'`,
        sql`${visitorStats.path} NOT LIKE '/discord-status%'`,
        sql`${visitorStats.path} NOT LIKE '/social-links%'`,
        sql`${visitorStats.path} NOT LIKE '/widgets/%'`,
        sql`${visitorStats.path} NOT LIKE '/webhooks/%'`,
        sql`${visitorStats.device} IS NOT NULL`
      ))
      .groupBy(visitorStats.device)
      .orderBy(desc(sql<number>`count(distinct ${visitorStats.visitorId})`))
      .limit(limit);
    
    return result;
  }

  /**
   * Get request logs
   */
  static async getRequestLogs(timeRange: string, limit: number = 100): Promise<any[]> {
    const timeAgo = this.getTimeAgo(timeRange);
    
    const result = await db
      .select()
      .from(visitorStats)
      .where(gte(visitorStats.timestamp, timeAgo))
      .orderBy(desc(visitorStats.timestamp))
      .limit(limit);
    
    return result;
  }


  static async getTotalPagesIndexed(timeRange: string): Promise<number> {
    const timeAgo = this.getTimeAgo(timeRange);
    
    const conditions = [
      eq(visitorStats.method, 'GET'),
      sql`${visitorStats.path} NOT LIKE '/api/%'`,
      sql`${visitorStats.path} NOT LIKE '/admin%'`,
      sql`${visitorStats.path} NOT LIKE '/login%'`,
      sql`${visitorStats.path} NOT LIKE '/logout%'`,
      sql`${visitorStats.path} NOT LIKE '/latest-tweet%'`,
      sql`${visitorStats.path} NOT LIKE '/nowplaying%'`,
      sql`${visitorStats.path} NOT LIKE '/discord-status%'`,
      sql`${visitorStats.path} NOT LIKE '/social-links%'`,
      sql`${visitorStats.path} NOT LIKE '/widgets/%'`,
      sql`${visitorStats.path} NOT LIKE '/webhooks/%'`
    ];
    
    if (timeAgo) {
      conditions.push(gte(visitorStats.timestamp, timeAgo));
    }
    
    const result = await db
      .select({ count: sql<number>`count(distinct ${visitorStats.path})` })
      .from(visitorStats)
      .where(and(...conditions));
    
    return Number(result[0]?.count || 0);
  }

  /**
   * Get total days since tracking started
   */
  static async getTotalDaysSinceTracking(): Promise<number> {
    const result = await db
      .select({ 
        firstDate: sql<Date>`min(${visitorStats.timestamp})`,
        lastDate: sql<Date>`max(${visitorStats.timestamp})`
      })
      .from(visitorStats)
      .where(and(
        eq(visitorStats.method, 'GET'),
        sql`${visitorStats.path} NOT LIKE '/api/%'`,
        sql`${visitorStats.path} NOT LIKE '/admin%'`,
        sql`${visitorStats.path} NOT LIKE '/login%'`,
        sql`${visitorStats.path} NOT LIKE '/logout%'`,
        sql`${visitorStats.path} NOT LIKE '/latest-tweet%'`,
        sql`${visitorStats.path} NOT LIKE '/nowplaying%'`,
        sql`${visitorStats.path} NOT LIKE '/discord-status%'`,
        sql`${visitorStats.path} NOT LIKE '/social-links%'`,
        sql`${visitorStats.path} NOT LIKE '/widgets/%'`,
        sql`${visitorStats.path} NOT LIKE '/webhooks/%'`
      ));
    
    if (!result[0]?.firstDate) {
      return 0;
    }
    
    const firstDate = new Date(result[0].firstDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - firstDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Generate a unique ID
   */
  private static generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Parse user agent string
   */
  private static parseUserAgent(userAgent: string): { browser: string; os: string; device: string } {
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';

    // Browser detection
    if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Safari')) {
      browser = 'Safari';
    } else if (userAgent.includes('Edge')) {
      browser = 'Edge';
    }

    // OS detection
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iOS')) {
      os = 'iOS';
    }

    // Device detection
    if (userAgent.includes('Mobile')) {
      device = 'Mobile';
    } else if (userAgent.includes('Tablet')) {
      device = 'Tablet';
    }

    return { browser, os, device };
  }

  /**
   * Get time ago based on time range
   */
  private static getTimeAgo(timeRange: string): Date | null {
    const now = new Date();
    
    switch (timeRange) {
      case '12h':
        return new Date(now.getTime() - 12 * 60 * 60 * 1000);
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '6m':
        return new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case 'all':
        return null; // No time filtering for 'all'
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
}
