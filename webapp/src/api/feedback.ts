import { blogAuthFetch } from '@/lib/api/blogAuthFetch';
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';
import { getOrCreateDeviceFingerprint } from '@/lib/auth/deviceFingerprint';

export {
  FEEDBACK_MAX_IMAGE_BYTES,
  type FeedbackClientMeta,
  type FeedbackCategoryDto,
  type FeedbackQuotaResponse,
  type FeedbackWeeklyQuota,
  type SubmitFeedbackResponse,
  type SubmitFeedbackMultipartParams,
} from '@contracts/feedbackApi';

import type {
  FeedbackCategoryDto,
  FeedbackClientMeta,
  FeedbackQuotaResponse,
  FeedbackWeeklyQuota,
  SubmitFeedbackMultipartParams,
  SubmitFeedbackResponse,
} from '@contracts/feedbackApi';

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

function quotaUrl(): string {
  const b = apiBase();
  const path = '/api/feedback/quota';
  return b ? `${b}${path}` : path;
}

export async function fetchFeedbackQuota(accessToken: string): Promise<FeedbackWeeklyQuota> {
  const res = await blogAuthFetch(quotaUrl(), { method: 'GET' }, accessToken);
  const data = (await res.json().catch(() => ({}))) as FeedbackQuotaResponse & {
    message?: string;
  };
  if (!res.ok || !data.quota) {
    throw new Error(data.message ?? res.statusText ?? 'Could not load feedback quota.');
  }
  return data.quota;
}

export async function submitFeedbackMultipart(
  params: SubmitFeedbackMultipartParams,
  token: string
): Promise<SubmitFeedbackResponse> {
  if (!token?.trim()) {
    throw new Error('Sign in required to send feedback.');
  }
  if (!params.attachment || params.attachment.size <= 0) {
    throw new Error('An image attachment is required.');
  }

  const fd = new FormData();
  fd.set('categoryId', params.categoryId);
  fd.set('subject', params.subject);
  fd.set('description', params.description);
  if (params.clientMeta && Object.keys(params.clientMeta).length > 0) {
    fd.set('clientMeta', JSON.stringify(params.clientMeta));
  }
  fd.set('attachment', params.attachment, params.attachment.name);
  if (params.attachmentTitle != null && params.attachmentTitle.trim() !== '') {
    fd.set('attachmentTitle', params.attachmentTitle.trim().slice(0, 120));
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
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
