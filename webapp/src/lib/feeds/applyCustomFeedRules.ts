import type { Post } from '@/types';

export type CustomFeedSort =
  | 'newest'
  | 'oldest'
  | 'most_respected'
  | 'most_reposted'
  | 'most_commented'
  | 'most_bookmarked';

export type CustomFeedTimeRange = 'all' | '24h' | '7d' | '30d' | '90d';

/** Serializable rules stored per custom feed (client-side). */
export type CustomFeedRules = Readonly<{
  tagSlugs: string[];
  categorySlugs: string[];
  userSources: string[];
  squadSources: string[];
  sort: CustomFeedSort;
  timeRange: CustomFeedTimeRange;
  minRespect: number | null;
  minRepost: number | null;
  minComment: number | null;
  minBookmark: number | null;
}>;

function timeRangeCutoffIso(range: CustomFeedTimeRange): string | null {
  if (range === 'all') return null;
  const now = Date.now();
  const ms =
    range === '24h'
      ? 24 * 60 * 60 * 1000
      : range === '7d'
        ? 7 * 24 * 60 * 60 * 1000
        : range === '30d'
          ? 30 * 24 * 60 * 60 * 1000
          : 90 * 24 * 60 * 60 * 1000;
  return new Date(now - ms).toISOString();
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function postTagsNorm(post: Post): string[] {
  const t = post.tags;
  if (!Array.isArray(t)) return [];
  return t.map((x) => (typeof x === 'string' ? norm(x) : '')).filter(Boolean);
}

function sortPosts(posts: Post[], sort: CustomFeedSort): Post[] {
  const out = [...posts];
  const t = (p: Post) => new Date(p.publishedAt).getTime();
  switch (sort) {
    case 'oldest':
      out.sort((a, b) => t(a) - t(b));
      break;
    case 'most_respected':
      out.sort((a, b) => (b.respectCount ?? 0) - (a.respectCount ?? 0));
      break;
    case 'most_reposted':
      out.sort((a, b) => (b.repostCount ?? 0) - (a.repostCount ?? 0));
      break;
    case 'most_commented':
      out.sort((a, b) => (b.commentCount ?? 0) - (a.commentCount ?? 0));
      break;
    case 'most_bookmarked':
      out.sort((a, b) => (b.bookmarkCount ?? 0) - (a.bookmarkCount ?? 0));
      break;
    case 'newest':
    default:
      out.sort((a, b) => t(b) - t(a));
  }
  return out;
}

/** Filter and sort posts for a custom feed. Empty rule sets do not constrain that dimension. */
export function applyCustomFeedRules(all: Post[], rules: CustomFeedRules): Post[] {
  const cutoff = timeRangeCutoffIso(rules.timeRange);
  const tags = rules.tagSlugs.map(norm).filter(Boolean);
  const cats = rules.categorySlugs.map(norm).filter(Boolean);
  const users = rules.userSources.map(norm).filter(Boolean);
  const squads = rules.squadSources.map(norm).filter(Boolean);

  let rows = all.filter((p) => {
    if (cutoff) {
      const pub = new Date(p.publishedAt).getTime();
      if (!Number.isFinite(pub) || new Date(cutoff).getTime() > pub) return false;
    }
    if (tags.length > 0) {
      const pt = new Set(postTagsNorm(p));
      const hit = tags.some((x) => pt.has(x));
      if (!hit) return false;
    }
    if (cats.length > 0) {
      const c = p.category ? norm(p.category) : '';
      if (!c || !cats.includes(c)) return false;
    }
    if (users.length > 0 || squads.length > 0) {
      const au = p.author.username ? norm(p.author.username) : '';
      const sq = p.squad?.slug ? norm(p.squad.slug) : '';
      const userHit = users.length > 0 && au && users.includes(au);
      const squadHit = squads.length > 0 && sq && squads.includes(sq);
      if (users.length > 0 && squads.length > 0) {
        if (!userHit && !squadHit) return false;
      } else if (users.length > 0 && !userHit) return false;
      else if (squads.length > 0 && !squadHit) return false;
    }
    if (rules.minRespect != null && (p.respectCount ?? 0) < rules.minRespect) return false;
    if (rules.minRepost != null && (p.repostCount ?? 0) < rules.minRepost) return false;
    if (rules.minComment != null && (p.commentCount ?? 0) < rules.minComment) return false;
    if (rules.minBookmark != null && (p.bookmarkCount ?? 0) < rules.minBookmark) return false;
    return true;
  });

  rows = sortPosts(rows, rules.sort);
  return rows;
}
