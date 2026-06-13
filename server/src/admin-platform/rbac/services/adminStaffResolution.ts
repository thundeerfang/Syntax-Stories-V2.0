import { UserModel } from '../../../models/User.js';
import { AdminUserModel } from '../models/AdminUser.js';
import type { AdminAccountKind } from '../models/AdminUser.js';

/** CMS / dashboard staff gate (editor vs full admin). */
export type StaffRole = 'editor' | 'admin';

export function staffRoleFromAdminKind(kind: AdminAccountKind): StaffRole {
  return kind === 'staff' ? 'editor' : 'admin';
}

/**
 * Resolves CMS / management staff role: explicit `users.staffRole`, else active `admin_users` row.
 */
export async function resolveStaffRoleForUser(userId: string): Promise<StaffRole | undefined> {
  const row = await UserModel.findById(userId).select('staffRole').lean();
  const sr = row?.staffRole as StaffRole | undefined;
  if (sr === 'editor' || sr === 'admin') return sr;

  const admin = await AdminUserModel.findOne({ userId, isActive: true }).select('kind').lean();
  if (!admin) return undefined;
  return staffRoleFromAdminKind(admin.kind as AdminAccountKind);
}
