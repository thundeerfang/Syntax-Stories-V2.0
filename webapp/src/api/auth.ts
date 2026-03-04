import { apiClient } from './client';

function getAuthBase(): string {
  const base = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? '')
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? '');
  return base ? `${base.replace(/\/$/, '')}/auth` : '/auth';
}

function authFetch<T>(path: string, options?: RequestInit & { token?: string }): Promise<T> {
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
  return fetch(url, { ...restOptions, headers }).then(async (res) => {
    if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
    return res.json() as Promise<T>;
  });
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

export interface AuthUser {
  id: string;
  _id?: string;
  fullName?: string;
  username?: string;
  email: string;
  name?: string;
  profileImg?: string;
  image?: string;
}

export interface AccountResponse {
  user: {
    _id: string;
    fullName: string;
    username: string;
    email: string;
    profileImg?: string;
    isGoogleAccount?: boolean;
    isGitAccount?: boolean;
  };
  message?: string;
}

export interface VerifyOtpResponse {
  message: string;
  success: boolean;
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

  logout: (accessToken: string) =>
    authFetch<{ message: string; success: boolean }>(`${getAuthBase()}/logout`, {
      method: 'POST',
      token: accessToken,
    }),

  getAccount: (accessToken: string) =>
    authFetch<AccountResponse>(`${getAuthBase()}/account`, {
      method: 'GET',
      token: accessToken,
    }),
};

export function normalizeUser(backendUser: { _id: string; fullName?: string; username?: string; email: string; profileImg?: string }): AuthUser {
  return {
    id: backendUser._id,
    _id: backendUser._id,
    email: backendUser.email,
    name: backendUser.fullName ?? backendUser.username ?? backendUser.email,
    fullName: backendUser.fullName,
    username: backendUser.username,
    profileImg: backendUser.profileImg,
    image: backendUser.profileImg,
  };
}
