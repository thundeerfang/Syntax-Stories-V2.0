import { MS_PER_HOUR, MS_PER_MINUTE } from "../constants/durations.js";
export type RateLimitSpec = {
  readonly windowMs: number;
  readonly max: number;
};
export const RATE_LIMITS = {
  sendOtp: { windowMs: 15 * MS_PER_MINUTE, max: 5 },
  verifyOtp: { windowMs: 15 * MS_PER_MINUTE, max: 10 },
  refresh: { windowMs: MS_PER_MINUTE, max: 30 },
  signup: { windowMs: MS_PER_HOUR, max: 5 },
  updateProfile: { windowMs: 15 * MS_PER_MINUTE, max: 120 },
  inviteResolve: { windowMs: MS_PER_MINUTE, max: 60 },
  staffLogin: { windowMs: 15 * MS_PER_MINUTE, max: 30 },
  feedback: { windowMs: MS_PER_HOUR, max: 20 },
  contact: { windowMs: MS_PER_HOUR, max: 15 },
  blogEngagementWrite: { windowMs: MS_PER_MINUTE, max: 120 },
  blogRespectWrite: { windowMs: MS_PER_MINUTE, max: 120 },
  billingCheckout: { windowMs: MS_PER_MINUTE, max: 10 },
  billingVerify: { windowMs: MS_PER_MINUTE, max: 10 },
  legalPublicRead: { windowMs: MS_PER_MINUTE, max: 120 },
  legalUserWrite: { windowMs: MS_PER_MINUTE, max: 60 },
  legalAdminWrite: { windowMs: MS_PER_MINUTE, max: 200 },
  trashRead: { windowMs: MS_PER_MINUTE, max: 120 },
} as const satisfies Record<string, RateLimitSpec>;
