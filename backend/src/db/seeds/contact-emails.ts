import { db } from '../index';
import { contactEmails } from '../schema';

export async function seedContactEmails() {
	console.log('📧 Seeding contact emails...');
	return db
		.insert(contactEmails)
		.values([
			{
				description: 'For general inquiries and collaboration requests:',
				email: 'hello@dane.gg',
				displayOrder: 0,
				isActive: true
			},
			{
				description: 'For business and professional matters:',
				email: 'business@dane.gg',
				displayOrder: 1,
				isActive: true
			},
			{
				description: 'For security-related concerns:',
				email: 'security@dane.gg',
				displayOrder: 2,
				isActive: true
			}
		])
		.returning();
}
