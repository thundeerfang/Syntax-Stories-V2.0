import { redirectLegacyOAuthCallback } from '@/lib/auth/legacyOAuthCallbackRedirect';

export default async function GithubCallbackRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return redirectLegacyOAuthCallback('github', searchParams);
}
