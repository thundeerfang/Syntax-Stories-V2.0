import { env } from '../../../config/env.js';
import { getMergedPermissionKeySet } from '../../rbac/services/adminPermissionCatalog.service.js';
import { invalidateAdminPermissionCache } from '../../rbac/services/rbac.service.js';
import { TemporalPermissionGrantModel } from './models/TemporalPermissionGrant.js';

const MAX_ELEVATION_MINUTES = 120;
const DEFAULT_ELEVATION_MINUTES = 30;

export async function getActiveTemporalPermissions(userId: string): Promise<string[]> {
  if (!env.FEATURE_ADMIN_TEMPORAL_PERMISSIONS) return [];
  const now = new Date();
  const grants = await TemporalPermissionGrantModel.find({
    userId,
    revokedAt: null,
    startsAt: { $lte: now },
    expiresAt: { $gt: now },
  })
    .select('permissions')
    .lean();

  const set = new Set<string>();
  for (const g of grants) {
    for (const p of g.permissions ?? []) set.add(p);
  }
  return [...set];
}

export async function createTemporalGrant(input: {
  userId: string;
  grantedById: string;
  permissions: string[];
  reason?: string;
  durationMinutes?: number;
}): Promise<{ id: string; expiresAt: Date }> {
  const catalog = await getMergedPermissionKeySet();
  const perms = input.permissions.map((p) => p.trim()).filter((p) => catalog.has(p));
  if (perms.length === 0) {
    throw new Error('No valid permissions');
  }

  const duration = Math.min(
    MAX_ELEVATION_MINUTES,
    Math.max(5, input.durationMinutes ?? DEFAULT_ELEVATION_MINUTES)
  );
  const expiresAt = new Date(Date.now() + duration * 60 * 1000);

  const doc = await TemporalPermissionGrantModel.create({
    userId: input.userId,
    grantedById: input.grantedById,
    permissions: perms,
    reason: input.reason?.trim(),
    expiresAt,
  });

  await invalidateAdminPermissionCache(input.userId);
  return { id: String(doc._id), expiresAt };
}

export async function listTemporalGrantsForUser(userId: string, includeExpired = false) {
  const now = new Date();
  const filter = includeExpired ? { userId } : { userId, revokedAt: null, expiresAt: { $gt: now } };

  return TemporalPermissionGrantModel.find(filter).sort({ expiresAt: 1 }).lean();
}

export async function revokeTemporalGrant(grantId: string, userId: string): Promise<boolean> {
  const res = await TemporalPermissionGrantModel.updateOne(
    { _id: grantId, userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  if (res.modifiedCount > 0) {
    await invalidateAdminPermissionCache(userId);
    return true;
  }
  return false;
}
