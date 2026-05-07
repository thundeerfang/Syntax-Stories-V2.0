/**
 * Auth HTTP client — same endpoints as `webapp/src/api/auth.ts` (OTP, refresh, /me, logout).
 */
import type {
  AccountUser,
  MeResponse,
  RefreshTokenResponseBody,
  SendOtpPayload,
  SendOtpResponse,
  SignUpEmailPayload,
  VerifyOtpPayload,
  VerifyOtpResponse,
  VerifyTwoFactorLoginResponse,
} from '@/types/auth';

const AUTH_TIMEOUT_MS = 28_000;

export class AuthHttpError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'AuthHttpError';
  }
}

function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:5000';
  return base.replace(/\/$/, '');
}

function getAuthBase(): string {
  return `${getApiBase()}/auth`;
}

function parseErrorMessage(text: string, status: number): string {
  try {
    const data = JSON.parse(text) as {
      message?: string;
      error?: Array<{ message?: string }>;
    };
    const detail = data.error?.[0]?.message;
    return detail || data.message || `Request failed (${status})`;
  } catch {
    return text || `Request failed (${status})`;
  }
}

async function authFetch<T>(
  path: string,
  init: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...rest } = init;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      headers,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new AuthHttpError('Request timed out. If the server is waking up, try again.');
    }
    throw e;
  }
  clearTimeout(timeoutId);

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new AuthHttpError(parseErrorMessage(text, res.status), res.status);
  }
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

function unwrapUser(raw: MeResponse): AccountUser {
  const u = raw.data?.user;
  if (!u) throw new AuthHttpError('Invalid profile response');
  return u;
}

export const authClient = {
  sendOtp: (data: SendOtpPayload) =>
    authFetch<SendOtpResponse>(`${getAuthBase()}/send-otp`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  signupEmail: (data: SignUpEmailPayload) =>
    authFetch<SendOtpResponse>(`${getAuthBase()}/signup-email`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyOtp: (data: VerifyOtpPayload) =>
    authFetch<VerifyOtpResponse>(`${getAuthBase()}/verify-otp`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyTwoFactorLogin: (data: { challengeToken: string; token: string }) =>
    authFetch<VerifyTwoFactorLoginResponse>(`${getAuthBase()}/2fa/verify-login`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refresh: (refreshToken: string) =>
    authFetch<RefreshTokenResponseBody>(`${getAuthBase()}/refresh`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  getMe: async (accessToken: string): Promise<AccountUser> => {
    const raw = await authFetch<MeResponse>(`${getAuthBase()}/me`, {
      method: 'GET',
      token: accessToken,
    });
    return unwrapUser(raw);
  },

  logout: (accessToken: string, refreshToken?: string | null) =>
    authFetch<{ success?: boolean; message?: string }>(`${getAuthBase()}/logout`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    }),
};

export function getConfiguredApiBase(): string {
  return getApiBase();
}
