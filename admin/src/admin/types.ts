export type AdminUserListItem = {
  id: string;
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
  createdAt: string;
};

export type AdminUserDetail = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  profileImg?: string;
  twoFactorEnabled: boolean;
  profileVersion: number;
  staffRole: string | null;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  subscriptionPlanKey: string | null;
  subscriptionPeriodEnd: string | null;
  followersCount: number;
  followingCount: number;
  createdAt: string | null;
  oauth: Record<string, boolean>;
  blog: { published: number; drafts: number };
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
