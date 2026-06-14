import {
  authApi,
  AuthError,
  normalizeUser,
  type AuthUser,
  type ProfileUpdateSection,
  type UpdateProfilePayload,
} from "@/api/auth";
import { handleAchievementsResponse } from "@/lib/achievements/handleAchievementsResponse";
import { useAuthStore } from "@/store/auth";
export const PROFILE_VERSION_CONFLICT_MESSAGE =
  "Your profile was updated elsewhere. We refreshed your data—please try again.";
export type ProfilePatchSnapshot = {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
};
export type ProfilePatchRuntime = {
  getSnapshot: () => ProfilePatchSnapshot;
  setSession: (partial: {
    user?: AuthUser | null;
    token?: string | null;
  }) => void;
  refreshUser: () => Promise<void>;
};
function buildPayload(
  data: UpdateProfilePayload,
  getSnapshot: () => ProfilePatchSnapshot,
): UpdateProfilePayload {
  const ver =
    data.expectedProfileVersion ?? getSnapshot().user?.profileVersion ?? 0;
  return { ...data, expectedProfileVersion: ver };
}
export async function runProfilePatch(
  runtime: ProfilePatchRuntime,
  data: UpdateProfilePayload,
  section?: ProfileUpdateSection,
): Promise<void> {
  const { token, refreshToken } = runtime.getSnapshot();
  if (!token) throw new Error("Not logged in");
  const exec = (accessToken: string) => {
    const payload = buildPayload(data, runtime.getSnapshot);
    return section
      ? authApi.updateProfileSection(accessToken, section, payload)
      : authApi.updateProfile(accessToken, payload);
  };
  try {
    const res = await exec(token);
    handleAchievementsResponse(res);
    runtime.setSession({ user: normalizeUser(res.user) });
  } catch (e) {
    if (
      e instanceof AuthError &&
      e.status === 409 &&
      e.extras?.code === "PROFILE_VERSION_CONFLICT"
    ) {
      await runtime.refreshUser();
      throw new Error(PROFILE_VERSION_CONFLICT_MESSAGE);
    }
    if (e instanceof AuthError && e.status === 401 && refreshToken) {
      const newToken = await useAuthStore
        .getState()
        .tryRefreshAndReturnNewToken();
      if (!newToken) throw e;
      const res = await exec(newToken);
      handleAchievementsResponse(res);
      runtime.setSession({ user: normalizeUser(res.user) });
      return;
    }
    throw e;
  }
}
