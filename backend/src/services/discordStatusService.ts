import { WidgetService } from './widgetService';

export interface DiscordStatusData {
  status: number;
  lastUpdate: string;
}

export class DiscordStatusService {
  private static readonly WIDGET_TYPE = 'discord_status';

  /**
   * Get the current Discord status
   */
  static async getCurrentStatus(): Promise<DiscordStatusData> {
    try {
      const defaultData = {
        status: 0,
        lastUpdate: new Date().toISOString()
      };

      const widgetData = await WidgetService.getWidgetDataWithFallback(
        this.WIDGET_TYPE,
        defaultData
      );

      return {
        status: widgetData.data.status,
        lastUpdate: widgetData.lastUpdate
      };
    } catch (error) {
      console.error('Error getting Discord status:', error);
      // Return default offline status on error
      return {
        status: 0,
        lastUpdate: new Date().toISOString()
      };
    }
  }

  /**
   * Update Discord status
   */
  static async updateStatus(status: number): Promise<boolean> {
    try {
      // Validate status value
      if (typeof status !== 'number' || ![0, 1].includes(status)) {
        throw new Error('Status must be 0 (offline) or 1 (online)');
      }

      const data = {
        status,
        lastUpdate: new Date().toISOString()
      };

      return await WidgetService.updateWidgetData(this.WIDGET_TYPE, data);
    } catch (error) {
      console.error('Error updating Discord status:', error);
      return false;
    }
  }

  /**
   * Get status history (optional, for future use)
   */
  static async getStatusHistory(limit: number = 10): Promise<DiscordStatusData[]> {
    try {
      // This would require a more complex query to get history
      // For now, return current status as single item
      const currentStatus = await this.getCurrentStatus();
      return [currentStatus];
    } catch (error) {
      console.error('Error getting Discord status history:', error);
      return [];
    }
  }
}
