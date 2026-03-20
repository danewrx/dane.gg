import { db } from '../index';
import {
  visitorStats,
  projectTags,
  postTags,
  projects,
  posts,
  projectCategories,
  tags,
  blogTags,
  messages,
  siteConfig,
  contactEmails,
  contactPageSettings,
  themes,
  fonts
} from '../schema';

/** Deletes rows in FK-safe order before re-seeding */
export async function clearAllSeedData() {
  console.log('🧹 Clearing existing data...');
  await db.delete(visitorStats);
  await db.delete(projectTags);
  await db.delete(postTags);
  await db.delete(projects);
  await db.delete(posts);
  await db.delete(projectCategories);
  await db.delete(tags);
  await db.delete(blogTags);
  await db.delete(messages);
  await db.delete(siteConfig);
  await db.delete(contactEmails);
  await db.delete(contactPageSettings);
  await db.delete(themes);
  await db.delete(fonts);
}
