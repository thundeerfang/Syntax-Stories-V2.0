import { ADMIN_PERMISSION_L1_TTL_MS } from '../../../variable/constants.js';

type L1Entry = {
  permissions: Set<string>;
  expiresAt: number;
};

const l1 = new Map<string, L1Entry>();

export function getL1PermissionCache(userId: string): Set<string> | null {
  const entry = l1.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    l1.delete(userId);
    return null;
  }
  return entry.permissions;
}

export function setL1PermissionCache(userId: string, permissions: Set<string>): void {
  l1.set(userId, {
    permissions,
    expiresAt: Date.now() + ADMIN_PERMISSION_L1_TTL_MS,
  });
}

export function clearL1PermissionCache(userId: string): void {
  l1.delete(userId);
}

export function clearAllL1PermissionCache(): void {
  l1.clear();
}
