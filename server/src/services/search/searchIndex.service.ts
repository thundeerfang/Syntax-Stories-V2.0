import { getRedis } from "../../config/redis.js";
import { SquadModel } from "../../models/Squad.js";
import { BlogPostModel } from "../../models/BlogPost.js";
import { UserModel } from "../../models/User.js";
import { redisKeys } from "../../shared/redis/keys.js";
import { loadCategoryRows, loadTagRows } from "../blogTaxonomy.service.js";
import { featuresToIndexDocs } from "./searchFeatures.service.js";
import {
  categoriesToIndexDocs,
  tagsToIndexDocs,
} from "./searchTaxonomy.service.js";
import type { SearchIndexDoc } from "./search.types.js";
import { invalidateFlexSearchBundles } from "./flexIndex.js";
import { NOT_DELETED_FILTER } from "../../shared/db/notDeleted.js";
async function writeIndex(key: string, docs: SearchIndexDoc[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(key, JSON.stringify(docs));
}
export async function loadSearchIndexFromRedis(
  key: string,
): Promise<SearchIndexDoc[] | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SearchIndexDoc[];
  } catch {
    return null;
  }
}
async function buildSquadsIndexDocs(): Promise<SearchIndexDoc[]> {
  const squads = await SquadModel.find({ visibility: "public" })
    .select("slug name description iconUrl memberCount")
    .sort({ memberCount: -1 })
    .limit(2000)
    .lean();
  return squads.map((s) => ({
    id: String(s._id),
    type: "squad" as const,
    label: s.name,
    sublabel: s.description?.trim()?.slice(0, 80) || `@${s.slug}`,
    href: `/squads/${s.slug}`,
    imageUrl: s.iconUrl?.trim() || undefined,
    tokens: [s.name, s.slug, s.description ?? ""].join(" ").toLowerCase(),
    rank: s.memberCount ?? 0,
    meta: { memberCount: s.memberCount ?? 0 },
  }));
}
async function buildBlogsRecentIndexDocs(): Promise<SearchIndexDoc[]> {
  const posts = await BlogPostModel.find({
    status: "published",
    ...NOT_DELETED_FILTER,
  })
    .sort({ publishedAt: -1 })
    .limit(500)
    .select("title slug summary authorId")
    .lean();
  const authorIds = [...new Set(posts.map((p) => String(p.authorId)))];
  const authors = await UserModel.find({ _id: { $in: authorIds } })
    .select("username")
    .lean();
  const usernameById = new Map(authors.map((a) => [String(a._id), a.username]));
  const docs: SearchIndexDoc[] = [];
  for (const p of posts) {
    const username = usernameById.get(String(p.authorId));
    if (!username) continue;
    docs.push({
      id: String(p._id),
      type: "blog",
      label: p.title,
      sublabel: `@${username}`,
      href: `/blogs/${username}/${p.slug}`,
      tokens: [p.title, p.summary ?? "", p.slug].join(" ").toLowerCase(),
    });
  }
  return docs;
}
export async function rebuildSearchIndexes(): Promise<void> {
  const [tags, categories, squads, blogsRecent] = await Promise.all([
    loadTagRows(),
    loadCategoryRows(),
    buildSquadsIndexDocs(),
    buildBlogsRecentIndexDocs(),
  ]);
  const featureDocs = featuresToIndexDocs();
  await Promise.all([
    writeIndex(redisKeys.search.index.tags, tagsToIndexDocs(tags)),
    writeIndex(
      redisKeys.search.index.categories,
      categoriesToIndexDocs(categories),
    ),
    writeIndex(redisKeys.search.index.squads, squads),
    writeIndex(redisKeys.search.index.features, featureDocs),
    writeIndex(redisKeys.search.index.blogsRecent, blogsRecent),
  ]);
  invalidateFlexSearchBundles();
}
let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
let rebuildInFlight = false;
export function scheduleSearchIndexRebuild(): void {
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    void runSearchIndexRebuild();
  }, 30000);
}
async function runSearchIndexRebuild(): Promise<void> {
  if (rebuildInFlight) return;
  rebuildInFlight = true;
  try {
    await rebuildSearchIndexes();
  } catch (e) {
    console.warn("[search-index] rebuild failed:", String(e));
  } finally {
    rebuildInFlight = false;
  }
}
export async function startSearchIndexWorker(): Promise<void> {
  await runSearchIndexRebuild();
  setInterval(() => void runSearchIndexRebuild(), 5 * 60000);
}
