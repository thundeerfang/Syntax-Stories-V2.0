import { apiUrl } from '@/lib/api';
import { adminFetchCredentials } from '@/lib/auth/adminFetchDefaults';

export async function submitStepUpTotp(token: string | null, totpCode: string): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(apiUrl('/auth/2fa/step-up'), {
    method: 'POST',
    credentials: adminFetchCredentials(),
    headers,
    body: JSON.stringify({ token: totpCode }),
  });
  const json = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Step-up verification failed');
  }
}
