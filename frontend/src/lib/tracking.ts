import { logger } from '$lib/logger';
class TrackingService {
	private static instance: TrackingService;
	private visitorId: string | null = null;
	private sessionId: string | null = null;

	static getInstance(): TrackingService {
		if (!TrackingService.instance) {
			TrackingService.instance = new TrackingService();
		}
		return TrackingService.instance;
	}

	private generateId(): string {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			const r = (Math.random() * 16) | 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}

	private getVisitorId(): string {
		if (!this.visitorId) {
			this.visitorId = localStorage.getItem('visitor_id');
			if (!this.visitorId) {
				this.visitorId = this.generateId();
				localStorage.setItem('visitor_id', this.visitorId);
			}
		}
		return this.visitorId;
	}

	private getSessionId(): string {
		if (!this.sessionId) {
			this.sessionId = sessionStorage.getItem('session_id');
			if (!this.sessionId) {
				this.sessionId = this.generateId();
				sessionStorage.setItem('session_id', this.sessionId);
			}
		}
		return this.sessionId;
	}

	private shouldTrackPath(path: string): boolean {
		// Skip tracking for admin pages + api routes
		if (path.startsWith('/admin') || path.startsWith('/login') || path.startsWith('/logout')) {
			logger.info('Path excluded (admin):', path);
			return false;
		}

		// Skip API routes
		if (
			path.startsWith('/api/') ||
			path.startsWith('/latest-tweet') ||
			path.startsWith('/nowplaying') ||
			path.startsWith('/discord-status') ||
			path.startsWith('/social-links') ||
			path.startsWith('/widgets/') ||
			path.startsWith('/webhooks/')
		) {
			logger.info('Path excluded (API):', path);
			return false;
		}

		// Skip system routes
		if (
			path.startsWith('/_app/') ||
			path.startsWith('/_svelte/') ||
			path.startsWith('/favicon') ||
			path.startsWith('/robots') ||
			path.startsWith('/assets/') ||
			path.startsWith('/static/')
		) {
			logger.info('Path excluded (system):', path);
			return false;
		}

		logger.info('Path allowed:', path);
		return true;
	}

	async trackPageView(path: string, statusCode: number = 200): Promise<void> {
		logger.info('trackPageView called for path:', path);

		// Check paths to be tracked
		if (!this.shouldTrackPath(path)) {
			logger.info('Path excluded by shouldTrackPath:', path);
			return;
		}

		logger.info('Sending fetch request for path:', path);

		try {
			const response = await fetch('/api/track', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					path,
					method: 'GET',
					statusCode,
					responseTime: 0,
					contentLength: 0
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				logger.error(
					'Failed to track page view (response not ok):',
					response.status,
					errorData
				);
			} else {
				logger.info('Page view tracked successfully for path:', path);
			}
		} catch (error) {
			logger.error('Failed to track page view (fetch error):', error);
		}
	}
}

export const trackingService = TrackingService.getInstance();
