import { redirectLegacyOAuthCallback } from '@/lib/legacyOAuthCallbackRedirect';

export default async function FacebookCallbackRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return redirectLegacyOAuthCallback('facebook', searchParams);
}
