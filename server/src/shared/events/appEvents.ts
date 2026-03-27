/**
 * In-process event bus (not Kafka). Listeners must not block the request path for heavy work.
 * Async listeners are fire-and-forget; errors are logged only.
 */
export type AuthLoginSuccessPayload = {
  userId: string;
  source: string;
  isNewUser?: boolean;
};

export type AppEventMap = {
  'auth.login.success': AuthLoginSuccessPayload;
};

type Listener<K extends keyof AppEventMap> = (payload: AppEventMap[K]) => void | Promise<void>;

const listeners = new Map<keyof AppEventMap, Set<Listener<keyof AppEventMap>>>();

export function onAppEvent<K extends keyof AppEventMap>(event: K, fn: Listener<K>): () => void {
  let set = listeners.get(event);
  if (!set) {
    set = new Set();
    listeners.set(event, set);
  }
  set.add(fn as Listener<keyof AppEventMap>);
  return () => {
    set!.delete(fn as Listener<keyof AppEventMap>);
  };
}

export function emitAppEvent<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]): void {
  const set = listeners.get(event);
  if (!set?.size) return;
  for (const fn of set) {
    try {
      void Promise.resolve(fn(payload)).catch((e) => console.error('[appEvents]', String(event), e));
    } catch (e) {
      console.error('[appEvents]', String(event), e);
    }
  }
}
