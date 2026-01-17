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
  messageSource: varchar('message_source', { length: 20 }).default('web'), // 'web', 'discord', 'admin'
  discordMessageId: varchar('discord_message_id', { length: 100 }), // Discord message ID for syncing deletions
  clientUuid: uuid('client_uuid'),
  visitorId: varchar('visitor_id', { length: 36 })
});

// Project categories table
export const projectCategories = websiteSchema.table('project_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  displayOrder: integer('display_order').notNull().default(0),
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
  active: varchar('active', { length: 20 }).notNull().default('Active'),
  published: boolean('published').default(false),
  projectUrl: varchar('project_url', { length: 255 }),
  projectText: varchar('project_text', { length: 50 }).default('View Project'),
  projectIcon: varchar('project_icon', { length: 50 }),
  repoUrl: varchar('repo_url', { length: 255 }),
  repoText: varchar('repo_text', { length: 50 }).default('View Repository'),
  repoIcon: varchar('repo_icon', { length: 50 }),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Tags table
export const tags = websiteSchema.table('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 50 }).notNull(),
  color: varchar('color', { length: 7 }).notNull(), // Hex code
  categoryId: uuid('category_id').references(() => projectCategories.id, { onDelete: 'set null' }), // Optional category grouping
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Project tags junction table
export const projectTags = websiteSchema.table('project_tags', {
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' })
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.tagId] })
}));

// Visitor tracking table
export const visitorStats = websiteSchema.table('visitor_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  visitorId: varchar('visitor_id', { length: 36 }).notNull(),
  sessionId: varchar('session_id', { length: 36 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  query: text('query'),
  statusCode: integer('status_code').notNull(),
  responseTime: integer('response_time').notNull(),
  contentLength: integer('content_length'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  country: varchar('country', { length: 100 }),
  browser: varchar('browser', { length: 50 }),
  os: varchar('os', { length: 50 }),
  device: varchar('device', { length: 50 }),
  screenResolution: varchar('screen_resolution', { length: 20 }),
  language: varchar('language', { length: 10 }),
  referrer: text('referrer'),
  isVpn: boolean('is_vpn').default(false),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow()
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
  dataType: varchar('data_type', { length: 20 }).notNull().default('string'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Discord status table
export const discordStatus = websiteSchema.table('discord_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: integer('status').notNull(),
  lastUpdate: timestamp('last_update', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Tweet table
export const tweets = websiteSchema.table('tweets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tweetId: varchar('tweet_id', { length: 50 }).notNull().unique(),
  content: text('content').notNull(),
  authorName: varchar('author_name', { length: 100 }).notNull(),
  authorUsername: varchar('author_username', { length: 50 }).notNull(),
  authorProfileImage: varchar('author_profile_image', { length: 500 }),
  authorProfileUrl: varchar('author_profile_url', { length: 500 }),
  tweetUrl: varchar('tweet_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Social links table
export const socialLinks = websiteSchema.table('social_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  iconType: varchar('icon_type', { length: 20 }).notNull().default('coreui-brand'), // 'coreui-brand', 'svg-url', 'custom-text'
  iconName: varchar('icon_name', { length: 100 }),
  iconText: varchar('icon_text', { length: 50 }),
  svgUrl: varchar('svg_url', { length: 500 }),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// User uploads table
export const userUploads = websiteSchema.table('user_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  size: integer('size').notNull(),
  mimetype: varchar('mimetype', { length: 100 }).notNull(),
  isExternal: boolean('is_external').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Uptime Kuma cache table
export const uptimeKumaMonitors = websiteSchema.table('uptime_kuma_monitors', {
  id: uuid('id').primaryKey().defaultRandom(),
  monitorId: integer('monitor_id').notNull().unique(), // monitor ID
  name: varchar('name', { length: 255 }).notNull(),
  customName: varchar('custom_name', { length: 255 }), // display name for site
  url: varchar('url', { length: 500 }),
  type: varchar('type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // up, down, pending, maintenance
  group: varchar('group', { length: 255 }),
  uptime: integer('uptime'), // Uptime percentage (0-100)
  avgResponseTime: integer('avg_response_time'), // Response time in milliseconds
  lastCheck: timestamp('last_check', { withTimezone: true }),
  lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// API Keys table for bot/external access
export const apiKeys = websiteSchema.table('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull(), // SHA-256 hash of the key
  keyPrefix: varchar('key_prefix', { length: 12 }).notNull().unique(),
  permissions: varchar('permissions', { length: 50 }).notNull().default('full'), // 'full', 'read', 'chat' etc.
  isActive: boolean('is_active').default(true),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Custom Emojis table
export const emojis = websiteSchema.table('emojis', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(), // :emojiname: format (without colons)
  imageUrl: varchar('image_url', { length: 500 }).notNull(), // Path to emoji image
  isCustom: boolean('is_custom').default(true), // true for custom, false for default Unicode emojis
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Skill categories table
export const skillCategories = websiteSchema.table('skill_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  color: varchar('color', { length: 100 }),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Skills table
export const skills = websiteSchema.table('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  level: integer('level').notNull().default(50),
  categoryId: uuid('category_id').notNull().references(() => skillCategories.id, { onDelete: 'cascade' }),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Certifications table
export const certifications = websiteSchema.table('certifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  earned: varchar('earned', { length: 50 }),
  endDate: varchar('end_date', { length: 50 }),
  isPresent: boolean('is_present').default(false),
  status: varchar('status', { length: 50 }).notNull().default('Active'),
  imageUrl: varchar('image_url', { length: 500 }),
  isExternal: boolean('is_external').default(false),
  displayOrder: integer('display_order').notNull().default(0),
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
  totpBackupCodes: many(totpBackupCodes),
  uploads: many(userUploads)
}));

export const totpBackupCodesRelations = relations(totpBackupCodes, ({ one }) => ({
  user: one(users, {
    fields: [totpBackupCodes.userId],
    references: [users.id]
  })
}));

export const userUploadsRelations = relations(userUploads, ({ one }) => ({
  user: one(users, {
    fields: [userUploads.userId],
    references: [users.id]
  })
}));

export const skillCategoriesRelations = relations(skillCategories, ({ many }) => ({
  skills: many(skills)
}));

export const skillsRelations = relations(skills, ({ one }) => ({
  category: one(skillCategories, {
    fields: [skills.categoryId],
    references: [skillCategories.id]
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

export type VisitorStat = typeof visitorStats.$inferSelect;
export type NewVisitorStat = typeof visitorStats.$inferInsert;
export type BlogTag = typeof blogTags.$inferSelect;
export type NewBlogTag = typeof blogTags.$inferInsert;
export type PostTag = typeof postTags.$inferSelect;
export type NewPostTag = typeof postTags.$inferInsert;
export type SiteConfig = typeof siteConfig.$inferSelect;
export type NewSiteConfig = typeof siteConfig.$inferInsert;
export type TotpBackupCode = typeof totpBackupCodes.$inferSelect;
export type NewTotpBackupCode = typeof totpBackupCodes.$inferInsert;
export type DiscordStatus = typeof discordStatus.$inferSelect;
export type NewDiscordStatus = typeof discordStatus.$inferInsert;
export type Tweet = typeof tweets.$inferSelect;
export type NewTweet = typeof tweets.$inferInsert;
export type SocialLink = typeof socialLinks.$inferSelect;
export type NewSocialLink = typeof socialLinks.$inferInsert;
export type UserUpload = typeof userUploads.$inferSelect;
export type NewUserUpload = typeof userUploads.$inferInsert;
export type UptimeKumaMonitorCache = typeof uptimeKumaMonitors.$inferSelect;
export type NewUptimeKumaMonitorCache = typeof uptimeKumaMonitors.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type SkillCategory = typeof skillCategories.$inferSelect;
export type NewSkillCategory = typeof skillCategories.$inferInsert;
export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;
export type Certification = typeof certifications.$inferSelect;
export type NewCertification = typeof certifications.$inferInsert;