import { resolvePublicApiBase } from '@/lib/publicApiBase';
import { getOrCreateDeviceFingerprint } from '@/lib/deviceFingerprint';
import type { FeedbackClientMeta } from '@/api/feedback';

export type SubmitContactParams = {
  fullName?: string;
  email?: string;
  company?: string;
  topic: string;
  message: string;
  altcha?: string;
  clientMeta?: FeedbackClientMeta;
};

export type SubmitContactResponse = {
  success: boolean;
  id?: string;
  message?: string;
};

function apiBase(): string {
  return resolvePublicApiBase().replace(/\/$/, '');
}

function submitUrl(): string {
  const b = apiBase();
  const path = '/api/contact';
  return b ? `${b}${path}` : path;
}

export async function submitContactLead(
  params: SubmitContactParams,
  token?: string | null
): Promise<SubmitContactResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const fp = getOrCreateDeviceFingerprint();
  if (fp) headers['X-Device-Fingerprint'] = fp;

  const body: Record<string, unknown> = {
    topic: params.topic,
    message: params.message,
  };
  if (params.fullName != null) body.fullName = params.fullName;
  if (params.email != null) body.email = params.email;
  if (params.company != null && params.company.trim()) body.company = params.company.trim();
  if (params.altcha) body.altcha = params.altcha;
  if (params.clientMeta && Object.keys(params.clientMeta).length > 0) {
    body.clientMeta = params.clientMeta;
  }

  const res = await fetch(submitUrl(), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: SubmitContactResponse = { success: false };
  try {
    data = text ? (JSON.parse(text) as SubmitContactResponse) : data;
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    return { success: false, message: data.message ?? 'Request failed.' };
  }
  return data;
}
