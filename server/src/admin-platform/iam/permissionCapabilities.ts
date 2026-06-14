import { ADMIN_PERMISSIONS } from "../rbac/adminPermissions.js";
export const PERMISSION_CAPABILITIES: Record<string, number> = {};
export const CAPABILITY_TO_PERMISSION: Record<number, string> = {};
let nextId = 1;
for (const key of ADMIN_PERMISSIONS) {
  PERMISSION_CAPABILITIES[key] = nextId;
  CAPABILITY_TO_PERMISSION[nextId] = key;
  nextId += 1;
}
export function permissionsToCapabilityIds(permissions: string[]): number[] {
  const ids: number[] = [];
  for (const p of permissions) {
    const id = PERMISSION_CAPABILITIES[p];
    if (id != null) ids.push(id);
  }
  return ids.sort((a, b) => a - b);
}
export function capabilityIdsToPermissions(ids: number[]): string[] {
  return ids.map((id) => CAPABILITY_TO_PERMISSION[id]).filter(Boolean);
}
export function hasCapability(
  capabilityIds: number[],
  permission: string,
): boolean {
  const id = PERMISSION_CAPABILITIES[permission];
  if (id == null) return false;
  return capabilityIds.includes(id);
}
