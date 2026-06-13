import { SECONDS_PER_MINUTE } from '../constants/durations.js';

/** Auth-related Redis / challenge TTLs (seconds unless noted). */
export const AUTH_TTL = {
  oauthLinkSec: 5 * SECONDS_PER_MINUTE,
  emailChangeSec: 10 * SECONDS_PER_MINUTE,
  qrLoginSec: 5 * SECONDS_PER_MINUTE,
  twoFactorSetupSec: 10 * SECONDS_PER_MINUTE,
  intentSec: 5 * SECONDS_PER_MINUTE,
  passkeyChallengeSec: 5 * SECONDS_PER_MINUTE,
  otpAttemptBlockSec: 5 * SECONDS_PER_MINUTE,
  otpAttemptLimit: 10,
} as const;
