import crypto from 'crypto';
import { getRedis } from '../../config/redis.js';
import { redisKeys } from '../../shared/redis/keys.js';
import { resolveStaffRoleForUser } from '../rbac/services/adminStaffResolution.js';
import {
  buildEffectiveAdminPermissions,
  getPermissionVersion,
} from '../rbac/services/rbac.service.js';
import { permissionsToCapabilityIds } from './permissionCapabilities.js';
import {
  compilePermissions,
  graphResourceCount,
  type CompiledPermissionGraph,
} from './permissionCompiler.service.js';
import { securityZonesForPermissions } from './securityZones.config.js';
import { getActorMaxRoleLevel } from '../rbac/services/rbac.service.js';
import { resolveSessionTier } from './sessionTier.config.js';
import { SessionModel } from '../../models/Session.js';

const SNAPSHOT_TTL_SEC = 7 * 24 * 60 * 60;

export type PermissionSnapshot = {
  userId: string;
  roleIds: string[];
  roleName: string | null;
  permissions: string[];
  capabilityIds: number[];
  compiledGraph: CompiledPermissionGraph;
  compiledResourceCount: number;
  securityZones: string[];
  sessionTier: string;
  permVersion: number;
  permHash: string;
  generatedAt: number;
};

function hashPermissions(permissions: string[], version: number): string {
  return crypto
    .createHash('sha256')
    .update(`${version}:${permissions.slice().sort().join(',')}`)
    .digest('hex')
    .slice(0, 16);
}

async function loadRoleMeta(
  userId: string
): Promise<{ roleIds: string[]; roleName: string | null }> {
  const { AdminUserModel } = await import('../rbac/models/AdminUser.js');
  const { AdminRoleModel } = await import('../rbac/models/AdminRole.js');
  const adminUser = await AdminUserModel.findOne({ userId, isActive: true })
    .populate('roleId', 'name')
    .lean();
  if (adminUser?.roleId && typeof adminUser.roleId === 'object') {
    const r = adminUser.roleId as { _id?: unknown; name?: string };
    return {
      roleIds: [String(r._id)],
      roleName: r.name ?? null,
    };
  }
  const { AdminUserRoleModel } = await import('../rbac/models/AdminUserRole.js');
  const links = await AdminUserRoleModel.find({ userId }).select('roleId').lean();
  const roleIds = links.map((l) => String(l.roleId));
  if (roleIds.length === 0) return { roleIds: [], roleName: null };
  const roles = await AdminRoleModel.find({ _id: { $in: roleIds }, deletedAt: null })
    .select('name')
    .lean();
  return {
    roleIds,
    roleName: roles[0]?.name ?? null,
  };
}

/** Build snapshot from DB and store under session id (staff only). */
export async function createStaffPermissionSnapshot(
  userId: string,
  sessionId: string
): Promise<PermissionSnapshot | null> {
  const staffRole = await resolveStaffRoleForUser(userId);
  if (!staffRole) return null;

  const permissions = await buildEffectiveAdminPermissions(userId);
  const permVersion = await getPermissionVersion(userId);
  const { roleIds, roleName } = await loadRoleMeta(userId);
  const permList = [...permissions].sort();
  const compiledGraph = compilePermissions(permList);
  const roleLevel = await getActorMaxRoleLevel(userId);
  const sessionTier = resolveSessionTier({ roleLevel });

  const snapshot: PermissionSnapshot = {
    userId,
    roleIds,
    roleName,
    permissions: permList,
    capabilityIds: permissionsToCapabilityIds(permList),
    compiledGraph,
    compiledResourceCount: graphResourceCount(compiledGraph),
    securityZones: securityZonesForPermissions(permList),
    sessionTier,
    permVersion,
    permHash: hashPermissions(permList, permVersion),
    generatedAt: Date.now(),
  };

  await SessionModel.updateOne({ _id: sessionId }, { $set: { sessionTier } });

  const redis = getRedis();
  if (redis) {
    try {
      await redis.setEx(
        redisKeys.iam.permissionSnapshot(sessionId),
        SNAPSHOT_TTL_SEC,
        JSON.stringify(snapshot)
      );
    } catch {
      /* ignore */
    }
  }

  return snapshot;
}

/** Refresh snapshot TTL + permissions after token rotation. */
export async function refreshStaffPermissionSnapshot(
  userId: string,
  sessionId: string
): Promise<void> {
  await createStaffPermissionSnapshot(userId, sessionId);
}

export async function getStaffPermissionSnapshot(
  sessionId: string
): Promise<PermissionSnapshot | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(redisKeys.iam.permissionSnapshot(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as PermissionSnapshot;
  } catch {
    return null;
  }
}

export async function deleteStaffPermissionSnapshot(sessionId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(redisKeys.iam.permissionSnapshot(sessionId));
  } catch {
    /* ignore */
  }
}
