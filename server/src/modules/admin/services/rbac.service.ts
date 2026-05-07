import { env } from '../../../config/env.js';
import { getRedis } from '../../../config/redis.js';
import { redisKeys } from '../../../shared/redis/keys.js';
import { ALL_ADMIN_PERMISSIONS } from '../adminPermissions.js';
import { getMergedPermissionKeySet } from './adminPermissionCatalog.service.js';
import { AdminRoleModel } from '../models/AdminRole.js';
import { AdminUserRoleModel } from '../models/AdminUserRole.js';
import { AdminUserModel } from '../models/AdminUser.js';

const CACHE_TTL_SEC = 300;

/**
 * Effective permissions for a staff user: UNION(role.permissions).
 * When FEATURE_ADMIN_RBAC_ENABLED is false, all catalog permissions are granted to any resolved staff user.
 */
export async function getEffectiveAdminPermissions(userId: string): Promise<Set<string>> {
  if (!env.FEATURE_ADMIN_RBAC_ENABLED) {
    return new Set(ALL_ADMIN_PERMISSIONS);
  }

  const redis = getRedis();
  const cacheKey = redisKeys.adminPerms(userId);
  if (redis) {
    try {
      const raw = await redis.get(cacheKey);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        return new Set(arr);
      }
    } catch {
      /* fall through */
    }
  }

  const allowedKeys = await getMergedPermissionKeySet();

  const adminUser = await AdminUserModel.findOne({ userId, isActive: true })
    .populate('roleId', 'permissions')
    .lean();

  const union = new Set<string>();

  if (adminUser?.roleId && typeof adminUser.roleId === 'object' && 'permissions' in adminUser.roleId) {
    const perms = (adminUser.roleId as { permissions?: string[] }).permissions ?? [];
    for (const p of perms) {
      if (allowedKeys.has(p)) union.add(p);
    }
  } else {
    const links = await AdminUserRoleModel.find({ userId }).select('roleId').lean();
    const roleIds = links.map((l) => l.roleId);
    if (roleIds.length === 0) {
      return new Set();
    }
    const roles = await AdminRoleModel.find({ _id: { $in: roleIds }, deletedAt: null })
      .select('permissions')
      .lean();
    for (const r of roles) {
      for (const p of r.permissions ?? []) {
        if (allowedKeys.has(p)) union.add(p);
      }
    }
  }

  if (redis) {
    try {
      await redis.setEx(cacheKey, CACHE_TTL_SEC, JSON.stringify([...union]));
    } catch {
      /* ignore */
    }
  }

  return union;
}

export async function invalidateAdminPermissionCache(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(redisKeys.adminPerms(userId));
  } catch {
    /* ignore */
  }
}

/** Clears permission cache for every active dashboard operator (catalog or role change). */
export async function invalidateAllStaffAdminPermissionCaches(): Promise<void> {
  const ids = await AdminUserModel.distinct('userId', { isActive: true });
  for (const uid of ids) {
    await invalidateAdminPermissionCache(String(uid));
  }
}

/** Max role level among roles assigned to this staff user (for assignment safety). */
export async function getActorMaxRoleLevel(userId: string): Promise<number> {
  if (!env.FEATURE_ADMIN_RBAC_ENABLED) {
    return 1000;
  }
  const adminUser = await AdminUserModel.findOne({ userId, isActive: true })
    .populate('roleId', 'level')
    .lean();
  if (adminUser?.roleId && typeof adminUser.roleId === 'object' && 'level' in adminUser.roleId) {
    const lev = (adminUser.roleId as { level?: number }).level;
    return typeof lev === 'number' ? lev : 0;
  }

  const links = await AdminUserRoleModel.find({ userId }).select('roleId').lean();
  const roleIds = links.map((l) => l.roleId);
  if (roleIds.length === 0) return 0;
  const roles = await AdminRoleModel.find({ _id: { $in: roleIds }, deletedAt: null }).select('level').lean();
  let max = 0;
  for (const r of roles) {
    if (typeof r.level === 'number' && r.level > max) max = r.level;
  }
  return max;
}

export function hasPermission(set: Set<string>, permission: string): boolean {
  return set.has(permission);
}
