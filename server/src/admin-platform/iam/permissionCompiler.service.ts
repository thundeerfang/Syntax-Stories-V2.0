const ACTION_BITS: Record<string, number> = {
  list: 1 << 0,
  read: 1 << 1,
  search: 1 << 2,
  update_profile: 1 << 3,
  lock: 1 << 4,
  unlock: 1 << 5,
  reset_email: 1 << 6,
  read_oauth: 1 << 7,
  read_security: 1 << 8,
  revoke_sessions: 1 << 9,
  impersonate: 1 << 10,
  read_subscription: 1 << 11,
  read_ledger: 1 << 12,
  open_stripe_customer: 1 << 13,
  sync_subscription: 1 << 14,
  read_metrics: 1 << 15,
  manage: 1 << 16,
};
export type CompiledPermissionGraph = Record<string, number>;
export function compilePermissions(
  permissions: Iterable<string>,
): CompiledPermissionGraph {
  const graph: CompiledPermissionGraph = {};
  for (const key of permissions) {
    const trimmed = key.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const resource = trimmed.slice(0, colon);
    const action = trimmed.slice(colon + 1);
    const bit = ACTION_BITS[action];
    if (!bit) continue;
    graph[resource] = (graph[resource] ?? 0) | bit;
  }
  return graph;
}
export function graphAllows(
  graph: CompiledPermissionGraph,
  permission: string,
): boolean {
  const colon = permission.indexOf(":");
  if (colon <= 0) return false;
  const resource = permission.slice(0, colon);
  const action = permission.slice(colon + 1);
  const bit = ACTION_BITS[action];
  if (!bit) return false;
  return ((graph[resource] ?? 0) & bit) === bit;
}
export function graphResourceCount(graph: CompiledPermissionGraph): number {
  return Object.keys(graph).length;
}
