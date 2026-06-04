/** Matches server `REFERRAL_CODE_REGEX` in referral.service.ts (Crockford base32). */
export const REFERRAL_CODE_REGEX = /^[0-9A-HJKMNP-TV-Z]{8,16}$/;

/** Normalize referral code the same way the API does before lookup. */
export function normalizeReferralCode(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  if (!code || code.length < 8 || code.length > 16) return null;
  if (!REFERRAL_CODE_REGEX.test(code)) return null;
  return code;
}

/** User-facing hint when the typed value is non-empty but fails normalization. */
export function referralCodeFormatMessage(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length < 8) return 'Referral code must be at least 8 characters.';
  if (trimmed.length > 16) return 'Referral code must be at most 16 characters.';
  if (!REFERRAL_CODE_REGEX.test(trimmed.toUpperCase())) {
    return 'Use letters and numbers only (no I, L, O, or U).';
  }
  return null;
}

const PENDING_REFERRAL_KEY = 'pendingReferralCode';

export function readPendingReferralCode(): string | null {
  if (typeof globalThis.sessionStorage === 'undefined') return null;
  try {
    return normalizeReferralCode(globalThis.sessionStorage.getItem(PENDING_REFERRAL_KEY));
  } catch {
    return null;
  }
}

export function writePendingReferralCode(code: string | null): void {
  if (typeof globalThis.sessionStorage === 'undefined') return;
  try {
    if (!code) {
      globalThis.sessionStorage.removeItem(PENDING_REFERRAL_KEY);
      return;
    }
    globalThis.sessionStorage.setItem(PENDING_REFERRAL_KEY, code);
  } catch {
    /* private mode / quota */
  }
}
