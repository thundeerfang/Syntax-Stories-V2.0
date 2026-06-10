import { adminAuthenticatedFetch } from '@/lib/auth/adminAuthenticatedFetch';

/**
 * API origin only (no path). Defaults to `http://localhost:7373` in development
 * when `NEXT_PUBLIC_API_BASE_URL` is unset — avoids 404s from calling `/auth/*` on the Next dev server.
 */
export function getApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? '';
  if (raw) return raw.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:7373';
  }
  return '';
}

export function apiUrl(path: string): string {
  const base = getApiOrigin();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

export type MeUser = {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  staffRole?: string | null;
};

export async function fetchMe(token?: string | null): Promise<{ user: MeUser }> {
  const res = await adminAuthenticatedFetch('/auth/me', { token: token ?? null });
  const json = (await res.json()) as {
    success?: boolean;
    data?: { user: MeUser };
    message?: string;
  };
  if (!res.ok || !json.data?.user) {
    throw new Error(json.message ?? 'Failed to load account');
  }
  return { user: json.data.user };
}

export type TrashBlogItem = {
  _id: string;
  title: string;
  slug: string;
  deletedAt: string | null;
  authorId: string;
  authorUsername: string | null;
  authorEmail: string | null;
};

export type TrashUserItem = {
  _id: string;
  email: string;
  username: string;
  fullName: string;
  updatedAt: string | null;
};

export type TrashResponse = {
  success: boolean;
  page: number;
  pageSize: number;
  blog?: { data: TrashBlogItem[]; total: number; page: number; pageSize: number };
  users?: { data: TrashUserItem[]; total: number; page: number; pageSize: number };
};

export async function fetchTrash(
  token: string,
  opts?: { sections?: string; page?: number; pageSize?: number }
): Promise<TrashResponse> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const sections = opts?.sections ?? 'blog,user';
  const res = await adminAuthenticatedFetch(
    `/api/v1/admin/trash?sections=${encodeURIComponent(sections)}&page=${page}&pageSize=${pageSize}`,
    { token }
  );
  const json = (await res.json()) as TrashResponse & { message?: string };
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to load trash');
  }
  return json;
}

export async function restoreTrashItem(
  token: string,
  resourceType: 'blog' | 'user',
  id: string
): Promise<void> {
  const res = await adminAuthenticatedFetch('/api/v1/admin/trash/restore', {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceType, id }),
  });
  const json = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Restore failed');
  }
}

const MGMT = '/api/v1/admin/management';

export type FeedbackSubmissionListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  categoryLabel: string;
  categorySlug: string;
  createdAt: string | null;
  hasAttachment: boolean;
  userId: string | null;
  userRef: string | null;
  username: string | null;
};

export type FeedbackSubmissionDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  description: string;
  categoryId: string;
  categorySlug: string;
  categoryLabel: string;
  userId: string | null;
  userRef: string | null;
  username: string | null;
  attachmentUrl: string | null;
  attachmentTitle: string | null;
  attachmentMeta: {
    mime?: string;
    width?: number;
    height?: number;
    bytesIn?: number;
    bytesOut?: number;
    originalName?: string;
  } | null;
  clientMeta: Record<string, unknown> | null;
  serverMeta: {
    submittedAtIst: string;
    ip?: string;
    forwardedFor?: string;
    userAgent?: string;
    istTimeZone: string;
  };
  emailDelivered: boolean;
  emailError: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function listFeedbackSubmissions(
  token: string,
  opts?: { limit?: number; cursor?: string | null }
): Promise<{ items: FeedbackSubmissionListItem[]; nextCursor: string | null }> {
  const q = new URLSearchParams();
  if (opts?.limit) q.set('limit', String(opts.limit));
  if (opts?.cursor) q.set('cursor', opts.cursor);
  const res = await adminAuthenticatedFetch(`${MGMT}/feedback-submissions?${q.toString()}`, {
    token,
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: { items: FeedbackSubmissionListItem[]; nextCursor: string | null };
    error?: { message?: string };
    message?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? json.message ?? 'Failed to load feedback');
  }
  return json.data;
}

export type FeedbackCategoryItem = {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
  active: boolean;
  createdAtIst: string;
  updatedAtIst: string;
};

export async function listFeedbackCategories(token: string): Promise<FeedbackCategoryItem[]> {
  const res = await adminAuthenticatedFetch(`${MGMT}/feedback-categories`, { token });
  const json = (await res.json()) as {
    success?: boolean;
    data?: { items: FeedbackCategoryItem[] };
    error?: { message?: string };
    message?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? json.message ?? 'Failed to load feedback categories');
  }
  return json.data.items;
}

export async function createFeedbackCategory(
  token: string,
  body: { label: string; sortOrder?: number }
): Promise<FeedbackCategoryItem> {
  const res = await adminAuthenticatedFetch(`${MGMT}/feedback-categories`, {
    token,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: { item: FeedbackCategoryItem };
    error?: { message?: string };
    message?: string;
  };
  if (!res.ok || !json.success || !json.data?.item) {
    throw new Error(json.error?.message ?? json.message ?? 'Failed to create category');
  }
  return json.data.item;
}

export async function deleteFeedbackCategory(
  token: string,
  id: string
): Promise<{ id: string; deleted?: boolean; deactivated?: boolean; submissionCount?: number }> {
  const res = await adminAuthenticatedFetch(
    `${MGMT}/feedback-categories/${encodeURIComponent(id)}`,
    { token, method: 'DELETE' }
  );
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { id: string; deleted?: boolean; deactivated?: boolean; submissionCount?: number };
    error?: { message?: string };
    message?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? json.message ?? 'Failed to delete category');
  }
  return json.data;
}

export async function patchFeedbackCategory(
  token: string,
  id: string,
  body: { label?: string; sortOrder?: number; active?: boolean }
): Promise<FeedbackCategoryItem> {
  const res = await adminAuthenticatedFetch(`${MGMT}/feedback-categories/${encodeURIComponent(id)}`, {
    token,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: { item: FeedbackCategoryItem };
    error?: { message?: string };
    message?: string;
  };
  if (!res.ok || !json.success || !json.data?.item) {
    throw new Error(json.error?.message ?? json.message ?? 'Failed to update category');
  }
  return json.data.item;
}

export async function getFeedbackSubmission(
  token: string,
  id: string
): Promise<{ submission: FeedbackSubmissionDetail }> {
  const res = await adminAuthenticatedFetch(
    `${MGMT}/feedback-submissions/${encodeURIComponent(id)}`,
    {
      token,
    }
  );
  const json = (await res.json()) as {
    success?: boolean;
    data?: { submission: FeedbackSubmissionDetail };
    error?: { message?: string };
    message?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? json.message ?? 'Failed to load feedback');
  }
  return json.data;
}

export type ContactLeadListItem = {
  id: string;
  fullName: string;
  email: string;
  company: string | null;
  topic: string;
  createdAt: string | null;
  userId: string | null;
  userRef: string | null;
  username: string | null;
};

export type ContactLeadDetail = {
  id: string;
  fullName: string;
  email: string;
  company: string | null;
  topic: string;
  message: string;
  userId: string | null;
  userRef: string | null;
  username: string | null;
  clientMeta: Record<string, unknown> | null;
  serverMeta: {
    submittedAtIst: string;
    ip?: string;
    forwardedFor?: string;
    userAgent?: string;
    istTimeZone: string;
  };
  createdAt: string | null;
  updatedAt: string | null;
};

export async function listContactLeads(
  token: string,
  opts?: { limit?: number; cursor?: string | null }
): Promise<{ items: ContactLeadListItem[]; nextCursor: string | null }> {
  const q = new URLSearchParams();
  if (opts?.limit) q.set('limit', String(opts.limit));
  if (opts?.cursor) q.set('cursor', opts.cursor);
  const res = await adminAuthenticatedFetch(`${MGMT}/contact-leads?${q.toString()}`, { token });
  const json = (await res.json()) as {
    success?: boolean;
    data?: { items: ContactLeadListItem[]; nextCursor: string | null };
    error?: { message?: string };
    message?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? json.message ?? 'Failed to load contact leads');
  }
  return json.data;
}

export async function getContactLead(
  token: string,
  id: string
): Promise<{ lead: ContactLeadDetail }> {
  const res = await adminAuthenticatedFetch(`${MGMT}/contact-leads/${encodeURIComponent(id)}`, {
    token,
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: { lead: ContactLeadDetail };
    error?: { message?: string };
    message?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? json.message ?? 'Failed to load contact lead');
  }
  return json.data;
}
