export type AdminAccountType = 'platform' | 'staff';

export type AdminUserListItem = {
  id: string;
  /** Opaque URL token — use in `/users/[ref]` paths, not raw ObjectId. */
  ref: string;
  fullName: string;
  username: string;
  email: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  profileImg: string | null;
  subscriptionStatus: string | null;
  subscriptionPlanKey: string | null;
  subscriptionPeriodEnd: string | null;
  staffRole: string | null;
  /** `platform` = webapp signup; `staff` = dashboard/CMS staff on User model. */
  accountType?: AdminAccountType;
  job: string | null;
  profileLocation: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
};

export type AdminUserProfile = {
  profileImg: string | null;
  profileImgAlt: string | null;
  coverBanner: string | null;
  coverBannerAlt: string | null;
  gender: string | null;
  job: string | null;
  profileLocation: string | null;
  bio: string | null;
  portfolioUrl: string | null;
  linkedin: string | null;
  instagram: string | null;
  github: string | null;
  youtube: string | null;
  stackAndTools: string[];
  workExperiences: Record<string, unknown>[];
  education: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  openSourceContributions: Record<string, unknown>[];
  mySetup: Record<string, unknown>[];
  blogStreakMode: string;
  profileUpdatedAt: string | null;
  referralCode: string | null;
  referralSource: string | null;
  referredAt: string | null;
  blogRespectReceivedCount: number;
  readStreakLongest: number;
};

export type AdminUserPostSummary = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'suspended';
  publishedAt: string | null;
  respectCount: number;
  viewCount: number;
  commentCount: number;
  updatedAt: string | null;
  thumbnailUrl?: string | null;
};

export type AdminBlogBlockSummary = {
  index: number;
  id: string;
  type: string;
  sectionId?: string;
  preview: string;
};

export type AdminBlogImageRef = {
  url: string;
  source: 'thumbnail' | 'block';
  blockIndex?: number;
  blockType?: string;
};

export type AdminUserPostDetail = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: 'draft' | 'published' | 'suspended';
  thumbnailUrl: string | null;
  category: string | null;
  tags: string[];
  language: string;
  publishedAt: string | null;
  lastEditedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
  respectCount: number;
  repostCount: number;
  bookmarkCount: number;
  commentCount: number;
  viewCount: number;
  squadId: string | null;
  content: string;
  blocks: unknown[];
  blockSummaries: AdminBlogBlockSummary[];
  images: AdminBlogImageRef[];
  textExcerpt: string;
  recentReposts: Array<{
    id: string;
    username: string;
    fullName: string;
    createdAt: string | null;
  }>;
};

export type AdminBlogListItem = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'suspended';
  publishedAt: string | null;
  updatedAt: string | null;
  respectCount: number;
  viewCount: number;
  commentCount: number;
  repostCount: number;
  bookmarkCount: number;
  thumbnailUrl: string | null;
  authorId: string | null;
  authorRef: string | null;
  authorUsername: string;
  authorFullName: string;
};

export type AdminBlogDetailResponse = {
  author: {
    id: string;
    ref: string | null;
    username: string;
    fullName: string;
    email: string | null;
    profileImg: string | null;
  };
  post: AdminUserPostDetail;
};

/** @deprecated Use AdminBlogDetailResponse */
export type AdminUserPostDetailResponse = AdminBlogDetailResponse;

export type AdminBlogEngagementRow = {
  id: string;
  kind: 'user' | 'anonymous';
  username: string | null;
  fullName: string | null;
  userRef: string | null;
  profileImg: string | null;
  createdAt: string | null;
  textPreview?: string;
};

export type AdminBlogEngagementResponse = {
  postTitle: string;
  metric: 'views' | 'respects' | 'comments' | 'reposts' | 'bookmarks';
  total: number;
  loggedInCount?: number;
  anonymousEstimate?: number;
  items: AdminBlogEngagementRow[];
};

export type AdminBlogCategoryListItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  postCount: number;
  followerCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminBlogCategoryDetail = AdminBlogCategoryListItem & {
  draftCount: number;
  recentPosts: {
    id: string;
    title: string;
    slug: string;
    publishedAt: string | null;
    authorUsername: string;
  }[];
};

export type AdminBlogTagListItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  postCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminBlogTagDetail = AdminBlogTagListItem & {
  draftCount: number;
  recentPosts: {
    id: string;
    title: string;
    slug: string;
    publishedAt: string | null;
    authorUsername: string;
  }[];
};

export type AdminUserEngagementItem = {
  postId: string;
  postTitle: string;
  postSlug: string;
  postAuthorUsername: string;
  createdAt: string | null;
  textPreview?: string;
  commentId?: string;
};

export type AdminUserActivity = {
  counts: {
    postsPublished: number;
    postsDraft: number;
    comments: number;
    reposts: number;
    respectsGiven: number;
    bookmarks: number;
  };
  recent: {
    posts: AdminUserPostSummary[];
    comments: AdminUserEngagementItem[];
    reposts: AdminUserEngagementItem[];
    respects: AdminUserEngagementItem[];
    bookmarks: AdminUserEngagementItem[];
  };
};

export type AdminUserDetail = {
  id: string;
  /** Opaque URL token — use in `/users/[ref]` paths, not raw ObjectId. */
  ref: string;
  fullName: string;
  username: string;
  email: string;
  isActive: boolean;
  emailVerified: boolean;
  /** True when verified in DB or via linked OAuth (Google, GitHub, etc.). */
  emailVerifiedEffective?: boolean;
  emailVerificationSource?: 'verified' | 'oauth' | 'unverified';
  oauthProviderLabels?: string[];
  lastLoginAt: string | null;
  profileImg?: string | null;
  twoFactorEnabled: boolean;
  profileVersion: number;
  staffRole: string | null;
  accountType?: AdminAccountType;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  subscriptionPlanKey: string | null;
  subscriptionPeriodEnd: string | null;
  followersCount: number;
  followingCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  oauth: Record<string, boolean>;
  /** Full webapp profile fields (work, education, social, etc.). */
  profile?: AdminUserProfile;
  blog: { published: number; drafts: number };
  activity?: AdminUserActivity;
  billing: {
    ledgerEntryCount: number;
    subscription: {
      plan: string;
      status: string;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
      stripeSubscriptionId: string | null;
    } | null;
  };
};

export type AdminRoleRow = {
  id: string;
  name: string;
  level: number;
  permissions: string[];
  description: string | null;
  deletedAt?: string | null;
};

export type CatalogSlugRow = {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  sortOrder: number;
  deletedAt: string | null;
};

export type CatalogPermissionRow = {
  id: string;
  key: string;
  resource: string;
  action: string;
  type: string;
  description: string | null;
  sortOrder: number;
  deletedAt: string | null;
};

export type AdminOperatorKind = 'staff' | 'admin' | 'super_admin';

export type AdminOperatorRow = {
  id: string;
  email: string;
  displayName: string;
  kind: AdminOperatorKind;
  isActive: boolean;
  userId: string;
  roleId: string | null;
  roleName: string | null;
  roleLevel: number | null;
  createdAt: string | null;
};
