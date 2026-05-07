import type { PublishedPolicyResponse } from '@contracts/legalApi';

export type PublicLegalKind = 'terms' | 'privacy' | 'udd';

const apiBase = (): string => (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

/**
 * Server-side fetch for published legal policy (§17.1).
 * Requires `NEXT_PUBLIC_API_BASE_URL` pointing at the API (same pattern as `publicHelp`).
 */
export async function fetchPublishedLegalPolicy(
  kind: PublicLegalKind
): Promise<PublishedPolicyResponse | null> {
  const base = apiBase();
  if (!base) return null;
  const res = await fetch(`${base}/api/v1/legal/policies/${kind}`, {
    next: { revalidate: 60 },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { ok?: boolean };
  if (!json || (json as { ok?: boolean }).ok !== true) return null;
  return json as PublishedPolicyResponse;
}
