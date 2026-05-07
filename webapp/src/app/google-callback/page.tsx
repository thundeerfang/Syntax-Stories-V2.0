import { redirectLegacyOAuthCallback } from '@/lib/legacyOAuthCallbackRedirect';

export default async function GoogleCallbackRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return redirectLegacyOAuthCallback('google', searchParams);
}
