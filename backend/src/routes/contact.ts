import { Router } from 'express';
import { db } from '../db';
import { contactEmails, contactPageSettings } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ============================================
// Contact Emails Routes
// ============================================

// GET all contact emails (public - only active)
router.get('/emails', async (req, res) => {
	try {
		const emails = await db
			.select()
			.from(contactEmails)
			.where(eq(contactEmails.isActive, true))
			.orderBy(asc(contactEmails.displayOrder));

		res.json({
			success: true,
			data: emails
		});
	} catch (error) {
		console.error('Error fetching contact emails:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch contact emails'
		});
	}
});

// GET all contact emails (admin - including inactive)
router.get('/emails/all', requireAuth, async (req, res) => {
	try {
		const emails = await db.select().from(contactEmails).orderBy(asc(contactEmails.displayOrder));

		res.json({
			success: true,
			data: emails
		});
	} catch (error) {
		console.error('Error fetching contact emails:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch contact emails'
		});
	}
});

// POST create new contact email
router.post('/emails', requireAuth, async (req, res) => {
	try {
		const { description, email, isActive } = req.body;

		if (!description || !email) {
			return res.status(400).json({
				success: false,
				error: 'Description and email are required'
			});
		}

		// Get max display order
		const allEmails = await db.select().from(contactEmails);
		const maxOrder = allEmails.reduce((max, e) => Math.max(max, e.displayOrder), -1);

		const [newEmail] = await db
			.insert(contactEmails)
			.values({
				description,
				email,
				isActive: isActive ?? true,
				displayOrder: maxOrder + 1
			})
			.returning();

		res.status(201).json({
			success: true,
			data: newEmail
		});
	} catch (error) {
		console.error('Error creating contact email:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to create contact email'
		});
	}
});

// PUT update contact emails order (bulk)
router.put('/emails/order', requireAuth, async (req, res) => {
	try {
		const { emails: emailsToUpdate } = req.body;

		if (!Array.isArray(emailsToUpdate)) {
			return res.status(400).json({
				success: false,
				error: 'Emails array is required'
			});
		}

		for (const email of emailsToUpdate) {
			await db
				.update(contactEmails)
				.set({
					displayOrder: email.displayOrder,
					updatedAt: new Date()
				})
				.where(eq(contactEmails.id, email.id));
		}

		res.json({
			success: true,
			message: 'Contact emails order updated successfully'
		});
	} catch (error) {
		console.error('Error updating contact emails order:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update contact emails order'
		});
	}
});

// PUT update contact email
router.put('/emails/:id', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;
		const { description, email, displayOrder, isActive } = req.body;

		const updateData: Record<string, any> = {
			updatedAt: new Date()
		};

		if (description !== undefined) updateData.description = description;
		if (email !== undefined) updateData.email = email;
		if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
		if (isActive !== undefined) updateData.isActive = isActive;

		const [updatedEmail] = await db
			.update(contactEmails)
			.set(updateData)
			.where(eq(contactEmails.id, id))
			.returning();

		if (!updatedEmail) {
			return res.status(404).json({
				success: false,
				error: 'Contact email not found'
			});
		}

		res.json({
			success: true,
			data: updatedEmail
		});
	} catch (error) {
		console.error('Error updating contact email:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update contact email'
		});
	}
});

// DELETE contact email
router.delete('/emails/:id', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;

		const [deletedEmail] = await db
			.delete(contactEmails)
			.where(eq(contactEmails.id, id))
			.returning();

		if (!deletedEmail) {
			return res.status(404).json({
				success: false,
				error: 'Contact email not found'
			});
		}

		res.json({
			success: true,
			message: 'Contact email deleted successfully'
		});
	} catch (error) {
		console.error('Error deleting contact email:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to delete contact email'
		});
	}
});

// ============================================
// Contact Page Settings Routes
// ============================================

// GET all contact page settings (public)
router.get('/settings', async (req, res) => {
	try {
		const settings = await db.select().from(contactPageSettings);

		// Convert to key-value object
		const settingsObj: Record<string, string> = {};
		for (const setting of settings) {
			settingsObj[setting.key] = setting.value;
		}

		res.json({
			success: true,
			data: settingsObj
		});
	} catch (error) {
		console.error('Error fetching contact page settings:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch contact page settings'
		});
	}
});

// GET single contact page setting by key
router.get('/settings/:key', async (req, res) => {
	try {
		const { key } = req.params;

		const [setting] = await db
			.select()
			.from(contactPageSettings)
			.where(eq(contactPageSettings.key, key))
			.limit(1);

		res.json({
			success: true,
			data: setting || null
		});
	} catch (error) {
		console.error('Error fetching contact page setting:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch contact page setting'
		});
	}
});

// PUT update/create contact page setting
router.put('/settings/:key', requireAuth, async (req, res) => {
	try {
		const { key } = req.params;
		const { value } = req.body;

		if (value === undefined) {
			return res.status(400).json({
				success: false,
				error: 'Value is required'
			});
		}

		// Check if setting exists
		const [existing] = await db
			.select()
			.from(contactPageSettings)
			.where(eq(contactPageSettings.key, key))
			.limit(1);

		let result;
		if (existing) {
			[result] = await db
				.update(contactPageSettings)
				.set({
					value,
					updatedAt: new Date()
				})
				.where(eq(contactPageSettings.key, key))
				.returning();
		} else {
			[result] = await db
				.insert(contactPageSettings)
				.values({
					key,
					value
				})
				.returning();
		}

		res.json({
			success: true,
			data: result
		});
	} catch (error) {
		console.error('Error updating contact page setting:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update contact page setting'
		});
	}
});

// DELETE contact page setting
router.delete('/settings/:key', requireAuth, async (req, res) => {
	try {
		const { key } = req.params;

		const [deleted] = await db
			.delete(contactPageSettings)
			.where(eq(contactPageSettings.key, key))
			.returning();

		if (!deleted) {
			return res.status(404).json({
				success: false,
				error: 'Contact page setting not found'
			});
		}

		res.json({
			success: true,
			message: 'Contact page setting deleted successfully'
		});
	} catch (error) {
		console.error('Error deleting contact page setting:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to delete contact page setting'
		});
	}
});

export default router;
