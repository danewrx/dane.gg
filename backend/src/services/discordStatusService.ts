import { db } from '../db';
import { discordStatus, type DiscordStatus, type NewDiscordStatus } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export class DiscordStatusService {
  /**
   * Get current Discord status
   */
  static async getCurrentStatus(): Promise<DiscordStatus | null> {
    try {
      const latestStatus = await db
        .select()
        .from(discordStatus)
        .orderBy(desc(discordStatus.lastUpdate))
        .limit(1);

      return latestStatus[0] || null;
    } catch (error) {
      console.error('Error fetching Discord status:', error);
      return null;
    }
  }

  /**
   * Update Discord status
   */
  static async updateStatus(status: number): Promise<boolean> {
    try {
      // Validate status value
      if (![0, 1].includes(status)) {
        throw new Error('Invalid status value. Must be 0 (offline) or 1 (online)');
      }

      const currentStatus = await this.getCurrentStatus();
      
      if (currentStatus && currentStatus.status === status) {
        await db
          .update(discordStatus)
          .set({ lastUpdate: new Date() })
          .where(eq(discordStatus.id, currentStatus.id));
      } else {
        const newStatus: NewDiscordStatus = {
          status,
          lastUpdate: new Date()
        };
        
        await db.insert(discordStatus).values(newStatus);
      }

      console.log(`Discord status updated: ${status === 1 ? 'online' : 'offline'}`);
      
      // Clean up old records after each update
      await this.cleanupOldRecords();
      
      return true;
    } catch (error) {
      console.error('Error updating Discord status:', error);
      return false;
    }
  }

  /**
   * Get status history (for admin purposes)
   */
  static async getStatusHistory(limit: number = 50): Promise<DiscordStatus[]> {
    try {
      return await db
        .select()
        .from(discordStatus)
        .orderBy(desc(discordStatus.lastUpdate))
        .limit(limit);
    } catch (error) {
      console.error('Error fetching Discord status history:', error);
      return [];
    }
  }

  /**
   * Get status count
   */
  static async getStatusCount(): Promise<number> {
    try {
      const result = await db
        .select({ count: discordStatus.id })
        .from(discordStatus);
      
      return result.length;
    } catch (error) {
      console.error('Error getting Discord status count:', error);
      return 0;
    }
  }

  /**
   * Clean up old status records (keep only last 30)
   */
  static async cleanupOldRecords(): Promise<boolean> {
    try {
      // Get all records ordered by lastUpdate
      const allRecords = await db
        .select({ id: discordStatus.id })
        .from(discordStatus)
        .orderBy(desc(discordStatus.lastUpdate));

      // If we have more than 30 records, delete the oldest ones
      if (allRecords.length > 30) {
        const recordsToDelete = allRecords.slice(30);
        const idsToDelete = recordsToDelete.map(record => record.id);

        // Delete all old records at once
        for (const id of idsToDelete) {
          await db
            .delete(discordStatus)
            .where(eq(discordStatus.id, id));
        }

        console.log(`Cleaned up ${recordsToDelete.length} old Discord status records (kept last 30)`);
      }

      return true;
    } catch (error) {
      console.error('Error cleaning up Discord status records:', error);
      return false;
    }
  }
}