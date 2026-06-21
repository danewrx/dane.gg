import { logger } from '../utils/logger';
import { db } from '../db';
import { visitorStats } from '../db/schema';
import { eq, desc, gte, sql, and, count } from 'drizzle-orm';
import { Request } from 'express';
import { VPNDetectionService } from './vpnDetection';
import { GeoLocationService } from './geoLocation';

export interface VisitorData {
	visitorId: string;
	sessionId: string;
	ipAddress: string;
	userAgent: string;
	country?: string | null;
	browser?: string;
	os?: string;
	device?: string;
	screenResolution?: string;
	language?: string;
	referrer?: string;
	isVpn?: boolean;
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
	static async extractVisitorData(req: Request): Promise<VisitorData> {
		const ipAddress =
			(req.headers['cf-connecting-ip'] as string | undefined)?.trim() ||
			req.ip ||
			req.connection.remoteAddress ||
			'unknown';
		const userAgent = req.get('User-Agent') || 'unknown';

		// Get country and VPN status in parallel
		const [country, isVpn] = await Promise.all([
			GeoLocationService.getCountry(ipAddress),
			VPNDetectionService.isVPN(ipAddress)
		]);

		const isUUID = (s: unknown): s is string =>
			typeof s === 'string' &&
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

		const visitorId = isUUID(req.cookies?.visitor_id)
			? req.cookies.visitor_id
			: this.generateId();

		const sessionId = isUUID(req.cookies?.session_id)
			? req.cookies.session_id
			: this.generateId();

		// Parse user agent for browser/OS info
		const { browser, os, device } = this.parseUserAgent(userAgent);

		return {
			visitorId,
			sessionId,
			ipAddress,
			userAgent,
			country,
			browser,
			os,
			device,
			screenResolution: req.headers['x-screen-resolution'] as string,
			language: req.headers['accept-language']?.split(',')[0],
			referrer: req.get('Referer'),
			isVpn
		};
	}

	/**
	 * Track visitor data
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
				isVpn: data.isVpn || false,
				timestamp: new Date()
			});
		} catch (error) {
			logger.error('Error tracking visitor data:', error);
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

		if (timeAgo !== null) {
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

		if (timeAgo !== null) {
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
	static async getPageViewsByPage(
		timeRange: string,
		limit: number = 10
	): Promise<Array<{ page: string; views: number }>> {
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

		if (timeAgo !== null) {
			conditions.push(gte(visitorStats.timestamp, timeAgo));
		}

		const result = await db
			.select({
				page: visitorStats.path,
				views: sql<number>`count(*)`
			})
			.from(visitorStats)
			.where(and(...conditions))
			.groupBy(visitorStats.path)
			.orderBy(desc(sql<number>`count(*)`))
			.limit(limit);

		return result;
	}

	/**
	 * Get visitor countries (only actual pages)
	 */
	static async getVisitorCountries(
		timeRange: string,
		limit: number = 10
	): Promise<Array<{ country: string | null; visitors: number; vpnVisitors: number }>> {
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
			sql`${visitorStats.path} NOT LIKE '/webhooks/%'`,
			sql`${visitorStats.country} IS NOT NULL`
		];

		if (timeAgo !== null) {
			conditions.push(gte(visitorStats.timestamp, timeAgo));
		}

		const result = await db
			.select({
				country: visitorStats.country,
				visitors: sql<number>`count(distinct ${visitorStats.visitorId})`,
				vpnVisitors: sql<number>`count(distinct case when ${visitorStats.isVpn} = true then ${visitorStats.visitorId} end)`
			})
			.from(visitorStats)
			.where(and(...conditions))
			.groupBy(visitorStats.country)
			.orderBy(desc(sql<number>`count(distinct ${visitorStats.visitorId})`))
			.limit(limit);

		return result;
	}

	/**
	 * Get visitor browsers (only actual pages)
	 */
	static async getVisitorBrowsers(
		timeRange: string,
		limit: number = 10
	): Promise<Array<{ browser: string | null; visitors: number }>> {
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
			sql`${visitorStats.path} NOT LIKE '/webhooks/%'`,
			sql`${visitorStats.browser} IS NOT NULL`
		];

		if (timeAgo !== null) {
			conditions.push(gte(visitorStats.timestamp, timeAgo));
		}

		const result = await db
			.select({
				browser: visitorStats.browser,
				visitors: sql<number>`count(distinct ${visitorStats.visitorId})`
			})
			.from(visitorStats)
			.where(and(...conditions))
			.groupBy(visitorStats.browser)
			.orderBy(desc(sql<number>`count(distinct ${visitorStats.visitorId})`))
			.limit(limit);

		return result;
	}

	/**
	 * Get visitor operating systems (only actual pages)
	 */
	static async getVisitorOS(
		timeRange: string,
		limit: number = 10
	): Promise<Array<{ os: string | null; visitors: number }>> {
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
			sql`${visitorStats.path} NOT LIKE '/webhooks/%'`,
			sql`${visitorStats.os} IS NOT NULL`
		];

		if (timeAgo !== null) {
			conditions.push(gte(visitorStats.timestamp, timeAgo));
		}

		const result = await db
			.select({
				os: visitorStats.os,
				visitors: sql<number>`count(distinct ${visitorStats.visitorId})`
			})
			.from(visitorStats)
			.where(and(...conditions))
			.groupBy(visitorStats.os)
			.orderBy(desc(sql<number>`count(distinct ${visitorStats.visitorId})`))
			.limit(limit);

		return result;
	}

	/**
	 * Get visitor devices (only actual pages)
	 */
	static async getVisitorDevices(
		timeRange: string,
		limit: number = 10
	): Promise<Array<{ device: string | null; visitors: number }>> {
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
			sql`${visitorStats.path} NOT LIKE '/webhooks/%'`,
			sql`${visitorStats.device} IS NOT NULL`
		];

		if (timeAgo !== null) {
			conditions.push(gte(visitorStats.timestamp, timeAgo));
		}

		const result = await db
			.select({
				device: visitorStats.device,
				visitors: sql<number>`count(distinct ${visitorStats.visitorId})`
			})
			.from(visitorStats)
			.where(and(...conditions))
			.groupBy(visitorStats.device)
			.orderBy(desc(sql<number>`count(distinct ${visitorStats.visitorId})`))
			.limit(limit);

		return result;
	}

	/**
	 * Get request logs with pagination
	 */
	static async getRequestLogs(
		timeRange: string,
		limit: number = 50,
		offset: number = 0
	): Promise<{ rows: any[]; total: number }> {
		const timeAgo = this.getTimeAgo(timeRange);
		const conditions = timeAgo !== null ? [gte(visitorStats.timestamp, timeAgo)] : [];
		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const [rows, countResult] = await Promise.all([
			db
				.select()
				.from(visitorStats)
				.where(whereClause)
				.orderBy(desc(visitorStats.timestamp))
				.limit(limit)
				.offset(offset),
			db
				.select({ total: sql<number>`count(*)` })
				.from(visitorStats)
				.where(whereClause)
		]);

		return { rows, total: Number(countResult[0]?.total ?? 0) };
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

		if (timeAgo !== null) {
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
			.where(
				and(
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
				)
			);

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
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			const r = (Math.random() * 16) | 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}

	/**
	 * Parse user agent string
	 */
	private static parseUserAgent(userAgent: string): {
		browser: string;
		os: string;
		device: string;
	} {
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
	 * Get visitor trends over time
	 */
	static async getVisitorTrends(
		timeRange: string
	): Promise<Array<{ date: string; visitors: number; views: number }>> {
		const timeAgo = this.getTimeAgo(timeRange);

		if (!timeAgo && timeRange !== 'all') {
			return [];
		}

		// 1h, 12h, 24h, 48h - group by hour
		const useHourly = ['1h', '12h', '24h', '48h'].includes(timeRange);

		// Use date_trunc for grouping by time intervals
		const groupByFormat = useHourly
			? sql`date_trunc('hour', ${visitorStats.timestamp})`
			: sql`date_trunc('day', ${visitorStats.timestamp})`;

		const conditions = timeAgo ? [gte(visitorStats.timestamp, timeAgo)] : [];

		const results = await db
			.select({
				date: sql<string>`${groupByFormat}`.as('date'),
				visitors: sql<number>`COUNT(DISTINCT ${visitorStats.visitorId})`.as('visitors'),
				views: count(visitorStats.id).as('views')
			})
			.from(visitorStats)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.groupBy(groupByFormat)
			.orderBy(sql`${groupByFormat} ASC`);

		// Fill in missing time periods with zero values
		if (results.length === 0 || !timeAgo) {
			return results.map((r) => ({
				date: r.date,
				visitors: Number(r.visitors),
				views: Number(r.views)
			}));
		}

		const filled: Array<{ date: string; visitors: number; views: number }> = [];
		const now = new Date();
		const start = new Date(timeAgo);

		if (useHourly) {
			const current = new Date(start);
			current.setMinutes(0, 0, 0);

			while (current <= now) {
				const hourStr = current.toISOString();
				const existing = results.find((r) => {
					const rDate = new Date(r.date);
					return rDate.getTime() === current.getTime();
				});

				filled.push({
					date: hourStr,
					visitors: existing ? Number(existing.visitors) : 0,
					views: existing ? Number(existing.views) : 0
				});

				current.setHours(current.getHours() + 1);
			}
		} else {
			const current = new Date(start);
			current.setHours(0, 0, 0, 0);

			while (current <= now) {
				const dayStr = current.toISOString().split('T')[0] + 'T00:00:00.000Z';
				const existing = results.find((r) => {
					const rDate = new Date(r.date);
					return rDate.toISOString().split('T')[0] === current.toISOString().split('T')[0];
				});

				filled.push({
					date: dayStr,
					visitors: existing ? Number(existing.visitors) : 0,
					views: existing ? Number(existing.views) : 0
				});

				current.setDate(current.getDate() + 1);
			}
		}

		return filled;
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
			case '48h':
				return new Date(now.getTime() - 48 * 60 * 60 * 1000);
			case '7d':
				return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			case '30d':
				return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			case '6m':
				return new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
			case '1y':
				return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
			case 'all':
				return null;
			default:
				return new Date(now.getTime() - 24 * 60 * 60 * 1000);
		}
	}
}
