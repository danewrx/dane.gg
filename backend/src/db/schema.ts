import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  boolean, 
  timestamp, 
  integer,
  pgSchema,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Create the website schema
export const websiteSchema = pgSchema('website');

// Users table (excluding for now as requested)
export const users = websiteSchema.table('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  totpSecret: text('totp_secret'),
  totpEnabled: boolean('totp_enabled').default(false),
  themePreference: varchar('theme_preference', { length: 10 }).default('system'), // 'light', 'dark', 'system'
  accentColor: varchar('accent_color', { length: 7 }).default('#000000'), // Hex code
});

// TOTP backup codes table
export const totpBackupCodes = websiteSchema.table('totp_backup_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: varchar('code_hash', { length: 255 }).notNull(), // Hashed backup code
  used: boolean('used').default(false),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Posts table
export const posts = websiteSchema.table('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 280 }).notNull().unique(),
  content: text('content').notNull(),
  thumbnail: varchar('thumbnail', { length: 255 }),
  published: boolean('published').default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Messages table
export const messages = websiteSchema.table('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull(),
  content: text('content').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  messageType: varchar('message_type', { length: 50 }).notNull(),
  messageColor: varchar('message_color', { length: 50 }),
  clientUuid: uuid('client_uuid')
});

// Project categories table
export const projectCategories = websiteSchema.table('project_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Projects table
export const projects = websiteSchema.table('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description').notNull(),
  categoryId: uuid('category_id').notNull().references(() => projectCategories.id),
  featured: boolean('featured').default(false),
  imageUrl: varchar('image_url', { length: 255 }),
  projectUrl: varchar('project_url', { length: 255 }),
  projectText: varchar('project_text', { length: 50 }).default('View Project'),
  repoUrl: varchar('repo_url', { length: 255 }),
  repoText: varchar('repo_text', { length: 50 }).default('View Repository'),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Tags table
export const tags = websiteSchema.table('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 50 }).notNull(),
  color: varchar('color', { length: 7 }).notNull(), // Hex code
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Project tags junction table
export const projectTags = websiteSchema.table('project_tags', {
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' })
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.tagId] })
}));

// Page views table
export const pageViews = websiteSchema.table('page_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  pagePath: varchar('page_path', { length: 255 }).notNull(),
  visitorId: varchar('visitor_id', { length: 36 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  countryCode: varchar('country_code', { length: 2 }),
  referrer: text('referrer'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Blog tags table
export const blogTags = websiteSchema.table('blog_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Post tags junction table
export const postTags = websiteSchema.table('post_tags', {
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => blogTags.id, { onDelete: 'cascade' })
}, (table) => ({
  pk: primaryKey({ columns: [table.postId, table.tagId] })
}));

// Site configuration table
export const siteConfig = websiteSchema.table('site_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  dataType: varchar('data_type', { length: 20 }).notNull().default('string'), // string, number, boolean, json
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  category: one(projectCategories, {
    fields: [projects.categoryId],
    references: [projectCategories.id]
  }),
  projectTags: many(projectTags)
}));

export const projectCategoriesRelations = relations(projectCategories, ({ many }) => ({
  projects: many(projects)
}));

export const projectTagsRelations = relations(projectTags, ({ one }) => ({
  project: one(projects, {
    fields: [projectTags.projectId],
    references: [projects.id]
  }),
  tag: one(tags, {
    fields: [projectTags.tagId],
    references: [tags.id]
  })
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  projectTags: many(projectTags)
}));

export const postsRelations = relations(posts, ({ many }) => ({
  postTags: many(postTags)
}));

export const blogTagsRelations = relations(blogTags, ({ many }) => ({
  postTags: many(postTags)
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id]
  }),
  tag: one(blogTags, {
    fields: [postTags.tagId],
    references: [blogTags.id]
  })
}));

export const usersRelations = relations(users, ({ many }) => ({
  totpBackupCodes: many(totpBackupCodes)
}));

export const totpBackupCodesRelations = relations(totpBackupCodes, ({ one }) => ({
  user: one(users, {
    fields: [totpBackupCodes.userId],
    references: [users.id]
  })
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectCategory = typeof projectCategories.$inferSelect;
export type NewProjectCategory = typeof projectCategories.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type ProjectTag = typeof projectTags.$inferSelect;
export type NewProjectTag = typeof projectTags.$inferInsert;
export type PageView = typeof pageViews.$inferSelect;
export type NewPageView = typeof pageViews.$inferInsert;
export type BlogTag = typeof blogTags.$inferSelect;
export type NewBlogTag = typeof blogTags.$inferInsert;
export type PostTag = typeof postTags.$inferSelect;
export type NewPostTag = typeof postTags.$inferInsert;
export type SiteConfig = typeof siteConfig.$inferSelect;
export type NewSiteConfig = typeof siteConfig.$inferInsert;
export type TotpBackupCode = typeof totpBackupCodes.$inferSelect;
export type NewTotpBackupCode = typeof totpBackupCodes.$inferInsert;