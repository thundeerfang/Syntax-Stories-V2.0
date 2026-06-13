import { BlogPostModel } from '../models/BlogPost.js';
import { BlogCategoryModel } from '../models/BlogCategory.js';
import { BlogTagModel } from '../models/BlogTag.js';
import { ensureBlogTaxonomySeeds } from '../modules/blog/ensureBlogTaxonomySeeds.js';
import { NOT_DELETED_FILTER } from '../shared/db/notDeleted.js';
import { BLOG_TAXONOMY_CACHE_TTL_MS } from '../variable/constants.js';

export type TaxonomyCategoryRow = {
  slug: string;
  name: string;
  description: string;
  postCount: number;
};

export type TaxonomyTagRow = {
  slug: string;
  name: string;
  postCount: number;
  lastUsedAt?: string;
};

export type CategoryListSort = 'name-asc' | 'posts-desc';
export type TagListSort = 'name-asc' | 'name-desc' | 'posts-desc' | 'recent';

export type PaginatedList<T> = {
  list: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

let categoriesCache: { at: number; rows: TaxonomyCategoryRow[] } | null = null;
let tagsCache: { at: number; rows: TaxonomyTagRow[] } | null = null;

function countMap(rows: { _id: string; postCount: number }[]) {
  return new Map(rows.map((r) => [String(r._id).toLowerCase(), r.postCount]));
}

function parseOffset(raw: unknown, fallback = 0): number {
  const n = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function parseLimit(raw: unknown, fallback: number, max: number): number {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

function sortCategories(rows: TaxonomyCategoryRow[], sort: CategoryListSort): TaxonomyCategoryRow[] {
  const copy = [...rows];
  if (sort === 'posts-desc') {
    copy.sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name));
  } else {
    copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }
  return copy;
}

function compareTags(a: TaxonomyTagRow, b: TaxonomyTagRow, sort: TagListSort): number {
  switch (sort) {
    case 'name-asc':
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    case 'name-desc':
      return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
    case 'posts-desc':
      return (
        b.postCount - a.postCount ||
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
    case 'recent': {
      const ta = a.lastUsedAt ? Date.parse(a.lastUsedAt) : 0;
      const tb = b.lastUsedAt ? Date.parse(b.lastUsedAt) : 0;
      if (tb !== ta) return tb - ta;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    default:
      return 0;
  }
}

function sortTags(rows: TaxonomyTagRow[], sort: TagListSort): TaxonomyTagRow[] {
  return [...rows].sort((a, b) => compareTags(a, b, sort));
}

function filterByQuery<T extends { name: string; slug: string }>(rows: T[], q: string): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(
    (row) => row.name.toLowerCase().includes(needle) || row.slug.toLowerCase().includes(needle)
  );
}

function paginate<T>(rows: T[], offset: number, limit: number): PaginatedList<T> {
  const total = rows.length;
  const list = rows.slice(offset, offset + limit);
  return {
    list,
    total,
    offset,
    limit,
    hasMore: offset + list.length < total,
  };
}

export async function loadCategoryRows(): Promise<TaxonomyCategoryRow[]> {
  const now = Date.now();
  if (categoriesCache && now - categoriesCache.at < BLOG_TAXONOMY_CACHE_TTL_MS) {
    return categoriesCache.rows;
  }

  await ensureBlogTaxonomySeeds();
  const publishedMatch = { status: 'published' as const, ...NOT_DELETED_FILTER };

  const [curatedCats, catAgg] = await Promise.all([
    BlogCategoryModel.find().sort({ sortOrder: 1, name: 1 }).lean(),
    BlogPostModel.aggregate<{ _id: string; postCount: number }>([
      {
        $match: {
          ...publishedMatch,
          category: { $type: 'string', $nin: ['', null] },
        },
      },
      { $group: { _id: { $toLower: '$category' }, postCount: { $sum: 1 } } },
    ]),
  ]);

  const catCounts = countMap(catAgg);
  const curatedSlugLower = new Set(curatedCats.map((c) => c.slug.toLowerCase()));

  const categoriesFromCurated = curatedCats.map((c) => ({
    slug: c.slug,
    name: c.name,
    description:
      typeof (c as { description?: string }).description === 'string'
        ? (c as { description?: string }).description!.trim()
        : '',
    postCount: catCounts.get(c.slug.toLowerCase()) ?? 0,
  }));

  const extraCats = catAgg
    .filter((a) => !curatedSlugLower.has(String(a._id).toLowerCase()))
    .map((a) => ({
      slug: String(a._id),
      name: String(a._id),
      description: '',
      postCount: a.postCount,
    }));

  const rows = [...categoriesFromCurated, ...extraCats];
  categoriesCache = { at: now, rows };
  return rows;
}

export async function loadTagRows(): Promise<TaxonomyTagRow[]> {
  const now = Date.now();
  if (tagsCache && now - tagsCache.at < BLOG_TAXONOMY_CACHE_TTL_MS) {
    return tagsCache.rows;
  }

  await ensureBlogTaxonomySeeds();
  const publishedMatch = { status: 'published' as const, ...NOT_DELETED_FILTER };

  const [curatedTags, tagAgg, recentAgg] = await Promise.all([
    BlogTagModel.find().sort({ sortOrder: 1, name: 1 }).lean(),
    BlogPostModel.aggregate<{ _id: string; postCount: number }>([
      {
        $match: {
          ...publishedMatch,
          tags: { $exists: true, $ne: [] },
        },
      },
      { $unwind: '$tags' },
      { $match: { tags: { $type: 'string', $nin: ['', null] } } },
      { $group: { _id: { $toLower: '$tags' }, postCount: { $sum: 1 } } },
    ]),
    BlogPostModel.aggregate<{ _id: string; lastUsedAt: Date }>([
      {
        $match: {
          ...publishedMatch,
          tags: { $exists: true, $ne: [] },
        },
      },
      {
        $addFields: {
          tagSortDate: { $ifNull: ['$publishedAt', '$createdAt'] },
        },
      },
      { $unwind: '$tags' },
      { $match: { tags: { $type: 'string', $nin: ['', null] } } },
      {
        $group: {
          _id: { $toLower: '$tags' },
          lastUsedAt: { $max: '$tagSortDate' },
        },
      },
    ]),
  ]);

  const tagCounts = countMap(tagAgg);
  const lastUsedMap = new Map(
    recentAgg.map((r) => {
      const d = r.lastUsedAt;
      const iso = d instanceof Date ? d.toISOString() : d != null ? String(d) : undefined;
      return [String(r._id).toLowerCase(), iso] as const;
    })
  );

  const nameBySlug = new Map(curatedTags.map((t) => [t.slug.toLowerCase(), t.name] as const));
  const curatedLower = new Set(curatedTags.map((t) => t.slug.toLowerCase()));

  const tagsFromCurated = curatedTags.map((t) => {
    const low = t.slug.toLowerCase();
    const lastUsedAt = lastUsedMap.get(low);
    return {
      slug: t.slug,
      name: t.name,
      postCount: tagCounts.get(low) ?? 0,
      ...(lastUsedAt ? { lastUsedAt } : {}),
    };
  });

  const extraTags = tagAgg
    .filter((a) => !curatedLower.has(String(a._id).toLowerCase()))
    .map((a) => {
      const slug = String(a._id);
      const low = slug.toLowerCase();
      const lastUsedAt = lastUsedMap.get(low);
      return {
        slug,
        name: nameBySlug.get(low) ?? slug,
        postCount: a.postCount,
        ...(lastUsedAt ? { lastUsedAt } : {}),
      };
    });

  const rows = [...tagsFromCurated, ...extraTags];
  tagsCache = { at: now, rows };
  return rows;
}

export async function listTaxonomyCategoriesPaginated(opts: {
  offset?: unknown;
  limit?: unknown;
  sort?: unknown;
  q?: unknown;
}): Promise<PaginatedList<TaxonomyCategoryRow>> {
  const offset = parseOffset(opts.offset);
  const limit = parseLimit(opts.limit, 6, 50);
  const sortRaw = String(opts.sort ?? 'name-asc');
  const sort: CategoryListSort = sortRaw === 'posts-desc' ? 'posts-desc' : 'name-asc';
  const q = typeof opts.q === 'string' ? opts.q : '';

  const rows = sortCategories(await loadCategoryRows(), sort);
  const filtered = filterByQuery(rows, q);
  return paginate(filtered, offset, limit);
}

export async function listTaxonomyTagsPaginated(opts: {
  offset?: unknown;
  limit?: unknown;
  sort?: unknown;
  q?: unknown;
}): Promise<PaginatedList<TaxonomyTagRow>> {
  const offset = parseOffset(opts.offset);
  const limit = parseLimit(opts.limit, 48, 100);
  const sortRaw = String(opts.sort ?? 'name-asc');
  const sort: TagListSort =
    sortRaw === 'name-desc' || sortRaw === 'posts-desc' || sortRaw === 'recent'
      ? sortRaw
      : 'name-asc';
  const q = typeof opts.q === 'string' ? opts.q : '';

  const rows = sortTags(await loadTagRows(), sort);
  const filtered = filterByQuery(rows, q);
  return paginate(filtered, offset, limit);
}

export async function loadExploreTagRankings(): Promise<{
  nameBySlug: Map<string, string>;
  trendingAgg: Array<{ _id: string; postCount: number }>;
  popularAgg: Array<{ _id: string; postCount: number }>;
  recentAgg: Array<{ _id: string; postCount: number; lastUsedAt: Date }>;
}> {
  await ensureBlogTaxonomySeeds();
  const publishedMatch = { status: 'published' as const, ...NOT_DELETED_FILTER };
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const tagWindowMatch = {
    ...publishedMatch,
    tags: { $exists: true, $ne: [] },
    $expr: {
      $gte: [{ $ifNull: ['$publishedAt', '$createdAt'] }, fourteenDaysAgo],
    },
  };

  const [curatedTags, trendingAgg, popularAgg, recentAgg] = await Promise.all([
    BlogTagModel.find().sort({ sortOrder: 1, name: 1 }).lean(),
    BlogPostModel.aggregate<{ _id: string; postCount: number }>([
      { $match: tagWindowMatch },
      { $unwind: '$tags' },
      { $match: { tags: { $type: 'string', $nin: ['', null] } } },
      { $group: { _id: { $toLower: '$tags' }, postCount: { $sum: 1 } } },
      { $sort: { postCount: -1 } },
      { $limit: 10 },
    ]),
    BlogPostModel.aggregate<{ _id: string; postCount: number }>([
      {
        $match: {
          ...publishedMatch,
          tags: { $exists: true, $ne: [] },
        },
      },
      { $unwind: '$tags' },
      { $match: { tags: { $type: 'string', $nin: ['', null] } } },
      { $group: { _id: { $toLower: '$tags' }, postCount: { $sum: 1 } } },
      { $sort: { postCount: -1 } },
      { $limit: 10 },
    ]),
    BlogPostModel.aggregate<{ _id: string; postCount: number; lastUsedAt: Date }>([
      {
        $match: {
          ...publishedMatch,
          tags: { $exists: true, $ne: [] },
        },
      },
      {
        $addFields: {
          tagSortDate: { $ifNull: ['$publishedAt', '$createdAt'] },
        },
      },
      { $unwind: '$tags' },
      { $match: { tags: { $type: 'string', $nin: ['', null] } } },
      {
        $group: {
          _id: { $toLower: '$tags' },
          lastUsedAt: { $max: '$tagSortDate' },
          postCount: { $sum: 1 },
        },
      },
      { $sort: { lastUsedAt: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const nameBySlug = new Map<string, string>();
  for (const t of curatedTags) {
    nameBySlug.set(t.slug.toLowerCase(), t.name);
  }

  return { nameBySlug, trendingAgg, popularAgg, recentAgg };
}

export function mapExploreTagRows(
  rows: Array<{ _id: unknown; postCount: number; lastUsedAt?: Date }>,
  nameBySlug: Map<string, string>,
  withLast?: boolean
): TaxonomyTagRow[] {
  return rows.map((r) => {
    const slug = String(r._id);
    const low = slug.toLowerCase();
    const base: TaxonomyTagRow = {
      slug,
      name: nameBySlug.get(low) ?? slug,
      postCount: r.postCount,
    };
    if (withLast && r.lastUsedAt != null) {
      const d = r.lastUsedAt;
      base.lastUsedAt = d instanceof Date ? d.toISOString() : String(d);
    }
    return base;
  });
}

/** Invalidate in-process taxonomy caches (e.g. after admin taxonomy edits). */
export function invalidateBlogTaxonomyCache(): void {
  categoriesCache = null;
  tagsCache = null;
  void import('./search/searchIndex.service.js').then(({ scheduleSearchIndexRebuild }) => {
    scheduleSearchIndexRebuild();
  });
}
