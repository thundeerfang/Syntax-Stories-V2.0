const STORAGE_KEY = 'ss-device-fp-v1';

/** Opaque id for rate limiting when IP is shared (sent as X-Device-Fingerprint). */
export function getOrCreateDeviceFingerprint(): string {
  if (globalThis.window === undefined) return '';
  try {
    let v = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!v || v.length < 8) {
      v =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      globalThis.localStorage.setItem(STORAGE_KEY, v);
    }
    return v;
  } catch {
    return '';
  }
}
