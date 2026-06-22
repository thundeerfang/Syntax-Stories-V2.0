import { normalizeProfileImg } from "../../models/User.js";
import { normalizeRespectCount } from "../../services/blogRespect.service.js";
import { estimateReadMinutesFromBlogFields } from "./readTimeEstimate.js";

export function normalizeBlogCounter(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw))
    return Math.max(0, Math.floor(raw));
  return 0;
}

export function mapLastEditor(raw: unknown):
  | {
      username: string;
      fullName: string;
    }
  | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const u = raw as {
    username?: string;
    fullName?: string;
  };
  const username = typeof u.username === "string" ? u.username.trim() : "";
  if (!username) return undefined;
  const fullName =
    typeof u.fullName === "string" && u.fullName.trim()
      ? u.fullName.trim()
      : username;
  return { username, fullName };
}

export type TaxonomyFields = {
  category?: string;
  categories?: string[];
  tags?: string[];
  language?: string;
};

export function mapTaxonomyFromDoc(p: TaxonomyFields): {
  category?: string;
  categories?: string[];
  tags?: string[];
  language?: string;
} {
  const categories =
    Array.isArray(p.categories) && p.categories.length
      ? p.categories
      : undefined;
  const category =
    typeof p.category === "string" && p.category.trim()
      ? p.category.trim()
      : categories?.[0];
  const tags = Array.isArray(p.tags) && p.tags.length ? p.tags : undefined;
  const language =
    typeof p.language === "string" && p.language.trim()
      ? p.language.trim().toLowerCase()
      : "en";
  return { category, categories, tags, language };
}

export type FeedListItem = {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  thumbnailUrl?: string;
  updatedAt: Date;
  createdAt: Date;
  lastEditedAt?: string;
  lastEditedBy?: {
    username: string;
    fullName: string;
  };
  respectCount: number;
  repostCount: number;
  bookmarkCount: number;
  commentCount: number;
  viewCount: number;
  readTimeMinutes: number;
  author: {
    username: string;
    fullName: string;
    profileImg: string;
  };
  category?: string;
  tags?: string[];
  language?: string;
  viewerHasRespected?: boolean;
  viewerHasReposted?: boolean;
  viewerHasBookmarked?: boolean;
  squad?: {
    slug: string;
    name: string;
    iconUrl?: string;
    coverBannerUrl?: string;
    visibility: "public" | "private";
    memberCount?: number;
  };
};

export function mapLeanSquadForFeed(
  squadRaw: unknown,
): NonNullable<FeedListItem["squad"]> | undefined {
  if (!squadRaw || typeof squadRaw !== "object" || Array.isArray(squadRaw))
    return undefined;
  const s = squadRaw as {
    slug?: string;
    name?: string;
    iconUrl?: string;
    visibility?: string;
    coverBannerUrl?: string;
    memberCount?: number;
  };
  if (typeof s.slug !== "string" || !s.slug.trim()) return undefined;
  const slug = s.slug.trim();
  return {
    slug,
    name: typeof s.name === "string" && s.name.trim() ? s.name.trim() : slug,
    iconUrl:
      typeof s.iconUrl === "string" && s.iconUrl.trim()
        ? s.iconUrl.trim()
        : undefined,
    coverBannerUrl:
      typeof s.coverBannerUrl === "string" && s.coverBannerUrl.trim()
        ? s.coverBannerUrl.trim()
        : undefined,
    visibility: s.visibility === "private" ? "private" : "public",
    memberCount:
      typeof s.memberCount === "number" && Number.isFinite(s.memberCount)
        ? s.memberCount
        : undefined,
  };
}

export function mapLeanPostToFeedListItem(p: unknown): FeedListItem | null {
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const doc = p as Record<string, unknown>;
  const authorRaw = doc.authorId;
  if (!authorRaw || typeof authorRaw !== "object" || Array.isArray(authorRaw)) {
    return null;
  }
  const a = authorRaw as {
    username?: string;
    fullName?: string;
    profileImg?: string;
  };
  if (typeof a.username !== "string" || !a.username.trim()) {
    return null;
  }
  const leAt = doc.lastEditedAt as Date | undefined;
  const leBy = mapLastEditor(doc.lastEditedById);
  const summary = typeof doc.summary === "string" ? doc.summary : "";
  const content = typeof doc.content === "string" ? doc.content : "";
  const squad = mapLeanSquadForFeed(doc.squadId);
  return {
    _id: String(doc._id),
    title: String(doc.title ?? ""),
    slug: String(doc.slug ?? ""),
    summary,
    thumbnailUrl:
      typeof doc.thumbnailUrl === "string" ? doc.thumbnailUrl : undefined,
    updatedAt: doc.updatedAt as Date,
    createdAt: doc.createdAt as Date,
    lastEditedAt: leAt ? leAt.toISOString() : undefined,
    lastEditedBy: leBy,
    respectCount: normalizeRespectCount(
      (
        doc as {
          respectCount?: number;
        }
      ).respectCount,
    ),
    repostCount: normalizeBlogCounter(
      (
        doc as {
          repostCount?: number;
        }
      ).repostCount,
    ),
    bookmarkCount: normalizeBlogCounter(
      (
        doc as {
          bookmarkCount?: number;
        }
      ).bookmarkCount,
    ),
    commentCount: normalizeBlogCounter(
      (
        doc as {
          commentCount?: number;
        }
      ).commentCount,
    ),
    viewCount: normalizeBlogCounter(
      (
        doc as {
          viewCount?: number;
        }
      ).viewCount,
    ),
    readTimeMinutes: estimateReadMinutesFromBlogFields(content, summary),
    author: {
      username: a.username.trim(),
      fullName:
        typeof a.fullName === "string" && a.fullName.trim()
          ? a.fullName.trim()
          : a.username.trim(),
      profileImg: normalizeProfileImg(a.profileImg),
    },
    ...mapTaxonomyFromDoc(doc as TaxonomyFields),
    ...(squad ? { squad } : {}),
  };
}
