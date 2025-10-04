import { db } from '../db';
import { socialLinks, type SocialLink, type NewSocialLink } from '../db/schema';
import { eq, asc } from 'drizzle-orm';

export class SocialLinksService {
  // Get active social links (ordered by display order)
  static async getAll(): Promise<SocialLink[]> {
    try {
      const links = await db
        .select()
        .from(socialLinks)
        .where(eq(socialLinks.isActive, true))
        .orderBy(asc(socialLinks.displayOrder));

      return links;
    } catch (error) {
      console.error('❌ SocialLinksService.getAll error:', error);
      throw new Error('Failed to fetch social links');
    }
  }

  // Get all social links for admin
  static async getAllForAdmin(): Promise<SocialLink[]> {
    try {
      const links = await db
        .select()
        .from(socialLinks)
        .orderBy(asc(socialLinks.displayOrder));

      return links;
    } catch (error) {
      console.error('❌ SocialLinksService.getAllForAdmin error:', error);
      throw new Error('Failed to fetch social links for admin');
    }
  }

  // Get a single social link by ID
  static async getById(id: string): Promise<SocialLink | null> {
    try {
      const [link] = await db
        .select()
        .from(socialLinks)
        .where(eq(socialLinks.id, id))
        .limit(1);

      return link || null;
    } catch (error) {
      console.error('❌ SocialLinksService.getById error:', error);
      throw new Error('Failed to fetch social link');
    }
  }

  // Create a new social link
  static async create(data: NewSocialLink): Promise<SocialLink> {
    try {
      const [link] = await db
        .insert(socialLinks)
        .values(data)
        .returning();

      return link;
    } catch (error) {
      console.error('❌ SocialLinksService.create error:', error);
      throw new Error('Failed to create social link');
    }
  }

  // Update a social link
  static async update(id: string, data: Partial<NewSocialLink>): Promise<SocialLink> {
    try {
      const [link] = await db
        .update(socialLinks)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(socialLinks.id, id))
        .returning();

      if (!link) {
        throw new Error('Social link not found');
      }

      return link;
    } catch (error) {
      console.error('❌ SocialLinksService.update error:', error);
      throw new Error('Failed to update social link');
    }
  }

  // Delete a social link
  static async delete(id: string): Promise<boolean> {
    try {
      const existingLink = await this.getById(id);
      if (!existingLink) {
        return false;
      }
      
      await db
        .delete(socialLinks)
        .where(eq(socialLinks.id, id));
      
      const deletedLink = await this.getById(id);
      if (deletedLink) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ SocialLinksService.delete error:', error);
      throw new Error('Failed to delete social link');
    }
  }

  // Toggle active status
  static async toggleActive(id: string): Promise<SocialLink> {
    try {
      const link = await this.getById(id);
      if (!link) {
        throw new Error('Social link not found');
      }

      const [updatedLink] = await db
        .update(socialLinks)
        .set({ 
          isActive: !link.isActive,
          updatedAt: new Date()
        })
        .where(eq(socialLinks.id, id))
        .returning();

      return updatedLink;
    } catch (error) {
      console.error('❌ SocialLinksService.toggleActive error:', error);
      throw new Error('Failed to toggle social link status');
    }
  }

  // Update display order
  static async updateDisplayOrder(updates: { id: string; displayOrder: number }[]): Promise<void> {
    try {
      for (const update of updates) {
        await db
          .update(socialLinks)
          .set({ 
            displayOrder: update.displayOrder,
            updatedAt: new Date()
          })
          .where(eq(socialLinks.id, update.id));
      }
    } catch (error) {
      console.error('❌ SocialLinksService.updateDisplayOrder error:', error);
      throw new Error('Failed to update display order');
    }
  }
}
