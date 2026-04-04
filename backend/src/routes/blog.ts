import { Router, Request, Response } from 'express';
import { db } from '../db';
import { posts, blogTags, postTags } from '../db/schema';
import { eq, desc, and, sql, inArray, gt, lt, asc } from 'drizzle-orm';
import { requireSession } from '../middleware/auth';

const router = Router();

/**
 * Get all published blog posts (public endpoint)
 */
router.get('/', async (req, res) => {
  try {
    const publishedPosts = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        content: posts.content,
        thumbnail: posts.thumbnail,
        publishedAt: posts.publishedAt,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt
      })
      .from(posts)
      .where(eq(posts.published, true))
      .orderBy(desc(posts.publishedAt));

    // Get tags for each post
    const postsWithTags = await Promise.all(
      publishedPosts.map(async (post) => {
        const tags = await db
          .select({
            id: blogTags.id,
            name: blogTags.name
          })
          .from(postTags)
          .innerJoin(blogTags, eq(postTags.tagId, blogTags.id))
          .where(eq(postTags.postId, post.id));

        return {
          ...post,
          tags
        };
      })
    );

    res.json({
      success: true,
      data: postsWithTags
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog posts'
    });
  }
});

/**
 * Get all blog posts (authenticated users only)
 */
router.get('/admin/all', requireSession, async (req, res) => {
  try {
    const allPosts = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        content: posts.content,
        thumbnail: posts.thumbnail,
        published: posts.published,
        publishedAt: posts.publishedAt,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt
      })
      .from(posts)
      .orderBy(desc(posts.createdAt));

    // Get tags for each post
    const postsWithTags = await Promise.all(
      allPosts.map(async (post) => {
        const tags = await db
          .select({
            id: blogTags.id,
            name: blogTags.name
          })
          .from(postTags)
          .innerJoin(blogTags, eq(postTags.tagId, blogTags.id))
          .where(eq(postTags.postId, post.id));

        return {
          ...post,
          tags
        };
      })
    );

    res.json({
      success: true,
      data: postsWithTags
    });
  } catch (error) {
    console.error('Error fetching all blog posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog posts'
    });
  }
});

/**
 * Get a single blog post by ID (authenticated users only)
 */
router.get('/admin/:id', requireSession, async (req, res) => {
  try {
    const { id } = req.params;

    const [post] = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        content: posts.content,
        thumbnail: posts.thumbnail,
        published: posts.published,
        publishedAt: posts.publishedAt,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt
      })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }

    // Get tags for the post
    const tags = await db
      .select({
        id: blogTags.id,
        name: blogTags.name
      })
      .from(postTags)
      .innerJoin(blogTags, eq(postTags.tagId, blogTags.id))
      .where(eq(postTags.postId, post.id));

    res.json({
      success: true,
      data: {
        ...post,
        tags
      }
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog post'
    });
  }
});

/**
 * Create a new blog post (authenticated users only)
 */
router.post('/admin', requireSession, async (req, res) => {
  try {
    const { title, slug, content, thumbnail, published, tags: tagNames } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }
    if (!slug?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Slug is required'
      });
    }
    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    const finalTitle = title.trim();
    const finalSlug = slug.trim();
    const finalContent = content.trim();

    // Check if slug exists
    const [existingPost] = await db
      .select()
      .from(posts)
      .where(eq(posts.slug, finalSlug))
      .limit(1);

    if (existingPost) {
      return res.status(400).json({
        success: false,
        error: 'A post with this slug already exists'
      });
    }

    const now = new Date();
    const [newPost] = await db
      .insert(posts)
      .values({
        title: finalTitle,
        slug: finalSlug,
        content: finalContent,
        thumbnail: thumbnail || null,
        published: published || false,
        publishedAt: published ? now : null,
        updatedAt: now
      })
      .returning();

    // Tags
    if (tagNames && Array.isArray(tagNames) && tagNames.length > 0) {
      for (const tagName of tagNames) {
        let [tag] = await db
          .select()
          .from(blogTags)
          .where(eq(blogTags.name, tagName))
          .limit(1);

        if (!tag) {
          [tag] = await db
            .insert(blogTags)
            .values({ name: tagName })
            .returning();
        }

        await db.insert(postTags).values({
          postId: newPost.id,
          tagId: tag.id
        });
      }
    }

    // Fetch post with tags
    const tags = await db
      .select({
        id: blogTags.id,
        name: blogTags.name
      })
      .from(postTags)
      .innerJoin(blogTags, eq(postTags.tagId, blogTags.id))
      .where(eq(postTags.postId, newPost.id));

    res.json({
      success: true,
      data: {
        ...newPost,
        tags
      }
    });
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create blog post'
    });
  }
});

/**
 * Update a blog post (authenticated users only)
 */
router.put('/admin/:id', requireSession, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, content, thumbnail, published, tags: tagNames, createdAt } = req.body;

    const [existingPost] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }

    if (slug && slug !== existingPost.slug) {
      const [conflictingPost] = await db
        .select()
        .from(posts)
        .where(eq(posts.slug, slug))
        .limit(1);

      if (conflictingPost) {
        return res.status(400).json({
          success: false,
          error: 'A post with this slug already exists'
        });
      }
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (content !== undefined) updateData.content = content;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail || null;
    if (createdAt !== undefined) updateData.createdAt = new Date(createdAt);
    if (published !== undefined) {
      updateData.published = published;
      if (published && !existingPost.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const [updatedPost] = await db
      .update(posts)
      .set(updateData)
      .where(eq(posts.id, id))
      .returning();

    // Handle tags
    if (tagNames !== undefined && Array.isArray(tagNames)) {
      await db.delete(postTags).where(eq(postTags.postId, id));

      for (const tagName of tagNames) {
        let [tag] = await db
          .select()
          .from(blogTags)
          .where(eq(blogTags.name, tagName))
          .limit(1);

        if (!tag) {
          [tag] = await db
            .insert(blogTags)
            .values({ name: tagName })
            .returning();
        }

        await db.insert(postTags).values({
          postId: id,
          tagId: tag.id
        });
      }
    }

    // Fetch post with tags
    const tags = await db
      .select({
        id: blogTags.id,
        name: blogTags.name
      })
      .from(postTags)
      .innerJoin(blogTags, eq(postTags.tagId, blogTags.id))
      .where(eq(postTags.postId, id));

    res.json({
      success: true,
      data: {
        ...updatedPost,
        tags
      }
    });
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update blog post'
    });
  }
});

/**
 * Delete a blog post (authenticated users only)
 */
router.delete('/admin/:id', requireSession, async (req, res) => {
  try {
    const { id } = req.params;

    const [deletedPost] = await db
      .delete(posts)
      .where(eq(posts.id, id))
      .returning();

    if (!deletedPost) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }

    res.json({
      success: true,
      data: deletedPost
    });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete blog post'
    });
  }
});

/**
 * Get all blog tags (authenticated users only)
 */
router.get('/admin/tags/all', requireSession, async (req, res) => {
  try {
    const allTags = await db
      .select()
      .from(blogTags)
      .orderBy(blogTags.name);

    res.json({
      success: true,
      data: allTags
    });
  } catch (error) {
    console.error('Error fetching blog tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog tags'
    });
  }
});

/**
 * List blog posts that use a tag (admin)
 */
router.get('/admin/tags/:id/posts', requireSession, async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await db
      .select({
        id: posts.id,
        title: posts.title
      })
      .from(postTags)
      .innerJoin(posts, eq(postTags.postId, posts.id))
      .where(eq(postTags.tagId, id))
      .orderBy(asc(posts.title));

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching posts for blog tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts using this tag'
    });
  }
});

/**
 * Create a new blog tag (authenticated users only)
 */
router.post('/admin/tags', requireSession, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Tag name is required'
      });
    }

    const [existingTag] = await db
      .select()
      .from(blogTags)
      .where(eq(blogTags.name, name.trim()))
      .limit(1);

    if (existingTag) {
      return res.status(400).json({
        success: false,
        error: 'A tag with this name already exists'
      });
    }

    const [newTag] = await db
      .insert(blogTags)
      .values({ name: name.trim() })
      .returning();

    res.json({
      success: true,
      data: newTag
    });
  } catch (error) {
    console.error('Error creating blog tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create blog tag'
    });
  }
});

/**
 * Update a blog tag (authenticated users only)
 */
router.put('/admin/tags/:id', requireSession, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Tag name is required'
      });
    }

    const [existingTag] = await db
      .select()
      .from(blogTags)
      .where(eq(blogTags.id, id))
      .limit(1);

    if (!existingTag) {
      return res.status(404).json({
        success: false,
        error: 'Tag not found'
      });
    }

    const [conflictingTag] = await db
      .select()
      .from(blogTags)
      .where(and(eq(blogTags.name, name.trim()), sql`${blogTags.id} != ${id}`))
      .limit(1);

    if (conflictingTag) {
      return res.status(400).json({
        success: false,
        error: 'A tag with this name already exists'
      });
    }

    const [updatedTag] = await db
      .update(blogTags)
      .set({ name: name.trim() })
      .where(eq(blogTags.id, id))
      .returning();

    res.json({
      success: true,
      data: updatedTag
    });
  } catch (error) {
    console.error('Error updating blog tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update blog tag'
    });
  }
});

/**
 * Delete a blog tag (authenticated users only)
 */
router.delete('/admin/tags/:id', requireSession, async (req, res) => {
  try {
    const { id } = req.params;

    const [deletedTag] = await db
      .delete(blogTags)
      .where(eq(blogTags.id, id))
      .returning();

    if (!deletedTag) {
      return res.status(404).json({
        success: false,
        error: 'Tag not found'
      });
    }

    res.json({
      success: true,
      data: deletedTag
    });
  } catch (error) {
    console.error('Error deleting blog tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete blog tag'
    });
  }
});

/**
 * Get previous and next posts for navigation (public endpoint)
 */
router.get('/:slug/navigation', async (req, res) => {
  try {
    const { slug } = req.params;

    // Get the current post
    const [currentPost] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.slug, slug), eq(posts.published, true)))
      .limit(1);

    if (!currentPost || !currentPost.publishedAt) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }

    // Get previous post (publishedAt < current)
    const [previousPost] = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug
      })
      .from(posts)
      .where(
        and(
          eq(posts.published, true),
          lt(posts.publishedAt, currentPost.publishedAt)
        )
      )
      .orderBy(desc(posts.publishedAt))
      .limit(1);

    // Get next post (publishedAt > current)
    const [nextPost] = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug
      })
      .from(posts)
      .where(
        and(
          eq(posts.published, true),
          gt(posts.publishedAt, currentPost.publishedAt)
        )
      )
      .orderBy(asc(posts.publishedAt))
      .limit(1);

    res.json({
      success: true,
      data: {
        previous: previousPost || null,
        next: nextPost || null
      }
    });
  } catch (error) {
    console.error('Error fetching navigation posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch navigation posts'
    });
  }
});

/**
 * Get a single published blog post by slug (public endpoint)
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.slug, slug), eq(posts.published, true)))
      .limit(1);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }

    const tags = await db
      .select({
        id: blogTags.id,
        name: blogTags.name
      })
      .from(postTags)
      .innerJoin(blogTags, eq(postTags.tagId, blogTags.id))
      .where(eq(postTags.postId, post.id));

    res.json({
      success: true,
      data: {
        ...post,
        tags
      }
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog post'
    });
  }
});

export default router;

