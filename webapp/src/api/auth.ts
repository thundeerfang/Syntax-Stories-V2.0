import { getOrCreateDeviceFingerprint } from '@/lib/auth/deviceFingerprint';
import { resolveSameOriginRequestUrl } from '@/lib/api/publicApiBase';
import type { ProfileUpdateSection } from '@syntax-stories/shared';
import type {
  SendOtpPayload,
  SignUpEmailPayload,
  VerifyOtpPayload,
  SendOtpResponse,
  VerifyOtpResponse,
  VerifyTwoFactorLoginResponse,
  RefreshTokenResponseBody,
  SimpleSuccessMessage,
  OAuthExchangeResponseBody,
} from '@contracts/authApi';

export type {
  SendOtpPayload,
  SignUpEmailPayload,
  VerifyOtpPayload,
  SendOtpResponse,
  VerifyOtpResponse,
  VerifyTwoFactorLoginResponse,
  RefreshTokenResponseBody,
  SimpleSuccessMessage,
  OAuthExchangeResponseBody,
} from '@contracts/authApi';

function getAuthBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return base ? `${base.replace(/\/$/, '')}/auth` : '/auth';
}

function getGithubImportBatchUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
  return base ? `${base}/api/github/repos/import-batch` : '/api/github/repos/import-batch';
}

export function getAltchaChallengeUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
  return base ? `${base}/auth/altcha/challenge` : '';
}

const AUTH_FETCH_TIMEOUT_MS = 28000; // 28s – avoid infinite "Sending..." when backend is cold or slow

type AuthErrorJson = {
  message?: string;
  error?: Array<{ message?: string }>;
  retryAfter?: number;
  attemptsLeft?: number;
  code?: string;
  details?: unknown;
};

function buildAuthErrorExtras(data: AuthErrorJson | null, res: Response): AuthErrorExtras {
  const retryHeader = res.headers.get('Retry-After');
  let retryFromHeader = Number.NaN;
  if (retryHeader != null && retryHeader !== '') {
    retryFromHeader = Number.parseInt(retryHeader, 10);
  }
  let retryAfter: number | undefined;
  if (typeof data?.retryAfter === 'number') {
    retryAfter = data.retryAfter;
  } else if (Number.isFinite(retryFromHeader)) {
    retryAfter = retryFromHeader;
  }
  return {
    retryAfter,
    attemptsLeft: typeof data?.attemptsLeft === 'number' ? data.attemptsLeft : undefined,
    code: typeof data?.code === 'string' ? data.code : undefined,
    details: data?.details,
  };
}

function throwAuthErrorFromResponse(res: Response, text: string): never {
  let data: AuthErrorJson | null = null;
  try {
    if (text) {
      data = JSON.parse(text) as AuthErrorJson;
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new AuthError(text || res.statusText || 'Request failed', res.status);
    }
    throw e;
  }
  const detail = data?.error?.[0]?.message;
  const msg = detail || data?.message || res.statusText || 'Request failed';
  throw new AuthError(msg, res.status, buildAuthErrorExtras(data, res));
}

export type AuthErrorExtras = {
  retryAfter?: number;
  attemptsLeft?: number;
  code?: string;
  /** Server `AppHttpError.details` (e.g. rate-limit metadata). */
  details?: unknown;
};

export class AuthError extends Error {
  constructor(
    message: string,
    public status?: number,
    public extras?: AuthErrorExtras
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Called on 401 to try refresh; returns new access token or null. Set by store so any auth request can retry once. */
let authRetryHandler: (() => Promise<string | null>) | null = null;

export function setAuthRetryHandler(handler: (() => Promise<string | null>) | null) {
  authRetryHandler = handler;
}

function buildAuthFetchHeaders(
  restOptions: RequestInit | undefined,
  token: string | undefined
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(restOptions?.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (globalThis.window !== undefined) {
    const fp = getOrCreateDeviceFingerprint();
    if (fp) headers['X-Device-Fingerprint'] = fp;
  }
  return headers;
}

async function authFetch<T>(
  path: string,
  options?: RequestInit & { token?: string },
  isRetry = false
): Promise<T> {
  const url = resolveSameOriginRequestUrl(path);
  const token = options?.token;
  const { token: _, ...restOptions } = options ?? {};
  const headers = buildAuthFetchHeaders(restOptions, token);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      ...restOptions,
      headers,
      signal: controller.signal,
      credentials: 'include',
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. If the server is waking up, try again in a moment.');
    }
    throw err;
  }
  clearTimeout(timeoutId);
  const text = await res.text().catch(() => '');

  if (!res.ok) {
    if (res.status === 401 && token && !isRetry && authRetryHandler) {
      const newToken = await authRetryHandler();
      if (newToken) return authFetch<T>(path, { ...restOptions, token: newToken }, true);
    }
    throwAuthErrorFromResponse(res, text);
  }

  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export type {
  CertificationItem,
  ProjectItem,
  OpenSourceContribution,
  SetupItem,
  AuthUser,
  AccountUser,
  AccountResponseJson,
  AccountResponse,
  UpdateProfilePayload,
} from '@contracts/profileApi';
import type {
  AccountResponse,
  AccountResponseJson,
  AccountUser,
  AuthUser,
  ProjectItem,
  UpdateProfilePayload,
} from '@contracts/profileApi';

export function unwrapAccountUserPayload(raw: AccountResponseJson): AccountUser {
  const u = raw.data?.user ?? raw.user;
  if (!u?._id) {
    throw new Error('Invalid account response: missing user');
  }
  return u;
}

/** Re-export for callers that import profile types from `auth` only. */
export type { ProfileUpdateSection };
export {
  profileBasicPatchSchema,
  profileCertificationsPatchSchema,
  profileProjectsPatchSchema,
  profileSetupPatchSchema,
  profileSocialPatchSchema,
  profileStackPatchSchema,
} from '@syntax-stories/shared';

export const authApi = {
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

  /** Swap one-time `code` from OAuth redirect for tokens (no tokens in URL). */
  exchangeOAuthCode: (code: string) =>
    authFetch<OAuthExchangeResponseBody>(`${getAuthBase()}/oauth/exchange`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  logout: (accessToken: string, refreshToken?: string | null) =>
    authFetch<SimpleSuccessMessage & { message: string }>(`${getAuthBase()}/logout`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    }),

  /** Revoke session by refresh token (no JWT). Call when clearing state after token expiry. */
  revokeSession: (refreshToken: string) =>
    authFetch<SimpleSuccessMessage>(`${getAuthBase()}/revoke-session`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  refresh: (refreshToken: string) =>
    authFetch<RefreshTokenResponseBody>(`${getAuthBase()}/refresh`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  getAccount: async (accessToken: string): Promise<AccountResponse> => {
    const raw = await authFetch<AccountResponseJson>(`${getAuthBase()}/me`, {
      method: 'GET',
      token: accessToken,
    });
    return { user: unwrapAccountUserPayload(raw), message: raw.message };
  },

  updateProfile: async (
    accessToken: string,
    data: UpdateProfilePayload
  ): Promise<{
    success: boolean;
    user: AccountUser;
    achievements?: import('@/contracts/achievementsApi').AchievementsPayload;
  }> => {
    const raw = await authFetch<AccountResponseJson>(`${getAuthBase()}/profile`, {
      method: 'PATCH',
      token: accessToken,
      body: JSON.stringify(data),
    });
    return {
      success: raw.success ?? true,
      user: unwrapAccountUserPayload(raw),
      achievements: raw.achievements,
    };
  },

  /** Section-scoped profile PATCH (smaller payload + Zod schema). See `docs/PROFILE_UPDATE_FLOW.md`. */
  updateProfileSection: async (
    accessToken: string,
    section: ProfileUpdateSection,
    data: UpdateProfilePayload
  ): Promise<{
    success: boolean;
    user: AccountUser;
    achievements?: import('@/contracts/achievementsApi').AchievementsPayload;
  }> => {
    const raw = await authFetch<AccountResponseJson>(
      `${getAuthBase()}/profile/${encodeURIComponent(section)}`,
      {
        method: 'PATCH',
        token: accessToken,
        body: JSON.stringify(data),
      }
    );
    return {
      success: raw.success ?? true,
      user: unwrapAccountUserPayload(raw),
      achievements: raw.achievements,
    };
  },

  disconnectProvider: (accessToken: string, provider: string) =>
    authFetch<{ success: boolean; message?: string }>(`${getAuthBase()}/disconnect/${provider}`, {
      method: 'POST',
      token: accessToken,
    }),

  /** Get redirect URL to link an OAuth provider to the current account. Call then set window.location = redirectUrl. */
  getLinkRedirectUrl: (
    accessToken: string,
    provider: 'google' | 'github' | 'facebook' | 'x' | 'discord'
  ) =>
    authFetch<{ success: boolean; redirectUrl?: string; message?: string }>(
      `${getAuthBase()}/link-request`,
      {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ provider }),
      }
    ),

  initEmailChange: (accessToken: string, newEmail: string) =>
    authFetch<{ success: boolean; message?: string }>(`${getAuthBase()}/email-change/init`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ newEmail }),
    }),

  verifyEmailChange: (accessToken: string, currentCode: string, newCode: string) =>
    authFetch<{ success: boolean; message?: string }>(`${getAuthBase()}/email-change/verify`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ currentCode, newCode }),
    }),

  cancelEmailChange: (accessToken: string) =>
    authFetch<{ success: boolean; message?: string }>(`${getAuthBase()}/email-change/cancel`, {
      method: 'POST',
      token: accessToken,
    }),

  /** Batch import GitHub repos as project payloads (replaces N× GET /github/repo/:fullName). */
  importGithubReposBatch: (
    accessToken: string,
    fullNames: string[]
  ): Promise<{
    success: boolean;
    projects?: ProjectItem[];
    failed?: { fullName: string; message: string }[];
    message?: string;
  }> =>
    authFetch(getGithubImportBatchUrl(), {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ fullNames }),
    }),
};

export function normalizeUser(backendUser: AccountUser): AuthUser {
  return {
    id: backendUser._id,
    _id: backendUser._id,
    email: backendUser.email,
    name: backendUser.fullName ?? backendUser.username ?? backendUser.email,
    fullName: backendUser.fullName,
    username: backendUser.username,
    profileImg: backendUser.profileImg,
    profileImgAlt: backendUser.profileImgAlt,
    image: backendUser.profileImg,
    coverBanner: backendUser.coverBanner,
    coverBannerAlt: backendUser.coverBannerAlt,
    bio: backendUser.bio,
    job: backendUser.job,
    portfolioUrl: backendUser.portfolioUrl,
    linkedin: backendUser.linkedin,
    instagram: backendUser.instagram,
    github: backendUser.github,
    youtube: backendUser.youtube,
    stackAndTools: backendUser.stackAndTools,
    stackAndToolsDisplay: backendUser.stackAndToolsDisplay,
    certifications: backendUser.certifications,
    projects: backendUser.projects,
    openSourceContributions: backendUser.openSourceContributions,
    mySetup: backendUser.mySetup,
    isGoogleAccount: backendUser.isGoogleAccount,
    isGitAccount: backendUser.isGitAccount,
    isDiscordAccount: backendUser.isDiscordAccount,
    isFacebookAccount: backendUser.isFacebookAccount,
    isXAccount: backendUser.isXAccount,
    isAppleAccount: backendUser.isAppleAccount,
    createdAt: backendUser.createdAt,
    profileVersion: typeof backendUser.profileVersion === 'number' ? backendUser.profileVersion : 0,
    profileUpdatedAt: backendUser.profileUpdatedAt,
    blogStreakMode: backendUser.blogStreakMode,
  };
}
