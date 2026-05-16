import { redirectLegacyOAuthCallback } from '@/lib/auth/legacyOAuthCallbackRedirect';

export default async function XCallbackRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return redirectLegacyOAuthCallback('x', searchParams);
}
