import { BlogPostModel } from '../../models/BlogPost.js';
import { UserModel } from '../../models/User.js';
import type { SearchHit } from './search.types.js';
import { escapeRegex } from './searchQuery.util.js';

const NOT_DELETED = {
  $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
};

/** Published blog search — `$text` when available, regex fallback. */
export async function searchBlogsForUnified(q: string, limit: number): Promise<SearchHit[]> {
  const publishedFilter = {
    status: 'published' as const,
    ...NOT_DELETED,
  };

  try {
    const textRows = await BlogPostModel.find(
      { ...publishedFilter, $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' }, publishedAt: -1 })
      .limit(limit)
      .select('title slug summary authorId publishedAt')
      .lean();

    if (textRows.length > 0) {
      return mapBlogHits(textRows);
    }
  } catch {
    // $text index may not exist yet — fall through to regex
  }

  const regex = new RegExp(escapeRegex(q), 'i');
  const regexRows = await BlogPostModel.find({
    ...publishedFilter,
    $or: [{ title: regex }, { summary: regex }],
  })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .select('title slug summary authorId publishedAt')
    .lean();

  return mapBlogHits(regexRows);
}

async function mapBlogHits(
  rows: Array<{
    _id: unknown;
    title: string;
    slug: string;
    summary?: string;
    authorId: unknown;
  }>
): Promise<SearchHit[]> {
  const authorIds = [...new Set(rows.map((r) => String(r.authorId)))];
  const authors = await UserModel.find({ _id: { $in: authorIds } })
    .select('username')
    .lean();
  const usernameById = new Map(authors.map((a) => [String(a._id), a.username]));

  const hits: SearchHit[] = [];
  for (const p of rows) {
    const username = usernameById.get(String(p.authorId));
    if (!username) continue;
    hits.push({
      id: String(p._id),
      type: 'blog',
      label: p.title,
      sublabel: `@${username}`,
      href: `/blogs/${username}/${p.slug}`,
    });
  }
  return hits;
}
