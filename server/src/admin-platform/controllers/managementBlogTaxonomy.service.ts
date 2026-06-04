import mongoose from 'mongoose';
import { removeBlogTaxonomyDummyData } from '../../modules/blog/ensureBlogTaxonomySeeds.js';
import { BlogCategoryModel } from '../../models/BlogCategory.js';
import { BlogTagModel } from '../../models/BlogTag.js';
import { BlogPostModel } from '../../models/BlogPost.js';
import { BlogCategoryFollowModel } from '../../models/BlogCategoryFollow.js';
import { reserveUniqueSlug } from '../../shared/slug/slugifyDisplayName.js';

const CATEGORY_SLUG_MAX = 64;
const TAG_SLUG_MAX = 48;

async function blogTaxonomySlugTaken(slug: string): Promise<boolean> {
  const [category, tag] = await Promise.all([
    BlogCategoryModel.exists({ slug }),
    BlogTagModel.exists({ slug }),
  ]);
  return Boolean(category || tag);
}
const MAX_LIMIT = 200;

function iso(d: Date | undefined | null): string | null {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

function notDeletedPostFilter(): Record<string, unknown> {
  return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
}

async function postCountByCategorySlug(slug: string): Promise<number> {
  return BlogPostModel.countDocuments({
    ...notDeletedPostFilter(),
    status: 'published',
    category: slug.toLowerCase(),
  });
}

async function postCountByTagSlug(slug: string): Promise<number> {
  return BlogPostModel.countDocuments({
    ...notDeletedPostFilter(),
    status: 'published',
    tags: slug.toLowerCase(),
  });
}

async function followerCountByCategorySlug(slug: string): Promise<number> {
  return BlogCategoryFollowModel.countDocuments({ categorySlug: slug.toLowerCase() });
}

export async function listAdminBlogCategories(opts: { q?: string; sort?: string }) {
  await removeBlogTaxonomyDummyData();
  const q = opts.q?.trim();
  const filter: Record<string, unknown> = {};
  if (q && q.length >= 1) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { slug: rx }, { description: rx }];
  }

  const rows = await BlogCategoryModel.find(filter).sort({ sortOrder: 1, name: 1 }).lean();

  const items = await Promise.all(
    rows.map(async (c) => {
      const slug = c.slug.toLowerCase();
      const [postCount, followerCount] = await Promise.all([
        postCountByCategorySlug(slug),
        followerCountByCategorySlug(slug),
      ]);
      return {
        id: String(c._id),
        slug: c.slug,
        name: c.name,
        description: c.description ?? '',
        sortOrder: c.sortOrder ?? 0,
        postCount,
        followerCount,
        createdAt: iso(c.createdAt),
        updatedAt: iso(c.updatedAt),
      };
    })
  );

  const sort = opts.sort ?? 'sortOrder';
  if (sort === 'posts') {
    items.sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name));
  } else if (sort === 'followers') {
    items.sort((a, b) => b.followerCount - a.followerCount || a.name.localeCompare(b.name));
  } else if (sort === 'name') {
    items.sort((a, b) => a.name.localeCompare(b.name));
  }

  return { items };
}

export async function loadAdminBlogCategory(ref: string) {
  const slug = ref.trim().toLowerCase();
  let doc = await BlogCategoryModel.findOne({ slug }).lean();
  if (!doc && mongoose.isValidObjectId(ref)) {
    doc = await BlogCategoryModel.findById(ref).lean();
  }
  if (!doc) return null;

  const categorySlug = doc.slug.toLowerCase();
  const [postCount, followerCount, draftCount] = await Promise.all([
    postCountByCategorySlug(categorySlug),
    followerCountByCategorySlug(categorySlug),
    BlogPostModel.countDocuments({
      ...notDeletedPostFilter(),
      status: 'draft',
      category: categorySlug,
    }),
  ]);

  const recentPosts = await BlogPostModel.find({
    ...notDeletedPostFilter(),
    status: 'published',
    category: categorySlug,
  })
    .sort({ publishedAt: -1 })
    .limit(10)
    .select('title slug publishedAt authorId')
    .populate({ path: 'authorId', select: 'username' })
    .lean();

  return {
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    description: doc.description ?? '',
    sortOrder: doc.sortOrder ?? 0,
    postCount,
    draftCount,
    followerCount,
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
    recentPosts: recentPosts.map((p) => {
      const author = p.authorId as { username?: string } | mongoose.Types.ObjectId | null;
      const username =
        author && typeof author === 'object' && 'username' in author
          ? String(author.username ?? '')
          : '';
      return {
        id: String(p._id),
        title: p.title,
        slug: p.slug,
        publishedAt: iso(p.publishedAt),
        authorUsername: username,
      };
    }),
  };
}

export async function createAdminBlogCategory(body: {
  slug?: string;
  name?: string;
  description?: string;
  sortOrder?: number;
}) {
  const name = body.name?.trim();
  if (!name) {
    return { error: 'VALIDATION' as const, message: 'Display name is required' };
  }

  const slug =
    body.slug?.trim().toLowerCase() ||
    (await reserveUniqueSlug(name, blogTaxonomySlugTaken, { maxLen: CATEGORY_SLUG_MAX }));

  const exists = await BlogCategoryModel.findOne({ slug }).lean();
  if (exists) return { error: 'CONFLICT' as const, message: 'Category slug already exists' };

  const doc = await BlogCategoryModel.create({
    slug,
    name,
    description: body.description?.trim() ?? '',
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
  });

  return {
    item: {
      id: String(doc._id),
      slug: doc.slug,
      name: doc.name,
      description: doc.description ?? '',
      sortOrder: doc.sortOrder,
      postCount: 0,
      followerCount: 0,
      createdAt: iso(doc.createdAt),
      updatedAt: iso(doc.updatedAt),
    },
  };
}

export const BULK_CATEGORY_MAX = 50;

export type BulkCategoryInput = {
  name?: string;
  description?: string;
  sortOrder?: number;
  slug?: string;
};

export async function bulkCreateAdminBlogCategories(items: BulkCategoryInput[]) {
  if (!items.length) {
    return { error: 'VALIDATION' as const, message: 'At least one category is required' };
  }
  if (items.length > BULK_CATEGORY_MAX) {
    return {
      error: 'VALIDATION' as const,
      message: `Maximum ${BULK_CATEGORY_MAX} categories per bulk import`,
    };
  }

  const created: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    sortOrder: number;
    postCount: number;
    followerCount: number;
    createdAt: string | null;
    updatedAt: string | null;
  }> = [];
  const failed: { index: number; name: string; message: string }[] = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const result = await createAdminBlogCategory(item);
    if ('error' in result) {
      failed.push({
        index,
        name: item.name?.trim() ?? '',
        message: result.message ?? 'Failed to create category',
      });
    } else {
      created.push(result.item);
    }
  }

  return { created, failed };
}

export async function patchAdminBlogCategory(
  ref: string,
  body: { name?: string; description?: string | null; sortOrder?: number }
) {
  const slug = ref.trim().toLowerCase();
  let doc = await BlogCategoryModel.findOne({ slug });
  if (!doc && mongoose.isValidObjectId(ref)) {
    doc = await BlogCategoryModel.findById(ref);
  }
  if (!doc) return null;

  if (body.name !== undefined) doc.name = body.name.trim() || doc.name;
  if (body.description !== undefined) doc.description = body.description?.trim() ?? '';
  if (typeof body.sortOrder === 'number') doc.sortOrder = body.sortOrder;
  await doc.save();

  return loadAdminBlogCategory(doc.slug);
}

export async function listAdminBlogTags(opts: { q?: string; sort?: string }) {
  await removeBlogTaxonomyDummyData();
  const q = opts.q?.trim();
  const filter: Record<string, unknown> = {};
  if (q && q.length >= 1) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { slug: rx }, { description: rx }];
  }

  const rows = await BlogTagModel.find(filter).sort({ sortOrder: 1, name: 1 }).lean();

  const items = await Promise.all(
    rows.map(async (t) => {
      const slug = t.slug.toLowerCase();
      const postCount = await postCountByTagSlug(slug);
      return {
        id: String(t._id),
        slug: t.slug,
        name: t.name,
        description: t.description ?? '',
        sortOrder: t.sortOrder ?? 0,
        postCount,
        createdAt: iso(t.createdAt),
        updatedAt: iso(t.updatedAt),
      };
    })
  );

  const sort = opts.sort ?? 'sortOrder';
  if (sort === 'posts') {
    items.sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name));
  } else if (sort === 'name') {
    items.sort((a, b) => a.name.localeCompare(b.name));
  }

  return { items };
}

export async function loadAdminBlogTag(ref: string) {
  const slug = ref.trim().toLowerCase();
  let doc = await BlogTagModel.findOne({ slug }).lean();
  if (!doc && mongoose.isValidObjectId(ref)) {
    doc = await BlogTagModel.findById(ref).lean();
  }
  if (!doc) return null;

  const tagSlug = doc.slug.toLowerCase();
  const [postCount, draftCount] = await Promise.all([
    postCountByTagSlug(tagSlug),
    BlogPostModel.countDocuments({
      ...notDeletedPostFilter(),
      status: 'draft',
      tags: tagSlug,
    }),
  ]);

  const recentPosts = await BlogPostModel.find({
    ...notDeletedPostFilter(),
    status: 'published',
    tags: tagSlug,
  })
    .sort({ publishedAt: -1 })
    .limit(10)
    .select('title slug publishedAt authorId')
    .populate({ path: 'authorId', select: 'username' })
    .lean();

  return {
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    description: doc.description ?? '',
    sortOrder: doc.sortOrder ?? 0,
    postCount,
    draftCount,
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
    recentPosts: recentPosts.map((p) => {
      const author = p.authorId as { username?: string } | mongoose.Types.ObjectId | null;
      const username =
        author && typeof author === 'object' && 'username' in author
          ? String(author.username ?? '')
          : '';
      return {
        id: String(p._id),
        title: p.title,
        slug: p.slug,
        publishedAt: iso(p.publishedAt),
        authorUsername: username,
      };
    }),
  };
}

export async function createAdminBlogTag(body: {
  slug?: string;
  name?: string;
  description?: string;
  sortOrder?: number;
}) {
  const name = body.name?.trim();
  if (!name) {
    return { error: 'VALIDATION' as const, message: 'Display name is required' };
  }

  const slug =
    body.slug?.trim().toLowerCase() ||
    (await reserveUniqueSlug(name, blogTaxonomySlugTaken, { maxLen: TAG_SLUG_MAX }));

  const exists = await BlogTagModel.findOne({ slug }).lean();
  if (exists) return { error: 'CONFLICT' as const, message: 'Tag slug already exists' };

  const doc = await BlogTagModel.create({
    slug,
    name,
    description: body.description?.trim() ?? '',
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
  });

  return {
    item: {
      id: String(doc._id),
      slug: doc.slug,
      name: doc.name,
      description: doc.description ?? '',
      sortOrder: doc.sortOrder,
      postCount: 0,
      createdAt: iso(doc.createdAt),
      updatedAt: iso(doc.updatedAt),
    },
  };
}

export const BULK_TAG_MAX = BULK_CATEGORY_MAX;

export type BulkTagInput = BulkCategoryInput;

export async function bulkCreateAdminBlogTags(items: BulkTagInput[]) {
  if (!items.length) {
    return { error: 'VALIDATION' as const, message: 'At least one tag is required' };
  }
  if (items.length > BULK_TAG_MAX) {
    return {
      error: 'VALIDATION' as const,
      message: `Maximum ${BULK_TAG_MAX} tags per bulk import`,
    };
  }

  const created: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    sortOrder: number;
    postCount: number;
    createdAt: string | null;
    updatedAt: string | null;
  }> = [];
  const failed: { index: number; name: string; message: string }[] = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const result = await createAdminBlogTag(item);
    if ('error' in result) {
      failed.push({
        index,
        name: item.name?.trim() ?? '',
        message: result.message ?? 'Failed to create tag',
      });
    } else {
      created.push(result.item);
    }
  }

  return { created, failed };
}

export async function patchAdminBlogTag(
  ref: string,
  body: { name?: string; description?: string | null; sortOrder?: number }
) {
  const slug = ref.trim().toLowerCase();
  let doc = await BlogTagModel.findOne({ slug });
  if (!doc && mongoose.isValidObjectId(ref)) {
    doc = await BlogTagModel.findById(ref);
  }
  if (!doc) return null;

  if (body.name !== undefined) doc.name = body.name.trim() || doc.name;
  if (body.description !== undefined) doc.description = body.description?.trim() ?? '';
  if (typeof body.sortOrder === 'number') doc.sortOrder = body.sortOrder;
  await doc.save();

  return loadAdminBlogTag(doc.slug);
}

export function parseTaxonomyListLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 100;
  return Math.min(Math.floor(n), MAX_LIMIT);
}
