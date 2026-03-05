import { apiClient } from './client';

function getAuthBase(): string {
  const base = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? '')
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? '');
  return base ? `${base.replace(/\/$/, '')}/auth` : '/auth';
}

const AUTH_FETCH_TIMEOUT_MS = 28000; // 28s – avoid infinite "Sending..." when backend is cold or slow

export class AuthError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'AuthError';
  }
}

async function authFetch<T>(path: string, options?: RequestInit & { token?: string }): Promise<T> {
  const url = path.startsWith('http')
    ? path
    : typeof window !== 'undefined'
      ? `${window.location.origin}${path}`
      : `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${path}`;
  const token = options?.token;
  const { token: _, ...restOptions } = options ?? {};
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...restOptions?.headers,
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { ...restOptions, headers, signal: controller.signal });
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
    try {
      const data = text ? (JSON.parse(text) as { message?: string; error?: Array<{ message?: string }> }) : null;
      const detail = data?.error?.[0]?.message;
      const msg = detail || data?.message || res.statusText || 'Request failed';
      throw new AuthError(msg, res.status);
    } catch (e) {
      if (e instanceof AuthError) throw e;
      if (e instanceof SyntaxError) throw new AuthError(text || res.statusText || 'Request failed', res.status);
      if (e instanceof Error) throw new AuthError(e.message, res.status);
      throw new AuthError(text || res.statusText || 'Request failed', res.status);
    }
  }

  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export interface SendOtpPayload {
  email: string;
}

export interface SignUpEmailPayload {
  fullName: string;
  email: string;
}

export interface VerifyOtpPayload {
  email: string;
  code: string;
}

export interface WorkExperience {
  company?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}
export interface EducationItem {
  school?: string;
  degree?: string;
  field?: string;
  startYear?: number;
  endYear?: number;
}
export interface ProjectItem {
  name?: string;
  url?: string;
  description?: string;
}
export interface OpenSourceContribution {
  repo?: string;
  description?: string;
  url?: string;
}

export interface AuthUser {
  id: string;
  _id?: string;
  fullName?: string;
  username?: string;
  email: string;
  name?: string;
  profileImg?: string;
  image?: string;
  coverBanner?: string;
  bio?: string;
  job?: string;
  linkedin?: string;
  instagram?: string;
  github?: string;
  youtube?: string;
  stackAndTools?: string[];
  mySetup?: string;
  workExperiences?: WorkExperience[];
  education?: EducationItem[];
  projects?: ProjectItem[];
  openSourceContributions?: OpenSourceContribution[];
  isGoogleAccount?: boolean;
  isGitAccount?: boolean;
  isFacebookAccount?: boolean;
    isXAccount?: boolean;
  isAppleAccount?: boolean;
  createdAt?: string;
}

export interface AccountResponse {
  user: {
    _id: string;
    fullName: string;
    username: string;
    email: string;
    profileImg?: string;
    coverBanner?: string;
    bio?: string;
    job?: string;
    linkedin?: string;
    instagram?: string;
    github?: string;
    youtube?: string;
    stackAndTools?: string[];
    mySetup?: string;
    workExperiences?: WorkExperience[];
    education?: EducationItem[];
    projects?: ProjectItem[];
    openSourceContributions?: OpenSourceContribution[];
    isGoogleAccount?: boolean;
    isGitAccount?: boolean;
    isFacebookAccount?: boolean;
    isXAccount?: boolean;
    isAppleAccount?: boolean;
    twoFactorEnabled?: boolean;
    createdAt?: string;
  };
  message?: string;
}

export type UpdateProfilePayload = Partial<{
  fullName: string;
  username: string;
  bio: string;
  profileImg: string;
  coverBanner: string;
  job: string;
  linkedin: string;
  instagram: string;
  github: string;
  youtube: string;
  stackAndTools: string[];
  mySetup: string;
  workExperiences: WorkExperience[];
  education: EducationItem[];
  projects: ProjectItem[];
  openSourceContributions: OpenSourceContribution[];
}>;

export interface VerifyOtpResponse {
  message: string;
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  twoFactorRequired?: boolean;
  challengeToken?: string;
  isNewUser?: boolean;
  user: {
    _id: string;
    fullName: string;
    username: string;
    email: string;
    profileImg?: string;
  };
}

export interface VerifyTwoFactorLoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: string;
  user: {
    _id: string;
    fullName: string;
    username: string;
    email: string;
    profileImg?: string;
  };
}

export const authApi = {
  sendOtp: (data: SendOtpPayload) =>
    authFetch<{ message: string; success: boolean }>(`${getAuthBase()}/send-otp`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  signupEmail: (data: SignUpEmailPayload) =>
    authFetch<{ message: string; success: boolean }>(`${getAuthBase()}/signup-email`, {
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

  logout: (accessToken: string) =>
    authFetch<{ message: string; success: boolean }>(`${getAuthBase()}/logout`, {
      method: 'POST',
      token: accessToken,
    }),

  /** Revoke session by refresh token (no JWT). Call when clearing state after token expiry. */
  revokeSession: (refreshToken: string) =>
    authFetch<{ success: boolean; message?: string }>(`${getAuthBase()}/revoke-session`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  refresh: (refreshToken: string) =>
    authFetch<{ success: boolean; accessToken: string; expiresIn?: string }>(`${getAuthBase()}/refresh`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  getAccount: (accessToken: string) =>
    authFetch<AccountResponse>(`${getAuthBase()}/me`, {
      method: 'GET',
      token: accessToken,
    }),

  updateProfile: (accessToken: string, data: UpdateProfilePayload) =>
    authFetch<{ success: boolean; user: AccountResponse['user'] }>(`${getAuthBase()}/profile`, {
      method: 'PATCH',
      token: accessToken,
      body: JSON.stringify(data),
    }),

  disconnectProvider: (accessToken: string, provider: string) =>
    authFetch<{ success: boolean; message?: string }>(`${getAuthBase()}/disconnect/${provider}`, {
      method: 'POST',
      token: accessToken,
    }),

  /** Get redirect URL to link an OAuth provider to the current account. Call then set window.location = redirectUrl. */
  getLinkRedirectUrl: (accessToken: string, provider: 'google' | 'github' | 'facebook' | 'x') =>
    authFetch<{ success: boolean; redirectUrl?: string; message?: string }>(`${getAuthBase()}/link-request`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ provider }),
    }),

  initEmailChange: (accessToken: string, newEmail: string) =>
    authFetch<{ success: boolean; message?: string }>(`${getAuthBase()}/email-change/init`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ newEmail }),
    }),

  verifyEmailChange: (accessToken: string, code: string) =>
    authFetch<{ success: boolean; message?: string }>(`${getAuthBase()}/email-change/verify`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ code }),
    }),
};

export function normalizeUser(backendUser: AccountResponse['user']): AuthUser {
  return {
    id: backendUser._id,
    _id: backendUser._id,
    email: backendUser.email,
    name: backendUser.fullName ?? backendUser.username ?? backendUser.email,
    fullName: backendUser.fullName,
    username: backendUser.username,
    profileImg: backendUser.profileImg,
    image: backendUser.profileImg,
    coverBanner: backendUser.coverBanner,
    bio: backendUser.bio,
    job: backendUser.job,
    linkedin: backendUser.linkedin,
    instagram: backendUser.instagram,
    github: backendUser.github,
    youtube: backendUser.youtube,
    stackAndTools: backendUser.stackAndTools as string[] | undefined,
    mySetup: backendUser.mySetup,
    workExperiences: backendUser.workExperiences as WorkExperience[] | undefined,
    education: backendUser.education as EducationItem[] | undefined,
    projects: backendUser.projects as ProjectItem[] | undefined,
    openSourceContributions: backendUser.openSourceContributions as OpenSourceContribution[] | undefined,
    isGoogleAccount: backendUser.isGoogleAccount,
    isGitAccount: backendUser.isGitAccount,
    isFacebookAccount: backendUser.isFacebookAccount,
    isXAccount: backendUser.isXAccount,
    isAppleAccount: backendUser.isAppleAccount,
    createdAt: backendUser.createdAt,
  };
}
