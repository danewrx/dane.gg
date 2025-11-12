/**
 * Notification service for sending alerts via Ntfy
 * Ntfy is a simple HTTP-based notification service
 * Documentation: https://docs.ntfy.sh/
 */

export class NotificationService {
  /**
   * Send a notification to Ntfy
   * @param topic - Ntfy topic (channel) to send to
   * @param message - Message to send
   * @param title - Optional title
   * @param priority - Priority level (1-5, default: 3)
   * @param tags - Optional tags
   */
  static async sendNotification(
    topic: string,
    message: string,
    title?: string,
    priority: number = 3,
    tags?: string[]
  ): Promise<boolean> {
    try {
      const ntfyUrl = process.env.NTFY_URL || 'https://ntfy.sh';
      const url = `${ntfyUrl}/${topic}`;

      const payload: any = {
        message,
        priority,
      };

      if (title) {
        payload.title = title;
      }

      if (tags && tags.length > 0) {
        payload.tags = tags;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`[Notification] Failed to send notification: ${response.status} ${response.statusText}`);
        return false;
      }

      console.log(`[Notification] Notification sent successfully to topic: ${topic}`);
      return true;
    } catch (error: any) {
      console.error('[Notification] Error sending notification:', error.message);
      return false;
    }
  }

  /**
   * Send a Twitter API connection failure notification
   */
  static async sendTwitterConnectionFailure(error: string): Promise<boolean> {
    const topic = process.env.NTFY_TOPIC;
    if (!topic) {
      console.log('[Notification] NTFY_TOPIC not configured, skipping notification');
      return false;
    }

    return this.sendNotification(
      topic,
      `Twitter API connection failed: ${error}\n\nTime: ${new Date().toISOString()}`,
      '⚠️ Twitter API Connection Failed',
      4, // High priority
      ['warning', 'twitter', 'api']
    );
  }

  /**
   * Send a Twitter API connection restored notification
   */
  static async sendTwitterConnectionRestored(): Promise<boolean> {
    const topic = process.env.NTFY_TOPIC;
    if (!topic) {
      return false;
    }

    return this.sendNotification(
      topic,
      `Twitter API connection has been restored.\n\nTime: ${new Date().toISOString()}`,
      '✅ Twitter API Connection Restored',
      2, // Low priority
      ['success', 'twitter', 'api']
    );
  }

  /**
   * Check if Ntfy is configured
   */
  static isConfigured(): boolean {
    return !!process.env.NTFY_TOPIC;
  }
}

