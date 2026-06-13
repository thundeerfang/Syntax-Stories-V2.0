import type mongoose from 'mongoose';
import { BlogPostModel } from '../../models/BlogPost.js';
import { BlogCommentModel } from '../../models/BlogComment.js';
import { BlogRepostModel } from '../../models/BlogRepost.js';
import { BlogRespectModel } from '../../models/BlogRespect.js';
import { BlogBookmarkModel } from '../../models/BlogBookmark.js';
import type { IUser } from '../../models/User.js';
import { toUserOAuthDto } from './managementUsers.mapper.js';
import { NOT_DELETED_FILTER } from '../../shared/db/notDeleted.js';

const RECENT_LIMIT = 48;

function iso(d: Date | undefined | null): string | null {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

type PostLean = {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  status: string;
  publishedAt?: Date;
  respectCount?: number;
  viewCount?: number;
  commentCount?: number;
  updatedAt?: Date;
  thumbnailUrl?: string;
};

type PopulatedPostLean = {
  _id: mongoose.Types.ObjectId;
  title?: string;
  slug?: string;
  deletedAt?: Date | null;
  authorId?: { username?: string } | mongoose.Types.ObjectId;
};

function postSummary(p: PostLean) {
  return {
    id: String(p._id),
    title: p.title,
    slug: p.slug,
    status: p.status as 'draft' | 'published',
    publishedAt: iso(p.publishedAt),
    respectCount: p.respectCount ?? 0,
    viewCount: p.viewCount ?? 0,
    commentCount: p.commentCount ?? 0,
    updatedAt: iso(p.updatedAt),
    thumbnailUrl: p.thumbnailUrl ?? null,
  };
}

function engagementFromPost(
  post: PopulatedPostLean | null | undefined,
  createdAt: Date | undefined,
  extra?: { textPreview?: string; commentId?: string }
) {
  if (!post || post.deletedAt) return null;
  const author =
    post.authorId && typeof post.authorId === 'object' && 'username' in post.authorId
      ? String(post.authorId.username ?? '')
      : '';
  return {
    postId: String(post._id),
    postTitle: post.title ?? 'Untitled',
    postSlug: post.slug ?? '',
    postAuthorUsername: author,
    createdAt: iso(createdAt),
    ...extra,
  };
}

export function resolveEmailVerificationForAdmin(user: IUser): {
  emailVerified: boolean;
  emailVerifiedEffective: boolean;
  emailVerificationSource: 'verified' | 'oauth' | 'unverified';
  oauthProviderLabels: string[];
} {
  const oauth = toUserOAuthDto(user);
  const labels: string[] = [];
  if (oauth.isGoogleAccount) labels.push('Google');
  if (oauth.isGitAccount) labels.push('GitHub');
  if (oauth.isFacebookAccount) labels.push('Facebook');
  if (oauth.isXAccount) labels.push('X');
  if (oauth.isAppleAccount) labels.push('Apple');
  if (oauth.isDiscordAccount) labels.push('Discord');
  if (oauth.isTwitchAccount) labels.push('Twitch');

  if (user.emailVerified) {
    return {
      emailVerified: true,
      emailVerifiedEffective: true,
      emailVerificationSource: 'verified',
      oauthProviderLabels: labels,
    };
  }
  if (labels.length > 0) {
    return {
      emailVerified: false,
      emailVerifiedEffective: true,
      emailVerificationSource: 'oauth',
      oauthProviderLabels: labels,
    };
  }
  return {
    emailVerified: false,
    emailVerifiedEffective: false,
    emailVerificationSource: 'unverified',
    oauthProviderLabels: labels,
  };
}

export async function loadAdminUserActivity(userId: mongoose.Types.ObjectId) {
  const authorFilter = {
    authorId: userId,
    ...NOT_DELETED_FILTER,
  };

  const [
    recentPosts,
    publishedCount,
    draftCount,
    commentCount,
    recentComments,
    repostCount,
    recentReposts,
    respectGivenCount,
    recentRespects,
    bookmarkCount,
    recentBookmarks,
  ] = await Promise.all([
    BlogPostModel.find(authorFilter)
      .sort({ updatedAt: -1 })
      .limit(RECENT_LIMIT)
      .select(
        'title slug status publishedAt respectCount viewCount commentCount updatedAt thumbnailUrl'
      )
      .lean(),
    BlogPostModel.countDocuments({ ...authorFilter, status: 'published' }),
    BlogPostModel.countDocuments({ ...authorFilter, status: 'draft' }),
    BlogCommentModel.countDocuments({ userId }),
    BlogCommentModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(RECENT_LIMIT)
      .populate({
        path: 'postId',
        select: 'title slug deletedAt authorId',
        populate: { path: 'authorId', select: 'username' },
      })
      .lean(),
    BlogRepostModel.countDocuments({ userId }),
    BlogRepostModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(RECENT_LIMIT)
      .populate({
        path: 'postId',
        select: 'title slug deletedAt authorId',
        populate: { path: 'authorId', select: 'username' },
      })
      .lean(),
    BlogRespectModel.countDocuments({ userId }),
    BlogRespectModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(RECENT_LIMIT)
      .populate({
        path: 'postId',
        select: 'title slug deletedAt authorId',
        populate: { path: 'authorId', select: 'username' },
      })
      .lean(),
    BlogBookmarkModel.countDocuments({ userId }),
    BlogBookmarkModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(RECENT_LIMIT)
      .populate({
        path: 'postId',
        select: 'title slug deletedAt authorId',
        populate: { path: 'authorId', select: 'username' },
      })
      .lean(),
  ]);

  const comments = recentComments
    .map((c) => {
      const post = c.postId as PopulatedPostLean | null;
      const preview = c.text?.trim().slice(0, 160) ?? '';
      return engagementFromPost(post, c.createdAt, {
        textPreview: preview.length > 0 ? preview : undefined,
        commentId: String(c._id),
      });
    })
    .filter(Boolean);

  const reposts = recentReposts
    .map((r) => engagementFromPost(r.postId as PopulatedPostLean | null, r.createdAt))
    .filter(Boolean);

  const respects = recentRespects
    .map((r) => engagementFromPost(r.postId as PopulatedPostLean | null, r.createdAt))
    .filter(Boolean);

  const bookmarks = recentBookmarks
    .map((b) => engagementFromPost(b.postId as PopulatedPostLean | null, b.createdAt))
    .filter(Boolean);

  return {
    counts: {
      postsPublished: publishedCount,
      postsDraft: draftCount,
      comments: commentCount,
      reposts: repostCount,
      respectsGiven: respectGivenCount,
      bookmarks: bookmarkCount,
    },
    recent: {
      posts: (recentPosts as PostLean[]).map(postSummary),
      comments,
      reposts,
      respects,
      bookmarks,
    },
  };
}
