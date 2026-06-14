export const ROUTE_RESTORE_EVENT = "ss-route-restore";
export function dispatchRouteRestore(): void {
  if (globalThis.window === undefined) return;
  globalThis.dispatchEvent(new CustomEvent(ROUTE_RESTORE_EVENT));
}
