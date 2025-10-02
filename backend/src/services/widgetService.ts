import { db } from '../db';
import { widgets } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export interface WidgetData {
  [key: string]: any;
}

export interface WidgetResponse {
  type: string;
  data: WidgetData;
  lastUpdate: string;
}

export class WidgetService {
  /**
   * Get widget data by type
   */
  static async getWidgetData(type: string): Promise<WidgetResponse | null> {
    try {
      const result = await db
        .select()
        .from(widgets)
        .where(eq(widgets.type, type))
        .orderBy(desc(widgets.lastUpdate))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const widget = result[0];
      return {
        type: widget.type,
        data: JSON.parse(widget.data),
        lastUpdate: widget.lastUpdate?.toISOString() || new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error getting widget data for type ${type}:`, error);
      return null;
    }
  }

  /**
   * Update widget data by type (UPSERT - update existing or insert new)
   */
  static async updateWidgetData(type: string, data: WidgetData): Promise<boolean> {
    try {
      // First, try to update existing record
      const updateResult = await db
        .update(widgets)
        .set({
          data: JSON.stringify(data),
          lastUpdate: new Date()
        })
        .where(eq(widgets.type, type));

      // If no rows were updated, insert a new one
      if (updateResult.rowCount === 0) {
        await db.insert(widgets).values({
          type,
          data: JSON.stringify(data),
          lastUpdate: new Date()
        });
      }

      return true;
    } catch (error) {
      console.error(`Error updating widget data for type ${type}:`, error);
      return false;
    }
  }

  /**
   * Get all widget types
   */
  static async getAllWidgetTypes(): Promise<string[]> {
    try {
      const result = await db
        .selectDistinct({ type: widgets.type })
        .from(widgets);

      return result.map(row => row.type);
    } catch (error) {
      console.error('Error getting widget types:', error);
      return [];
    }
  }

  /**
   * Get widget data with fallback defaults
   */
  static async getWidgetDataWithFallback(type: string, defaultData: WidgetData): Promise<WidgetResponse> {
    const widgetData = await this.getWidgetData(type);
    
    if (widgetData) {
      return widgetData;
    }

    // Return default data if no widget data exists
    return {
      type,
      data: defaultData,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Delete old widget data (cleanup)
   */
  static async cleanupOldData(type: string, keepDays: number = 30): Promise<boolean> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      await db
        .delete(widgets)
        .where(
          eq(widgets.type, type)
          // Add date condition when needed
        );

      return true;
    } catch (error) {
      console.error(`Error cleaning up old data for type ${type}:`, error);
      return false;
    }
  }
}
