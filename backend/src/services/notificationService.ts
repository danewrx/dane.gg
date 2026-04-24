import { logger } from '../utils/logger';
/**
 * Notification service for sending alerts via Ntfy
 * Ntfy is a simple HTTP-based notification service
 * Documentation: https://docs.ntfy.sh/
 */

export class NotificationService {
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

			const ntfyUrl = process.env.NTFY_URL || 'https://ntfy.sh';
			const url = `${ntfyUrl}/${finalTopic}`;

			const headers: Record<string, string> = {
				'Content-Type': 'text/plain'
			};

			if (title) {
				headers['Title'] = title;
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
				logger.error(
					`Failed to send notification: ${response.status} ${response.statusText}`
				);
				return false;
			}

			logger.info(`${finalTopic}`);
			return true;
		} catch (error: any) {
			logger.error('Error sending notification:', error.message);
			return false;
		}
	}

	/**
	 * Check if Ntfy is configured
	 */
	static isConfigured(): boolean {
		return !!process.env.NTFY_TOPIC;
	}
}
