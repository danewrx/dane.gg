import { db } from '../index';
import { blogTags, postTags, posts } from '../schema';

type BlogTag = typeof blogTags.$inferSelect;
type Post = typeof posts.$inferSelect;

export async function seedBlogPostsAndTagLinks(
  blogTagSeeds: BlogTag[]
): Promise<{ posts: Post[]; postTagLinkCount: number }> {
  const blogTagId = (name: string) => blogTagSeeds.find((t) => t.name === name)?.id;

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

  console.log('🔗 Linking posts with blog tags...');
  const postTagLinks = [
    { postId: postSeeds[0].id, tagId: blogTagId('Tutorial') },
    { postId: postSeeds[0].id, tagId: blogTagId('Web Development') },
    { postId: postSeeds[0].id, tagId: blogTagId('JavaScript') },

    { postId: postSeeds[1].id, tagId: blogTagId('Tutorial') },
    { postId: postSeeds[1].id, tagId: blogTagId('Node.js') },
    { postId: postSeeds[1].id, tagId: blogTagId('Programming') },

    { postId: postSeeds[2].id, tagId: blogTagId('Database') },
    { postId: postSeeds[2].id, tagId: blogTagId('Programming') },
    { postId: postSeeds[2].id, tagId: blogTagId('Tips & Tricks') }
  ].filter((link): link is { postId: string; tagId: string } => Boolean(link.tagId));

  await db.insert(postTags).values(postTagLinks);

  return { posts: postSeeds, postTagLinkCount: postTagLinks.length };
}
