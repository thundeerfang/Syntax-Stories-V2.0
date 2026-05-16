import { cache } from 'react';
import type { PublishedPolicyResponse } from '@contracts/legalApi';
import { publicApiAbortSignal } from '@/lib/api/publicApiFetchTimeout';

export type PublicLegalKind = 'terms' | 'privacy' | 'udd';

const apiBase = (): string => (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

async function fetchPublishedLegalPolicyUncached(
  kind: PublicLegalKind
): Promise<PublishedPolicyResponse | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/v1/legal/policies/${kind}`, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
      signal: publicApiAbortSignal(),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean };
    if (!json || (json as { ok?: boolean }).ok !== true) return null;
    return json as PublishedPolicyResponse;
  } catch {
    return null;
  }
}

/**
 * Server-side fetch for published legal policy (§17.1).
 * Cached per-request so `generateMetadata` + page share one fetch during static generation.
 */
export const fetchPublishedLegalPolicy = cache(fetchPublishedLegalPolicyUncached);
