import { logger } from '../utils/logger';
import { getNotificationSettings } from './notificationSettings';
import { buildNtfyPublishHeaders, type NtfyEventAppearance } from './ntfyPublish';
/**
 * Notification service for sending alerts via Ntfy
 * Documentation: https://docs.ntfy.sh/publish/
 */

/** Valid ntfy topic names: a-z, A-Z, 0-9, _, - (no dots). */
const NTFY_TOPIC_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

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
	 * Send a notification using a full ntfy appearance preset.
	 */
	static async sendWithAppearance(
		message: string,
		appearance: NtfyEventAppearance,
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
				...buildNtfyPublishHeaders(appearance),
				...this.buildAuthHeaders()
			};

			const response = await fetch(url, {
				method: 'POST',
				headers,
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
	 * @deprecated Prefer sendWithAppearance. Legacy positional args for manual API.
	 */
	static async send(
		message: string,
		title?: string,
		priority: number = 3,
		tags?: string[],
		topic?: string
	): Promise<boolean> {
		return this.sendWithAppearance(
			message,
			{
				title: title || 'Notification',
				priority,
				tags: tags ?? [],
				markdown: false,
				click: '',
				icon: ''
			},
			topic
		);
	}

	static isConfigured(): boolean {
		return !!process.env.NTFY_TOPIC;
	}

	static notifyAdminLoginLockout(
		ip: string,
		attemptCount: number,
		lockoutMinutes = 15,
		username?: string
	): void {
		if (!this.isConfigured()) return;

		void getNotificationSettings().then((settings) => {
			if (settings.adminLogin.failedMode === 'off') return;

			const { lockout } = settings.adminLogin;
			const userLine = username ? `Username: ${username}\n` : '';

			void this.sendWithAppearance(
				`IP ${ip} was locked out after ${attemptCount} failed admin login attempts.\n` +
					userLine +
					`Lockout: ${lockoutMinutes} minutes.\n` +
					`Time: ${new Date().toISOString()}`,
				lockout
			);
		});
	}

	static notifyAdminLoginFailed(
		ip: string,
		attemptCount: number,
		maxAttempts: number,
		username?: string
	): void {
		if (!this.isConfigured()) return;

		void getNotificationSettings().then((settings) => {
			if (settings.adminLogin.failedMode !== 'each') return;

			const { failed } = settings.adminLogin;
			const userLine = username ? `Username: ${username}\n` : 'Username: (unknown)\n';

			void this.sendWithAppearance(
				`Failed admin login attempt ${attemptCount}/${maxAttempts}.\n` +
					userLine +
					`IP: ${ip}\n` +
					`Time: ${new Date().toISOString()}`,
				failed
			);
		});
	}

	static notifyAdminLoginSuccess(
		username: string,
		ip: string,
		options?: { totpUsed?: boolean }
	): void {
		if (!this.isConfigured()) return;

		void getNotificationSettings().then((settings) => {
			if (!settings.adminLogin.successEnabled) return;

			const { success } = settings.adminLogin;
			const totpLine = options?.totpUsed ? '2FA: yes' : '2FA: no';

			void this.sendWithAppearance(
				`User ${username} signed in to the admin panel.\n` +
					`${totpLine}\n` +
					`IP: ${ip}\n` +
					`Time: ${new Date().toISOString()}`,
				success
			);
		});
	}

	static async sendTestNotification(message: string): Promise<boolean> {
		if (!this.isConfigured()) return false;

		const settings = await getNotificationSettings();
		return this.sendWithAppearance(message, settings.test);
	}
}
