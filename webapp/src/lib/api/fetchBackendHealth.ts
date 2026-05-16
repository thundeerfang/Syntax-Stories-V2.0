/**
 * Lightweight GET /api/health — no auth. Used by connectivity gate only.
 */
export async function fetchBackendHealth(apiBase: string, timeoutMs = 8000): Promise<boolean> {
  const base = apiBase.replace(/\/$/, '');
  if (!base) return false;

  const controller = new AbortController();
  const t = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(`${base}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
    });
    if (!r.ok) return false;
    const data = (await r.json().catch(() => null)) as { success?: boolean } | null;
    return data?.success === true;
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(t);
  }
}
