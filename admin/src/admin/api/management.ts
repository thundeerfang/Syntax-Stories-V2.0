import { adminAuthenticatedFetch } from '@/lib/auth/adminAuthenticatedFetch';
import { userRefForApiPath } from '@/lib/users/normalizeUserRef';
import type { ManagementMePayload } from '@/store/session';
import type {
  AdminOperatorKind,
  AdminOperatorRow,
  AdminRoleRow,
  CatalogPermissionRow,
  CatalogSlugRow,
  AdminUserDetail,
  AdminUserListItem,
  AdminBlogDetailResponse,
  AdminBlogEngagementResponse,
  AdminBlogCategoryDetail,
  AdminBlogCategoryListItem,
  AdminBlogTagDetail,
  AdminBlogTagListItem,
  AdminBlogListItem,
} from '../types';

type ApiErr = { success?: boolean; error?: { code?: string; message?: string }; message?: string };

async function parseJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

function throwFromAdmin(res: Response, json: ApiErr): never {
  const msg = json.error?.message ?? json.message ?? res.statusText;
  throw new Error(msg);
}

const BASE = '/api/v1/admin/management';

export type IamSimulateResult = {
  allowed: boolean;
  action: string;
  roleName: string | null;
  permissionCount: number;
  securityZones: string[];
  capabilityIds: number[];
  reason?: string;
  code?: string;
};

/** Staff profile + effective permissions for nav gating (`GET /management/me`). */
export async function fetchManagementMe(token: string | null): Promise<ManagementMePayload> {
  const res = await adminAuthenticatedFetch(`${BASE}/me`, { token });
  const json = await parseJson<{ success?: boolean; data?: ManagementMePayload } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export type { AdminSessionIdleStatus } from '@/store/session';

function mgmt(
  token: string | null,
  path: string,
  init?: RequestInit & { method?: string; body?: BodyInit | null }
): Promise<Response> {
  return adminAuthenticatedFetch(`${BASE}${path}`, { token, ...init });
}

export type AdminUserAccountFilter = 'all' | 'platform' | 'staff';

export async function listUsers(
  token: string | null,
  opts?: { limit?: number; cursor?: string | null; accountType?: AdminUserAccountFilter }
): Promise<{ items: AdminUserListItem[]; nextCursor: string | null }> {
  const q = new URLSearchParams();
  if (opts?.limit) q.set('limit', String(opts.limit));
  if (opts?.cursor) q.set('cursor', opts.cursor);
  if (opts?.accountType && opts.accountType !== 'all') {
    q.set('accountType', opts.accountType);
  }
  const res = await adminAuthenticatedFetch(`${BASE}/users?${q.toString()}`, { token });
  const json = await parseJson<
    { success?: boolean; data?: { items: AdminUserListItem[]; nextCursor: string | null } } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function searchUsers(
  token: string | null,
  q: string,
  limit = 20,
  accountType?: AdminUserAccountFilter
): Promise<{ items: AdminUserListItem[] }> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  if (accountType && accountType !== 'all') {
    params.set('accountType', accountType);
  }
  const res = await adminAuthenticatedFetch(`${BASE}/users/search?${params.toString()}`, { token });
  const json = await parseJson<
    { success?: boolean; data?: { items: AdminUserListItem[] } } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function getUser(
  token: string | null,
  id: string
): Promise<{ user: AdminUserDetail }> {
  const res = await adminAuthenticatedFetch(`${BASE}/users/${userRefForApiPath(id)}`, { token });
  const json = await parseJson<{ success?: boolean; data?: { user: AdminUserDetail } } & ApiErr>(
    res
  );
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export type AdminUserLedgerItem = {
  id: string;
  stripeInvoiceId: string;
  amountPaid: number;
  currency: string;
  status: string;
  paidAt: string | null;
  description: string;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
};

export async function getUserLedger(
  token: string | null,
  userRef: string
): Promise<{ items: AdminUserLedgerItem[] }> {
  const res = await adminAuthenticatedFetch(
    `${BASE}/users/${userRefForApiPath(userRef)}/ledger`,
    { token }
  );
  const json = await parseJson<{ success?: boolean; data?: { items: AdminUserLedgerItem[] } } & ApiErr>(
    res
  );
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export type AdminUserFollowItem = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  profileImg: string;
  followedAt: string | null;
};

export async function getUserFollows(
  token: string | null,
  userRef: string,
  type: 'followers' | 'following'
): Promise<{ type: 'followers' | 'following'; items: AdminUserFollowItem[] }> {
  const res = await adminAuthenticatedFetch(
    `${BASE}/users/${userRefForApiPath(userRef)}/follows?type=${type}`,
    { token }
  );
  const json = await parseJson<
    {
      success?: boolean;
      data?: { type: 'followers' | 'following'; items: AdminUserFollowItem[] };
    } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function listBlogs(
  token: string | null,
  opts?: { limit?: number; cursor?: string; status?: 'draft' | 'published'; q?: string }
): Promise<{ items: AdminBlogListItem[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.cursor) params.set('cursor', opts.cursor);
  if (opts?.status) params.set('status', opts.status);
  if (opts?.q) params.set('q', opts.q);
  const qs = params.toString();
  const res = await adminAuthenticatedFetch(`${BASE}/blogs${qs ? `?${qs}` : ''}`, { token });
  const json = await parseJson<
    { success?: boolean; data?: { items: AdminBlogListItem[]; nextCursor: string | null } } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function getBlog(
  token: string | null,
  postId: string
): Promise<AdminBlogDetailResponse> {
  const res = await adminAuthenticatedFetch(
    `${BASE}/blogs/${encodeURIComponent(postId)}`,
    { token }
  );
  const json = await parseJson<{ success?: boolean; data?: AdminBlogDetailResponse } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function suspendBlogPost(
  token: string | null,
  postId: string
): Promise<{ id: string; status: 'suspended' }> {
  const res = await mgmt(token, `/blogs/${encodeURIComponent(postId)}/suspend`, {
    method: 'POST',
  });
  const json = await parseJson<
    { success?: boolean; data?: { id: string; status: 'suspended' } } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function deleteBlogPost(token: string | null, postId: string): Promise<{ id: string }> {
  const res = await mgmt(token, `/blogs/${encodeURIComponent(postId)}`, { method: 'DELETE' });
  const json = await parseJson<{ success?: boolean; data?: { id: string } } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function unsuspendBlogPost(
  token: string | null,
  postId: string
): Promise<{ id: string; status: 'draft' | 'published' }> {
  const res = await mgmt(token, `/blogs/${encodeURIComponent(postId)}/unsuspend`, {
    method: 'POST',
  });
  const json = await parseJson<
    { success?: boolean; data?: { id: string; status: 'draft' | 'published' } } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function restoreBlogPost(
  token: string | null,
  postId: string
): Promise<{ id: string; status: string }> {
  const res = await mgmt(token, `/blogs/${encodeURIComponent(postId)}/restore`, {
    method: 'POST',
  });
  const json = await parseJson<
    { success?: boolean; data?: { id: string; status: string } } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function getBlogEngagement(
  token: string | null,
  postId: string,
  metric: AdminBlogEngagementResponse['metric'],
  opts?: { limit?: number }
): Promise<AdminBlogEngagementResponse> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  const res = await adminAuthenticatedFetch(
    `${BASE}/blogs/${encodeURIComponent(postId)}/engagement/${encodeURIComponent(metric)}${qs ? `?${qs}` : ''}`,
    { token }
  );
  const json = await parseJson<{ success?: boolean; data?: AdminBlogEngagementResponse } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function listBlogCategories(
  token: string | null,
  opts?: { q?: string; sort?: 'sortOrder' | 'name' | 'posts' | 'followers' }
): Promise<{ items: AdminBlogCategoryListItem[] }> {
  const params = new URLSearchParams();
  if (opts?.q) params.set('q', opts.q);
  if (opts?.sort) params.set('sort', opts.sort);
  const qs = params.toString();
  const res = await adminAuthenticatedFetch(
    `${BASE}/blog-categories${qs ? `?${qs}` : ''}`,
    { token }
  );
  const json = await parseJson<
    { success?: boolean; data?: { items: AdminBlogCategoryListItem[] } } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function getBlogCategory(
  token: string | null,
  ref: string
): Promise<AdminBlogCategoryDetail> {
  const res = await adminAuthenticatedFetch(
    `${BASE}/blog-categories/${encodeURIComponent(ref)}`,
    { token }
  );
  const json = await parseJson<{ success?: boolean; data?: AdminBlogCategoryDetail } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function createBlogCategory(
  token: string | null,
  body: { name: string; description?: string; sortOrder?: number }
): Promise<AdminBlogCategoryListItem> {
  const res = await adminAuthenticatedFetch(`${BASE}/blog-categories`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<{ success?: boolean; data?: AdminBlogCategoryListItem } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export type BulkCreateBlogCategoriesResult = {
  created: AdminBlogCategoryListItem[];
  failed: { index: number; name: string; message: string }[];
};

export async function bulkCreateBlogCategories(
  token: string | null,
  items: { name: string; description?: string; sortOrder?: number; slug?: string }[]
): Promise<BulkCreateBlogCategoriesResult> {
  const res = await adminAuthenticatedFetch(`${BASE}/blog-categories/bulk`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  const json = await parseJson<
    { success?: boolean; data?: BulkCreateBlogCategoriesResult } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function updateBlogCategory(
  token: string | null,
  ref: string,
  body: { name?: string; description?: string | null; sortOrder?: number }
): Promise<AdminBlogCategoryDetail> {
  const res = await adminAuthenticatedFetch(
    `${BASE}/blog-categories/${encodeURIComponent(ref)}`,
    {
      method: 'PATCH',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  const json = await parseJson<{ success?: boolean; data?: AdminBlogCategoryDetail } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function listBlogTags(
  token: string | null,
  opts?: { q?: string; sort?: 'sortOrder' | 'name' | 'posts' }
): Promise<{ items: AdminBlogTagListItem[] }> {
  const params = new URLSearchParams();
  if (opts?.q) params.set('q', opts.q);
  if (opts?.sort) params.set('sort', opts.sort);
  const qs = params.toString();
  const res = await adminAuthenticatedFetch(`${BASE}/blog-tags${qs ? `?${qs}` : ''}`, { token });
  const json = await parseJson<{ success?: boolean; data?: { items: AdminBlogTagListItem[] } } & ApiErr>(
    res
  );
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function getBlogTag(
  token: string | null,
  ref: string
): Promise<AdminBlogTagDetail> {
  const res = await adminAuthenticatedFetch(`${BASE}/blog-tags/${encodeURIComponent(ref)}`, { token });
  const json = await parseJson<{ success?: boolean; data?: AdminBlogTagDetail } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function createBlogTag(
  token: string | null,
  body: { name: string; description?: string; sortOrder?: number }
): Promise<AdminBlogTagListItem> {
  const res = await adminAuthenticatedFetch(`${BASE}/blog-tags`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<{ success?: boolean; data?: AdminBlogTagListItem } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export type BulkCreateBlogTagsResult = {
  created: AdminBlogTagListItem[];
  failed: { index: number; name: string; message: string }[];
};

export async function bulkCreateBlogTags(
  token: string | null,
  items: { name: string; description?: string; sortOrder?: number; slug?: string }[]
): Promise<BulkCreateBlogTagsResult> {
  const res = await adminAuthenticatedFetch(`${BASE}/blog-tags/bulk`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  const json = await parseJson<
    { success?: boolean; data?: BulkCreateBlogTagsResult } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function updateBlogTag(
  token: string | null,
  ref: string,
  body: { name?: string; description?: string | null; sortOrder?: number }
): Promise<AdminBlogTagDetail> {
  const res = await adminAuthenticatedFetch(`${BASE}/blog-tags/${encodeURIComponent(ref)}`, {
    method: 'PATCH',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<{ success?: boolean; data?: AdminBlogTagDetail } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function postLockUser(token: string | null, id: string): Promise<void> {
  const res = await adminAuthenticatedFetch(`${BASE}/users/${userRefForApiPath(id)}/lock`, {
    method: 'POST',
    token,
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function postUnlockUser(token: string | null, id: string): Promise<void> {
  const res = await adminAuthenticatedFetch(`${BASE}/users/${userRefForApiPath(id)}/unlock`, {
    method: 'POST',
    token,
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function postRevokeSessions(token: string | null, id: string): Promise<void> {
  const res = await adminAuthenticatedFetch(
    `${BASE}/users/${userRefForApiPath(id)}/revoke-sessions`,
    { method: 'POST', token }
  );
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function listRoles(
  token: string | null,
  includeDeleted = false
): Promise<{ roles: AdminRoleRow[] }> {
  const q = includeDeleted ? '?includeDeleted=1' : '';
  const res = await adminAuthenticatedFetch(`${BASE}/roles${q}`, { token });
  const json = await parseJson<{ success?: boolean; data?: { roles: AdminRoleRow[] } } & ApiErr>(
    res
  );
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function createRole(
  token: string | null,
  body: { name: string; level: number; permissions: string[]; description?: string }
): Promise<{ id: string }> {
  const res = await mgmt(token, '/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<{ success?: boolean; data?: { id: string } } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function updateRole(
  token: string | null,
  id: string,
  body: Partial<{ name: string; level: number; permissions: string[]; description: string | null }>
): Promise<void> {
  const res = await mgmt(token, `/roles/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function archiveRole(token: string | null, id: string): Promise<void> {
  const res = await adminAuthenticatedFetch(`${BASE}/roles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function restoreRole(token: string | null, id: string): Promise<void> {
  const res = await adminAuthenticatedFetch(`${BASE}/roles/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
    token,
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

type CatalogSegment =
  | 'access-resources'
  | 'access-actions'
  | 'access-scope-types'
  | 'access-permissions';

async function listCatalog<T>(
  token: string | null,
  segment: CatalogSegment,
  includeDeleted: boolean
): Promise<{ items: T[] }> {
  const q = includeDeleted ? '?includeDeleted=1' : '';
  const res = await adminAuthenticatedFetch(`${BASE}/${segment}${q}`, { token });
  const json = await parseJson<{ success?: boolean; data?: { items: T[] } } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function listAccessResources(
  token: string | null,
  includeDeleted = false
): Promise<{ items: CatalogSlugRow[] }> {
  return listCatalog<CatalogSlugRow>(token, 'access-resources', includeDeleted);
}

export async function listAccessActions(
  token: string | null,
  includeDeleted = false
): Promise<{ items: CatalogSlugRow[] }> {
  return listCatalog<CatalogSlugRow>(token, 'access-actions', includeDeleted);
}

export async function listAccessScopeTypes(
  token: string | null,
  includeDeleted = false
): Promise<{ items: CatalogSlugRow[] }> {
  return listCatalog<CatalogSlugRow>(token, 'access-scope-types', includeDeleted);
}

export async function listAccessPermissions(
  token: string | null,
  includeDeleted = false
): Promise<{ items: CatalogPermissionRow[] }> {
  return listCatalog<CatalogPermissionRow>(token, 'access-permissions', includeDeleted);
}

export async function createAccessResource(
  token: string | null,
  body: { displayName: string; description?: string; sortOrder?: number }
): Promise<{ id: string }> {
  const res = await mgmt(token, '/access-resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<{ success?: boolean; data?: { id: string } } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function updateAccessResource(
  token: string | null,
  id: string,
  body: { displayName?: string; description?: string | null; sortOrder?: number }
): Promise<void> {
  const res = await mgmt(token, `/access-resources/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function archiveAccessResource(token: string | null, id: string): Promise<void> {
  const res = await adminAuthenticatedFetch(`${BASE}/access-resources/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function restoreAccessResource(token: string | null, id: string): Promise<void> {
  const res = await adminAuthenticatedFetch(
    `${BASE}/access-resources/${encodeURIComponent(id)}/restore`,
    { method: 'POST', token }
  );
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function createAccessAction(
  token: string | null,
  body: { displayName: string; description?: string; sortOrder?: number }
): Promise<{ id: string }> {
  const res = await mgmt(token, '/access-actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<{ success?: boolean; data?: { id: string } } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function updateAccessAction(
  token: string | null,
  id: string,
  body: { displayName?: string; description?: string | null; sortOrder?: number }
): Promise<void> {
  const res = await mgmt(token, `/access-actions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function archiveAccessAction(token: string | null, id: string): Promise<void> {
  const res = await adminAuthenticatedFetch(`${BASE}/access-actions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function restoreAccessAction(token: string | null, id: string): Promise<void> {
  const res = await adminAuthenticatedFetch(
    `${BASE}/access-actions/${encodeURIComponent(id)}/restore`,
    { method: 'POST', token }
  );
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function createAccessScopeType(
  token: string | null,
  body: { displayName: string; description?: string; sortOrder?: number }
): Promise<{ id: string }> {
  const res = await mgmt(token, '/access-scope-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<{ success?: boolean; data?: { id: string } } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function updateAccessScopeType(
  token: string | null,
  id: string,
  body: { displayName?: string; description?: string | null; sortOrder?: number }
): Promise<void> {
  const res = await mgmt(token, `/access-scope-types/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function archiveAccessScopeType(token: string | null, id: string): Promise<void> {
  const res = await adminAuthenticatedFetch(
    `${BASE}/access-scope-types/${encodeURIComponent(id)}`,
    { method: 'DELETE', token }
  );
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function restoreAccessScopeType(token: string | null, id: string): Promise<void> {
  const res = await adminAuthenticatedFetch(
    `${BASE}/access-scope-types/${encodeURIComponent(id)}/restore`,
    { method: 'POST', token }
  );
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function createAccessPermission(
  token: string | null,
  body: {
    resource: string;
    action: string;
    type?: string;
    description?: string;
    sortOrder?: number;
  }
): Promise<{ id: string; key: string }> {
  const res = await mgmt(token, '/access-permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<{ success?: boolean; data?: { id: string; key: string } } & ApiErr>(
    res
  );
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function updateAccessPermission(
  token: string | null,
  id: string,
  body: { description?: string | null; sortOrder?: number }
): Promise<void> {
  const res = await mgmt(token, `/access-permissions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function archiveAccessPermission(token: string | null, id: string): Promise<void> {
  const res = await adminAuthenticatedFetch(
    `${BASE}/access-permissions/${encodeURIComponent(id)}`,
    { method: 'DELETE', token }
  );
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function restoreAccessPermission(token: string | null, id: string): Promise<void> {
  const res = await adminAuthenticatedFetch(
    `${BASE}/access-permissions/${encodeURIComponent(id)}/restore`,
    { method: 'POST', token }
  );
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function listAdminOperators(
  token: string | null
): Promise<{ items: AdminOperatorRow[] }> {
  const res = await adminAuthenticatedFetch(`${BASE}/admin-users`, { token });
  const json = await parseJson<
    { success?: boolean; data?: { items: AdminOperatorRow[] } } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function sendAdminInviteOtp(
  token: string | null,
  email: string
): Promise<{ otpVersion: number; expiresInSeconds: number }> {
  const res = await adminAuthenticatedFetch(`${BASE}/admin-users/send-invite-otp`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const json = await parseJson<
    { success?: boolean; data?: { otpVersion: number; expiresInSeconds: number } } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function verifyAdminInviteOtp(
  token: string | null,
  body: { email: string; code: string; otpVersion?: number }
): Promise<{ emailVerificationToken: string; expiresInSeconds: number }> {
  const res = await mgmt(token, '/admin-users/verify-invite-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: body.email.trim().toLowerCase(),
      code: body.code.replace(/\D/g, '').slice(0, 6),
      otpVersion: body.otpVersion,
    }),
  });
  const json = await parseJson<
    {
      success?: boolean;
      data?: { emailVerificationToken: string; expiresInSeconds: number };
    } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function createAdminOperator(
  token: string | null,
  body: {
    email: string;
    password: string;
    displayName: string;
    kind: AdminOperatorKind;
    roleId: string;
    emailVerificationToken: string;
  }
): Promise<void> {
  const res = await adminAuthenticatedFetch(`${BASE}/admin-users`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function patchAdminOperator(
  token: string | null,
  id: string,
  body: { roleId?: string; isActive?: boolean; kind?: AdminOperatorKind }
): Promise<void> {
  const res = await adminAuthenticatedFetch(`${BASE}/admin-users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export type AdminSessionRow = {
  id: string;
  deviceName: string;
  ip: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
  rotationGeneration: number;
  lastActiveAt: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  isCurrent: boolean;
};

export async function listMySessions(token: string | null): Promise<{
  currentSessionId: string | null;
  sessions: AdminSessionRow[];
}> {
  const res = await adminAuthenticatedFetch(`${BASE}/sessions`, { token });
  const json = await parseJson<
    {
      success?: boolean;
      data?: { currentSessionId: string | null; sessions: AdminSessionRow[] };
    } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function revokeMySession(token: string | null, sessionId: string): Promise<void> {
  const res = await adminAuthenticatedFetch(`${BASE}/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    token,
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function revokeOtherSessions(token: string | null): Promise<void> {
  const res = await adminAuthenticatedFetch(`${BASE}/sessions/revoke-others`, {
    method: 'POST',
    token,
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export type AuditLogRow = {
  id: string;
  action: string;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  timestamp: string | null;
};

export async function listAuditLogs(
  token: string | null,
  opts?: { limit?: number; cursor?: string | null; actionPrefix?: string; userId?: string }
): Promise<{ items: AuditLogRow[]; nextCursor: string | null }> {
  const q = new URLSearchParams();
  if (opts?.limit) q.set('limit', String(opts.limit));
  if (opts?.cursor) q.set('cursor', opts.cursor);
  if (opts?.actionPrefix) q.set('actionPrefix', opts.actionPrefix);
  if (opts?.userId) q.set('userId', opts.userId);
  const res = await adminAuthenticatedFetch(`${BASE}/audit-logs?${q.toString()}`, { token });
  const json = await parseJson<
    {
      success?: boolean;
      data?: { items: AuditLogRow[]; nextCursor: string | null };
    } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export type IamMetricsPayload = {
  metrics: Record<string, number>;
  derived: { refreshSuccessRate: number | null; permissionDeniedRate: number | null };
  collectedAt: string;
};

export async function fetchIamMetrics(token: string | null): Promise<IamMetricsPayload> {
  const res = await adminAuthenticatedFetch(`${BASE}/iam-metrics`, { token });
  const json = await parseJson<{ success?: boolean; data?: IamMetricsPayload } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export type TrustedDeviceRow = {
  id: string;
  deviceFingerprint: string;
  deviceName: string;
  ip: string | null;
  trustedAt: string | null;
  lastSeenAt: string | null;
};

export async function listTrustedDevices(
  token: string | null
): Promise<{ devices: TrustedDeviceRow[] }> {
  const res = await adminAuthenticatedFetch(`${BASE}/devices`, { token });
  const json = await parseJson<
    { success?: boolean; data?: { devices: TrustedDeviceRow[] } } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function trustCurrentDevice(token: string | null): Promise<void> {
  const res = await adminAuthenticatedFetch(`${BASE}/devices/trust-current`, {
    method: 'POST',
    token,
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function revokeTrustedDevice(token: string | null, deviceId: string): Promise<void> {
  const res = await adminAuthenticatedFetch(`${BASE}/devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
    token,
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function startImpersonation(
  token: string | null,
  userId: string
): Promise<{
  impersonation: {
    targetUserId: string;
    targetUsername: string | null;
    targetEmail: string | null;
    expiresAt: string;
  };
}> {
  const res = await adminAuthenticatedFetch(
    `${BASE}/users/${userRefForApiPath(userId)}/impersonate`,
    {
      method: 'POST',
      token,
    }
  );
  const json = await parseJson<
    {
      success?: boolean;
      data?: {
        impersonation: {
          targetUserId: string;
          targetUsername: string | null;
          targetEmail: string | null;
          expiresAt: string;
        };
      };
    } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function endImpersonation(token: string | null): Promise<void> {
  const res = await adminAuthenticatedFetch(`${BASE}/impersonation/end`, { method: 'POST', token });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export type FederationStatusPayload = {
  saml: {
    enabled: boolean;
    entityId: string | null;
    idpSsoUrl?: string | null;
    acsUrl?: string | null;
    metadataPath?: string;
    loginPath?: string;
  };
  scim: {
    enabled: boolean;
    baseUrl: string | null;
    usersPath?: string;
    tokenConfigured?: boolean;
  };
  configured: boolean;
};

export type RiskAssessmentPayload = {
  score: number;
  decision: 'ALLOW' | 'STEP_UP' | 'BLOCK';
  signals: string[];
};

export async function fetchSessionRisk(token: string | null): Promise<RiskAssessmentPayload> {
  const res = await adminAuthenticatedFetch(`${BASE}/risk`, { token });
  const json = await parseJson<{ success?: boolean; data?: RiskAssessmentPayload } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export type TemporalGrantRow = {
  id: string;
  userId: string;
  grantedById: string;
  permissions: string[];
  reason: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};

export async function listIamElevations(
  token: string | null,
  opts?: { userId?: string; includeExpired?: boolean }
): Promise<{ items: TemporalGrantRow[] }> {
  const q = new URLSearchParams();
  if (opts?.userId) q.set('userId', opts.userId);
  if (opts?.includeExpired) q.set('includeExpired', '1');
  const res = await adminAuthenticatedFetch(`${BASE}/iam/elevations?${q.toString()}`, { token });
  const json = await parseJson<
    { success?: boolean; data?: { items: TemporalGrantRow[] } } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function createIamElevation(
  token: string | null,
  body: { userId?: string; permissions: string[]; reason?: string; durationMinutes?: number }
): Promise<{ id: string; expiresAt: string }> {
  const res = await adminAuthenticatedFetch(`${BASE}/iam/elevations`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<
    { success?: boolean; data?: { id: string; expiresAt: string } } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function revokeIamElevation(
  token: string | null,
  grantId: string,
  userId?: string
): Promise<void> {
  const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const res = await adminAuthenticatedFetch(
    `${BASE}/iam/elevations/${encodeURIComponent(grantId)}${q}`,
    {
      method: 'DELETE',
      token,
    }
  );
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function fetchFederationStatus(
  token: string | null
): Promise<FederationStatusPayload> {
  const res = await adminAuthenticatedFetch(`${BASE}/federation`, { token });
  const json = await parseJson<{ success?: boolean; data?: FederationStatusPayload } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function simulateIamPermission(
  token: string | null,
  body: { roleId?: string; permissions?: string[]; action: string }
): Promise<IamSimulateResult> {
  const res = await adminAuthenticatedFetch(`${BASE}/iam/simulate`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<{ success?: boolean; data?: IamSimulateResult } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}
