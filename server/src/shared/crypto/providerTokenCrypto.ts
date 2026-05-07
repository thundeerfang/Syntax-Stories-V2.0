import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const PREFIX = 'sspt1:';

function deriveKey(raw: string): Buffer {
  const t = raw.trim();
  const b64 = Buffer.from(t, 'base64');
  if (b64.length === 32) return b64;
  const hex = Buffer.from(t.replace(/^0x/i, ''), 'hex');
  if (hex.length === 32) return hex;
  return scryptSync(t, 'syntax-stories-oauth-provider-token', 32);
}

function getKey(): Buffer | null {
  const raw = process.env.OAUTH_PROVIDER_TOKEN_KEY;
  if (!raw?.trim()) return null;
  try {
    return deriveKey(raw);
  } catch {
    return null;
  }
}

/** Persist OAuth provider access tokens encrypted when `OAUTH_PROVIDER_TOKEN_KEY` is set (32-byte key, base64 or hex). */
export function sealProviderToken(plain: string | undefined | null): string | undefined {
  if (plain == null || plain === '') return undefined;
  const key = getKey();
  if (!key) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64url');
}

/** Decrypt sealed token, or return legacy plaintext if not prefixed. */
export function unsealProviderToken(sealed: string | undefined | null): string | undefined {
  if (sealed == null || sealed === '') return undefined;
  if (!sealed.startsWith(PREFIX)) return sealed;
  const key = getKey();
  if (!key) {
    console.warn('[providerTokenCrypto] cannot decrypt: OAUTH_PROVIDER_TOKEN_KEY missing');
    return undefined;
  }
  try {
    const raw = Buffer.from(sealed.slice(PREFIX.length), 'base64url');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return undefined;
  }
}
