import { resolvePublicApiBase } from '@/lib/api/publicApiBase';

const OPERATIONAL_PING_PATH = '/api/webhooks/operational/ping';

function operationalPingUrl(): string {
  const base = resolvePublicApiBase().replace(/\/$/, '');
  const origin =
    base ||
    (typeof globalThis !== 'undefined' && globalThis.window !== undefined
      ? globalThis.window.location.origin.replace(/\/$/, '')
      : '');
  return `${origin}${OPERATIONAL_PING_PATH}`;
}

export type { OperationalPingResult } from '@contracts/webhooksApi';
import type { OperationalPingResult } from '@contracts/webhooksApi';

/**
 * Public operational heartbeat — GET /api/webhooks/operational/ping (no auth).
 * Used by the global footer for live API / backend connectivity.
 */
export async function fetchOperationalPing(signal?: AbortSignal): Promise<OperationalPingResult> {
  const url = operationalPingUrl();
  if (!url.startsWith('http')) {
    return { ok: false, error: 'Invalid API URL' };
  }
  const start = globalThis.performance?.now() ?? Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal,
      headers: { Accept: 'application/json' },
    });
    const end = globalThis.performance?.now() ?? Date.now();
    const latencyMs = Math.max(0, Math.round(end - start));
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; service?: string; t?: string };
    if (!res.ok || body.ok !== true) {
      return { ok: false, latencyMs, error: res.statusText || 'Request failed' };
    }
    return {
      ok: true,
      latencyMs,
      service: typeof body.service === 'string' ? body.service : 'syntax-stories-api',
      t: typeof body.t === 'string' ? body.t : '',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, error: msg };
  }
}
