import { resolvePublicApiBase } from '@/lib/publicApiBase';
import { getOrCreateDeviceFingerprint } from '@/lib/deviceFingerprint';

/** Must match server `IMAGE_MASTER_PROFILES.feedback.maxInputBytes`. */
export const FEEDBACK_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type FeedbackClientMeta = {
  pageUrl?: string;
  referrer?: string;
  language?: string;
  languages?: string;
  platform?: string;
  userAgent?: string;
  screen?: string;
  timezone?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connection?: string;
};

export type FeedbackCategoryDto = {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
  active: boolean;
  isSystemSeed: boolean;
  createdByLabel: string;
  updatedByLabel: string;
  createdAtIst: string;
  updatedAtIst: string;
};

export function collectFeedbackClientMeta(): FeedbackClientMeta | undefined {
  if (typeof window === 'undefined') return undefined;
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string };
    deviceMemory?: number;
  };
  const conn = nav.connection?.effectiveType;
  return {
    pageUrl: window.location.href.slice(0, 2000),
    referrer: document.referrer ? document.referrer.slice(0, 2000) : undefined,
    language: navigator.language?.slice(0, 80),
    languages: navigator.languages?.join(',')?.slice(0, 200),
    platform: navigator.platform?.slice(0, 120),
    userAgent: navigator.userAgent?.slice(0, 512),
    screen:
      typeof window.screen?.width === 'number' && typeof window.screen?.height === 'number'
        ? `${window.screen.width}x${window.screen.height}`.slice(0, 40)
        : undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone?.slice(0, 80),
    deviceMemory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : undefined,
    hardwareConcurrency:
      typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : undefined,
    connection: typeof conn === 'string' ? conn.slice(0, 40) : undefined,
  };
}

export type SubmitFeedbackResponse = {
  success: boolean;
  message?: string;
  emailSent?: boolean;
};

function apiBase(): string {
  return resolvePublicApiBase().replace(/\/$/, '');
}

function categoriesUrl(): string {
  const b = apiBase();
  const path = '/api/feedback/categories';
  return b ? `${b}${path}` : path;
}

function submitUrl(): string {
  const b = apiBase();
  const path = '/api/feedback';
  return b ? `${b}${path}` : path;
}

export async function fetchFeedbackCategories(): Promise<FeedbackCategoryDto[]> {
  const res = await fetch(categoriesUrl(), { method: 'GET' });
  const text = await res.text();
  let data: { success?: boolean; categories?: FeedbackCategoryDto[]; message?: string } = {};
  try {
    data = text ? (JSON.parse(text) as typeof data) : {};
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(data.message || 'Could not load categories.');
  }
  return Array.isArray(data.categories) ? data.categories : [];
}

export type SubmitFeedbackMultipartParams = {
  categoryId: string;
  subject: string;
  description: string;
  clientMeta?: FeedbackClientMeta;
  firstName?: string;
  lastName?: string;
  email?: string;
  altcha?: string;
  attachment?: File | null;
  /** Shown as title + alt for the attachment when saved (max 120 chars). */
  attachmentTitle?: string | null;
};

export async function submitFeedbackMultipart(
  params: SubmitFeedbackMultipartParams,
  token?: string | null
): Promise<SubmitFeedbackResponse> {
  const fd = new FormData();
  fd.set('categoryId', params.categoryId);
  fd.set('subject', params.subject);
  fd.set('description', params.description);
  if (params.clientMeta && Object.keys(params.clientMeta).length > 0) {
    fd.set('clientMeta', JSON.stringify(params.clientMeta));
  }
  if (params.firstName != null) fd.set('firstName', params.firstName);
  if (params.lastName != null) fd.set('lastName', params.lastName);
  if (params.email != null) fd.set('email', params.email);
  if (params.altcha) fd.set('altcha', params.altcha);
  if (params.attachment && params.attachment.size > 0) {
    fd.set('attachment', params.attachment, params.attachment.name);
  }
  if (params.attachmentTitle != null && params.attachmentTitle.trim() !== '') {
    fd.set('attachmentTitle', params.attachmentTitle.trim().slice(0, 120));
  }

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const fp = getOrCreateDeviceFingerprint();
  if (fp) headers['X-Device-Fingerprint'] = fp;

  const res = await fetch(submitUrl(), {
    method: 'POST',
    headers,
    body: fd,
  });
  const text = await res.text();
  let data: SubmitFeedbackResponse = { success: false };
  try {
    data = text ? (JSON.parse(text) as SubmitFeedbackResponse) : data;
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const msg =
      (typeof data.message === 'string' && data.message) ||
      (res.status === 429 ? 'Too many requests. Try again later.' : 'Could not send feedback.');
    throw new Error(msg);
  }
  return data;
}
