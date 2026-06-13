/** Fired after bfcache restore, history back, or OAuth return so pages can reset client loading state. */
export const ROUTE_RESTORE_EVENT = 'ss-route-restore';

export function dispatchRouteRestore(): void {
  if (globalThis.window === undefined) return;
  globalThis.dispatchEvent(new CustomEvent(ROUTE_RESTORE_EVENT));
}
