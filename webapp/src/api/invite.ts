import { resolvePublicApiBase } from "@/lib/api/publicApiBase";
const getApiBase = () => resolvePublicApiBase();
export type InviteResolveValid = {
  valid: true;
  username: string;
  fullName: string;
  profileImg: string;
};
export type InviteResolveInvalid = {
  valid: false;
  message?: string;
};
export type InviteResolveResponse = InviteResolveValid | InviteResolveInvalid;
export type InviteShareChannel =
  | "copy_link"
  | "copy_code"
  | "copy_attach"
  | "twitter"
  | "whatsapp"
  | "email"
  | "other";
export const inviteApi = {
  resolveCode(code: string): Promise<InviteResolveResponse> {
    const params = new URLSearchParams({ code: code.trim() });
    return fetch(`${getApiBase()}/api/invites/resolve?${params}`).then(
      async (r) => {
        if (!r.ok) {
          return {
            valid: false as const,
            message: "Could not verify referral code.",
          };
        }
        return r.json() as Promise<InviteResolveResponse>;
      },
    );
  },
  recordShare(
    token: string,
    channel: InviteShareChannel,
    referralCode?: string,
  ): Promise<void> {
    return fetch(`${getApiBase()}/api/invites/share`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify({
        channel,
        ...(referralCode ? { referralCode } : {}),
      }),
    }).then((r) => {
      if (!r.ok) throw new Error("Failed to record share");
    });
  },
  getLeaderboard(limit = 20): Promise<{
    success: boolean;
    items?: Array<{
      rank: number;
      score: number;
      userId: string;
      username: string | null;
      fullName: string | null;
      profileImg: string | null;
    }>;
  }> {
    return fetch(`${getApiBase()}/api/invites/leaderboard?limit=${limit}`).then(
      (r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      },
    );
  },
};
