import { db } from '../index';
import { projectCategories } from '../schema';

export async function seedProjectCategories() {
  console.log('📁 Seeding project categories...');
  return db.insert(projectCategories).values([
    { name: 'Development', displayOrder: 1 },
    { name: 'Graphics', displayOrder: 2 },
    { name: 'Videos', displayOrder: 3 }
  ]).returning();
}
