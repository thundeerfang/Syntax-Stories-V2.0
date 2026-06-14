/**
 * Squads JSON API — `/api/squads/*`.
 * Keep in sync with `server/src/routes/squad.routes.ts`.
 */

import type { PublicFeedPost } from "@/types/blog";

export type SquadVisibility = "public" | "private";
export type SquadPostPolicy = "all_members" | "staff_only";
export type SquadInvitePermission = "all_members" | "staff_only";
export type SquadMemberRole = "admin" | "moderator" | "member";

export type SquadMemberContribution = {
  joinedAt: string;
  postsAuthored: number;
  postsShared: number;
};

export type SquadCategory =
  | "languages"
  | "web"
  | "ai"
  | "devops"
  | "mobile"
  | "game"
  | "career"
  | "open_source"
  | "devrel"
  | "devtools";

export type SquadMemberPreview = { username: string; profileImg: string };

export type SquadSummary = {
  _id: string;
  slug: string;
  handle?: string;
  name: string;
  description: string;
  iconUrl?: string;
  coverBannerUrl?: string;
  visibility: SquadVisibility;
  category?: SquadCategory;
  postPolicy: SquadPostPolicy;
  requirePostApproval?: boolean;
  invitePermission?: SquadInvitePermission;
  memberCount: number;
  postCount?: number;
  viewCount?: number;
  createdAt?: string;
  memberPreview?: SquadMemberPreview[];
  viewerRole?: SquadMemberRole;
  viewerIsStaff?: boolean;
  viewerNeedsInvite?: boolean;
  creatorUserId?: string;
  inviteToken?: string;
};

export type SquadFeedSharedBy = {
  userId: string;
  username: string;
  fullName?: string;
  profileImg?: string;
};

export type SquadFeedRow = {
  kind: "authored" | "shared";
  item: PublicFeedPost;
  sharedAt?: string;
  sharedById?: string;
  sharedBy?: SquadFeedSharedBy;
  pinned?: boolean;
};

export interface CreateSquadBody {
  name: string;
  description?: string;
  visibility: SquadVisibility;
  category?: SquadCategory;
  postPolicy?: SquadPostPolicy;
  invitePermission?: SquadInvitePermission;
  iconUrl?: string;
  coverBannerUrl?: string;
}
