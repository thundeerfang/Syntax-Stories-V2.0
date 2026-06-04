import { getApiOrigin } from '@/lib/api';

export type PublicHelpProbe = {
  ok: boolean;
  message: string;
  total?: number;
  version?: string;
};

/** Probe public Help API (no auth) — used by documentation hub API contracts tab. */
export async function probePublicHelpApi(category = 'general'): Promise<PublicHelpProbe> {
  const origin = getApiOrigin();
  if (!origin) {
    return { ok: false, message: 'NEXT_PUBLIC_API_BASE_URL is not set' };
  }
  try {
    const q = new URLSearchParams({ category, pageSize: '1', page: '1' });
    const res = await fetch(`${origin}/api/v1/help/articles?${q.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return { ok: false, message: `Public API HTTP ${res.status}` };
    }
    const json = (await res.json()) as {
      version?: string;
      total?: number;
      data?: unknown[];
    };
    return {
      ok: true,
      message: 'Public Help API reachable',
      total: json.total,
      version: json.version,
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Public API unreachable',
    };
  }
}
