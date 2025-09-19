import { db } from './index';
import { sql } from 'drizzle-orm';
import { 
  projectCategories, 
  projects, 
  tags, 
  projectTags, 
  posts, 
  blogTags, 
  postTags,
  messages,
  pageViews
} from './schema';

export async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Create website schema if it doesn't exist
    console.log('📁 Creating website schema...');
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS website`);
    await db.execute(sql`GRANT USAGE ON SCHEMA website TO dane_gg`);
    await db.execute(sql`ALTER DEFAULT PRIVILEGES IN SCHEMA website GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dane_gg`);
    await db.execute(sql`ALTER DEFAULT PRIVILEGES IN SCHEMA website GRANT USAGE, SELECT ON SEQUENCES TO dane_gg`);

    // Clear existing data (in reverse order of dependencies)
    console.log('🧹 Clearing existing data...');
    await db.delete(projectTags);
    await db.delete(postTags);
    await db.delete(projects);
    await db.delete(posts);
    await db.delete(projectCategories);
    await db.delete(tags);
    await db.delete(blogTags);
    await db.delete(messages);
    await db.delete(pageViews);

    // Seed project categories
    console.log('📁 Seeding project categories...');
    const categories = await db.insert(projectCategories).values([
      { name: 'Web Development' },
      { name: 'Mobile Apps' },
      { name: 'Desktop Applications' },
      { name: 'DevOps & Infrastructure' },
      { name: 'Machine Learning' },
      { name: 'Game Development' }
    ]).returning();

    // Seed tags
    console.log('🏷️ Seeding tags...');
    const seededTags = await db.insert(tags).values([
      { title: 'JavaScript', color: '#F0DB4F' },
      { title: 'Node.js', color: '#43853D' },
      { title: 'Express', color: '#000000' },
      { title: 'React', color: '#61DAFB' },
      { title: 'CSS', color: '#2965f1' },
      { title: 'HTML', color: '#e34c26' },
      { title: 'TypeScript', color: '#3178c6' },
      { title: 'Svelte', color: '#ff3e00' },
      { title: 'Vue.js', color: '#4fc08d' },
      { title: 'Python', color: '#3776ab' },
      { title: 'PostgreSQL', color: '#336791' },
      { title: 'Docker', color: '#2496ed' }
    ]).returning();

    // Seed blog tags
    console.log('📝 Seeding blog tags...');
    const blogTagSeeds = await db.insert(blogTags).values([
      { name: 'Tutorial' },
      { name: 'Web Development' },
      { name: 'JavaScript' },
      { name: 'React' },
      { name: 'Node.js' },
      { name: 'Database' },
      { name: 'DevOps' },
      { name: 'Programming' },
      { name: 'Tips & Tricks' },
      { name: 'Project Showcase' }
    ]).returning();

    // Seed projects
    console.log('🚀 Seeding projects...');
    const projectSeeds = await db.insert(projects).values([
      {
        title: 'Personal Portfolio Website',
        description: 'A modern, responsive portfolio website built with SvelteKit and TypeScript. Features a clean design, blog functionality, and project showcase.',
        categoryId: categories[0].id,
        featured: true,
        imageUrl: '/images/portfolio-preview.jpg',
        projectUrl: 'https://dane.gg',
        projectText: 'Visit Site',
        repoUrl: 'https://github.com/dane/dane.gg',
        repoText: 'View Code',
        displayOrder: 1
      },
      {
        title: 'Task Management App',
        description: 'A full-stack task management application with real-time collaboration features. Built with React, Node.js, and PostgreSQL.',
        categoryId: categories[0].id,
        featured: true,
        imageUrl: '/images/task-app-preview.jpg',
        projectUrl: 'https://tasks.dane.gg',
        projectText: 'Try Demo',
        repoUrl: 'https://github.com/dane/task-manager',
        repoText: 'View Code',
        displayOrder: 2
      },
      {
        title: 'Weather Dashboard',
        description: 'A beautiful weather dashboard with location-based forecasts and interactive charts. Built with Vue.js and Chart.js.',
        categoryId: categories[0].id,
        featured: false,
        imageUrl: '/images/weather-dashboard.jpg',
        projectUrl: 'https://weather.dane.gg',
        projectText: 'View App',
        repoUrl: 'https://github.com/dane/weather-dashboard',
        repoText: 'View Code',
        displayOrder: 3
      },
      {
        title: 'Mobile Recipe App',
        description: 'A cross-platform mobile app for managing recipes with photo uploads and meal planning. Built with React Native.',
        categoryId: categories[1].id,
        featured: true,
        imageUrl: '/images/recipe-app.jpg',
        projectUrl: 'https://apps.apple.com/recipe-app',
        projectText: 'Download',
        repoUrl: 'https://github.com/dane/recipe-app',
        repoText: 'View Code',
        displayOrder: 1
      },
      {
        title: 'Desktop File Organizer',
        description: 'A desktop application for automatically organizing files by type, date, and content. Built with Electron and Python.',
        categoryId: categories[2].id,
        featured: false,
        imageUrl: '/images/file-organizer.jpg',
        projectUrl: 'https://github.com/dane/file-organizer/releases',
        projectText: 'Download',
        repoUrl: 'https://github.com/dane/file-organizer',
        repoText: 'View Code',
        displayOrder: 1
      },
      {
        title: 'Docker Deployment Pipeline',
        description: 'Automated CI/CD pipeline for containerized applications with multi-environment support and rollback capabilities.',
        categoryId: categories[3].id,
        featured: false,
        imageUrl: '/images/docker-pipeline.jpg',
        projectUrl: 'https://github.com/dane/docker-pipeline',
        projectText: 'View Docs',
        repoUrl: 'https://github.com/dane/docker-pipeline',
        repoText: 'View Code',
        displayOrder: 1
      }
    ]).returning();

    // Link projects with tags
    console.log('🔗 Linking projects with tags...');
    const projectTagLinks = [
      // Portfolio website
      { projectId: projectSeeds[0].id, tagId: seededTags.find(t => t.title === 'Svelte')?.id! },
      { projectId: projectSeeds[0].id, tagId: seededTags.find(t => t.title === 'TypeScript')?.id! },
      { projectId: projectSeeds[0].id, tagId: seededTags.find(t => t.title === 'CSS')?.id! },
      
      // Task management app
      { projectId: projectSeeds[1].id, tagId: seededTags.find(t => t.title === 'React')?.id! },
      { projectId: projectSeeds[1].id, tagId: seededTags.find(t => t.title === 'Node.js')?.id! },
      { projectId: projectSeeds[1].id, tagId: seededTags.find(t => t.title === 'PostgreSQL')?.id! },
      
      // Weather dashboard
      { projectId: projectSeeds[2].id, tagId: seededTags.find(t => t.title === 'Vue.js')?.id! },
      { projectId: projectSeeds[2].id, tagId: seededTags.find(t => t.title === 'JavaScript')?.id! },
      
      // Mobile recipe app
      { projectId: projectSeeds[3].id, tagId: seededTags.find(t => t.title === 'React')?.id! },
      { projectId: projectSeeds[3].id, tagId: seededTags.find(t => t.title === 'JavaScript')?.id! },
      
      // Desktop file organizer
      { projectId: projectSeeds[4].id, tagId: seededTags.find(t => t.title === 'Python')?.id! },
      
      // Docker pipeline
      { projectId: projectSeeds[5].id, tagId: seededTags.find(t => t.title === 'Docker')?.id! },
      { projectId: projectSeeds[5].id, tagId: seededTags.find(t => t.title === 'Node.js')?.id! }
    ].filter(link => link.tagId); // Filter out any undefined tag IDs

    await db.insert(projectTags).values(projectTagLinks);

    // Seed blog posts
    console.log('📰 Seeding blog posts...');
    const postSeeds = await db.insert(posts).values([
      {
        title: 'Getting Started with SvelteKit',
        slug: 'getting-started-with-sveltekit',
        content: `# Getting Started with SvelteKit

SvelteKit is the official Svelte framework for building web applications. It provides a powerful set of features for creating modern, performant web apps.

## Why SvelteKit?

- **Performance**: Svelte compiles to vanilla JavaScript, resulting in smaller bundle sizes
- **Developer Experience**: Excellent TypeScript support and hot module replacement
- **Flexibility**: Works with any backend or can be deployed as a static site
- **Built-in Features**: File-based routing, server-side rendering, and more

## Installation

\`\`\`bash
npm create svelte@latest my-app
cd my-app
npm install
npm run dev
\`\`\`

## Basic Structure

SvelteKit uses a file-based routing system where each route is represented by a folder with a \`+page.svelte\` file.

\`\`\`
src/
├── routes/
│   ├── +page.svelte          # Home page
│   ├── about/
│   │   └── +page.svelte      # About page
│   └── blog/
│       ├── +page.svelte      # Blog listing
│       └── [slug]/
│           └── +page.svelte  # Individual blog post
\`\`\`

This is just the beginning of your SvelteKit journey. The framework offers much more to explore!`,
        thumbnail: '/images/sveltekit-tutorial.jpg',
        published: true,
        publishedAt: new Date('2024-01-15T10:00:00Z')
      },
      {
        title: 'Building RESTful APIs with Node.js and Express',
        slug: 'building-restful-apis-nodejs-express',
        content: `# Building RESTful APIs with Node.js and Express

Creating robust RESTful APIs is a fundamental skill for modern web developers. In this guide, we'll explore how to build APIs using Node.js and Express.

## Setting Up the Project

First, let's initialize a new Node.js project:

\`\`\`bash
mkdir my-api
cd my-api
npm init -y
npm install express cors helmet morgan
npm install -D @types/express @types/cors @types/morgan
\`\`\`

## Basic Server Setup

\`\`\`javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
\`\`\`

## Best Practices

1. **Use middleware for common functionality**
2. **Implement proper error handling**
3. **Validate input data**
4. **Use environment variables for configuration**
5. **Add logging and monitoring**

Building APIs is an art that requires practice and attention to detail.`,
        thumbnail: '/images/nodejs-api-tutorial.jpg',
        published: true,
        publishedAt: new Date('2024-01-10T14:30:00Z')
      },
      {
        title: 'Database Design Patterns for Web Applications',
        slug: 'database-design-patterns-web-applications',
        content: `# Database Design Patterns for Web Applications

Good database design is crucial for building scalable and maintainable web applications. Let's explore some essential patterns and best practices.

## Normalization vs Denormalization

### Normalization
- Reduces data redundancy
- Ensures data consistency
- Can impact query performance

### Denormalization
- Improves query performance
- Increases data redundancy
- Requires careful maintenance

## Common Patterns

### 1. One-to-Many Relationships
\`\`\`sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL
);

-- Posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL
);
\`\`\`

### 2. Many-to-Many Relationships
\`\`\`sql
-- Tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

-- Junction table
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id),
  tag_id UUID REFERENCES tags(id),
  PRIMARY KEY (post_id, tag_id)
);
\`\`\`

## Indexing Strategies

- **Primary Keys**: Automatically indexed
- **Foreign Keys**: Often need indexes for joins
- **Frequently Queried Columns**: Add indexes for performance
- **Composite Indexes**: For multi-column queries

Remember: Good database design is the foundation of a successful application!`,
        thumbnail: '/images/database-design.jpg',
        published: true,
        publishedAt: new Date('2024-01-05T09:15:00Z')
      },
      {
        title: 'Draft: Advanced TypeScript Techniques',
        slug: 'advanced-typescript-techniques',
        content: `# Advanced TypeScript Techniques

This is a draft post about advanced TypeScript techniques. It will be published soon!

## Coming Soon

- Generic constraints
- Conditional types
- Template literal types
- Mapped types
- Utility types

Stay tuned for the full article!`,
        thumbnail: '/images/typescript-advanced.jpg',
        published: false
      }
    ]).returning();

    // Link posts with blog tags
    console.log('🔗 Linking posts with blog tags...');
    const postTagLinks = [
      // SvelteKit post
      { postId: postSeeds[0].id, tagId: blogTagSeeds.find(t => t.name === 'Tutorial')?.id! },
      { postId: postSeeds[0].id, tagId: blogTagSeeds.find(t => t.name === 'Web Development')?.id! },
      { postId: postSeeds[0].id, tagId: blogTagSeeds.find(t => t.name === 'JavaScript')?.id! },
      
      // Node.js API post
      { postId: postSeeds[1].id, tagId: blogTagSeeds.find(t => t.name === 'Tutorial')?.id! },
      { postId: postSeeds[1].id, tagId: blogTagSeeds.find(t => t.name === 'Node.js')?.id! },
      { postId: postSeeds[1].id, tagId: blogTagSeeds.find(t => t.name === 'Programming')?.id! },
      
      // Database design post
      { postId: postSeeds[2].id, tagId: blogTagSeeds.find(t => t.name === 'Database')?.id! },
      { postId: postSeeds[2].id, tagId: blogTagSeeds.find(t => t.name === 'Programming')?.id! },
      { postId: postSeeds[2].id, tagId: blogTagSeeds.find(t => t.name === 'Tips & Tricks')?.id! }
    ].filter(link => link.tagId);

    await db.insert(postTags).values(postTagLinks);

    // Seed some sample messages
    console.log('💬 Seeding messages...');
    await db.insert(messages).values([
      {
        username: 'dane',
        content: 'Welcome to the chat! 🎉',
        messageType: 'system',
        messageColor: '#4CAF50',
        clientUuid: '550e8400-e29b-41d4-a716-446655440000'
      },
      {
        username: 'visitor',
        content: 'This is a really cool website!',
        messageType: 'user',
        messageColor: '#2196F3',
        clientUuid: '550e8400-e29b-41d4-a716-446655440001'
      },
      {
        username: 'dane',
        content: 'Thanks! I put a lot of work into it 😊',
        messageType: 'user',
        messageColor: '#FF9800',
        clientUuid: '550e8400-e29b-41d4-a716-446655440000'
      }
    ]);

    // Seed some sample page views
    console.log('📊 Seeding page views...');
    await db.insert(pageViews).values([
      {
        pagePath: '/',
        visitorId: 'visitor-001',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        countryCode: 'US',
        referrer: 'https://google.com'
      },
      {
        pagePath: '/projects',
        visitorId: 'visitor-001',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        countryCode: 'US',
        referrer: 'https://dane.gg'
      },
      {
        pagePath: '/blog',
        visitorId: 'visitor-002',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        countryCode: 'CA',
        referrer: 'https://github.com'
      }
    ]);

    console.log('✅ Database seeded successfully!');
    console.log(`📊 Seeded data:`);
    console.log(`   - ${categories.length} project categories`);
    console.log(`   - ${seededTags.length} tags`);
    console.log(`   - ${blogTagSeeds.length} blog tags`);
    console.log(`   - ${projectSeeds.length} projects`);
    console.log(`   - ${postSeeds.length} blog posts`);
    console.log(`   - ${projectTagLinks.length} project-tag relationships`);
    console.log(`   - ${postTagLinks.length} post-tag relationships`);
    console.log(`   - 3 sample messages`);
    console.log(`   - 3 sample page views`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (import.meta.main) {
  seed()
    .then(() => {
      console.log('🎉 Seed completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seed failed:', error);
      process.exit(1);
    });
}
