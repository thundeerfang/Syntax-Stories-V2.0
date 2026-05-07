import { resolvePublicApiBase } from '@/lib/publicApiBase';
import { useAuthStore } from '@/store/auth';

function apiBase(): string {
  return resolvePublicApiBase();
}

/**
 * Authenticated blog API fetch with one 401 retry after silent refresh (same pattern as authFetch).
 * Surfaces clearer errors when the API host is unreachable (avoids opaque "NetworkError").
 */
export async function blogAuthFetch(
  url: string,
  init: RequestInit | undefined,
  accessToken: string,
): Promise<Response> {
  const baseHeaders: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.body != null && !baseHeaders['Content-Type'] && !baseHeaders['content-type']) {
    baseHeaders['Content-Type'] = 'application/json';
  }

  const run = async (token: string): Promise<Response> => {
    try {
      return await fetch(url, {
        ...init,
        headers: { ...baseHeaders, Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new Error(
        `Network error while calling ${url}. Check that the API server is running and NEXT_PUBLIC_API_BASE_URL is correct.`,
      );
    }
  };

  let res = await run(accessToken);
  if (res.status === 401) {
    const newTok = await useAuthStore.getState().tryRefreshAndReturnNewToken();
    if (newTok) res = await run(newTok);
  }
  return res;
}

export async function blogPublicFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(
      `Network error while calling ${url}. Check that the API server is running and NEXT_PUBLIC_API_BASE_URL is correct.`,
    );
  }
}

export { apiBase as getBlogApiBase };
