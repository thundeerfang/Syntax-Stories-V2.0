import { getOrCreateDeviceFingerprint } from '@/lib/deviceFingerprint';
import { resolveSameOriginRequestUrl } from '@/lib/publicApiBase';
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

async function authFetch<T>(path: string, options?: RequestInit & { token?: string }, isRetry = false): Promise<T> {
  const url = resolveSameOriginRequestUrl(path);
  const token = options?.token;
  const { token: _, ...restOptions } = options ?? {};
  const headers = buildAuthFetchHeaders(restOptions, token);

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
    if (res.status === 401 && token && !isRetry && authRetryHandler) {
      const newToken = await authRetryHandler();
      if (newToken) return authFetch<T>(path, { ...restOptions, token: newToken }, true);
    }
    throwAuthErrorFromResponse(res, text);
  }

  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export interface WorkExperience {
  /** Auto-generated by backend when work experience is added (WORK_ID display). */
  workId?: string;
  jobTitle?: string;
  employmentType?: string;
  company?: string;
  companyDomain?: string;
  currentPosition?: boolean;
  startDate?: string;
  endDate?: string;
  location?: string;
  locationType?: string;
  description?: string;
  skills?: string[];
  /** @deprecated use media */
  mediaUrls?: string[];
  /** Media items: links or uploaded images (url, title, altText) */
  media?: { url: string; title?: string; altText?: string }[];
  /** @deprecated use jobTitle */
  role?: string;
}
export interface EducationItem {
  /** Auto-generated by backend when education entry is added (EDU_ID display). */
  eduId?: string;
  school?: string;
  schoolDomain?: string;
  degree?: string;
  fieldOfStudy?: string;
  field?: string;
  currentEducation?: boolean;
  startDate?: string;
  endDate?: string;
  startYear?: number;
  endYear?: number;
  grade?: string;
  description?: string;
  activity?: string;
  /** Ref code like "2024_EDU_DOC", based on last update year. */
  refCode?: string;
}
export interface CertificationItem {
  /** Auto-generated by backend when certification is added (CERT_ID display). */
  certId?: string;
  name?: string;
  issuingOrganization?: string;
  currentlyValid?: boolean;
  issueDate?: string;
  expirationDate?: string;
  /** Auto-generated validation type, e.g. "A-24". */
  certValType?: string;
  credentialId?: string;
  credentialUrl?: string;
  description?: string;
  skills?: string[];
  media?: { url: string; title?: string; altText?: string }[];
}
export interface ProjectItem {
  type?: 'project' | 'publication';
  source?: 'github';
  repoFullName?: string;
  repoId?: number;
  title?: string;
  publisher?: string;
  ongoing?: boolean;
  publicationDate?: string;
  endDate?: string;
  publicationUrl?: string;
  description?: string;
  media?: { url: string; title?: string; altText?: string }[];
  /** Last updated year log from backend, e.g. "2025_prd_log". */
  prjLog?: string;
  /** @deprecated use title */
  name?: string;
  /** @deprecated use publicationUrl */
  url?: string;
}
export interface OpenSourceContribution {
  title?: string;
  repository?: string;
  repositoryUrl?: string;
  active?: boolean;
  activeFrom?: string;
  endDate?: string;
  description?: string;
  /** @deprecated use repository */
  repo?: string;
  /** @deprecated use repositoryUrl */
  url?: string;
}

export interface SetupItem {
  label: string;
  imageUrl: string;
  productUrl?: string;
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
  portfolioUrl?: string;
  linkedin?: string;
  instagram?: string;
  github?: string;
  youtube?: string;
  stackAndTools?: string[];
  workExperiences?: WorkExperience[];
  education?: EducationItem[];
  certifications?: CertificationItem[];
  projects?: ProjectItem[];
  openSourceContributions?: OpenSourceContribution[];
  mySetup?: SetupItem[];
  isGoogleAccount?: boolean;
  isGitAccount?: boolean;
  isFacebookAccount?: boolean;
    isXAccount?: boolean;
  isAppleAccount?: boolean;
  isDiscordAccount?: boolean;
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
    portfolioUrl?: string;
    linkedin?: string;
    instagram?: string;
    github?: string;
    youtube?: string;
    stackAndTools?: string[];
    workExperiences?: WorkExperience[];
    education?: EducationItem[];
    certifications?: CertificationItem[];
    projects?: ProjectItem[];
    openSourceContributions?: OpenSourceContribution[];
    mySetup?: SetupItem[];
    isGoogleAccount?: boolean;
    isGitAccount?: boolean;
    isFacebookAccount?: boolean;
    isXAccount?: boolean;
    isAppleAccount?: boolean;
    isDiscordAccount?: boolean;
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
  portfolioUrl: string;
  linkedin: string;
  instagram: string;
  github: string;
  youtube: string;
  stackAndTools: string[];
  workExperiences: WorkExperience[];
  education: EducationItem[];
  certifications: CertificationItem[];
  projects: ProjectItem[];
  openSourceContributions: OpenSourceContribution[];
  mySetup: SetupItem[];
}>;

export type ParseCvMissingFieldKey =
  | 'bio'
  | 'linkedin'
  | 'github'
  | 'stackAndTools'
  | 'workExperiences'
  | 'education'
  | 'certifications';

export type IncompleteItemHint = { index: number; title?: string; missing: string[] };

export type IncompleteItemHints = {
  workExperiences?: IncompleteItemHint[];
  education?: IncompleteItemHint[];
  certifications?: IncompleteItemHint[];
  projects?: IncompleteItemHint[];
};

export interface ParseCvResponse {
  success: boolean;
  extracted: Partial<UpdateProfilePayload>;
  missingFields: ParseCvMissingFieldKey[];
  incompleteItemHints?: IncompleteItemHints;
}

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

  logout: (accessToken: string) =>
    authFetch<SimpleSuccessMessage & { message: string }>(`${getAuthBase()}/logout`, {
      method: 'POST',
      token: accessToken,
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

  /** Parse CV/Resume PDF and return extracted profile + missing field keys. Does not update profile. */
  parseCv: async (accessToken: string, file: File) => {
    const path = `${getAuthBase()}/parse-cv`;
    const url = resolveSameOriginRequestUrl(path);
    const formData = new FormData();
    formData.append('pdf', file);
    const headers: HeadersInit = { Authorization: `Bearer ${accessToken}` };
    const res = await fetch(url, { method: 'POST', body: formData, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data.message as string) || 'Failed to parse PDF');
    return data as ParseCvResponse;
  },

  disconnectProvider: (accessToken: string, provider: string) =>
    authFetch<{ success: boolean; message?: string }>(`${getAuthBase()}/disconnect/${provider}`, {
      method: 'POST',
      token: accessToken,
    }),

  /** Get redirect URL to link an OAuth provider to the current account. Call then set window.location = redirectUrl. */
  getLinkRedirectUrl: (accessToken: string, provider: 'google' | 'github' | 'facebook' | 'x' | 'discord') =>
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
    portfolioUrl: backendUser.portfolioUrl,
    linkedin: backendUser.linkedin,
    instagram: backendUser.instagram,
    github: backendUser.github,
    youtube: backendUser.youtube,
    stackAndTools: backendUser.stackAndTools,
    workExperiences: backendUser.workExperiences,
    education: backendUser.education,
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
  };
}
