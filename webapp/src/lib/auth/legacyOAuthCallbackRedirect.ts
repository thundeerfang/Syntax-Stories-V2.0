import { redirect } from 'next/navigation';

type LegacyOAuthProvider = 'google' | 'github' | 'discord' | 'facebook' | 'x';

/** Permanent Week 4 redirects: old `/google-callback` etc. → `/auth/callback/{provider}`. */
export async function redirectLegacyOAuthCallback(
  targetProvider: LegacyOAuthProvider,
  searchParams: Promise<Record<string, string | string[] | undefined>>
): Promise<never> {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    if (typeof v === 'string') q.set(k, v);
    else for (const item of v) q.append(k, item);
  }
  const s = q.toString();
  redirect(s ? `/auth/callback/${targetProvider}?${s}` : `/auth/callback/${targetProvider}`);
}
