/**
 * Service for interacting with Uptime Kuma API
 * Documentation: https://github.com/louislam/uptime-kuma/blob/master/src/queries/monitor.js
 */

import { db } from '../db/index';
import { uptimeKumaMonitors } from '../db/schema';
import { eq, notInArray, inArray } from 'drizzle-orm';

export interface UptimeKumaMonitor {
	id: number;
	name: string;
	customName?: string; // Custom display name for public site
	url?: string;
	type: string;
	status: 'up' | 'down' | 'pending' | 'maintenance';
	uptime?: number;
	avgResponseTime?: number;
	lastCheck?: string;
	group?: string;
}

export interface UptimeKumaStatus {
	monitors: UptimeKumaMonitor[];
}

export class UptimeKumaService {
	private static baseUrl: string;
	private static apiKey: string | null = null;

	/**
	 * Initialize the service with Uptime Kuma instance URL and optional API key
	 */
	static initialize(baseUrl: string, apiKey?: string) {
		this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
		if (apiKey) {
			this.apiKey = apiKey;
		}
	}

	/**
	 * Get all monitors from Uptime Kuma
	 * Tries multiple endpoints:
	 * 1. REST API /api/monitor (requires authentication) - best for group structure
	 * 2. Metrics endpoint (Prometheus format)
	 * 3. Status page endpoints (public, if configured)
	 * Falls back to database cache if all API calls fail
	 */
	static async getAllMonitors(): Promise<UptimeKumaMonitor[]> {
		if (!this.baseUrl) {
			throw new Error('Uptime Kuma base URL not configured');
		}

		const errors: string[] = [];
		let monitors: UptimeKumaMonitor[] = [];

		// Try 1: REST API endpoint (best for group structure)
		if (this.apiKey) {
			try {
				console.log(`[Uptime Kuma] Attempting REST API endpoint at ${this.baseUrl}/api/monitor`);
				const authHeader = `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`;
				const response = await fetch(`${this.baseUrl}/api/monitor`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: authHeader
					}
				});

				if (response.ok) {
					const data = await response.json();
					console.log(`[Uptime Kuma] REST API endpoint success`);
					console.log(
						`[Uptime Kuma] REST API response type:`,
						Array.isArray(data) ? 'array' : typeof data
					);
					console.log(
						`[Uptime Kuma] REST API response keys:`,
						Array.isArray(data) ? 'array' : Object.keys(data)
					);

					// REST API returns full monitor objects with group information
					if (Array.isArray(data)) {
						monitors = this.parseRestApiMonitors(data);
					} else if (data.monitors && Array.isArray(data.monitors)) {
						monitors = this.parseRestApiMonitors(data.monitors);
					} else if (data.data && Array.isArray(data.data)) {
						monitors = this.parseRestApiMonitors(data.data);
					}

					if (monitors.length > 0) {
						return monitors;
					}
				} else {
					const errorText = await response.text();
					errors.push(
						`REST API endpoint failed (${response.status}): ${errorText.substring(0, 100)}`
					);
					console.log(
						`[Uptime Kuma] REST API endpoint failed: ${response.status} ${response.statusText}`
					);
				}
			} catch (error: any) {
				errors.push(`REST API endpoint error: ${error.message}`);
				console.error('[Uptime Kuma] REST API endpoint error:', error.message);
			}
		}

		// Try 2: Metrics endpoint (Prometheus format)
		try {
			console.log(`[Uptime Kuma] Attempting metrics endpoint at ${this.baseUrl}/metrics`);
			const headers: Record<string, string> = {
				'Content-Type': 'text/plain'
			};

			if (this.apiKey) {
				const authHeader = `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`;
				headers['Authorization'] = authHeader;
			}

			const response = await fetch(`${this.baseUrl}/metrics`, {
				method: 'GET',
				headers
			});

			if (response.ok) {
				const metricsText = await response.text();
				console.log(`[Uptime Kuma] Metrics endpoint success, received ${metricsText.length} bytes`);
				console.log(`[Uptime Kuma] First 500 chars of metrics:`, metricsText.substring(0, 500));
				monitors = this.parsePrometheusMetrics(metricsText);
				console.log(`[Uptime Kuma] Parsed ${monitors.length} monitors from metrics`);
				if (monitors.length > 0) {
					await this.saveMonitorsToCache(monitors);
					return monitors;
				}
			} else {
				const errorText = await response.text();
				errors.push(`Metrics endpoint failed (${response.status}): ${errorText.substring(0, 100)}`);
				console.log(
					`[Uptime Kuma] Metrics endpoint failed: ${response.status} ${response.statusText}`
				);
			}
		} catch (error: any) {
			errors.push(`Metrics endpoint error: ${error.message}`);
			console.error('[Uptime Kuma] Metrics endpoint error:', error.message);
		}

		// Try 2: Status page endpoint (public, no auth)
		// Note: This requires a status page to be configured in Uptime Kuma
		// Common slugs: 'default', 'main', or custom slug
		const statusPageSlugs = ['default', 'main', 'status'];

		for (const slug of statusPageSlugs) {
			try {
				console.log(
					`[Uptime Kuma] Attempting status page at ${this.baseUrl}/api/status-page/${slug}`
				);
				const response = await fetch(`${this.baseUrl}/api/status-page/${slug}`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (response.ok) {
					const data = await response.json();
					console.log(`[Uptime Kuma] Status page success for slug '${slug}'`);

					// Status page response structure
					if (data.monitorList && Array.isArray(data.monitorList)) {
						monitors = this.parseMonitors(data.monitorList);
					} else if (data.monitors && Array.isArray(data.monitors)) {
						monitors = this.parseMonitors(data.monitors);
					} else if (Array.isArray(data)) {
						monitors = this.parseMonitors(data);
					}

					if (monitors.length > 0) {
						return monitors;
					}
				} else {
					errors.push(`Status page '${slug}' failed (${response.status})`);
				}
			} catch (error: any) {
				errors.push(`Status page '${slug}' error: ${error.message}`);
				console.error(`[Uptime Kuma] Status page '${slug}' error:`, error.message);
			}
		}

		// Try 3: Legacy heartbeat endpoint
		try {
			console.log(
				`[Uptime Kuma] Attempting heartbeat endpoint at ${this.baseUrl}/api/status-page/heartbeat`
			);
			const response = await fetch(`${this.baseUrl}/api/status-page/heartbeat`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				const data = await response.json();
				console.log(`[Uptime Kuma] Heartbeat endpoint success`);

				if (Array.isArray(data)) {
					monitors = this.parseMonitors(data);
				} else if (data.heartbeatList) {
					monitors = this.parseMonitors(data.heartbeatList);
				}

				if (monitors.length > 0) {
					await this.saveMonitorsToCache(monitors);
					return monitors;
				}
			} else {
				errors.push(`Heartbeat endpoint failed (${response.status})`);
			}
		} catch (error: any) {
			errors.push(`Heartbeat endpoint error: ${error.message}`);
			console.error('[Uptime Kuma] Heartbeat endpoint error:', error.message);
		}

		// If all attempts failed, try to load from database cache
		if (monitors.length === 0) {
			console.log(
				'[Uptime Kuma] All API attempts failed, attempting to load from database cache...'
			);
			try {
				monitors = await this.loadMonitorsFromCache();
				if (monitors.length > 0) {
					console.log(`[Uptime Kuma] Loaded ${monitors.length} monitors from database cache`);
					return monitors;
				}
			} catch (cacheError: any) {
				console.error('[Uptime Kuma] Failed to load from cache:', cacheError.message);
			}
		}

		// If still no monitors, throw error
		if (monitors.length === 0) {
			const errorMessage = `Failed to connect to Uptime Kuma at ${this.baseUrl}. Tried multiple endpoints:\n${errors.join('\n')}\n\nPossible solutions:\n1. Ensure UPTIME_KUMA_URL is correct\n2. If using REST API, set UPTIME_KUMA_API_KEY\n3. If using status page, ensure a status page is configured in Uptime Kuma\n4. Check if Uptime Kuma is accessible from the server`;
			console.error('[Uptime Kuma] All connection attempts failed:', errorMessage);
			throw new Error(errorMessage);
		}

		return monitors;
	}

	/**
	 * Get status for specific monitor IDs
	 * Only queries the selected monitors, not all monitors
	 */
	static async getMonitorStatus(monitorIds: number[]): Promise<UptimeKumaMonitor[]> {
		if (!this.baseUrl) {
			throw new Error('Uptime Kuma base URL not configured');
		}

		if (monitorIds.length === 0) {
			return [];
		}

		const errors: string[] = [];
		let monitors: UptimeKumaMonitor[] = [];

		// Try to fetch from API for selected monitors only
		// Try 1: REST API endpoint
		if (this.apiKey) {
			try {
				console.log(
					`[Uptime Kuma] Attempting REST API endpoint for ${monitorIds.length} selected monitors`
				);
				const authHeader = `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`;
				const response = await fetch(`${this.baseUrl}/api/monitor`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: authHeader
					}
				});

				if (response.ok) {
					const data = await response.json();
					let allMonitors: UptimeKumaMonitor[] = [];

					if (Array.isArray(data)) {
						allMonitors = this.parseRestApiMonitors(data);
					} else if (data.monitors && Array.isArray(data.monitors)) {
						allMonitors = this.parseRestApiMonitors(data.monitors);
					} else if (data.data && Array.isArray(data.data)) {
						allMonitors = this.parseRestApiMonitors(data.data);
					}

					monitors = allMonitors.filter((monitor) => monitorIds.includes(monitor.id));
					if (monitors.length > 0) {
						// Load custom names from cache and merge them
						await this.mergeCustomNames(monitors);
						await this.saveMonitorsToCache(monitors);
						return monitors;
					}
				}
			} catch (error: any) {
				errors.push(`REST API endpoint error: ${error.message}`);
			}
		}

		// Try 2: Metrics endpoint
		try {
			const headers: Record<string, string> = {
				'Content-Type': 'text/plain'
			};

			if (this.apiKey) {
				const authHeader = `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`;
				headers['Authorization'] = authHeader;
			}

			const response = await fetch(`${this.baseUrl}/metrics`, {
				method: 'GET',
				headers
			});

			if (response.ok) {
				const metricsText = await response.text();
				const allMonitors = this.parsePrometheusMetrics(metricsText);
				monitors = allMonitors.filter((monitor) => monitorIds.includes(monitor.id));
				if (monitors.length > 0) {
					// Load custom names from cache and merge them
					await this.mergeCustomNames(monitors);
					await this.saveMonitorsToCache(monitors);
					return monitors;
				}
			}
		} catch (error: any) {
			errors.push(`Metrics endpoint error: ${error.message}`);
		}

		// If API fails, try to load from cache
		try {
			const cachedMonitors = await this.loadMonitorsFromCache();
			monitors = cachedMonitors.filter((monitor) => monitorIds.includes(monitor.id));
			if (monitors.length > 0) {
				console.log(
					`[Uptime Kuma] Loaded ${monitors.length} selected monitors from database cache`
				);
				return monitors;
			}
		} catch (cacheError: any) {
			console.error('[Uptime Kuma] Failed to load from cache:', cacheError.message);
		}

		// If still no monitors, throw error
		if (monitors.length === 0) {
			throw new Error(`Failed to fetch status for selected monitors. ${errors.join('; ')}`);
		}

		return monitors;
	}

	/**
	 * Save monitors to database cache
	 * Only saves the provided monitors (selected monitors only)
	 * Removes any monitors not in the provided list
	 */
	static async saveMonitorsToCache(monitors: UptimeKumaMonitor[]): Promise<void> {
		try {
			const monitorIds = monitors.map((m) => m.id);

			// Delete monitors that are not in the new list
			if (monitorIds.length > 0) {
				await db
					.delete(uptimeKumaMonitors)
					.where(notInArray(uptimeKumaMonitors.monitorId, monitorIds));
			} else {
				// If no monitors, clear entire cache
				await db.delete(uptimeKumaMonitors);
				return;
			}

			// Insert/update the provided monitors
			for (const monitor of monitors) {
				// Get existing custom name if monitor already exists
				const existing = await db
					.select({ customName: uptimeKumaMonitors.customName })
					.from(uptimeKumaMonitors)
					.where(eq(uptimeKumaMonitors.monitorId, monitor.id))
					.limit(1);

				const existingCustomName = existing.length > 0 ? existing[0].customName : null;

				await db
					.insert(uptimeKumaMonitors)
					.values({
						monitorId: monitor.id,
						name: monitor.name,
						customName: monitor.customName || existingCustomName || null,
						url: monitor.url,
						type: monitor.type,
						status: monitor.status,
						group: monitor.group,
						uptime: monitor.uptime,
						avgResponseTime: monitor.avgResponseTime,
						lastCheck: monitor.lastCheck ? new Date(monitor.lastCheck) : null
					})
					.onConflictDoUpdate({
						target: uptimeKumaMonitors.monitorId,
						set: {
							name: monitor.name,
							// Preserve custom name if not provided in update
							customName:
								monitor.customName !== undefined ? monitor.customName : existingCustomName,
							url: monitor.url,
							type: monitor.type,
							status: monitor.status,
							group: monitor.group,
							uptime: monitor.uptime,
							avgResponseTime: monitor.avgResponseTime,
							lastCheck: monitor.lastCheck ? new Date(monitor.lastCheck) : null,
							lastUpdated: new Date()
						}
					});
			}
			console.log(`[Uptime Kuma] Saved ${monitors.length} selected monitors to database cache`);
		} catch (error: any) {
			console.error('[Uptime Kuma] Error saving monitors to cache:', error.message);
			// Don't throw - caching is optional
		}
	}

	/**
	 * Load monitors from database cache
	 */
	private static async loadMonitorsFromCache(): Promise<UptimeKumaMonitor[]> {
		try {
			const cached = await db.select().from(uptimeKumaMonitors);

			return cached.map((record) => ({
				id: record.monitorId,
				name: record.name,
				customName: record.customName || undefined,
				url: record.url || undefined,
				type: record.type,
				status: record.status as 'up' | 'down' | 'pending' | 'maintenance',
				group: record.group || undefined,
				uptime: record.uptime || undefined,
				avgResponseTime: record.avgResponseTime || undefined,
				lastCheck: record.lastCheck?.toISOString() || undefined
			}));
		} catch (error: any) {
			console.error('[Uptime Kuma] Error loading monitors from cache:', error.message);
			throw error;
		}
	}

	/**
	 * Clear all monitors from database cache
	 */
	static async clearCache(): Promise<void> {
		try {
			await db.delete(uptimeKumaMonitors);
			console.log('[Uptime Kuma] Cleared all monitors from database cache');
		} catch (error: any) {
			console.error('[Uptime Kuma] Error clearing cache:', error.message);
			throw error;
		}
	}

	/**
	 * Merge custom names from cache into monitors
	 */
	private static async mergeCustomNames(monitors: UptimeKumaMonitor[]): Promise<void> {
		try {
			const monitorIds = monitors.map((m) => m.id);
			if (monitorIds.length === 0) return;

			// Load existing custom names
			const cached = await db
				.select({
					monitorId: uptimeKumaMonitors.monitorId,
					customName: uptimeKumaMonitors.customName
				})
				.from(uptimeKumaMonitors)
				.where(inArray(uptimeKumaMonitors.monitorId, monitorIds));

			// Create a map
			const customNameMap = new Map<number, string | null>();
			for (const record of cached) {
				if (record.customName) {
					customNameMap.set(record.monitorId, record.customName);
				}
			}

			// Merge custom names into monitors
			for (const monitor of monitors) {
				if (customNameMap.has(monitor.id)) {
					monitor.customName = customNameMap.get(monitor.id) || undefined;
				}
			}
		} catch (error: any) {
			console.error('[Uptime Kuma] Error merging custom names:', error.message);
		}
	}

	/**
	 * Update custom names for monitors
	 */
	static async updateCustomNames(customNames: Record<number, string | null>): Promise<void> {
		try {
			for (const [monitorIdStr, customName] of Object.entries(customNames)) {
				const monitorId = parseInt(monitorIdStr, 10);
				if (isNaN(monitorId)) continue;

				await db
					.update(uptimeKumaMonitors)
					.set({
						customName: customName || null,
						lastUpdated: new Date()
					})
					.where(eq(uptimeKumaMonitors.monitorId, monitorId));
			}
			console.log(
				`[Uptime Kuma] Updated custom names for ${Object.keys(customNames).length} monitors`
			);
		} catch (error: any) {
			console.error('[Uptime Kuma] Error updating custom names:', error.message);
			throw error;
		}
	}

	/**
	 * Parse REST API monitor response
	 * REST API returns full monitor objects with group information
	 */
	private static parseRestApiMonitors(data: any[]): UptimeKumaMonitor[] {
		const monitors: UptimeKumaMonitor[] = [];
		const groups = new Map<number, string>(); // groupId -> groupName

		for (const item of data) {
			if (item.type === 'group' && item.id && item.name) {
				groups.set(item.id, item.name);
			}
		}

		console.log(`[Uptime Kuma] Found ${groups.size} groups in REST API response`);

		for (const item of data) {
			if (item.type === 'group') {
				continue;
			}

			if (!item.id || !item.name) {
				continue;
			}

			let status: 'up' | 'down' | 'pending' | 'maintenance' = 'pending';
			if (item.status === 1 || item.status === 'up') {
				status = 'up';
			} else if (item.status === 0 || item.status === 'down') {
				status = 'down';
			} else if (item.status === 2 || item.status === 'pending') {
				status = 'pending';
			} else if (item.status === 3 || item.status === 'maintenance') {
				status = 'maintenance';
			}

			const groupName =
				item.parentId && groups.has(item.parentId) ? groups.get(item.parentId) : undefined;

			monitors.push({
				id: item.id,
				name: item.name,
				url: item.url || undefined,
				type: item.type || 'http',
				status,
				uptime: item.uptime,
				avgResponseTime: item.avgResponseTime || item.avgPing,
				lastCheck: item.lastCheck,
				group: groupName
			});
		}

		const groupedCount = monitors.filter((m) => m.group).length;
		console.log(
			`[Uptime Kuma] Parsed ${monitors.length} monitors from REST API, ${groupedCount} with groups`
		);

		if (groupedCount === 0 && monitors.length > 0) {
			console.log(
				`[Uptime Kuma] No groups assigned from REST API, falling back to type-based grouping`
			);
			const typeMap: Record<string, string> = {
				http: 'Websites',
				https: 'Websites',
				keyword: 'Websites', // HTTP(s) - Keyword
				'json-query': 'Websites', // HTTP(s) - Json Query
				'http-keyword': 'Websites',
				'https-keyword': 'Websites',
				'http-json-query': 'Websites',
				'https-json-query': 'Websites',
				browser: 'Websites', // HTTP(s) - Browser Engine

				// Network protocols
				tcp: 'Network Services',
				udp: 'Network Services',
				ping: 'Network Services',
				port: 'Network Services',
				dns: 'DNS Services',

				// gRPC
				grpc: 'gRPC Services',
				grpcs: 'gRPC Services',
				'grpc-keyword': 'gRPC Services',
				'grpcs-keyword': 'gRPC Services',

				// Containers
				docker: 'Docker Containers',

				// Passive monitoring
				push: 'Push Monitors',

				// Game servers
				steam: 'Game Services',
				gamedig: 'Game Services',

				// Message queues
				mqtt: 'Message Queue Services',
				kafka: 'Message Queue Services',
				'kafka-producer': 'Message Queue Services',

				// Databases
				mssql: 'Database Services',
				sqlserver: 'Database Services',
				postgres: 'Database Services',
				postgresql: 'Database Services',
				mysql: 'Database Services',
				mariadb: 'Database Services',
				mongodb: 'Database Services',

				// Authentication
				radius: 'Authentication Services',

				// Cache
				redis: 'Cache Services'
			};

			for (const monitor of monitors) {
				const type = monitor.type?.toLowerCase() || 'unknown';
				monitor.group = typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
			}
			console.log(`[Uptime Kuma] Assigned all monitors to type-based groups`);
		} else if (groupedCount < monitors.length) {
			console.log(
				`[Uptime Kuma] ${monitors.length - groupedCount} monitors without groups, assigning type-based groups`
			);
			const typeMap: Record<string, string> = {
				http: 'Websites',
				https: 'Websites',
				keyword: 'Websites', // HTTP(s) - Keyword
				'json-query': 'Websites', // HTTP(s) - Json Query
				'http-keyword': 'Websites',
				'https-keyword': 'Websites',
				'http-json-query': 'Websites',
				'https-json-query': 'Websites',
				browser: 'Websites', // HTTP(s) - Browser Engine

				// Network protocols
				tcp: 'Network Services',
				udp: 'Network Services',
				ping: 'Network Services',
				port: 'Network Services',
				dns: 'DNS Services',

				// gRPC
				grpc: 'gRPC Services',
				grpcs: 'gRPC Services',
				'grpc-keyword': 'gRPC Services',
				'grpcs-keyword': 'gRPC Services',

				// Containers
				docker: 'Docker Containers',

				// Passive monitoring
				push: 'Push Monitors',

				// Game servers
				steam: 'Game Services',
				gamedig: 'Game Services',

				// Message queues
				mqtt: 'Message Queue Services',
				kafka: 'Message Queue Services',
				'kafka-producer': 'Message Queue Services',

				// Databases
				mssql: 'Database Services',
				sqlserver: 'Database Services',
				postgres: 'Database Services',
				postgresql: 'Database Services',
				mysql: 'Database Services',
				mariadb: 'Database Services',
				mongodb: 'Database Services',

				// Authentication
				radius: 'Authentication Services',

				// Cache
				redis: 'Cache Services'
			};

			for (const monitor of monitors) {
				if (!monitor.group) {
					const type = monitor.type?.toLowerCase() || 'unknown';
					monitor.group = typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
				}
			}
			console.log(`[Uptime Kuma] Assigned type-based groups to ungrouped monitors`);
		}

		return monitors;
	}

	/**
	 * Parse Prometheus metrics format
	 * Handles Uptime Kuma's format with monitor_name, monitor_type, monitor_url labels
	 * Also collects groups and tries to infer relationships
	 */
	private static parsePrometheusMetrics(metricsText: string): UptimeKumaMonitor[] {
		const monitors: UptimeKumaMonitor[] = [];
		const lines = metricsText.split('\n');

		const monitorData: Map<string, Partial<UptimeKumaMonitor>> = new Map();
		const groupNames = new Set<string>();

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (trimmedLine.startsWith('#') || !trimmedLine) continue;

			const metricMatch = trimmedLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\{([^}]+)\}\s+(.+)$/);
			if (!metricMatch) continue;

			const [, , labelsStr] = metricMatch;
			const nameMatch = labelsStr.match(/monitor_name="([^"]+)"/);
			const typeMatch = labelsStr.match(/monitor_type="([^"]+)"/);

			if (nameMatch && typeMatch && typeMatch[1] === 'group') {
				groupNames.add(nameMatch[1]);
			}
		}

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (trimmedLine.startsWith('#') || !trimmedLine) continue;

			const metricMatch = trimmedLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\{([^}]+)\}\s+(.+)$/);
			if (!metricMatch) continue;

			const [, metricName, labelsStr, valueStr] = metricMatch;

			const nameMatch = labelsStr.match(/monitor_name="([^"]+)"/);
			const typeMatch = labelsStr.match(/monitor_type="([^"]+)"/);
			const urlMatch = labelsStr.match(/monitor_url="([^"]+)"/);

			if (!nameMatch) continue;

			const monitorName = nameMatch[1];
			const monitorType = typeMatch ? typeMatch[1] : 'http';
			const monitorUrl = urlMatch ? urlMatch[1] : undefined;

			if (monitorType === 'group') {
				continue;
			}

			if (!monitorData.has(monitorName)) {
				let inferredGroup: string | undefined;

				const monitorLower = monitorName.toLowerCase();

				const sortedGroups = Array.from(groupNames).sort((a, b) => b.length - a.length);

				for (const groupName of sortedGroups) {
					const groupLower = groupName.toLowerCase();

					if (monitorLower.includes(groupLower) || groupLower.includes(monitorLower)) {
						inferredGroup = groupName;
						break;
					}

					const groupWords = groupLower.split(/\s+/);
					const monitorWords = monitorLower.split(/\s+/);

					if (
						groupWords.some((word) => {
							if (word.length <= 2) return false;
							return monitorWords.some((mw) => {
								// Direct match
								if (mw.includes(word) || word.includes(mw)) return true;
								// Singular/plural variations
								if (word.endsWith('s') && mw === word.slice(0, -1)) return true;
								if (mw.endsWith('s') && word === mw.slice(0, -1)) return true;
								// Check if monitor word contains group word (e.g., "website" in "portainer (website)")
								if (mw.includes(word)) return true;
								return false;
							});
						})
					) {
						inferredGroup = groupName;
						break;
					}
				}

				monitorData.set(monitorName, {
					id: monitorData.size + 1,
					name: monitorName,
					url: monitorUrl === 'null' || monitorUrl === 'https://' ? undefined : monitorUrl,
					type: monitorType === 'null' ? 'http' : monitorType,
					status: 'pending',
					group: inferredGroup
				});
			}

			const monitor = monitorData.get(monitorName)!;

			// Parse monitor_status metric (1=UP, 0=DOWN, 2=PENDING, 3=MAINTENANCE)
			if (metricName === 'monitor_status') {
				const value = parseInt(valueStr);
				if (value === 1) {
					monitor.status = 'up';
				} else if (value === 0) {
					monitor.status = 'down';
				} else if (value === 2) {
					monitor.status = 'pending';
				} else if (value === 3) {
					monitor.status = 'maintenance';
				}
			}

			// Parse monitor_response_time in milliseconds
			if (metricName === 'monitor_response_time') {
				const value = parseFloat(valueStr);
				if (!isNaN(value) && value >= 0) {
					monitor.avgResponseTime = value;
				}
			}
		}

		// Convert map to array and ensure all required fields
		let idCounter = 1;
		for (const [name, data] of monitorData) {
			if (data.status) {
				monitors.push({
					id: data.id || idCounter++,
					name: data.name || name,
					url: data.url,
					type: data.type || 'http',
					status: data.status,
					uptime: data.uptime,
					avgResponseTime: data.avgResponseTime,
					group: data.group
				});
			}
		}

		console.log(`[Uptime Kuma] Parsed ${monitors.length} monitors from metrics`);
		console.log(`[Uptime Kuma] Found ${groupNames.size} groups:`, Array.from(groupNames));
		const groupedCount = monitors.filter((m) => m.group).length;
		console.log(`[Uptime Kuma] ${groupedCount} monitors assigned to groups`);

		if (groupedCount === 0 && monitors.length > 0) {
			console.log(`[Uptime Kuma] No groups assigned, falling back to type-based grouping`);
			const typeMap: Record<string, string> = {
				http: 'Websites',
				https: 'Websites',
				keyword: 'Websites', // HTTP(s) - Keyword
				'json-query': 'Websites', // HTTP(s) - Json Query
				'http-keyword': 'Websites',
				'https-keyword': 'Websites',
				'http-json-query': 'Websites',
				'https-json-query': 'Websites',
				browser: 'Websites', // HTTP(s) - Browser Engine

				// Network protocols
				tcp: 'Network Services',
				udp: 'Network Services',
				ping: 'Network Services',
				port: 'Network Services',
				dns: 'DNS Services',

				// gRPC
				grpc: 'gRPC Services',
				grpcs: 'gRPC Services',
				'grpc-keyword': 'gRPC Services',
				'grpcs-keyword': 'gRPC Services',

				// Containers
				docker: 'Docker Containers',

				// Passive monitoring
				push: 'Push Monitors',

				// Game servers
				steam: 'Game Services',
				gamedig: 'Game Services',

				// Message queues
				mqtt: 'Message Queue Services',
				kafka: 'Message Queue Services',
				'kafka-producer': 'Message Queue Services',

				// Databases
				mssql: 'Database Services',
				sqlserver: 'Database Services',
				postgres: 'Database Services',
				postgresql: 'Database Services',
				mysql: 'Database Services',
				mariadb: 'Database Services',
				mongodb: 'Database Services',

				// Authentication
				radius: 'Authentication Services',

				// Cache
				redis: 'Cache Services'
			};

			for (const monitor of monitors) {
				const type = monitor.type?.toLowerCase() || 'unknown';
				monitor.group = typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
			}
			console.log(`[Uptime Kuma] Assigned all monitors to type-based groups`);
		} else if (groupedCount < monitors.length) {
			console.log(
				`[Uptime Kuma] ${monitors.length - groupedCount} monitors without groups, assigning type-based groups`
			);
			const typeMap: Record<string, string> = {
				http: 'Websites',
				https: 'Websites',
				keyword: 'Websites', // HTTP(s) - Keyword
				'json-query': 'Websites', // HTTP(s) - Json Query
				'http-keyword': 'Websites',
				'https-keyword': 'Websites',
				'http-json-query': 'Websites',
				'https-json-query': 'Websites',
				browser: 'Websites', // HTTP(s) - Browser Engine

				// Network protocols
				tcp: 'Network Services',
				udp: 'Network Services',
				ping: 'Network Services',
				port: 'Network Services',
				dns: 'DNS Services',

				// gRPC
				grpc: 'gRPC Services',
				grpcs: 'gRPC Services',
				'grpc-keyword': 'gRPC Services',
				'grpcs-keyword': 'gRPC Services',

				// Containers
				docker: 'Docker Containers',

				// Passive monitoring
				push: 'Push Monitors',

				// Game servers
				steam: 'Game Services',
				gamedig: 'Game Services',

				// Message queues
				mqtt: 'Message Queue Services',
				kafka: 'Message Queue Services',
				'kafka-producer': 'Message Queue Services',

				// Databases
				mssql: 'Database Services',
				sqlserver: 'Database Services',
				postgres: 'Database Services',
				postgresql: 'Database Services',
				mysql: 'Database Services',
				mariadb: 'Database Services',
				mongodb: 'Database Services',

				// Authentication
				radius: 'Authentication Services',

				// Cache
				redis: 'Cache Services'
			};

			for (const monitor of monitors) {
				if (!monitor.group) {
					const type = monitor.type?.toLowerCase() || 'unknown';
					monitor.group = typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
				}
			}
			console.log(`[Uptime Kuma] Assigned type-based groups to ungrouped monitors`);
		}

		return monitors;
	}

	/**
	 * Parse monitor data from Uptime Kuma API response
	 */
	private static parseMonitors(data: any[]): UptimeKumaMonitor[] {
		return data.map((item: any) => {
			const monitor: UptimeKumaMonitor = {
				id: item.id || item.monitorId || item.monitor?.id,
				name: item.name || item.monitor?.name || 'Unknown',
				url: item.url || item.monitor?.url,
				type: item.type || item.monitor?.type || 'http',
				status: this.parseStatus(item.status || item.up || item.monitor?.status),
				uptime: item.uptime || item.monitor?.uptime,
				avgResponseTime:
					item.avgResponseTime || item.avg_response_time || item.monitor?.avgResponseTime,
				lastCheck: item.lastCheck || item.last_check || item.monitor?.lastCheck
			};

			return monitor;
		});
	}

	/**
	 * Parse status value to standard format
	 */
	private static parseStatus(status: any): 'up' | 'down' | 'pending' | 'maintenance' {
		if (typeof status === 'boolean') {
			return status ? 'up' : 'down';
		}

		const statusStr = String(status).toLowerCase();

		if (statusStr === 'up' || statusStr === 'online' || statusStr === '1' || statusStr === 'true') {
			return 'up';
		} else if (
			statusStr === 'down' ||
			statusStr === 'offline' ||
			statusStr === '0' ||
			statusStr === 'false'
		) {
			return 'down';
		} else if (statusStr === 'maintenance' || statusStr === 'maintaining') {
			return 'maintenance';
		}

		return 'pending';
	}

	/**
	 * Get monitor by ID
	 */
	static async getMonitorById(id: number): Promise<UptimeKumaMonitor | null> {
		try {
			const monitors = await this.getAllMonitors();
			return monitors.find((m) => m.id === id) || null;
		} catch (error) {
			console.error('Error fetching monitor by ID:', error);
			return null;
		}
	}

	/**
	 * Test connection to Uptime Kuma instance
	 * Returns true if connection is successful, false otherwise
	 */
	static async testConnection(): Promise<{ connected: boolean; message: string }> {
		if (!this.baseUrl) {
			return {
				connected: false,
				message: 'Uptime Kuma URL not configured'
			};
		}

		try {
			const response = await fetch(`${this.baseUrl}/metrics`, {
				method: 'GET',
				headers: {
					Accept: 'text/plain'
				},
				signal: AbortSignal.timeout(5000) // 5 second timeout
			});

			if (response.ok || response.status === 401 || response.status === 403) {
				// 401/403 means the server is reachable, just needs auth
				return {
					connected: true,
					message: 'Connected successfully'
				};
			}

			return {
				connected: false,
				message: `Connection failed: ${response.status} ${response.statusText}`
			};
		} catch (error: any) {
			if (this.apiKey) {
				try {
					const authHeader = `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`;
					const response = await fetch(`${this.baseUrl}/api/monitor`, {
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							Authorization: authHeader
						},
						signal: AbortSignal.timeout(5000)
					});

					if (response.ok) {
						return {
							connected: true,
							message: 'Connected successfully (REST API)'
						};
					}

					return {
						connected: false,
						message: `REST API connection failed: ${response.status} ${response.statusText}`
					};
				} catch (apiError: any) {
					return {
						connected: false,
						message: `Connection error: ${apiError.message || 'Unable to reach Uptime Kuma instance'}`
					};
				}
			}

			return {
				connected: false,
				message: `Connection error: ${error.message || 'Unable to reach Uptime Kuma instance'}`
			};
		}
	}
}
