import { apiUrl } from '@/lib/api';
import { adminFetchCredentials } from '@/lib/auth/adminFetchDefaults';

export type RefreshResponse = {
  success?: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  sessionId?: string;
  tokensInCookies?: boolean;
  message?: string;
};

/** Exchange refresh token for a new access JWT (`POST /auth/refresh`). */
export async function refreshAccessToken(refreshToken?: string | null): Promise<RefreshResponse> {
  const res = await fetch(apiUrl('/auth/refresh'), {
    method: 'POST',
    credentials: adminFetchCredentials(),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  });
  return (await res.json()) as RefreshResponse;
}
