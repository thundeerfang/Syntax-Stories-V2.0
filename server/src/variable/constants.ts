/**
 * Server-only constants — single source for enums, seeds, limits, and TTLs.
 * Not exposed to webapp/mobile; clients use their own contracts or `@syntax-stories/shared`.
 */

import { BIO_MAX_LENGTH, STACK_AND_TOOLS_MAX } from '@syntax-stories/shared';
import {
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  SEVEN_DAYS_MS,
  SEVEN_DAYS_SEC,
} from '../constants/durations.js';

export { BIO_MAX_LENGTH, STACK_AND_TOOLS_MAX };

// --- Avatars ---

export const DEFAULT_AVATAR_SEED = 'syntax-stories-default';

// --- Subscription / billing plan keys ---

export const SUBSCRIPTION_PLAN_FREE = 'free' as const;

export const PAID_PLAN_KEYS = ['pro', 'proplus', 'ultra'] as const;

export const LEGACY_SUBSCRIPTION_PLAN_PREMIUM = 'premium' as const;

export const SUBSCRIPTION_PLAN_KEYS = [
  SUBSCRIPTION_PLAN_FREE,
  ...PAID_PLAN_KEYS,
  LEGACY_SUBSCRIPTION_PLAN_PREMIUM,
] as const;

export type PaidPlanKey = (typeof PAID_PLAN_KEYS)[number];
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN_KEYS)[number];

export const ALL_PAID_PLAN_KEYS: readonly PaidPlanKey[] = PAID_PLAN_KEYS;

export const PAID_PLAN_DISPLAY_NAMES: Record<PaidPlanKey, string> = {
  pro: 'Pro',
  proplus: 'Pro Plus',
  ultra: 'Ultra',
};

export const PAID_PLAN_KEY_VALIDATION_MESSAGE = `key must be ${PAID_PLAN_KEYS.join(', ')}`;

export function isPaidPlanKey(value: string): value is PaidPlanKey {
  return (PAID_PLAN_KEYS as readonly string[]).includes(value);
}

export function isSubscriptionPlan(value: string): value is SubscriptionPlan {
  return (SUBSCRIPTION_PLAN_KEYS as readonly string[]).includes(value);
}

/** Normalize legacy `premium` to `ultra` for API/UI. */
export function normalizeSubscriptionPlan(plan: SubscriptionPlan): SubscriptionPlan {
  if (plan === LEGACY_SUBSCRIPTION_PLAN_PREMIUM) return 'ultra';
  return plan;
}

export function subscriptionPlanDisplayName(planKey: string | undefined): string {
  if (!planKey || planKey === SUBSCRIPTION_PLAN_FREE) return 'Free';
  const normalized =
    planKey === LEGACY_SUBSCRIPTION_PLAN_PREMIUM ? 'ultra' : planKey;
  if (isPaidPlanKey(normalized)) return PAID_PLAN_DISPLAY_NAMES[normalized];
  return planKey;
}

/** DB query: match stored plan key including legacy alias for ultra. */
export function subscriptionPlanMatchKeys(planKey: PaidPlanKey): string[] {
  return planKey === 'ultra'
    ? ['ultra', LEGACY_SUBSCRIPTION_PLAN_PREMIUM]
    : [planKey];
}

// --- Stripe subscription status ---

export const SUBSCRIPTION_STATUS_KEYS = [
  'active',
  'canceled',
  'past_due',
  'trialing',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'paused',
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS_KEYS)[number];

export const SUBSCRIPTION_WRITE_SOURCE_KEYS = ['stripe', 'manual'] as const;

export type SubscriptionWriteSource = (typeof SUBSCRIPTION_WRITE_SOURCE_KEYS)[number];

// --- Timing / TTL / cache ---

export const NINETY_DAYS_SEC = 90 * SECONDS_PER_DAY;

// Billing & Stripe
export const BILLING_LOCK_TTL_SEC = 30;
export const BILLING_LOCK_HEARTBEAT_MS = 5 * MS_PER_SECOND;
export const BILLING_RECONCILE_AGE_MS = 72 * MS_PER_HOUR;
export const CHECKOUT_INTENT_TTL_MS = 55 * MS_PER_MINUTE;
export const STRIPE_WEBHOOK_DEDUP_SEC = SECONDS_PER_DAY;
export const STRIPE_WEBHOOK_RETRY_BACKOFF_MS = [
  MS_PER_MINUTE,
  5 * MS_PER_MINUTE,
  15 * MS_PER_MINUTE,
  MS_PER_HOUR,
] as const;

// Achievements
export const ACHIEVEMENT_CATALOG_TTL_SEC = SECONDS_PER_DAY;
export const ACHIEVEMENT_EVENT_LOG_TTL_SEC = NINETY_DAYS_SEC;

// Sessions & retention
export const SESSION_DURATION_MS = SEVEN_DAYS_MS;
export const SOFT_DELETE_RETENTION_MS = SEVEN_DAYS_MS;
export const PROFILE_VIEW_EVENT_RETENTION_SEC = NINETY_DAYS_SEC;

// Referral
export const REFERRAL_COOKIE_MAX_MS = 30 * MS_PER_DAY;
export const REFERRAL_POSITIVE_CACHE_TTL_SEC = SECONDS_PER_DAY;
export const REFERRAL_NEGATIVE_CACHE_TTL_SEC = 10 * SECONDS_PER_MINUTE;
export const REFERRAL_STATS_CACHE_TTL_SEC = 2 * SECONDS_PER_MINUTE;

// Blog read tracking
export const MIN_READ_COMMIT_DWELL_MS = 10 * MS_PER_SECOND;
export const READ_VIEW_SESSION_TTL_SEC = 30 * SECONDS_PER_MINUTE;
export const READ_VIEW_ACK_TTL_SEC = 30 * SECONDS_PER_MINUTE;
export const BLOG_TAXONOMY_CACHE_TTL_MS = MS_PER_MINUTE;

// Analytics & general cache
export const ANALYTICS_CACHE_TTL_SEC = SECONDS_PER_MINUTE;
export const RBAC_CACHE_TTL_SEC = 5 * SECONDS_PER_MINUTE;
export const ADMIN_PERMISSION_L1_TTL_MS = MS_PER_MINUTE;
export const ADMIN_PERMISSION_SNAPSHOT_TTL_SEC = SEVEN_DAYS_SEC;

// Auth & OAuth
export const AUTH_CHALLENGE_TTL_SEC = 10 * SECONDS_PER_MINUTE;
export const OAUTH_SIGNUP_NONCE_TTL_SEC = 10 * SECONDS_PER_MINUTE;
export const OAUTH_EXCHANGE_TTL_SEC = 90;
export const OAUTH_RETURN_COOKIE_MAX_MS = 10 * MS_PER_MINUTE;

// Admin IAM
export const STEP_UP_TTL_SEC = 15 * SECONDS_PER_MINUTE;
export const ADMIN_IDLE_STEP_UP_SEC = SECONDS_PER_HOUR;
export const ADMIN_STEP_UP_GRACE_SEC = 10 * SECONDS_PER_MINUTE;
export const IMPERSONATION_TTL_SEC = 30 * SECONDS_PER_MINUTE;
export const ADMIN_INVITE_OTP_TTL_SEC = 10 * SECONDS_PER_MINUTE;
export const ADMIN_INVITE_VERIFIED_TOKEN_TTL_SEC = 15 * SECONDS_PER_MINUTE;
export const LEGAL_PUBLISH_LOCK_TTL_SEC = 30;

// OTP send rate limits (emailOtp.service)
export const OTP_SEND_MAX_IN_WINDOW = 10;
export const OTP_SEND_WINDOW_SEC = 10 * SECONDS_PER_MINUTE;
export const OTP_SEND_COOLDOWN_SEC = [
  10 * SECONDS_PER_MINUTE,
  20 * SECONDS_PER_MINUTE,
  30 * SECONDS_PER_MINUTE,
  SECONDS_PER_HOUR,
] as const;
export const OTP_SEND_STRIKE_TTL_SEC = NINETY_DAYS_SEC;

// --- Patterns ---

export const DAY_BUCKET_RE = /^\d{4}-\d{2}-\d{2}$/;

// --- Referral (codes, cookies, cache) ---

export const REFERRAL_CODE_REGEX = /^[0-9A-HJKMNP-TV-Z]{8,16}$/;
export const REFERRAL_CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const REFERRAL_COOKIE_NAME = 'ss_ref';
export const REFERRAL_NEGATIVE_CACHE_SENTINEL = '__NONE__';

// --- Crypto wire-format prefixes ---

export const PROVIDER_TOKEN_PREFIX = 'sspt1:';
export const ADMIN_USER_REF_PREFIX = 'ssur1:';

// --- Rate limits (numeric caps) ---

/** Max VIEW_START calls per user per rolling minute (read-streak F.2). */
export const READ_VIEW_START_MAX_PER_MINUTE = 30;

// --- Legal policy kinds ---

export const LEGAL_POLICY_KINDS = ['terms', 'privacy', 'udd'] as const;
export type LegalPolicyKind = (typeof LEGAL_POLICY_KINDS)[number];

export const ACCEPT_POLICY_KINDS = ['terms', 'privacy'] as const;
export type AcceptPolicyKind = (typeof ACCEPT_POLICY_KINDS)[number];

// --- Bookmarks ---

export const DEFAULT_BOOKMARK_GROUP_NAME = 'General';

// --- Read streak ---

export const READ_DAYS_ZSET_RETAIN_DAYS = 400;
/** UTC window for profile heatmap (must match webapp `READ_HEATMAP_WINDOW_DAYS`). */
export const READ_HEATMAP_WINDOW_DAYS = 200;

// --- Admin cookies ---

export const ADMIN_ACCESS_COOKIE = 'ss_admin_at';
export const ADMIN_REFRESH_COOKIE = 'ss_admin_rt';

// --- Legal cookies & acceptance ---

export const LEGAL_SIGNUP_ACK_COOKIE = 'syntax_legal_signup_ack';
export const LEGAL_ACCEPT_SOURCES = ['signup', 'api'] as const;
export type LegalAcceptSource = (typeof LEGAL_ACCEPT_SOURCES)[number];

// --- Auth crypto ---

export const BCRYPT_ROUNDS = 10;

// --- Admin trash ---

export const TRASH_SECTIONS = ['blog', 'user'] as const;
export type TrashSection = (typeof TRASH_SECTIONS)[number];

// --- Admin access catalog ---

export const ADMIN_ACCESS_CATALOG_SLUG_RE = /^[a-z][a-z0-9_]{0,79}$/;
export const ADMIN_ACCESS_CATALOG_SLUG_MAX = 80;

// --- Feedback ---

/** Max feedback submissions per signed-in user per rolling 7-day window. */
export const FEEDBACK_WEEKLY_MAX_PER_USER = 5;
export const FEEDBACK_WEEKLY_WINDOW_MS = SEVEN_DAYS_MS;
