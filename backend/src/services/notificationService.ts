import { logger } from '../utils/logger';
/**
 * Notification service for sending alerts via Ntfy
 * Ntfy is a simple HTTP-based notification service
 * Documentation: https://docs.ntfy.sh/
 */

/** Valid ntfy topic names: a-z, A-Z, 0-9, _, - (no dots). */
const NTFY_TOPIC_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

function sanitizeNtfyHeaderValue(value: string, maxLength = 200): string {
	const ascii = value
		.replaceAll(/[^\x20-\x7E]/g, '')
		.replaceAll(/\s+/g, ' ')
		.trim();
	return (ascii.slice(0, maxLength) || 'Notification').trim();
}

export class NotificationService {
	private static buildAuthHeaders(): Record<string, string> {
		const token = process.env.NTFY_TOKEN?.trim();
		if (token) {
			return { Authorization: `Bearer ${token}` };
		}

		const username = process.env.NTFY_USERNAME?.trim();
		const password = process.env.NTFY_PASSWORD;
		if (username && password !== undefined && password !== '') {
			const encoded = Buffer.from(`${username}:${password}`).toString('base64');
			return { Authorization: `Basic ${encoded}` };
		}

		return {};
	}

	static hasAuthConfigured(): boolean {
		return Object.keys(this.buildAuthHeaders()).length > 0;
	}

	/**
	 * Send a notification to Ntfy
	 * @param message - Message to send
	 * @param title - Optional title
	 * @param priority - Priority level (1-5, default: 3)
	 * @param tags - Optional tags
	 * @param topic - Optional topic (defaults to NTFY_TOPIC env var)
	 */
	static async send(
		message: string,
		title?: string,
		priority: number = 3,
		tags?: string[],
		topic?: string
	): Promise<boolean> {
		try {
			const finalTopic = topic || process.env.NTFY_TOPIC;
			if (!finalTopic) {
				logger.warn('No topic provided and NTFY_TOPIC not configured');
				return false;
			}

			if (!NTFY_TOPIC_PATTERN.test(finalTopic)) {
				logger.warn(
					`NTFY_TOPIC "${finalTopic}" contains invalid characters (use a-z, A-Z, 0-9, _, - only; dots are not allowed)`
				);
			}

			const ntfyUrl = (process.env.NTFY_URL || 'https://ntfy.sh').replace(/\/$/, '');
			const url = `${ntfyUrl}/${encodeURIComponent(finalTopic)}`;

			const headers: Record<string, string> = {
				'Content-Type': 'text/plain',
				...this.buildAuthHeaders()
			};

			if (title) {
				headers['Title'] = sanitizeNtfyHeaderValue(title);
			}

			if (priority) {
				headers['Priority'] = priority.toString();
			}

			if (tags && tags.length > 0) {
				headers['Tags'] = tags.join(',');
			}

			const response = await fetch(url, {
				method: 'POST',
				headers: headers,
				body: message
			});

			if (!response.ok) {
				const detail = await response.text().catch(() => '');
				const hint =
					response.status === 403 && !this.hasAuthConfigured()
						? ' (topic may require NTFY_TOKEN or NTFY_USERNAME/NTFY_PASSWORD)'
						: '';
				logger.error(
					`Failed to send notification to ${url}: ${response.status} ${response.statusText}${hint}` +
						(detail ? ` — ${detail.trim()}` : '')
				);
				return false;
			}

			logger.info(`Notification sent to topic ${finalTopic}`);
			return true;
		} catch (error: unknown) {
			const messageText = error instanceof Error ? error.message : String(error);
			logger.error('Error sending notification:', messageText);
			return false;
		}
	}

	/**
	 * Check if Ntfy is configured
	 */
	static isConfigured(): boolean {
		return !!process.env.NTFY_TOPIC;
	}

	/** Push alert when an IP is brute-force locked out of admin login. */
	static notifyAdminLoginLockout(
		ip: string,
		attemptCount: number,
		lockoutMinutes = 15,
		username?: string
	): void {
		if (!this.isConfigured()) return;

		const userLine = username ? `Username: ${username}\n` : '';

		void this.send(
			`IP ${ip} was locked out after ${attemptCount} failed admin login attempts.\n` +
				userLine +
				`Lockout: ${lockoutMinutes} minutes.\n` +
				`Time: ${new Date().toISOString()}`,
			'Admin login lockout',
			4,
			['warning', 'security', 'auth', 'admin']
		);
	}

	/** Push alert on a failed admin login attempt */
	static notifyAdminLoginFailed(
		ip: string,
		attemptCount: number,
		maxAttempts: number,
		username?: string
	): void {
		if (!this.isConfigured()) return;

		const mode = (process.env.ADMIN_LOGIN_NOTIFY_FAILED || 'lockout').trim().toLowerCase();
		if (mode !== 'each') return;

		const userLine = username ? `Username: ${username}\n` : 'Username: (unknown)\n';

		void this.send(
			`Failed admin login attempt ${attemptCount}/${maxAttempts}.\n` +
				userLine +
				`IP: ${ip}\n` +
				`Time: ${new Date().toISOString()}`,
			'Admin login failed',
			3,
			['warning', 'security', 'auth', 'admin']
		);
	}

	/** Push alert when a user completes admin login */
	static notifyAdminLoginSuccess(
		username: string,
		ip: string,
		options?: { totpUsed?: boolean }
	): void {
		if (!this.isConfigured()) return;

		const totpLine = options?.totpUsed ? '2FA: yes' : '2FA: no';

		void this.send(
			`User ${username} signed in to the admin panel.\n` +
				`${totpLine}\n` +
				`IP: ${ip}\n` +
				`Time: ${new Date().toISOString()}`,
			'Admin login',
			3,
			['success', 'security', 'auth', 'admin']
		);
	}
}
