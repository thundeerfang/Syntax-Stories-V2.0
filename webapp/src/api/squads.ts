import { blogAuthFetch, blogPublicFetch } from "@/lib/api/blogAuthFetch";
import { resolvePublicApiBase } from "@/lib/api/publicApiBase";
import type {
  SquadCategory,
  SquadFeedRow,
  SquadInvitePermission,
  SquadMemberRole,
  SquadPostPolicy,
  SquadSummary,
  SquadVisibility,
} from "@contracts/squadsApi";
const getApiBase = () => resolvePublicApiBase();
async function readJson<T>(r: Response): Promise<T> {
  const text = await r.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}
export type {
  SquadVisibility,
  SquadPostPolicy,
  SquadInvitePermission,
  SquadMemberRole,
  SquadCategory,
  SquadMemberPreview,
  SquadSummary,
  SquadFeedRow,
} from "@contracts/squadsApi";
async function optionalAuthFetch(
  url: string,
  init: RequestInit | undefined,
  accessToken: string | null,
) {
  if (accessToken) {
    return blogAuthFetch(url, init, accessToken);
  }
  return blogPublicFetch(url, init);
}
export const squadsApi = {
  listPublic: async (opts?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    success: boolean;
    squads: SquadSummary[];
    total: number;
  }> => {
    const q = new URLSearchParams();
    if (opts?.limit != null) q.set("limit", String(opts.limit));
    if (opts?.offset != null) q.set("offset", String(opts.offset));
    const qs = q.toString();
    const r = await blogPublicFetch(
      `${getApiBase()}/api/squads${qs ? `?${qs}` : ""}`,
      {
        method: "GET",
      },
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      squads?: SquadSummary[];
      total?: number;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, squads: data.squads ?? [], total: data.total ?? 0 };
  },
  listMine: async (
    accessToken: string,
  ): Promise<{
    success: boolean;
    squads: SquadSummary[];
  }> => {
    const r = await blogAuthFetch(
      `${getApiBase()}/api/squads/mine`,
      { method: "GET" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      squads?: SquadSummary[];
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, squads: data.squads ?? [] };
  },
  listForUser: async (
    username: string,
    accessToken: string | null,
  ): Promise<{
    success: boolean;
    squads: SquadSummary[];
  }> => {
    const slug = encodeURIComponent(username.trim().toLowerCase());
    const r = await optionalAuthFetch(
      `${getApiBase()}/api/squads/u/${slug}`,
      { method: "GET" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      squads?: SquadSummary[];
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, squads: data.squads ?? [] };
  },
  create: async (
    body: {
      name: string;
      description: string;
      iconUrl?: string;
      coverBannerUrl?: string;
      visibility: SquadVisibility;
      category?: SquadCategory;
      postPolicy: SquadPostPolicy;
      requirePostApproval?: boolean;
      invitePermission?: SquadInvitePermission;
    },
    accessToken: string,
  ): Promise<{
    success: boolean;
    squad: SquadSummary;
    inviteToken?: string;
  }> => {
    const r = await blogAuthFetch(
      `${getApiBase()}/api/squads`,
      { method: "POST", body: JSON.stringify(body) },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      squad?: SquadSummary;
      inviteToken?: string;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.squad) throw new Error("Invalid response");
    return { success: true, squad: data.squad, inviteToken: data.inviteToken };
  },
  getBySlug: async (
    slug: string,
    accessToken: string | null,
  ): Promise<{
    success: boolean;
    squad: SquadSummary;
  }> => {
    const s = encodeURIComponent(slug);
    const r = await optionalAuthFetch(
      `${getApiBase()}/api/squads/s/${s}`,
      { method: "GET" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      squad?: SquadSummary;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.squad) throw new Error("Invalid response");
    return { success: true, squad: data.squad };
  },
  patch: async (
    slug: string,
    body: {
      coverBannerUrl?: string | null;
      iconUrl?: string | null;
      name?: string;
      description?: string;
      category?: SquadCategory;
      postPolicy?: SquadPostPolicy;
      requirePostApproval?: boolean;
      invitePermission?: SquadInvitePermission;
    },
    accessToken: string,
  ): Promise<{
    success: boolean;
    squad: SquadSummary;
  }> => {
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/squads/s/${s}`,
      { method: "PATCH", body: JSON.stringify(body) },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      squad?: SquadSummary;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.squad) throw new Error("Invalid response");
    return { success: true, squad: data.squad };
  },
  leave: async (slug: string, accessToken: string): Promise<void> => {
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/squads/s/${s}/leave`,
      { method: "POST", body: "{}" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
  },
  delete: async (slug: string, accessToken: string): Promise<void> => {
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/squads/s/${s}`,
      { method: "DELETE" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
  },
  join: async (
    slug: string,
    accessToken: string,
    inviteToken?: string,
  ): Promise<void> => {
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/squads/s/${s}/join`,
      {
        method: "POST",
        body: JSON.stringify(inviteToken ? { inviteToken } : {}),
      },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
  },
  addMember: async (
    slug: string,
    username: string,
    accessToken: string,
  ): Promise<void> => {
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/squads/s/${s}/members`,
      { method: "POST", body: JSON.stringify({ username: username.trim() }) },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
  },
  sharePost: async (
    slug: string,
    postId: string,
    accessToken: string,
  ): Promise<void> => {
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/squads/s/${s}/shares`,
      { method: "POST", body: JSON.stringify({ postId }) },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
  },
  getFeed: async (
    slug: string,
    accessToken: string | null,
    opts?: {
      limit?: number;
    },
  ): Promise<{
    success: boolean;
    feed: SquadFeedRow[];
    pinnedCount: number;
  }> => {
    const s = encodeURIComponent(slug);
    const q = new URLSearchParams();
    if (opts?.limit != null) q.set("limit", String(opts.limit));
    const qs = q.toString();
    const r = await optionalAuthFetch(
      `${getApiBase()}/api/squads/s/${s}/feed${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      feed?: SquadFeedRow[];
      pinnedCount?: number;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return {
      success: true,
      feed: data.feed ?? [],
      pinnedCount: typeof data.pinnedCount === "number" ? data.pinnedCount : 0,
    };
  },
  pinFeedPost: async (
    slug: string,
    postId: string,
    accessToken: string,
  ): Promise<void> => {
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/squads/s/${s}/pins`,
      { method: "POST", body: JSON.stringify({ postId }) },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
  },
  unpinFeedPost: async (
    slug: string,
    postId: string,
    accessToken: string,
  ): Promise<void> => {
    const s = encodeURIComponent(slug);
    const pid = encodeURIComponent(postId);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/squads/s/${s}/pins/${pid}`,
      { method: "DELETE" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
  },
  listMembers: async (
    slug: string,
    accessToken: string | null,
  ): Promise<{
    success: boolean;
    members: Array<{
      userId: string;
      username: string;
      fullName: string;
      profileImg: string;
      role: SquadMemberRole;
      joinedAt?: string;
    }>;
  }> => {
    const s = encodeURIComponent(slug);
    const r = await optionalAuthFetch(
      `${getApiBase()}/api/squads/s/${s}/members`,
      { method: "GET" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      members?: Array<{
        userId: string;
        username: string;
        fullName: string;
        profileImg: string;
        role: SquadMemberRole;
        joinedAt?: string;
      }>;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, members: data.members ?? [] };
  },
  setMemberRole: async (
    slug: string,
    username: string,
    role: Extract<SquadMemberRole, "member" | "moderator">,
    accessToken: string,
  ): Promise<void> => {
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/squads/s/${s}/members/role`,
      {
        method: "PATCH",
        body: JSON.stringify({ username: username.trim(), role }),
      },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
  },
  removeMember: async (
    slug: string,
    username: string,
    accessToken: string,
  ): Promise<void> => {
    const s = encodeURIComponent(slug);
    const u = encodeURIComponent(username.trim());
    const r = await blogAuthFetch(
      `${getApiBase()}/api/squads/s/${s}/members/${u}`,
      { method: "DELETE" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
  },
  getMemberStats: async (
    slug: string,
    username: string,
    accessToken: string | null,
  ): Promise<{
    success: boolean;
    stats: import("@contracts/squadsApi").SquadMemberContribution;
  }> => {
    const s = encodeURIComponent(slug);
    const u = encodeURIComponent(username.trim());
    const r = await optionalAuthFetch(
      `${getApiBase()}/api/squads/s/${s}/members/${u}/stats`,
      { method: "GET" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      stats?: import("@contracts/squadsApi").SquadMemberContribution;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.stats) throw new Error("Invalid response");
    return { success: true, stats: data.stats };
  },
};
