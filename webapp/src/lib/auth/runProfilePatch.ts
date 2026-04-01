import {
  authApi,
  AuthError,
  normalizeUser,
  type AuthUser,
  type ProfileUpdateSection,
  type UpdateProfilePayload,
} from '@/api/auth';

/** User-facing copy when `expectedProfileVersion` is stale (matches server `PROFILE_VERSION_CONFLICT`). */
export const PROFILE_VERSION_CONFLICT_MESSAGE =
  'Your profile was updated elsewhere. We refreshed your data—please try again.';

export type ProfilePatchSnapshot = {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
};

/**
 * Dependencies for a profile PATCH so the logic stays testable and the Zustand store stays thin.
 * `getSnapshot` must read current token/user at call time (important for 401 retry).
 */
export type ProfilePatchRuntime = {
  getSnapshot: () => ProfilePatchSnapshot;
  setSession: (partial: { user?: AuthUser | null; token?: string | null }) => void;
  refreshUser: () => Promise<void>;
};

function buildPayload(data: UpdateProfilePayload, getSnapshot: () => ProfilePatchSnapshot): UpdateProfilePayload {
  const ver = data.expectedProfileVersion ?? getSnapshot().user?.profileVersion ?? 0;
  return { ...data, expectedProfileVersion: ver };
}

/**
 * Runs legacy or section profile PATCH with version merge, 409 refresh, and 401 refresh+retry.
 */
export async function runProfilePatch(
  runtime: ProfilePatchRuntime,
  data: UpdateProfilePayload,
  section?: ProfileUpdateSection
): Promise<void> {
  const { token, refreshToken } = runtime.getSnapshot();
  if (!token) throw new Error('Not logged in');

  const exec = (accessToken: string) => {
    const payload = buildPayload(data, runtime.getSnapshot);
    return section
      ? authApi.updateProfileSection(accessToken, section, payload)
      : authApi.updateProfile(accessToken, payload);
  };

  try {
    const res = await exec(token);
    runtime.setSession({ user: normalizeUser(res.user) });
  } catch (e) {
    if (e instanceof AuthError && e.status === 409 && e.extras?.code === 'PROFILE_VERSION_CONFLICT') {
      await runtime.refreshUser();
      throw new Error(PROFILE_VERSION_CONFLICT_MESSAGE);
    }
    if (e instanceof AuthError && e.status === 401 && refreshToken) {
      const refreshed = await authApi.refresh(refreshToken);
      runtime.setSession({ token: refreshed.accessToken });
      const res = await exec(refreshed.accessToken);
      runtime.setSession({ user: normalizeUser(res.user) });
      return;
    }
    throw e;
  }
}
