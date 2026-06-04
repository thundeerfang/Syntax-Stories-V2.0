import { adminAuthenticatedFetch } from '@/lib/auth/adminAuthenticatedFetch';

const MGMT = '/api/v1/admin/management';

export type AchievementCategory = 'engagement' | 'profile' | 'reading' | 'social' | 'meta';
export type AchievementModule = 'profile' | 'blog' | 'reading' | 'social' | 'engagement' | 'meta';
export type AchievementMetric =
  | 'respect.given.total'
  | 'respect.received.total'
  | 'read.brief.total'
  | 'stack.tools.count'
  | 'followers.count'
  | 'read.streak.longest'
  | 'profile.has_avatar'
  | 'profile.has_location'
  | 'profile.has_work'
  | 'profile.has_education'
  | 'profile.has_cv'
  | 'profile.has_bio'
  | 'profile.has_cover'
  | 'profile.has_github'
  | 'profile.setup.count'
  | 'social.following.count'
  | 'blog.categories.followed.count'
  | 'squads.joined.count'
  | 'feedback.submitted.count'
  | 'posts.authored.count';

export type AdminAchievementItem = {
  id: string;
  key: string;
  slug: string;
  title: string;
  description: string;
  category: AchievementCategory;
  module: AchievementModule;
  points: number;
  metric: AchievementMetric;
  target: number;
  unlocksAfter: string | null;
  celebrateAs: 'dialog';
  sortOrder: number;
  active: boolean;
};

export type AchievementCatalogOptions = {
  categories: AchievementCategory[];
  modules: AchievementModule[];
  metrics: AchievementMetric[];
};

type AdminOk<T> = { success?: boolean; data?: T; error?: { message?: string }; message?: string };

function throwFrom(res: Response, json: AdminOk<unknown>): never {
  throw new Error(json.error?.message ?? json.message ?? `Request failed (${res.status})`);
}

export async function listAdminAchievements(
  token: string
): Promise<{ items: AdminAchievementItem[]; configuredCount: number }> {
  const res = await adminAuthenticatedFetch(`${MGMT}/achievements`, { token });
  const json = (await res.json().catch(() => ({}))) as AdminOk<{
    items: AdminAchievementItem[];
    configuredCount: number;
  }>;
  if (!res.ok || !json.success || !json.data?.items) throwFrom(res, json);
  return {
    items: json.data.items,
    configuredCount: json.data.configuredCount ?? json.data.items.length,
  };
}

export async function getAchievementCatalogOptions(token: string): Promise<AchievementCatalogOptions> {
  const res = await adminAuthenticatedFetch(`${MGMT}/achievements/options`, { token });
  const json = (await res.json().catch(() => ({}))) as AdminOk<AchievementCatalogOptions>;
  if (!res.ok || !json.success || !json.data) throwFrom(res, json);
  return json.data;
}

export async function createAdminAchievement(
  token: string,
  body: {
    key: string;
    slug: string;
    title: string;
    description: string;
    category: AchievementCategory;
    module: AchievementModule;
    points: number;
    metric: AchievementMetric;
    target: number;
    unlocksAfter?: string | null;
    sortOrder?: number;
    active?: boolean;
  }
): Promise<AdminAchievementItem> {
  const res = await adminAuthenticatedFetch(`${MGMT}/achievements`, {
    token,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as AdminOk<{ item: AdminAchievementItem }>;
  if (!res.ok || !json.success || !json.data?.item) throwFrom(res, json);
  return json.data.item;
}

export async function patchAdminAchievement(
  token: string,
  id: string,
  body: Partial<{
    slug: string;
    title: string;
    description: string;
    category: AchievementCategory;
    module: AchievementModule;
    points: number;
    metric: AchievementMetric;
    target: number;
    unlocksAfter: string | null;
    sortOrder: number;
    active: boolean;
  }>
): Promise<AdminAchievementItem> {
  const res = await adminAuthenticatedFetch(`${MGMT}/achievements/${encodeURIComponent(id)}`, {
    token,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as AdminOk<{ item: AdminAchievementItem }>;
  if (!res.ok || !json.success || !json.data?.item) throwFrom(res, json);
  return json.data.item;
}

export async function deleteAdminAchievement(
  token: string,
  id: string
): Promise<{ id: string; deactivated?: boolean }> {
  const res = await adminAuthenticatedFetch(`${MGMT}/achievements/${encodeURIComponent(id)}`, {
    token,
    method: 'DELETE',
  });
  const json = (await res.json().catch(() => ({}))) as AdminOk<{ id: string; deactivated?: boolean }>;
  if (!res.ok || !json.success || !json.data) throwFrom(res, json);
  return json.data;
}

export const MODULE_LABELS: Record<AchievementModule, string> = {
  profile: 'Profile',
  blog: 'Blog',
  reading: 'Reading',
  social: 'Social',
  engagement: 'Engagement',
  meta: 'Meta',
};

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  engagement: 'Engagement',
  profile: 'Profile',
  reading: 'Reading',
  social: 'Social',
  meta: 'Meta',
};
