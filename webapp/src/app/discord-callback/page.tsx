import { redirectLegacyOAuthCallback } from '@/lib/legacyOAuthCallbackRedirect';

export default async function DiscordCallbackRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return redirectLegacyOAuthCallback('discord', searchParams);
}
