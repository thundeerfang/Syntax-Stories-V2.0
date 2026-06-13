import { diceBearAvatarUrl, isDiceBearStoredProfile } from '@/lib/core/diceBearAvatarUrl';
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';

export type CategoryMemberPreview = Readonly<{
  username: string;
  profileImg?: string;
}>;

export type CategoryMembersSnapshot = Readonly<{
  members: CategoryMemberPreview[];
  totalCount: number;
}>;

export function resolveMemberAvatarUrl(profileImg: string | undefined, username: string): string {
  const trimmed = profileImg?.trim();
  const handle = username.trim() || 'member';

  if (!trimmed || isDiceBearStoredProfile(trimmed)) {
    return diceBearAvatarUrl(handle);
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (isDiceBearStoredProfile(trimmed)) {
      return diceBearAvatarUrl(handle);
    }
    return trimmed;
  }

  const base = resolvePublicApiBase().replace(/\/$/, '');
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

/** Unique authors from published posts in a category (writers in the sector). */
export function extractCategoryMembersFromPosts(
  posts: ReadonlyArray<{
    author: { username: string; profileImg?: string };
  }>,
  previewLimit = 6
): { members: CategoryMemberPreview[]; totalCount: number } {
  const seen = new Set<string>();
  const all: CategoryMemberPreview[] = [];

  for (const post of posts) {
    const username = post.author.username?.trim();
    if (!username) continue;
    const key = username.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    all.push({
      username,
      profileImg: post.author.profileImg,
    });
  }

  return {
    members: all.slice(0, previewLimit),
    totalCount: all.length,
  };
}

type MemberPost = Readonly<{
  category?: string;
  author: { username: string; profileImg?: string };
}>;

/** Group writers from a feed batch by category slug. */
export function buildCategoryMembersMapFromPosts(
  posts: readonly MemberPost[],
  slugs: readonly string[],
  previewLimit = 4
): Record<string, CategoryMembersSnapshot> {
  const targets = new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean));
  const allBySlug = new Map<string, CategoryMemberPreview[]>();
  const seenBySlug = new Map<string, Set<string>>();

  for (const post of posts) {
    const cat = post.category?.trim().toLowerCase();
    if (!cat || !targets.has(cat)) continue;
    const username = post.author.username?.trim();
    if (!username) continue;
    const dedupeKey = username.toLowerCase();
    let seen = seenBySlug.get(cat);
    if (!seen) {
      seen = new Set<string>();
      seenBySlug.set(cat, seen);
    }
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const bucket = allBySlug.get(cat) ?? [];
    bucket.push({ username, profileImg: post.author.profileImg });
    allBySlug.set(cat, bucket);
  }

  const out: Record<string, CategoryMembersSnapshot> = {};
  for (const slug of targets) {
    const all = allBySlug.get(slug) ?? [];
    out[slug] = {
      members: all.slice(0, previewLimit),
      totalCount: all.length,
    };
  }
  return out;
}

export function mergeFollowerIntoCategoryMembers(
  snapshot: CategoryMembersSnapshot,
  follower: CategoryMemberPreview | null | undefined,
  previewLimit = 4
): CategoryMembersSnapshot {
  if (!follower?.username?.trim()) return snapshot;
  const key = follower.username.trim().toLowerCase();
  const alreadyListed = snapshot.members.some((m) => m.username.trim().toLowerCase() === key);
  if (alreadyListed) return snapshot;
  const members = [follower, ...snapshot.members].slice(0, previewLimit);
  return { members, totalCount: snapshot.totalCount + 1 };
}

/** Explore sector grid: follower counts + face previews from the API. */
export async function fetchCategoryFollowersForExplorer(
  slugs: readonly string[],
  fetchPreview: (
    slugs: readonly string[]
  ) => Promise<
    Record<string, { totalCount: number; members: { username: string; profileImg?: string }[] }>
  >
): Promise<Record<string, CategoryMembersSnapshot>> {
  const unique = [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (unique.length === 0) return {};

  try {
    const rows = await fetchPreview(unique);
    const out: Record<string, CategoryMembersSnapshot> = {};
    for (const slug of unique) {
      const row = rows[slug];
      out[slug] = row
        ? {
            members: row.members.map((m) => ({
              username: m.username,
              profileImg: m.profileImg,
            })),
            totalCount: row.totalCount,
          }
        : { members: [], totalCount: 0 };
    }
    return out;
  } catch {
    const out: Record<string, CategoryMembersSnapshot> = {};
    for (const slug of unique) {
      out[slug] = { members: [], totalCount: 0 };
    }
    return out;
  }
}

/** @deprecated Use fetchCategoryFollowersForExplorer — writers-from-feed heuristic. */
export async function fetchCategoryMembersForExplorer(
  slugs: readonly string[],
  taxonomyPostCounts: Record<string, number>,
  previewLimit: number,
  fetchFeedBatch: () => Promise<readonly MemberPost[]>,
  fetchCategoryPosts: (categorySlug: string) => Promise<readonly MemberPost[]>
): Promise<Record<string, CategoryMembersSnapshot>> {
  const unique = [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (unique.length === 0) return {};

  let map: Record<string, CategoryMembersSnapshot> = {};
  try {
    const batch = await fetchFeedBatch();
    map = buildCategoryMembersMapFromPosts(batch, unique, previewLimit);
  } catch {
    map = {};
  }

  await Promise.all(
    unique.map(async (slug) => {
      if ((map[slug]?.totalCount ?? 0) > 0) return;
      if ((taxonomyPostCounts[slug] ?? 0) <= 0) return;
      try {
        const posts = await fetchCategoryPosts(slug);
        map = {
          ...map,
          [slug]: extractCategoryMembersFromPosts(posts, previewLimit),
        };
      } catch {
        /* keep empty snapshot */
      }
    })
  );

  return map;
}
