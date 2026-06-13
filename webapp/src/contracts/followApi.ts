/**
 * Follow & public profile JSON API — `/api/follow/*`.
 * Keep in sync with `server/src/routes/follow.routes.ts`.
 */

import type { TechStackItem } from './referenceApi';

export interface FollowUser {
  id: string;
  username: string;
  fullName: string;
  profileImg?: string;
  followedAt?: string;
}

export interface FollowCounts {
  followersCount: number;
  followingCount: number;
}

export interface PublicProfileUser {
  id: string;
  username: string;
  fullName: string;
  profileImg?: string;
  coverBanner?: string;
  bio?: string;
  portfolioUrl?: string;
  linkedin?: string;
  github?: string;
  instagram?: string;
  youtube?: string;
  stackAndTools?: string[];
  stackAndToolsDisplay?: TechStackItem[];
  mySetup?: Array<{ label: string; imageUrl: string; productUrl?: string }>;
  certifications?: unknown[];
  projects?: unknown[];
  openSourceContributions?: unknown[];
  createdAt?: string;
  blogStreakMode?: 'daily' | 'weekly' | 'monthly';
}

export type ReadStreakCounts = { current: number; longest: number };

export type ReadStreakPayload = {
  displayMode: 'daily' | 'weekly' | 'monthly';
  current: number;
  longest: number;
  totalDistinctReadDays?: number;
  byMode: Record<'daily' | 'weekly' | 'monthly', ReadStreakCounts>;
};

export interface PublicProfileResponse {
  success: boolean;
  user: PublicProfileUser & { blogRespectReceivedCount?: number };
  followersCount: number;
  followingCount: number;
  blogRespectReceivedCount?: number;
  blogRepostCount?: number;
  readStreak?: ReadStreakPayload;
  readHeatmapDays?: string[];
}
