import { ADMIN_PERMISSIONS } from '../adminPermissions.js';
import { AdminAccessPermissionModel } from '../models/AdminAccessPermission.js';

/** Static catalog keys plus any active rows from `admin_access_permissions`. */
export async function getMergedPermissionKeySet(): Promise<Set<string>> {
  const s = new Set<string>([...ADMIN_PERMISSIONS]);
  const keys = await AdminAccessPermissionModel.distinct('key', {
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  });
  for (const k of keys) {
    if (typeof k === 'string' && k.trim()) s.add(k.trim());
  }
  return s;
}
