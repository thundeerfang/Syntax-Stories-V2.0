import { resolveFetchBaseForApiClient } from '@/lib/publicApiBase';

const getBaseUrl = () => resolveFetchBaseForApiClient();

export async function apiClient<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const base = getBaseUrl();
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json() as Promise<T>;
}
