import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { ADMIN_USER_REF_PREFIX } from '../../variable/constants.js';

function deriveKey(raw: string): Buffer {
  const t = raw.trim();
  const b64 = Buffer.from(t, 'base64');
  if (b64.length === 32) return b64;
  const hex = Buffer.from(t.replace(/^0x/i, ''), 'hex');
  if (hex.length === 32) return hex;
  return scryptSync(t, 'syntax-stories-admin-user-ref', 32);
}

function getKey(): Buffer {
  const raw =
    process.env.ADMIN_USER_REF_KEY?.trim() ||
    env.SESSION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();
  if (!raw) {
    throw new Error('ADMIN_USER_REF_KEY or JWT_SECRET required for admin user refs');
  }
  return deriveKey(raw);
}

/** Opaque URL-safe token for a Mongo user id (admin console only). */
export function encodeAdminUserRef(objectId: string): string {
  if (!mongoose.isValidObjectId(objectId)) {
    throw new Error('encodeAdminUserRef: invalid ObjectId');
  }
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(objectId, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ADMIN_USER_REF_PREFIX + Buffer.concat([iv, tag, enc]).toString('base64url');
}

export function decodeAdminUserRef(ref: string): string | null {
  const trimmed = ref.trim();
  if (!trimmed.startsWith(ADMIN_USER_REF_PREFIX)) return null;
  try {
    const key = getKey();
    const raw = Buffer.from(trimmed.slice(ADMIN_USER_REF_PREFIX.length), 'base64url');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const objectId = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    return mongoose.isValidObjectId(objectId) ? objectId : null;
  } catch {
    return null;
  }
}

export function adminUserRefFromObjectId(userId: string | null | undefined): string | null {
  if (!userId || !mongoose.isValidObjectId(userId)) return null;
  try {
    return encodeAdminUserRef(userId);
  } catch {
    return null;
  }
}

function decodeRouteParam(param: string): string {
  let value = param.trim();
  for (let i = 0; i < 3; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(value)) break;
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value;
}

/** Resolve `:id` route param (opaque ref or legacy ObjectId) to a Mongo user id. */
export function resolveManagementUserParam(
  param: string
): { objectId: string } | { error: string } {
  const trimmed = decodeRouteParam(param);
  if (!trimmed) return { error: 'Missing user reference' };
  if (mongoose.isValidObjectId(trimmed)) return { objectId: trimmed };
  const decoded = decodeAdminUserRef(trimmed);
  if (decoded) return { objectId: decoded };
  return { error: 'Invalid user reference' };
}
