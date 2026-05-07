import { apiUrl } from '@/lib/api';
import type {
  AdminOperatorKind,
  AdminOperatorRow,
  AdminRoleRow,
  CatalogPermissionRow,
  CatalogSlugRow,
  AdminUserDetail,
  AdminUserListItem,
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

export async function listUsers(
  token: string,
  opts?: { limit?: number; cursor?: string | null }
): Promise<{ items: AdminUserListItem[]; nextCursor: string | null }> {
  const q = new URLSearchParams();
  if (opts?.limit) q.set('limit', String(opts.limit));
  if (opts?.cursor) q.set('cursor', opts.cursor);
  const res = await fetch(apiUrl(`${BASE}/users?${q.toString()}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<{ success?: boolean; data?: { items: AdminUserListItem[]; nextCursor: string | null } } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function searchUsers(
  token: string,
  q: string,
  limit = 20
): Promise<{ items: AdminUserListItem[] }> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  const res = await fetch(apiUrl(`${BASE}/users/search?${params.toString()}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<{ success?: boolean; data?: { items: AdminUserListItem[] } } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function getUser(token: string, id: string): Promise<{ user: AdminUserDetail }> {
  const res = await fetch(apiUrl(`${BASE}/users/${encodeURIComponent(id)}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<{ success?: boolean; data?: { user: AdminUserDetail } } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function postLockUser(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/users/${encodeURIComponent(id)}/lock`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function postUnlockUser(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/users/${encodeURIComponent(id)}/unlock`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function postRevokeSessions(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/users/${encodeURIComponent(id)}/revoke-sessions`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function listRoles(
  token: string,
  includeDeleted = false
): Promise<{ roles: AdminRoleRow[] }> {
  const q = includeDeleted ? '?includeDeleted=1' : '';
  const res = await fetch(apiUrl(`${BASE}/roles${q}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<{ success?: boolean; data?: { roles: AdminRoleRow[] } } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function createRole(
  token: string,
  body: { name: string; level: number; permissions: string[]; description?: string }
): Promise<{ id: string }> {
  const res = await fetch(apiUrl(`${BASE}/roles`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<{ success?: boolean; data?: { id: string } } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function updateRole(
  token: string,
  id: string,
  body: Partial<{ name: string; level: number; permissions: string[]; description: string | null }>
): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/roles/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function archiveRole(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/roles/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function restoreRole(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/roles/${encodeURIComponent(id)}/restore`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

type CatalogSegment = 'access-resources' | 'access-actions' | 'access-scope-types' | 'access-permissions';

async function listCatalog<T>(
  token: string,
  segment: CatalogSegment,
  includeDeleted: boolean
): Promise<{ items: T[] }> {
  const q = includeDeleted ? '?includeDeleted=1' : '';
  const res = await fetch(apiUrl(`${BASE}/${segment}${q}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<{ success?: boolean; data?: { items: T[] } } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function listAccessResources(
  token: string,
  includeDeleted = false
): Promise<{ items: CatalogSlugRow[] }> {
  return listCatalog<CatalogSlugRow>(token, 'access-resources', includeDeleted);
}

export async function listAccessActions(
  token: string,
  includeDeleted = false
): Promise<{ items: CatalogSlugRow[] }> {
  return listCatalog<CatalogSlugRow>(token, 'access-actions', includeDeleted);
}

export async function listAccessScopeTypes(
  token: string,
  includeDeleted = false
): Promise<{ items: CatalogSlugRow[] }> {
  return listCatalog<CatalogSlugRow>(token, 'access-scope-types', includeDeleted);
}

export async function listAccessPermissions(
  token: string,
  includeDeleted = false
): Promise<{ items: CatalogPermissionRow[] }> {
  return listCatalog<CatalogPermissionRow>(token, 'access-permissions', includeDeleted);
}

export async function createAccessResource(
  token: string,
  body: { slug: string; displayName: string; description?: string; sortOrder?: number }
): Promise<{ id: string }> {
  const res = await fetch(apiUrl(`${BASE}/access-resources`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<{ success?: boolean; data?: { id: string } } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function updateAccessResource(
  token: string,
  id: string,
  body: { displayName?: string; description?: string | null; sortOrder?: number }
): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/access-resources/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function archiveAccessResource(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/access-resources/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function restoreAccessResource(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/access-resources/${encodeURIComponent(id)}/restore`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function createAccessAction(
  token: string,
  body: { slug: string; displayName: string; description?: string; sortOrder?: number }
): Promise<{ id: string }> {
  const res = await fetch(apiUrl(`${BASE}/access-actions`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<{ success?: boolean; data?: { id: string } } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function updateAccessAction(
  token: string,
  id: string,
  body: { displayName?: string; description?: string | null; sortOrder?: number }
): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/access-actions/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function archiveAccessAction(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/access-actions/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function restoreAccessAction(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/access-actions/${encodeURIComponent(id)}/restore`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function createAccessScopeType(
  token: string,
  body: { slug: string; displayName: string; description?: string; sortOrder?: number }
): Promise<{ id: string }> {
  const res = await fetch(apiUrl(`${BASE}/access-scope-types`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<{ success?: boolean; data?: { id: string } } & ApiErr>(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function updateAccessScopeType(
  token: string,
  id: string,
  body: { displayName?: string; description?: string | null; sortOrder?: number }
): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/access-scope-types/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function archiveAccessScopeType(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/access-scope-types/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function restoreAccessScopeType(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/access-scope-types/${encodeURIComponent(id)}/restore`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function createAccessPermission(
  token: string,
  body: { resource: string; action: string; type?: string; description?: string; sortOrder?: number }
): Promise<{ id: string; key: string }> {
  const res = await fetch(apiUrl(`${BASE}/access-permissions`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<
    { success?: boolean; data?: { id: string; key: string } } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function updateAccessPermission(
  token: string,
  id: string,
  body: { description?: string | null; sortOrder?: number }
): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/access-permissions/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function archiveAccessPermission(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/access-permissions/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function restoreAccessPermission(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/access-permissions/${encodeURIComponent(id)}/restore`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function listAdminOperators(token: string): Promise<{ items: AdminOperatorRow[] }> {
  const res = await fetch(apiUrl(`${BASE}/admin-users`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<
    { success?: boolean; data?: { items: AdminOperatorRow[] } } & ApiErr
  >(res);
  if (!res.ok || !json.success || !json.data) throwFromAdmin(res, json);
  return json.data;
}

export async function createAdminOperator(
  token: string,
  body: {
    email: string;
    password: string;
    displayName: string;
    kind: AdminOperatorKind;
    roleId: string;
  }
): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/admin-users`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}

export async function patchAdminOperator(
  token: string,
  id: string,
  body: { roleId?: string; isActive?: boolean; kind?: AdminOperatorKind }
): Promise<void> {
  const res = await fetch(apiUrl(`${BASE}/admin-users/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await parseJson<ApiErr & { success?: boolean }>(res);
  if (!res.ok || json.success === false) throwFromAdmin(res, json);
}
