import { env } from '../../config/env.js';
import { AUTH_TTL } from '../../config/auth.ttls.js';

/** Admin app origin for WebAuthn ceremonies (must match browser `window.location.origin`). */
export function getWebAuthnOrigin(): string {
  const raw =
    process.env.ADMIN_APP_URL?.trim() ||
    process.env.WEBAUTHN_ORIGIN?.trim() ||
    'http://localhost:3002';
  return raw.replace(/\/$/, '');
}

export function getWebAuthnRpId(): string {
  const explicit = process.env.WEBAUTHN_RP_ID?.trim();
  if (explicit) return explicit;
  try {
    return new URL(getWebAuthnOrigin()).hostname;
  } catch {
    return 'localhost';
  }
}

export const WEBAUTHN_RP_NAME = process.env.WEBAUTHN_RP_NAME?.trim() || 'Syntax Stories Admin';

export const PASSKEY_CHALLENGE_TTL_SEC = AUTH_TTL.passkeyChallengeSec;

export function isPasskeyFeatureEnabled(): boolean {
  return env.FEATURE_ADMIN_PASSKEY_STEPUP;
}
